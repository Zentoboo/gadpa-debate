using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using GadpaDebateApi.Data;
using GadpaDebateApi.Services;
using BCrypt.Net;
using System.Security.Claims;

namespace GadpaDebateApi;

// ---- DTOs ----
public record AdminCredentials(string Username, string Password);

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // --- Add required services ---

        // EF Core + SQLite
        builder.Services.AddDbContext<AppDbContext>(options =>
            options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

        // JWT Authentication
        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
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
                    ValidateLifetime = true
                };
            });

        builder.Services.AddAuthorization();

        // TokenService (singleton to generate JWTs)
        builder.Services.AddSingleton<TokenService>();

        // Swagger/OpenAPI (NSwag)
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddOpenApiDocument(config =>
        {
            config.DocumentName = "GadpaApi";
            config.Title = "GadpaApi v1";
            config.Version = "v1";
            
            // Add JWT Bearer authentication to Swagger
            config.AddSecurity("JWT", Enumerable.Empty<string>(), new NSwag.OpenApiSecurityScheme
            {
                Type = NSwag.OpenApiSecuritySchemeType.ApiKey,
                Name = "Authorization",
                In = NSwag.OpenApiSecurityApiKeyLocation.Header,
                Description = "Type into the textbox: Bearer {your JWT token}."
            });

            config.OperationProcessors.Add(new NSwag.Generation.Processors.Security.AspNetCoreOperationSecurityScopeProcessor("JWT"));
        });

        var app = builder.Build();

        if (app.Environment.IsDevelopment())
        {
            app.UseOpenApi();
            app.UseSwaggerUi(settings =>
            {
                settings.DocumentPath = "/swagger/{documentName}/swagger.json";
                settings.Path = "/swagger";
                settings.DocExpansion = "list";
            });
        }

        app.UseAuthentication();
        app.UseAuthorization();

        // ===========================
        // ===== PUBLIC ROUTES ======
        // ===========================

        // Guest: POST fire emoji (no auth)
        app.MapPost("/debate/fire", async (HttpContext context, AppDbContext db) =>
        {
            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

            // banned check
            var isBanned = await db.BannedIps.AnyAsync(b => b.IpAddress == ip);
            if (isBanned)
                return Results.Forbid();

            // rate limit: check last timestamp for this IP
            var existing = await db.FireEvents.FirstOrDefaultAsync(f => f.IpAddress == ip);

            if (existing is not null)
            {
                if ((DateTime.UtcNow - existing.Timestamp).TotalSeconds < 10)
                    return Results.StatusCode(StatusCodes.Status429TooManyRequests);

                // increment
                existing.FireCount += 1;
                existing.Timestamp = DateTime.UtcNow;
                db.FireEvents.Update(existing);
            }
            else
            {
                existing = new FireEvent
                {
                    IpAddress = ip,
                    Timestamp = DateTime.UtcNow,
                    FireCount = 1
                };
                db.FireEvents.Add(existing);
            }

            await db.SaveChangesAsync();

            // total fires overall (sum of FireCount)
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

        // Admin register - create admin in DB (with registration toggle control)
        app.MapPost("/admin/register", async (AppDbContext db, AdminCredentials creds) =>
        {
            // Check if registration is enabled (database-based)
            var setting = await db.AppSettings.FirstOrDefaultAsync(s => s.Key == "RegistrationEnabled");
            var registrationEnabled = setting?.Value == "True";
            
            // If no setting exists, allow registration (for first admin setup)
            if (setting == null)
            {
                var adminCount = await db.Users.CountAsync(u => u.Role == "Admin");
                if (adminCount > 0)
                {
                    // If admins exist but no setting, default to disabled for security
                    registrationEnabled = false;
                }
                else
                {
                    // First admin setup - allow registration
                    registrationEnabled = true;
                }
            }
            
            if (!registrationEnabled)
                return Results.BadRequest(new { message = "Registration is currently disabled." });

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

        // Admin login -> returns JWT
        app.MapPost("/admin/login", async (TokenService tokenService, AppDbContext db, AdminCredentials creds) =>
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Username == creds.Username && u.Role == "Admin");
            if (user == null)
                return Results.Unauthorized();

            var isValid = BCrypt.Net.BCrypt.Verify(creds.Password, user.PasswordHash);
            if (!isValid)
                return Results.Unauthorized();

            var token = tokenService.CreateToken(user.Username, user.Role);
            return Results.Ok(new { token });
        });

        // Admin: view heatmap (protected)
        app.MapGet("/admin/heatmap", async (AppDbContext db) =>
        {
            var total = await db.FireEvents.SumAsync(f => f.FireCount);
            return Results.Ok(new { total });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Admin: reset all fire data
        app.MapPost("/admin/reset", async (AppDbContext db) =>
        {
            db.FireEvents.RemoveRange(db.FireEvents);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Heatmap reset." });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Admin: ban ip
        app.MapPost("/admin/ban-ip", async (AppDbContext db, string ip) =>
        {
            if (string.IsNullOrWhiteSpace(ip))
                return Results.BadRequest(new { message = "ip query required, e.g. /admin/ban-ip?ip=1.2.3.4" });

            if (await db.BannedIps.AnyAsync(b => b.IpAddress == ip))
                return Results.BadRequest(new { message = "IP already banned" });

            db.BannedIps.Add(new BannedIp { IpAddress = ip });
            await db.SaveChangesAsync();
            return Results.Ok(new { message = $"Banned {ip}" });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Admin: unban ip
        app.MapPost("/admin/unban-ip", async (AppDbContext db, string ip) =>
        {
            var banned = await db.BannedIps.FirstOrDefaultAsync(b => b.IpAddress == ip);
            if (banned == null)
                return Results.NotFound(new { message = "IP not found" });

            db.BannedIps.Remove(banned);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = $"Unbanned {ip}" });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Admin: list banned ips
        app.MapGet("/admin/banned-ips", async (AppDbContext db) =>
        {
            var list = await db.BannedIps.Select(b => b.IpAddress).ToListAsync();
            return Results.Ok(list);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Admin: Enable/Disable Registration
        app.MapPost("/admin/toggle-registration", async (AppDbContext db, bool enabled) =>
        {
            var setting = await db.AppSettings.FirstOrDefaultAsync(s => s.Key == "RegistrationEnabled");
            
            if (setting == null)
            {
                setting = new AppSetting 
                { 
                    Key = "RegistrationEnabled", 
                    Value = enabled.ToString(),
                    UpdatedAt = DateTime.UtcNow
                };
                db.AppSettings.Add(setting);
            }
            else
            {
                setting.Value = enabled.ToString();
                setting.UpdatedAt = DateTime.UtcNow;
                db.AppSettings.Update(setting);
            }
            
            await db.SaveChangesAsync();
            
            return Results.Ok(new { message = $"Registration {(enabled ? "enabled" : "disabled")}", enabled });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Admin: Check registration status
        app.MapGet("/admin/registration-status", async (AppDbContext db) =>
        {
            var setting = await db.AppSettings.FirstOrDefaultAsync(s => s.Key == "RegistrationEnabled");
            var enabled = setting?.Value == "True";
            
            // If no setting exists, check if this is first-time setup
            if (setting == null)
            {
                var adminCount = await db.Users.CountAsync(u => u.Role == "Admin");
                enabled = adminCount == 0; // Allow registration only if no admins exist
            }
            
            return Results.Ok(new { 
                enabled, 
                lastUpdated = setting?.UpdatedAt,
                isFirstSetup = setting == null && enabled
            });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        app.Run();
    }
}