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
        app.UseCors("ReactApp");
        app.UseAuthRateLimit();

        // ===========================
        // ===== PUBLIC ROUTES =======
        // ===========================
        const int LIMIT_PER_WINDOW = 5;
        var WINDOW = TimeSpan.FromMinutes(1);

        app.MapPost("/debate/fire", async (
            HttpContext context,
            AppDbContext db,
            IMemoryCache cache) =>
        {
            string GetClientIp()
            {
                if (context.Request.Headers.TryGetValue("X-Forwarded-For", out var xff) && !string.IsNullOrWhiteSpace(xff))
                {
                    var first = xff.ToString().Split(',').First().Trim();
                    if (!string.IsNullOrWhiteSpace(first)) return first;
                }
                return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            }

            var ip = GetClientIp();

            if (await db.BannedIps.AnyAsync(b => b.IpAddress == ip))
                return Results.Forbid();

            var key = $"fire:rl:{ip}";
            var now = DateTime.UtcNow;
            if (!cache.TryGetValue<RateLimitEntry>(key, out var entry))
            {
                entry = new RateLimitEntry(1, now);
                cache.Set(key, entry, entry.WindowStart.Add(WINDOW) - now);
            }
            else
            {
                if (now - entry.WindowStart >= WINDOW)
                {
                    entry = new RateLimitEntry(1, now);
                    cache.Set(key, entry, WINDOW);
                }
                else
                {
                    if (entry.Count >= LIMIT_PER_WINDOW)
                    {
                        var retryAfter = (int)Math.Ceiling((entry.WindowStart.Add(WINDOW) - now).TotalSeconds);
                        context.Response.Headers["Retry-After"] = retryAfter.ToString();
                        context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                        return Results.Json(new
                        {
                            message = "Rate limit exceeded. Try again later.",
                            retryAfterSeconds = retryAfter
                        });
                    }
                    var newCount = entry.Count + 1;
                    entry = new RateLimitEntry(newCount, entry.WindowStart);
                    cache.Set(key, entry, entry.WindowStart.Add(WINDOW) - now);
                }
            }

            db.FireEvents.Add(new FireEvent
            {
                IpAddress = ip,
                FireCount = 1,
                Timestamp = DateTime.UtcNow
            });

            await db.SaveChangesAsync();
            var total = await db.FireEvents.SumAsync(f => f.FireCount);
            return Results.Ok(new { message = "🔥 added", total });
        });

        app.MapGet("/debate/heatmap-data", async (AppDbContext db, int intervalSeconds) =>
        {
            if (intervalSeconds <= 0) intervalSeconds = 10;
            var total = await db.FireEvents.SumAsync(f => f.FireCount);
            var since = DateTime.UtcNow.AddSeconds(-intervalSeconds);
            var intervalTotal = await db.FireEvents
                .Where(f => f.Timestamp >= since)
                .SumAsync(f => f.FireCount);

            return Results.Ok(new { total, intervalTotal, intervalSeconds });
        });

        // ===========================
        // ===== ADMIN ROUTES ========
        // ===========================

        // Get register status - PUBLIC ENDPOINT (NO AUTH REQUIRED)
        app.MapGet("/admin/register-status", async (AppDbContext db) =>
        {
            var setting = await db.AppSettings.FirstOrDefaultAsync(s => s.Key == "AdminRegisterEnabled");
            return Results.Ok(new { enabled = setting?.Value != "false" });
        });

        // Admin register with enable/disable check
        app.MapPost("/admin/register", async (AppDbContext db, AdminCredentials creds) =>
        {
            var setting = await db.AppSettings.FirstOrDefaultAsync(s => s.Key == "AdminRegisterEnabled");
            if (setting != null && setting.Value == "false")
                return Results.BadRequest(new { message = "Admin registration is currently disabled." });

            if (string.IsNullOrWhiteSpace(creds.Username) || string.IsNullOrWhiteSpace(creds.Password))
                return Results.BadRequest(new { message = "Username and password required." });

            if (creds.Username.Length < 3)
                return Results.BadRequest(new { message = "Username must be at least 3 characters long." });

            if (creds.Password.Length < 6)
                return Results.BadRequest(new { message = "Password must be at least 6 characters long." });

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

        // Admin login
        app.MapPost("/admin/login", async (TokenService tokenService, AppDbContext db, AdminCredentials creds) =>
        {
            if (string.IsNullOrWhiteSpace(creds.Username) || string.IsNullOrWhiteSpace(creds.Password))
                return Results.BadRequest(new { message = "Username and password required." });

            var user = await db.Users.FirstOrDefaultAsync(u => u.Username == creds.Username && u.Role == "Admin");
            if (user == null || !BCrypt.Net.BCrypt.Verify(creds.Password, user.PasswordHash))
                return Results.Unauthorized();

            var token = tokenService.CreateToken(user.Username, user.Role);
            return Results.Ok(new { token });
        });

        // Toggle admin register - REQUIRES ADMIN AUTH
        app.MapPost("/admin/toggle-register", async (AppDbContext db) =>
        {
            var setting = await db.AppSettings.FirstOrDefaultAsync(s => s.Key == "AdminRegisterEnabled");

            if (setting == null)
            {
                setting = new AppSetting { Key = "AdminRegisterEnabled", Value = "true" };
                db.AppSettings.Add(setting);
            }
            else
            {
                setting.Value = (setting.Value?.ToLower() == "true") ? "false" : "true";
                db.AppSettings.Update(setting);
            }

            await db.SaveChangesAsync();

            return Results.Ok(new { enabled = setting.Value == "true" });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Admin-protected endpoints
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