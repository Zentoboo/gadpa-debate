using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using GadpaDebateApi.Data;
using GadpaDebateApi.Services;
using GadpaDebateApi.Middleware;
using GadpaDebateApi.Hubs;
using System.Security.Claims;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.AspNetCore.SignalR;

namespace GadpaDebateApi;

// ---- DTOs ----
public record AdminCredentials(string Username, string Password);
public record BanIpRequest(string IpAddress);
public record UnbanIpRequest(string IpAddress);
public record RateLimitEntry(int Count, DateTime WindowStart);

// Kongres PPI DTOs
public record VoteRequest(int VoterId, int CandidateId);
public record StartShiftRequest(int BpuMemberId, string Activity, string? Notes);

// Debate Session DTOs
public record CreateDebateSessionRequest(string Title, string Description, string SessionType, DateTime? ScheduledAt, int TotalDurationMinutes);
public record AddQuestionRequest(string Question, int OrderIndex, int DurationMinutes, string QuestionType, string? TargetCandidate);
public record LiveControlRequest(string Action, int? QuestionId, int? ExtendTimeSeconds); // Actions: "start", "pause", "next", "prev", "extend", "end"
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
        
        // SignalR for real-time features
        builder.Services.AddSignalR();

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
            IMemoryCache cache,
            IHubContext<DebateHub> hubContext) =>
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
            
            // Broadcast fire event to all connected clients
            await hubContext.Clients.All.SendAsync("FireAdded", new { 
                total, 
                ip = ip.Substring(0, Math.Min(ip.Length, 10)) + "...", // Partial IP for privacy
                timestamp = DateTime.UtcNow 
            });
            
            return Results.Ok(new { message = "🔥 added", total });
        });

        // app.MapGet("/debate/heatmap", async (AppDbContext db) =>
        // {
        //     var total = await db.FireEvents.SumAsync(f => f.FireCount);
        //     return Results.Ok(new { total });
        // });

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

        // Admin register with enable/disable check
        app.MapPost("/admin/register", async (AppDbContext db, AdminCredentials creds) =>
        {
            var setting = await db.AppSettings.FirstOrDefaultAsync(s => s.Key == "AdminRegisterEnabled");
            if (setting != null && setting.Value == "false")
                return Results.BadRequest(new { message = "Admin registration is currently disabled." });

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
        // Get register status
        app.MapGet("/admin/register-status", async (AppDbContext db) =>
        {
            var setting = await db.AppSettings.FirstOrDefaultAsync(s => s.Key == "AdminRegisterEnabled");
            return Results.Ok(new { enabled = setting?.Value != "false" });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Admin login
        app.MapPost("/admin/login", async (TokenService tokenService, AppDbContext db, AdminCredentials creds) =>
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Username == creds.Username && u.Role == "Admin");
            if (user == null || !BCrypt.Net.BCrypt.Verify(creds.Password, user.PasswordHash))
                return Results.Unauthorized();

            var token = tokenService.CreateToken(user.Username, user.Role);
            return Results.Ok(new { token });
        });

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

        // ===========================
        // ===== BPU ENDPOINTS =======
        // ===========================

        // BPU Members Management
        app.MapGet("/api/bpu/members", async (AppDbContext db) =>
        {
            var members = await db.BpuMembers.Where(m => m.IsActive).ToListAsync();
            return Results.Ok(members);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        app.MapPost("/api/bpu/members", async (AppDbContext db, BpuMember member) =>
        {
            member.OathDate = DateTime.UtcNow;
            db.BpuMembers.Add(member);
            await db.SaveChangesAsync();
            return Results.Created($"/api/bpu/members/{member.Id}", member);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // BPU Tasks Management
        app.MapGet("/api/bpu/tasks", async (AppDbContext db) =>
        {
            var tasks = await db.BpuTasks.Include(t => t.AssignedToBpuMember).ToListAsync();
            return Results.Ok(tasks);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        app.MapPost("/api/bpu/tasks", async (AppDbContext db, BpuTask task) =>
        {
            db.BpuTasks.Add(task);
            await db.SaveChangesAsync();
            return Results.Created($"/api/bpu/tasks/{task.Id}", task);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        app.MapPut("/api/bpu/tasks/{id}/status", async (AppDbContext db, int id, string status) =>
        {
            var task = await db.BpuTasks.FindAsync(id);
            if (task == null) return Results.NotFound();
            
            task.Status = status;
            if (status == "Completed")
                task.CompletedAt = DateTime.UtcNow;
            
            await db.SaveChangesAsync();
            return Results.Ok(task);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Candidates Management
        app.MapGet("/api/candidates", async (AppDbContext db) =>
        {
            var candidates = await db.Candidates.ToListAsync();
            return Results.Ok(candidates);
        });

        app.MapPost("/api/candidates", async (AppDbContext db, Candidate candidate) =>
        {
            db.Candidates.Add(candidate);
            await db.SaveChangesAsync();
            return Results.Created($"/api/candidates/{candidate.Id}", candidate);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Voters Management
        app.MapGet("/api/voters", async (AppDbContext db) =>
        {
            var voters = await db.Voters.Where(v => v.IsEligible).ToListAsync();
            return Results.Ok(voters);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        app.MapPost("/api/voters", async (AppDbContext db, Voter voter) =>
        {
            db.Voters.Add(voter);
            await db.SaveChangesAsync();
            return Results.Created($"/api/voters/{voter.Id}", voter);
        });

        // Voting System
        app.MapPost("/api/vote", async (HttpContext context, AppDbContext db, VoteRequest request) =>
        {
            var voter = await db.Voters.FindAsync(request.VoterId);
            if (voter == null || !voter.IsEligible || voter.HasVoted)
                return Results.BadRequest(new { message = "Voter tidak eligible atau sudah memilih" });

            var candidate = await db.Candidates.FindAsync(request.CandidateId);
            if (candidate == null || !candidate.IsApproved)
                return Results.BadRequest(new { message = "Kandidat tidak valid" });

            var vote = new Vote
            {
                VoterId = request.VoterId,
                CandidateId = request.CandidateId,
                IpAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown"
            };

            voter.HasVoted = true;
            voter.VotedAt = DateTime.UtcNow;

            db.Votes.Add(vote);
            db.Voters.Update(voter);
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Vote berhasil dicatat" });
        });

        // Campaign Monitoring
        app.MapGet("/api/campaign-monitors", async (AppDbContext db) =>
        {
            var monitors = await db.CampaignMonitors.Include(m => m.BpuMember).ToListAsync();
            return Results.Ok(monitors);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        app.MapPost("/api/campaign-monitors", async (AppDbContext db, CampaignMonitor monitor) =>
        {
            db.CampaignMonitors.Add(monitor);
            await db.SaveChangesAsync();
            return Results.Created($"/api/campaign-monitors/{monitor.Id}", monitor);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Shift Records
        app.MapGet("/api/shift-records", async (AppDbContext db) =>
        {
            var shifts = await db.ShiftRecords.Include(s => s.BpuMember).ToListAsync();
            return Results.Ok(shifts);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        app.MapPost("/api/shift-records/start", async (AppDbContext db, StartShiftRequest request) =>
        {
            var shift = new ShiftRecord
            {
                BpuMemberId = request.BpuMemberId,
                Activity = request.Activity,
                StartTime = DateTime.UtcNow,
                Notes = request.Notes
            };
            db.ShiftRecords.Add(shift);
            await db.SaveChangesAsync();
            return Results.Created($"/api/shift-records/{shift.Id}", shift);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        app.MapPut("/api/shift-records/{id}/end", async (AppDbContext db, int id, string? notes) =>
        {
            var shift = await db.ShiftRecords.FindAsync(id);
            if (shift == null) return Results.NotFound();
            
            shift.EndTime = DateTime.UtcNow;
            shift.IsActive = false;
            if (!string.IsNullOrEmpty(notes))
                shift.Notes = notes;
            
            await db.SaveChangesAsync();
            return Results.Ok(shift);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // ================================
        // ===== VOTE RESULTS API ========
        // ================================

        // Get live vote results
        app.MapGet("/api/vote-results", async (AppDbContext db) =>
        {
            // Get vote counts by candidate
            var voteResults = await db.Votes
                .GroupBy(v => v.CandidateId)
                .Select(g => new {
                    CandidateId = g.Key,
                    VoteCount = g.Count()
                })
                .ToListAsync();

            // Get all candidates
            var allCandidates = await db.Candidates.ToListAsync();

            // Build result list with vote counts
            var candidateResults = allCandidates.Select(c => new {
                c.Id,
                c.Name,
                c.Position,
                c.VisionMission,
                c.TicketNumber,
                c.IsApproved,
                VoteCount = voteResults.FirstOrDefault(r => r.CandidateId == c.Id)?.VoteCount ?? 0
            }).OrderByDescending(c => c.VoteCount).ToList();

            var totalVotes = await db.Votes.CountAsync();
            var totalEligibleVoters = await db.Voters.CountAsync(v => v.IsEligible);
            var turnoutPercentage = totalEligibleVoters > 0 ? (double)totalVotes / totalEligibleVoters * 100 : 0;

            // Determine winner (simple majority)
            var winner = candidateResults.FirstOrDefault();
            var isWinnerDetermined = totalVotes > 0 && winner != null && 
                                   (candidateResults.Count == 1 || winner.VoteCount > (candidateResults.Skip(1).FirstOrDefault()?.VoteCount ?? 0));

            return Results.Ok(new {
                results = candidateResults,
                summary = new {
                    totalVotes,
                    totalEligibleVoters,
                    turnoutPercentage = Math.Round(turnoutPercentage, 2),
                    isWinnerDetermined,
                    winner = isWinnerDetermined ? new { 
                        name = winner.Name, 
                        position = winner.Position,
                        ticketNumber = winner.TicketNumber,
                        voteCount = winner.VoteCount,
                        percentage = totalVotes > 0 ? Math.Round((double)winner.VoteCount / totalVotes * 100, 2) : 0
                    } : null
                },
                lastUpdated = DateTime.UtcNow
            });
        });

        // Get detailed vote audit trail (admin only)
        app.MapGet("/api/vote-audit", async (AppDbContext db) =>
        {
            var auditData = await db.Votes
                .Include(v => v.Voter)
                .Include(v => v.Candidate)
                .Select(v => new {
                    id = v.Id,
                    voterStudentId = v.Voter!.StudentId,
                    candidateName = v.Candidate!.Name,
                    timestamp = v.VotedAt,
                    ipAddress = v.IpAddress.Substring(0, Math.Min(v.IpAddress.Length, 10)) + "..." // Partial IP for privacy
                })
                .OrderByDescending(v => v.timestamp)
                .ToListAsync();

            var votingPattern = await db.Votes
                .GroupBy(v => v.VotedAt.Date)
                .Select(g => new {
                    date = g.Key,
                    count = g.Count()
                })
                .OrderBy(g => g.date)
                .ToListAsync();

            return Results.Ok(new {
                auditTrail = auditData,
                votingPattern,
                totalRecords = auditData.Count
            });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Export election results (admin only)
        app.MapGet("/api/export-results", async (AppDbContext db) =>
        {
            var results = await db.Votes
                .Include(v => v.Candidate)
                .Include(v => v.Voter)
                .GroupBy(v => v.CandidateId)
                .Select(g => new {
                    CandidateName = g.First().Candidate!.Name,
                    Position = g.First().Candidate!.Position,
                    TicketNumber = g.First().Candidate!.TicketNumber,
                    VoteCount = g.Count(),
                    Percentage = 0.0 // Will calculate below
                })
                .ToListAsync();

            var totalVotes = results.Sum(r => r.VoteCount);
            var exportData = results.Select(r => new {
                r.CandidateName,
                r.Position,
                r.TicketNumber,
                r.VoteCount,
                Percentage = totalVotes > 0 ? Math.Round((double)r.VoteCount / totalVotes * 100, 2) : 0
            }).OrderByDescending(r => r.VoteCount);

            var reportData = new {
                electionTitle = "Kongres PPI XMUM 2025/2026 - Presidential Election",
                generatedAt = DateTime.UtcNow,
                results = exportData,
                summary = new {
                    totalVotes,
                    totalCandidates = results.Count,
                    winner = exportData.FirstOrDefault()
                }
            };

            return Results.Ok(reportData);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // ===============================
        // ===== DEBATE SESSION API =====
        // ===============================

        // Get current live session status
        app.MapGet("/api/live-status", async (AppDbContext db) =>
        {
            var liveSession = await db.LiveSessions.Include(l => l.DebateSession).Include(l => l.CurrentQuestion).FirstOrDefaultAsync();
            if (liveSession == null)
            {
                return Results.Ok(new { isLive = false, status = "Offline" });
            }
            
            return Results.Ok(new { 
                isLive = liveSession.IsLive,
                status = liveSession.Status,
                debateSession = liveSession.DebateSession?.Title,
                currentQuestion = liveSession.CurrentQuestion?.Question,
                timeRemaining = liveSession.TimeRemainingSeconds,
                startedAt = liveSession.StartedAt
            });
        });

        // Create debate session (draft)
        app.MapPost("/api/debate-sessions", async (AppDbContext db, CreateDebateSessionRequest request, HttpContext context) =>
        {
            var session = new DebateSession
            {
                Title = request.Title,
                Description = request.Description,
                SessionType = request.SessionType,
                ScheduledAt = request.ScheduledAt,
                TotalDurationMinutes = request.TotalDurationMinutes,
                CreatedByAdminId = context.User.Identity?.Name
            };
            
            db.DebateSessions.Add(session);
            await db.SaveChangesAsync();
            return Results.Created($"/api/debate-sessions/{session.Id}", session);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Get all debate sessions
        app.MapGet("/api/debate-sessions", async (AppDbContext db) =>
        {
            var sessions = await db.DebateSessions.Include(s => s.Questions.OrderBy(q => q.OrderIndex)).ToListAsync();
            return Results.Ok(sessions);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Add question to debate session
        app.MapPost("/api/debate-sessions/{sessionId}/questions", async (AppDbContext db, int sessionId, AddQuestionRequest request) =>
        {
            var session = await db.DebateSessions.FindAsync(sessionId);
            if (session == null) return Results.NotFound();
            
            var question = new DebateQuestion
            {
                DebateSessionId = sessionId,
                Question = request.Question,
                OrderIndex = request.OrderIndex,
                DurationMinutes = request.DurationMinutes,
                QuestionType = request.QuestionType,
                TargetCandidate = request.TargetCandidate
            };
            
            db.DebateQuestions.Add(question);
            await db.SaveChangesAsync();
            return Results.Created($"/api/debate-sessions/{sessionId}/questions/{question.Id}", question);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Go live with a debate session
        app.MapPost("/api/debate-sessions/{sessionId}/go-live", async (AppDbContext db, int sessionId, HttpContext context) =>
        {
            var session = await db.DebateSessions.Include(s => s.Questions.OrderBy(q => q.OrderIndex)).FirstOrDefaultAsync(s => s.Id == sessionId);
            if (session == null) return Results.NotFound();

            // End any existing live session
            var existingLive = await db.LiveSessions.FirstOrDefaultAsync();
            if (existingLive != null)
            {
                existingLive.IsLive = false;
                existingLive.Status = "Ended";
                existingLive.EndedAt = DateTime.UtcNow;
                db.LiveSessions.Update(existingLive);
            }

            // Start new live session
            var firstQuestion = session.Questions.FirstOrDefault();
            var liveSession = new LiveSession
            {
                DebateSessionId = sessionId,
                IsLive = true,
                Status = "Live",
                StartedAt = DateTime.UtcNow,
                CurrentQuestionId = firstQuestion?.Id,
                CurrentQuestionStartedAt = DateTime.UtcNow,
                TimeRemainingSeconds = firstQuestion?.DurationMinutes * 60,
                AdminControllerUsername = context.User.Identity?.Name
            };

            session.Status = "Live";
            
            db.LiveSessions.Add(liveSession);
            db.DebateSessions.Update(session);
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Debate session is now live!", liveSession });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Live session control (next question, pause, extend time, etc.)
        app.MapPost("/api/live-control", async (AppDbContext db, LiveControlRequest request, HttpContext context) =>
        {
            var liveSession = await db.LiveSessions.Include(l => l.DebateSession).ThenInclude(s => s!.Questions.OrderBy(q => q.OrderIndex)).FirstOrDefaultAsync(l => l.IsLive);
            if (liveSession == null) return Results.BadRequest(new { message = "No live session found" });

            switch (request.Action.ToLower())
            {
                case "next":
                    var questions = liveSession.DebateSession!.Questions.OrderBy(q => q.OrderIndex).ToList();
                    var currentIndex = questions.FindIndex(q => q.Id == liveSession.CurrentQuestionId);
                    if (currentIndex < questions.Count - 1)
                    {
                        var nextQuestion = questions[currentIndex + 1];
                        liveSession.CurrentQuestionId = nextQuestion.Id;
                        liveSession.CurrentQuestionStartedAt = DateTime.UtcNow;
                        liveSession.TimeRemainingSeconds = nextQuestion.DurationMinutes * 60;
                    }
                    break;
                    
                case "prev":
                    var allQuestions = liveSession.DebateSession!.Questions.OrderBy(q => q.OrderIndex).ToList();
                    var currentIdx = allQuestions.FindIndex(q => q.Id == liveSession.CurrentQuestionId);
                    if (currentIdx > 0)
                    {
                        var prevQuestion = allQuestions[currentIdx - 1];
                        liveSession.CurrentQuestionId = prevQuestion.Id;
                        liveSession.CurrentQuestionStartedAt = DateTime.UtcNow;
                        liveSession.TimeRemainingSeconds = prevQuestion.DurationMinutes * 60;
                    }
                    break;
                    
                case "pause":
                    liveSession.Status = "Paused";
                    break;
                    
                case "resume":
                    liveSession.Status = "Live";
                    break;
                    
                case "extend":
                    liveSession.TimeRemainingSeconds += request.ExtendTimeSeconds ?? 60;
                    break;
                    
                case "end":
                    liveSession.IsLive = false;
                    liveSession.Status = "Ended";
                    liveSession.EndedAt = DateTime.UtcNow;
                    if (liveSession.DebateSession != null)
                        liveSession.DebateSession.Status = "Completed";
                    break;
            }

            db.LiveSessions.Update(liveSession);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = $"Action '{request.Action}' executed", liveSession });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Map SignalR Hub
        app.MapHub<DebateHub>("/debateHub");

        app.Run();
    }
}
