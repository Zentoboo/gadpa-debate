using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using GadpaDebateApi.Data;
using GadpaDebateApi.Services;
using GadpaDebateApi.Middleware;
using System.Security.Claims;
using Microsoft.Extensions.Caching.Memory;

namespace GadpaDebateApi;

// ---- DTOs ----
public record AdminCredentials(string Username, string Password);
public record BanIpRequest(string IpAddress);
public record UnbanIpRequest(string IpAddress);
public record RateLimitEntry(int Count, DateTime WindowStart);
public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // EF Core + SQLite (expects "DefaultConnection" in appsettings)
        builder.Services.AddDbContext<AppDbContext>(options =>
            options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

        // JWT Authentication
        builder.Services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            var key = Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!);
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = builder.Configuration["Jwt:Issuer"],
                ValidateAudience = true,
                ValidAudience = builder.Configuration["Jwt:Audience"],
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero,
                RequireExpirationTime = true
            };
        });

        builder.Services.AddAuthorization();

        // CORS (React dev server default)
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("ReactApp", b =>
            {
                b.WithOrigins("http://localhost:5173")
                 .AllowAnyMethod()
                 .AllowAnyHeader()
                 .AllowCredentials();
            });
        });

        // Token service and memory cache
        builder.Services.AddSingleton<TokenService>();
        builder.Services.AddMemoryCache();

        // Swagger/OpenAPI (NSwag)
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddOpenApiDocument(config =>
        {
            config.DocumentName = "GadpaApi";
            config.Title = "GadpaApi v1";
            config.Version = "v1";
        });

        var app = builder.Build();

        if (app.Environment.IsDevelopment())
        {
            app.UseOpenApi();
            app.UseSwaggerUi();
        }

        app.UseAuthentication();
        app.UseAuthorization();
        app.UseAuthRateLimit();
        app.UseCors("ReactApp");

        // ===========================
        // ===== PUBLIC ROUTES ======
        // ===========================

        // Configurable limits for fire events
        const int LIMIT_PER_WINDOW = 5;
        var WINDOW = TimeSpan.FromMinutes(1);

        // Guest: POST fire emoji with "5-per-minute" soft cooldown
        app.MapPost("/debate/fire", async (
            HttpContext context,
            AppDbContext db,
            IMemoryCache cache) =>
        {
            // Prefer X-Forwarded-For when behind proxy/load balancer
            string GetClientIp()
            {
                if (context.Request.Headers.TryGetValue("X-Forwarded-For", out var xff) && !string.IsNullOrWhiteSpace(xff))
                {
                    // X-Forwarded-For may contain comma separated list
                    var first = xff.ToString().Split(',').First().Trim();
                    if (!string.IsNullOrWhiteSpace(first)) return first;
                }

                return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            }

            var ip = GetClientIp();

            // Optional: check manual ban list
            if (await db.BannedIps.AnyAsync(b => b.IpAddress == ip))
                return Results.Forbid();

            var key = $"fire:rl:{ip}";

            // Try get existing entry
            var now = DateTime.UtcNow;
            if (!cache.TryGetValue<RateLimitEntry>(key, out var entry))
            {
                // No entry -> create new with 1 click
                entry = new RateLimitEntry(1, now);
                // Set cache to expire when window ends to auto-reset
                cache.Set(key, entry, entry.WindowStart.Add(WINDOW) - now);
            }
            else
            {
                // Check if current window has expired
                if (now - entry.WindowStart >= WINDOW)
                {
                    // Reset window: start now with count = 1
                    entry = new RateLimitEntry(1, now);
                    cache.Set(key, entry, WINDOW);
                }
                else
                {
                    // Same window: check limit
                    if (entry.Count >= LIMIT_PER_WINDOW)
                    {
                        var retryAfter = (int)Math.Ceiling((entry.WindowStart.Add(WINDOW) - now).TotalSeconds);
                        // Return 429 with retry info
                        context.Response.Headers["Retry-After"] = retryAfter.ToString();
                        context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                        return Results.Json(new
                        {
                            message = "Rate limit exceeded. Try again later.",
                            retryAfterSeconds = retryAfter
                        });
                    }

                    // Increment count and update cache with remaining TTL
                    var newCount = entry.Count + 1;
                    entry = new RateLimitEntry(newCount, entry.WindowStart);
                    cache.Set(key, entry, entry.WindowStart.Add(WINDOW) - now);
                }
            }

            // Allowed: update DB aggregates
            var existing = await db.FireEvents.FirstOrDefaultAsync(f => f.IpAddress == ip);
            if (existing != null)
            {
                existing.FireCount += 1;
                existing.Timestamp = DateTime.UtcNow;
                db.FireEvents.Update(existing);
            }
            else
            {
                db.FireEvents.Add(new FireEvent
                {
                    IpAddress = ip,
                    FireCount = 1,
                    Timestamp = DateTime.UtcNow
                });
            }

            await db.SaveChangesAsync();

            var total = await db.FireEvents.SumAsync(f => f.FireCount);
            return Results.Ok(new { message = "🔥 added", total });
        });

        // Guest: GET heatmap total
        app.MapGet("/debate/heatmap", async (AppDbContext db) =>
        {
            var total = await db.FireEvents.SumAsync(f => f.FireCount);
            return Results.Ok(new { total });
        });

        // ===========================
        // ===== ADMIN ROUTES =======
        // ===========================

        // Admin register - now with rate limiting via middleware
        app.MapPost("/admin/register", async (AppDbContext db, AdminCredentials creds) =>
        {
            if (string.IsNullOrWhiteSpace(creds.Username) || string.IsNullOrWhiteSpace(creds.Password))
                return Results.BadRequest(new { message = "Username and password required." });

            var exists = await db.Users.AnyAsync(u => u.Username == creds.Username);
            if (exists)
                return Results.BadRequest(new { message = "Username already exists." });

            var user = new User
            {
                Username = creds.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(creds.Password),
                Role = "Admin"
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();

            return Results.Created($"/admin/{user.Id}", new { user.Id, user.Username });
        });

        // Admin login -> JWT - now with rate limiting via middleware
        app.MapPost("/admin/login", async (TokenService tokenService, AppDbContext db, AdminCredentials creds) =>
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Username == creds.Username && u.Role == "Admin");
            if (user == null || !BCrypt.Net.BCrypt.Verify(creds.Password, user.PasswordHash))
                return Results.Unauthorized();

            var token = tokenService.CreateToken(user.Username, user.Role);
            return Results.Ok(new { token });
        });

        // Admin-protected endpoints (NO rate limiting - admins need unrestricted access)
        app.MapGet("/admin/heatmap", async (AppDbContext db) =>
        {
            var total = await db.FireEvents.SumAsync(f => f.FireCount);
            return Results.Ok(new { total });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        app.MapPost("/admin/reset", async (AppDbContext db) =>
        {
            db.FireEvents.RemoveRange(db.FireEvents);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Heatmap reset." });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Fixed: Use request body instead of query parameter for security
        app.MapPost("/admin/ban-ip", async (AppDbContext db, BanIpRequest request) =>
        {
            if (string.IsNullOrWhiteSpace(request.IpAddress))
                return Results.BadRequest(new { message = "IP required." });

            if (await db.BannedIps.AnyAsync(b => b.IpAddress == request.IpAddress))
                return Results.BadRequest(new { message = "IP already banned" });

            db.BannedIps.Add(new BannedIp { IpAddress = request.IpAddress });
            await db.SaveChangesAsync();
            return Results.Ok(new { message = $"Banned {request.IpAddress}" });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        app.MapPost("/admin/unban-ip", async (AppDbContext db, UnbanIpRequest request) =>
        {
            var banned = await db.BannedIps.FirstOrDefaultAsync(b => b.IpAddress == request.IpAddress);
            if (banned == null)
                return Results.NotFound(new { message = "IP not found" });

            db.BannedIps.Remove(banned);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = $"Unbanned {request.IpAddress}" });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        app.MapGet("/admin/banned-ips", async (AppDbContext db) =>
        {
            var list = await db.BannedIps.Select(b => b.IpAddress).ToListAsync();
            return Results.Ok(list);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        app.Run();
    }
}