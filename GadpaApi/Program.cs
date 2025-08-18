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
public record DebateManagerCredentials(string Username, string Password);
public record BanIpRequest(string IpAddress);
public record UnbanIpRequest(string IpAddress);
public record RateLimitEntry(int Count, DateTime WindowStart);
public record CreateDebateRequest(string Title, string Description, List<string> Questions);
public record UpdateDebateRequest(string Title, string Description, List<string> Questions);
public record ChangeRoundRequest(int RoundNumber);

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
                b.WithOrigins("http://localhost:3000", "http://localhost:5173", "http://localhost:3001")
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

        // Get a list of all currently live debates for the public home page.
        app.MapGet("/debate/live-debates", async (AppDbContext db) =>
        {
            var liveDebates = await db.LiveDebates
                .Where(ld => ld.IsActive)
                .Include(ld => ld.Debate)
                .ThenInclude(d => d.Questions.OrderBy(q => q.RoundNumber))
                .ToListAsync();

            if (!liveDebates.Any())
            {
                return Results.Ok(new { isLive = false, debates = new List<object>() });
            }

            var debateList = liveDebates.Select(ld => new
            {
                id = ld.Debate.Id,
                title = ld.Debate.Title,
                description = ld.Debate.Description,
                currentRound = ld.CurrentRound,
                totalRounds = ld.Debate.Questions.Count
            }).ToList();

            return Results.Ok(new { isLive = true, debates = debateList });
        });

        app.MapGet("/debate/current", async (AppDbContext db) =>
        {
            // Find the single active live debate.
            var liveDebate = await db.LiveDebates
                .FirstOrDefaultAsync(ld => ld.IsActive);

            // If no live debate is found, return `isLive = false` immediately.
            if (liveDebate == null)
            {
                return Results.Ok(new { isLive = false });
            }
            var debate = await db.Debates
                .Include(d => d.Questions.OrderBy(q => q.RoundNumber))
                .FirstOrDefaultAsync(d => d.Id == liveDebate.DebateId);

            if (debate == null)
            {
                return Results.Ok(new { isLive = false });
            }

            var currentQuestion = debate.Questions.FirstOrDefault(q => q.RoundNumber == liveDebate.CurrentRound);

            return Results.Ok(new
            {
                isLive = true,
                debate = new
                {
                    id = debate.Id, // <-- Add this line to include the debate ID
                    title = debate.Title,
                    description = debate.Description,
                    currentRound = liveDebate.CurrentRound,
                    totalRounds = debate.Questions.Count,
                    currentQuestion = currentQuestion?.Question,
                    questions = debate.Questions.Select(q => new { round = q.RoundNumber, question = q.Question })
                }
            });
        });

        app.MapGet("/debate/{debateId}", async (AppDbContext db, int debateId) =>
        {
            var debate = await db.Debates
                .Include(d => d.Questions.OrderBy(q => q.RoundNumber))
                .FirstOrDefaultAsync(d => d.Id == debateId);

            if (debate == null)
            {
                return Results.NotFound(new { message = "Debate not found." });
            }

            var liveDebateStatus = await db.LiveDebates.FirstOrDefaultAsync(ld => ld.DebateId == debate.Id && ld.IsActive);
            bool isLive = liveDebateStatus != null;

            // Now return the debate details regardless of live status
            return Results.Ok(new
            {
                isLive = isLive,
                id = debate.Id,
                title = debate.Title,
                description = debate.Description,
                currentRound = isLive ? liveDebateStatus.CurrentRound : 0, // Only show round if live
                totalRounds = debate.Questions.Count,
                currentQuestion = isLive ? debate.Questions.FirstOrDefault(q => q.RoundNumber == liveDebateStatus.CurrentRound)?.Question : null,
                questions = debate.Questions.Select(q => new { round = q.RoundNumber, question = q.Question })
            });
        });

        // Post a fire event for a specific debate
        app.MapPost("/debate/{debateId}/fire", async (
            HttpContext context,
            AppDbContext db,
            IMemoryCache cache,
            int debateId) =>
        {
            // First, find the specific live debate
            var liveDebate = await db.LiveDebates.FirstOrDefaultAsync(ld => ld.DebateId == debateId && ld.IsActive);
            if (liveDebate == null)
                return Results.BadRequest(new { message = "The specified debate is not currently live." });

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

            var key = $"fire:rl:{ip}:{liveDebate.Id}";
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
                Timestamp = DateTime.UtcNow,
                LiveDebateId = liveDebate.Id,
                LiveDebate = liveDebate
            });

            await db.SaveChangesAsync();
            var total = await db.FireEvents.Where(f => f.LiveDebateId == liveDebate.Id).SumAsync(f => f.FireCount);
            return Results.Ok(new { message = "🔥 added", total });
        });

        // Get heatmap data for a specific debate
        app.MapGet("/debate/{debateId}/heatmap-data", async (AppDbContext db, int debateId, int intervalSeconds = 10, int lastMinutes = 3) =>
        {
            var liveDebate = await db.LiveDebates.FirstOrDefaultAsync(ld => ld.DebateId == debateId && ld.IsActive);
            if (liveDebate == null)
                return Results.BadRequest(new { message = "Debate not found or is not live." });

            if (intervalSeconds <= 0) intervalSeconds = 10;
            if (lastMinutes <= 0) lastMinutes = 3;

            var now = DateTime.UtcNow;
            var since = now.AddMinutes(-lastMinutes);

            var allEvents = await db.FireEvents
                .Where(f => f.LiveDebateId == liveDebate.Id && f.Timestamp >= since)
                .OrderBy(f => f.Timestamp)
                .ToListAsync();

            var buckets = new List<object>();
            var bucketDuration = TimeSpan.FromSeconds(intervalSeconds);
            var cumulativeTotal = 0;

            var currentBucketStart = since;
            while (currentBucketStart < now)
            {
                var currentBucketEnd = currentBucketStart.Add(bucketDuration);
                var intervalTotal = allEvents
                    .Where(e => e.Timestamp >= currentBucketStart && e.Timestamp < currentBucketEnd)
                    .Sum(e => e.FireCount);

                cumulativeTotal += intervalTotal;

                var bucketLabel = $"{currentBucketStart:HH:mm:ss}-{currentBucketEnd:HH:mm:ss}";
                var bucketEndLabel = currentBucketEnd.ToString("HH:mm:ss");

                buckets.Add(new
                {
                    bucketLabel,
                    bucketEndLabel,
                    intervalTotal,
                    total = cumulativeTotal,
                    bucketEndTimestamp = (long)(currentBucketEnd - new DateTime(1970, 1, 1)).TotalSeconds
                });

                currentBucketStart = currentBucketEnd;
            }

            var currentTotal = await db.FireEvents.Where(e => e.LiveDebateId == liveDebate.Id).SumAsync(e => e.FireCount);
            return Results.Ok(new { buckets, total = currentTotal });
        });

        // ===========================
        // ===== ADMIN ROUTES ========
        // ===========================

        // Get admin register status
        app.MapGet("/admin/register-status", async (AppDbContext db) =>
        {
            var setting = await db.AppSettings.FirstOrDefaultAsync(s => s.Key == "AdminRegisterEnabled");
            return Results.Ok(new { enabled = setting?.Value != "false" });
        });

        // Admin register
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

            var token = tokenService.CreateToken(user.Id, user.Username, user.Role);
            return Results.Ok(new { token });
        });

        // Toggle admin register
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

        // Get a list of all live debates for the admin dashboard
        app.MapGet("/admin/live/all-status", async (AppDbContext db) =>
        {
            var liveDebates = await db.LiveDebates
                .Where(ld => ld.IsActive)
                .Select(ld => new
                {
                    liveDebate = ld,
                    debate = db.Debates
                        .Where(d => d.Id == ld.DebateId)
                        .Include(d => d.Questions.OrderBy(q => q.RoundNumber))
                        .FirstOrDefault()
                })
                .ToListAsync();

            if (liveDebates == null || !liveDebates.Any())
            {
                return Results.Ok(new List<object>()); // Return an empty list if no debates are live
            }

            var result = liveDebates.Select(item =>
            {
                var currentQuestion = item.debate.Questions.FirstOrDefault(q => q.RoundNumber == item.liveDebate.CurrentRound);

                return new
                {
                    isLive = true,
                    debate = new
                    {
                        id = item.debate.Id,
                        title = item.debate.Title,
                        description = item.debate.Description,
                        currentRound = item.liveDebate.CurrentRound,
                        totalRounds = item.debate.Questions.Count,
                        currentQuestion = currentQuestion?.Question,
                        debateManagerId = item.liveDebate.DebateManagerId
                    }
                };
            }).ToList();

            return Results.Ok(result);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Admin-only endpoints
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

        // Toggle debate manager register (Admin only)
        app.MapPost("/admin/toggle-debate-manager-register", async (AppDbContext db) =>
        {
            var setting = await db.AppSettings.FirstOrDefaultAsync(s => s.Key == "DebateManagerRegisterEnabled");

            if (setting == null)
            {
                setting = new AppSetting { Key = "DebateManagerRegisterEnabled", Value = "true" };
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

        // =======================================
        // ===== DEBATE MANAGER ROUTES ==========
        // =======================================

        // Get debate manager register status
        app.MapGet("/debate-manager/register-status", async (AppDbContext db) =>
        {
            var setting = await db.AppSettings.FirstOrDefaultAsync(s => s.Key == "DebateManagerRegisterEnabled");
            return Results.Ok(new { enabled = setting?.Value != "false" });
        });

        // Debate manager register
        app.MapPost("/debate-manager/register", async (AppDbContext db, DebateManagerCredentials creds) =>
        {
            var setting = await db.AppSettings.FirstOrDefaultAsync(s => s.Key == "DebateManagerRegisterEnabled");
            if (setting != null && setting.Value == "false")
                return Results.BadRequest(new { message = "Debate manager registration is currently disabled." });

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
                Role = "DebateManager"
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();

            return Results.Created($"/debate-manager/{user.Id}", new { user.Id, user.Username });
        });

        // Debate manager login
        app.MapPost("/debate-manager/login", async (TokenService tokenService, AppDbContext db, DebateManagerCredentials creds) =>
        {
            if (string.IsNullOrWhiteSpace(creds.Username) || string.IsNullOrWhiteSpace(creds.Password))
                return Results.BadRequest(new { message = "Username and password required." });

            var user = await db.Users.FirstOrDefaultAsync(u => u.Username == creds.Username && u.Role == "DebateManager");
            if (user == null || !BCrypt.Net.BCrypt.Verify(creds.Password, user.PasswordHash))
                return Results.Unauthorized();

            var token = tokenService.CreateToken(user.Id, user.Username, user.Role);
            return Results.Ok(new { token });
        });

        // Get debates created by current debate manager
        app.MapGet("/debate-manager/debates", async (HttpContext context, AppDbContext db) =>
        {
            var userId = int.Parse(context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            var debates = await db.Debates
                .Where(d => d.CreatedByUserId == userId)
                .OrderByDescending(d => d.UpdatedAt)
                .Select(d => new
                {
                    d.Id,
                    d.Title,
                    d.Description,
                    d.CreatedAt,
                    d.UpdatedAt,
                    questionCount = d.Questions.Count,
                    Questions = d.Questions
                        .OrderBy(q => q.RoundNumber)
                        .Select(q => new
                        {
                            q.Id,
                            q.Question,
                            q.RoundNumber
                        })
                        .ToList()
                })
                .ToListAsync();

            return Results.Ok(debates);
        }).RequireAuthorization(policy => policy.RequireRole("DebateManager"));


        // Create new debate
        app.MapPost("/debate-manager/debates", async (HttpContext context, AppDbContext db, CreateDebateRequest request) =>
        {
            var userId = int.Parse(context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            if (string.IsNullOrWhiteSpace(request.Title))
                return Results.BadRequest(new { message = "Title is required." });

            if (request.Questions == null || request.Questions.Count == 0)
                return Results.BadRequest(new { message = "At least one question is required." });

            var debate = new Debate
            {
                Title = request.Title.Trim(),
                Description = request.Description?.Trim() ?? "",
                CreatedByUserId = userId
            };

            db.Debates.Add(debate);
            await db.SaveChangesAsync();

            // Add questions
            var questions = request.Questions.Select((q, index) => new DebateQuestion
            {
                DebateId = debate.Id,
                RoundNumber = index + 1,
                Question = q.Trim()
            }).ToList();

            db.DebateQuestions.AddRange(questions);
            await db.SaveChangesAsync();

            return Results.Created($"/debate-manager/debates/{debate.Id}", new { debate.Id, debate.Title });
        }).RequireAuthorization(policy => policy.RequireRole("DebateManager"));

        // Get specific debate
        app.MapGet("/debate-manager/debates/{id:int}", async (HttpContext context, AppDbContext db, int id) =>
        {
            var userId = int.Parse(context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            var debate = await db.Debates
                .Include(d => d.Questions.OrderBy(q => q.RoundNumber))
                .FirstOrDefaultAsync(d => d.Id == id && d.CreatedByUserId == userId);

            if (debate == null)
                return Results.NotFound();

            return Results.Ok(new
            {
                debate.Id,
                debate.Title,
                debate.Description,
                debate.CreatedAt,
                debate.UpdatedAt,
                questions = debate.Questions.Select(q => new { q.RoundNumber, q.Question })
            });
        }).RequireAuthorization(policy => policy.RequireRole("DebateManager"));

        // Update debate
        app.MapPut("/debate-manager/debates/{id:int}", async (HttpContext context, AppDbContext db, int id, UpdateDebateRequest request) =>
        {
            var userId = int.Parse(context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            var debate = await db.Debates
                .Include(d => d.Questions)
                .FirstOrDefaultAsync(d => d.Id == id && d.CreatedByUserId == userId);

            if (debate == null)
                return Results.NotFound();

            // Check if debate is currently live
            var isLive = await db.LiveDebates.AnyAsync(ld => ld.DebateId == id && ld.IsActive);
            if (isLive)
                return Results.BadRequest(new { message = "Cannot edit a debate that is currently live." });

            debate.Title = request.Title?.Trim() ?? debate.Title;
            debate.Description = request.Description?.Trim() ?? debate.Description;
            debate.UpdatedAt = DateTime.UtcNow;

            // Update questions if provided
            if (request.Questions != null && request.Questions.Count > 0)
            {
                // Remove existing questions
                db.DebateQuestions.RemoveRange(debate.Questions);

                // Add new questions
                var newQuestions = request.Questions.Select((q, index) => new DebateQuestion
                {
                    DebateId = debate.Id,
                    RoundNumber = index + 1,
                    Question = q.Trim()
                }).ToList();

                db.DebateQuestions.AddRange(newQuestions);
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Debate updated successfully." });
        }).RequireAuthorization(policy => policy.RequireRole("DebateManager"));

        // Delete debate
        app.MapDelete("/debate-manager/debates/{id:int}", async (HttpContext context, AppDbContext db, int id) =>
        {
            var userId = int.Parse(context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            var debate = await db.Debates.FirstOrDefaultAsync(d => d.Id == id && d.CreatedByUserId == userId);
            if (debate == null)
                return Results.NotFound();

            // Check if debate is currently live
            var isLive = await db.LiveDebates.AnyAsync(ld => ld.DebateId == id && ld.IsActive);
            if (isLive)
                return Results.BadRequest(new { message = "Cannot delete a debate that is currently live." });

            db.Debates.Remove(debate);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Debate deleted successfully." });
        }).RequireAuthorization(policy => policy.RequireRole("DebateManager"));

        // Start live debate
        app.MapPost("/debate-manager/debates/{id:int}/go-live", async (HttpContext context, AppDbContext db, int id) =>
        {
            var userId = int.Parse(context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            var debate = await db.Debates
                .Include(d => d.Questions)
                .FirstOrDefaultAsync(d => d.Id == id && d.CreatedByUserId == userId);

            if (debate == null)
                return Results.NotFound();

            if (debate.Questions.Count == 0)
                return Results.BadRequest(new { message = "Cannot go live with a debate that has no questions." });

            // Check if user already has a live debate
            var existingLive = await db.LiveDebates.FirstOrDefaultAsync(ld => ld.DebateManagerId == userId && ld.IsActive);
            if (existingLive != null)
                return Results.BadRequest(new { message = "You already have a live debate. End it first before starting a new one." });

            var liveDebate = new LiveDebate
            {
                DebateId = id,
                DebateManagerId = userId,
                CurrentRound = 1,
                StartedAt = DateTime.UtcNow,
                IsActive = true,
                Debate = debate
            };

            db.LiveDebates.Add(liveDebate);
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Debate is now live!", liveDebateId = liveDebate.Id });
        }).RequireAuthorization(policy => policy.RequireRole("DebateManager"));

        // End live debate
        app.MapPost("/debate-manager/live/end", async (HttpContext context, AppDbContext db) =>
        {
            var userId = int.Parse(context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            var liveDebate = await db.LiveDebates.FirstOrDefaultAsync(ld => ld.DebateManagerId == userId && ld.IsActive);
            if (liveDebate == null)
                return Results.NotFound(new { message = "No active live debate found." });

            // Mark as inactive
            liveDebate.IsActive = false;

            // Delete all fire events for this live debate
            var fireEvents = await db.FireEvents.Where(fe => fe.LiveDebateId == liveDebate.Id).ToListAsync();
            db.FireEvents.RemoveRange(fireEvents);

            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Live debate ended and data cleared." });
        }).RequireAuthorization(policy => policy.RequireRole("DebateManager"));

        // Get current live debate status
        app.MapGet("/debate-manager/live/status", async (HttpContext context, AppDbContext db) =>
        {
            var userId = int.Parse(context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            var liveDebate = await db.LiveDebates
                .Where(ld => ld.DebateManagerId == userId && ld.IsActive)
                .FirstOrDefaultAsync();

            if (liveDebate == null)
                return Results.Ok(new { isLive = false });

            var debate = await db.Debates
                .Include(d => d.Questions.OrderBy(q => q.RoundNumber))
                .FirstAsync(d => d.Id == liveDebate.DebateId);

            var currentQuestion = debate.Questions.FirstOrDefault(q => q.RoundNumber == liveDebate.CurrentRound);
            var totalFires = await db.FireEvents.Where(fe => fe.LiveDebateId == liveDebate.Id).SumAsync(fe => fe.FireCount);

            return Results.Ok(new
            {
                isLive = true,
                liveDebateId = liveDebate.Id,
                debate = new
                {
                    id = debate.Id,
                    title = debate.Title,
                    description = debate.Description
                },
                currentRound = liveDebate.CurrentRound,
                totalRounds = debate.Questions.Count,
                currentQuestion = currentQuestion?.Question,
                totalFires,
                startedAt = liveDebate.StartedAt
            });
        }).RequireAuthorization(policy => policy.RequireRole("DebateManager"));

        // Change current round
        app.MapPost("/debate-manager/live/change-round", async (HttpContext context, AppDbContext db, ChangeRoundRequest request) =>
        {
            var userId = int.Parse(context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            var liveDebate = await db.LiveDebates.FirstOrDefaultAsync(ld => ld.DebateManagerId == userId && ld.IsActive);
            if (liveDebate == null)
                return Results.NotFound(new { message = "No active live debate found." });

            var debate = await db.Debates
                .Include(d => d.Questions)
                .FirstAsync(d => d.Id == liveDebate.DebateId);

            if (request.RoundNumber < 1 || request.RoundNumber > debate.Questions.Count)
                return Results.BadRequest(new { message = $"Round number must be between 1 and {debate.Questions.Count}." });

            liveDebate.CurrentRound = request.RoundNumber;
            await db.SaveChangesAsync();

            var currentQuestion = debate.Questions.First(q => q.RoundNumber == request.RoundNumber);
            return Results.Ok(new
            {
                message = $"Changed to round {request.RoundNumber}",
                currentRound = request.RoundNumber,
                currentQuestion = currentQuestion.Question
            });
        }).RequireAuthorization(policy => policy.RequireRole("DebateManager"));

        // Get live debate heatmap (for debate manager)
        app.MapGet("/debate-manager/live/heatmap", async (HttpContext context, AppDbContext db, int intervalSeconds = 10, int lastMinutes = 3) =>
        {
            var userId = int.Parse(context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            var liveDebate = await db.LiveDebates.FirstOrDefaultAsync(ld => ld.DebateManagerId == userId && ld.IsActive);
            if (liveDebate == null)
                return Results.NotFound(new { message = "No active live debate found." });

            if (intervalSeconds <= 0) intervalSeconds = 10;
            if (lastMinutes <= 0) lastMinutes = 3;

            var now = DateTime.UtcNow;
            var since = now.AddMinutes(-lastMinutes);

            var allEvents = await db.FireEvents
                .Where(f => f.LiveDebateId == liveDebate.Id && f.Timestamp >= since)
                .OrderBy(f => f.Timestamp)
                .ToListAsync();

            var buckets = new List<object>();
            var bucketDuration = TimeSpan.FromSeconds(intervalSeconds);
            var cumulativeTotal = 0;

            var currentBucketStart = since;
            while (currentBucketStart < now)
            {
                var currentBucketEnd = currentBucketStart.Add(bucketDuration);
                var intervalTotal = allEvents
                    .Where(e => e.Timestamp >= currentBucketStart && e.Timestamp < currentBucketEnd)
                    .Sum(e => e.FireCount);

                cumulativeTotal += intervalTotal;

                var bucketLabel = $"{currentBucketStart:HH:mm:ss}-{currentBucketEnd:HH:mm:ss}";
                var bucketEndLabel = currentBucketEnd.ToString("HH:mm:ss");

                buckets.Add(new
                {
                    bucketLabel,
                    bucketEndLabel,
                    intervalTotal,
                    total = cumulativeTotal,
                    bucketEndTimestamp = (long)(currentBucketEnd - new DateTime(1970, 1, 1)).TotalSeconds
                });

                currentBucketStart = currentBucketEnd;
            }

            var totalFires = await db.FireEvents.Where(e => e.LiveDebateId == liveDebate.Id).SumAsync(e => e.FireCount);
            return Results.Ok(new { buckets, total = totalFires });
        }).RequireAuthorization(policy => policy.RequireRole("DebateManager"));

        app.Run();
    }
}