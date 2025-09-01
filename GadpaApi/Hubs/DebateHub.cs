using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;
using GadpaDebateApi.Data;
using Microsoft.AspNetCore.Authorization;

namespace GadpaDebateApi.Hubs;

public class DebateHub : Hub
{
    private readonly AppDbContext _db;
    private readonly ILogger<DebateHub> _logger;
    
    public DebateHub(AppDbContext db, ILogger<DebateHub> logger)
    {
        _db = db;
        _logger = logger;
    }
    // Track connected users
    private static readonly ConcurrentDictionary<string, string> ConnectedUsers = new();
    private static int ViewerCount = 0;
    
    // Fire reaction tracking
    private static int TotalFireCount = 0;
    private static readonly ConcurrentDictionary<string, DateTime> LastFireTime = new();
    
    // Debate state management
    private static string? CurrentRound = null;
    private static string? CurrentQuestion = null;
    private static DateTime? RoundStartTime = null;
    private static int? RoundDuration = null;
    private static bool IsDebateLive = false;

    public override async Task OnConnectedAsync()
    {
        Interlocked.Increment(ref ViewerCount);
        ConnectedUsers[Context.ConnectionId] = Context.ConnectionId;
        
        // Notify all clients of new viewer count
        await Clients.All.SendAsync("ViewerCountChanged", ViewerCount);
        
        // Send current debate status to the new connection
        await Clients.Caller.SendAsync("Connected", new { 
            viewerCount = ViewerCount,
            connectionId = Context.ConnectionId,
            isDebateLive = IsDebateLive,
            currentRound = CurrentRound,
            currentQuestion = CurrentQuestion,
            roundStartTime = RoundStartTime,
            roundDuration = RoundDuration,
            totalFireCount = TotalFireCount
        });
        
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        Interlocked.Decrement(ref ViewerCount);
        ConnectedUsers.TryRemove(Context.ConnectionId, out _);
        
        // Notify all clients of updated viewer count
        await Clients.All.SendAsync("ViewerCountChanged", ViewerCount);
        
        await base.OnDisconnectedAsync(exception);
    }

    // Send fire reaction (optimized for high frequency)
    public async Task SendFireReaction(string? userName = null, int x = 0, int y = 0)
    {
        var connectionId = Context.ConnectionId;
        var now = DateTime.UtcNow;
        
        // Rate limiting: max 1 fire per user per second
        if (LastFireTime.TryGetValue(connectionId, out var lastTime))
        {
            if ((now - lastTime).TotalMilliseconds < 1000)
            {
                return; // Rate limited
            }
        }
        
        LastFireTime[connectionId] = now;
        Interlocked.Increment(ref TotalFireCount);
        
        // Broadcast fire reaction to all clients
        await Clients.All.SendAsync("ReceiveFireReaction", new
        {
            userName = userName ?? "Anonymous",
            x,
            y,
            timestamp = now,
            totalCount = TotalFireCount
        });
        
        // Broadcast updated fire count
        await Clients.All.SendAsync("FireCountUpdate", TotalFireCount);
    }

    // Round Management
    public async Task StartRound(string roundName, string question, int durationMinutes)
    {
        CurrentRound = roundName;
        CurrentQuestion = question;
        RoundStartTime = DateTime.UtcNow;
        RoundDuration = durationMinutes;
        IsDebateLive = true;
        
        await Clients.All.SendAsync("RoundStarted", new
        {
            roundName,
            question,
            durationMinutes,
            startTime = RoundStartTime,
            timestamp = DateTime.UtcNow
        });
    }
    
    public async Task StopRound()
    {
        IsDebateLive = false;
        CurrentRound = null;
        CurrentQuestion = null;
        RoundStartTime = null;
        RoundDuration = null;
        
        await Clients.All.SendAsync("RoundStopped", new
        {
            timestamp = DateTime.UtcNow
        });
    }
    
    public async Task UpdateRoundTimer(int remainingSeconds)
    {
        await Clients.All.SendAsync("TimerUpdate", new
        {
            remainingSeconds,
            timestamp = DateTime.UtcNow
        });
    }

    // Question Broadcasting
    public async Task BroadcastQuestion(string question)
    {
        CurrentQuestion = question;
        
        await Clients.All.SendAsync("QuestionBroadcast", new
        {
            question,
            currentRound = CurrentRound,
            timestamp = DateTime.UtcNow
        });
    }
    
    public async Task NextQuestion(string question)
    {
        CurrentQuestion = question;
        
        await Clients.All.SendAsync("NextQuestion", new
        {
            question,
            currentRound = CurrentRound,
            timestamp = DateTime.UtcNow
        });
    }
    
    public async Task PreviousQuestion(string question)
    {
        CurrentQuestion = question;
        
        await Clients.All.SendAsync("PreviousQuestion", new
        {
            question,
            currentRound = CurrentRound,
            timestamp = DateTime.UtcNow
        });
    }

    // Broadcast typing indicator for moderator
    public async Task SendTypingIndicator(bool isTyping)
    {
        await Clients.Others.SendAsync("ModeratorTyping", isTyping);
    }

    // Send live chat message (optional feature)
    public async Task SendMessage(string userName, string message)
    {
        if (string.IsNullOrWhiteSpace(message)) return;
        
        await Clients.All.SendAsync("ReceiveMessage", new
        {
            userName = userName ?? "Anonymous",
            message = message.Substring(0, Math.Min(message.Length, 200)), // Limit message length
            timestamp = DateTime.UtcNow
        });
    }

    // Live Stats Broadcasting
    public async Task GetLiveStats()
    {
        await Clients.Caller.SendAsync("LiveStatsUpdate", new
        {
            viewerCount = ViewerCount,
            totalFireCount = TotalFireCount,
            isDebateLive = IsDebateLive,
            currentRound = CurrentRound,
            currentQuestion = CurrentQuestion,
            roundStartTime = RoundStartTime,
            roundDuration = RoundDuration,
            timestamp = DateTime.UtcNow
        });
    }
    
    public async Task BroadcastLiveStats()
    {
        await Clients.All.SendAsync("LiveStatsUpdate", new
        {
            viewerCount = ViewerCount,
            totalFireCount = TotalFireCount,
            isDebateLive = IsDebateLive,
            timestamp = DateTime.UtcNow
        });
    }
    
    // Reset fire count (admin only)
    public async Task ResetFireCount()
    {
        TotalFireCount = 0;
        LastFireTime.Clear();
        
        await Clients.All.SendAsync("FireCountReset", new
        {
            timestamp = DateTime.UtcNow
        });
    }
    
    // Audience engagement methods
    public async Task JoinAsAudience(string? userName = null)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "Audience");
        
        await Clients.Group("Audience").SendAsync("AudienceJoined", new
        {
            userName = userName ?? "Anonymous",
            connectionId = Context.ConnectionId,
            timestamp = DateTime.UtcNow
        });
    }
    
    public async Task LeaveAudience()
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "Audience");
    }
    
    // ===== ADVANCED DEBATE CONTROL WITH DATABASE =====
    
    // Get all debate sessions (for admin)
    [Authorize(Roles = "Admin")]
    public async Task GetDebateSessions()
    {
        var sessions = await _db.DebateSessions
            .Include(s => s.Questions.OrderBy(q => q.OrderIndex))
            .Select(s => new
            {
                s.Id,
                s.Title,
                s.Description,
                s.SessionType,
                s.Status,
                s.TotalDurationMinutes,
                s.CreatedAt,
                s.ScheduledAt,
                Questions = s.Questions.Select(q => new
                {
                    q.Id,
                    q.Question,
                    q.OrderIndex,
                    q.DurationMinutes,
                    q.QuestionType,
                    q.TargetCandidate
                })
            })
            .ToListAsync();
            
        await Clients.Caller.SendAsync("DebateSessionsList", sessions);
    }
    
    // Go live with a debate session
    [Authorize(Roles = "Admin")]
    public async Task GoLiveWithSession(int sessionId)
    {
        try
        {
            var session = await _db.DebateSessions
                .Include(s => s.Questions.OrderBy(q => q.OrderIndex))
                .FirstOrDefaultAsync(s => s.Id == sessionId);
                
            if (session == null)
            {
                await Clients.Caller.SendAsync("Error", "Session not found");
                return;
            }
            
            // End any existing live session
            var existingLive = await _db.LiveSessions.FirstOrDefaultAsync(l => l.IsLive);
            if (existingLive != null)
            {
                existingLive.IsLive = false;
                existingLive.EndedAt = DateTime.UtcNow;
            }
            
            // Create new live session
            var firstQuestion = session.Questions.FirstOrDefault();
            var liveSession = new LiveSession
            {
                DebateSessionId = sessionId,
                IsLive = true,
                Status = "Live",
                StartedAt = DateTime.UtcNow,
                CurrentQuestionId = firstQuestion?.Id,
                TimeRemaining = firstQuestion?.DurationMinutes * 60
            };
            
            _db.LiveSessions.Add(liveSession);
            session.Status = "Live";
            await _db.SaveChangesAsync();
            
            // Update in-memory state
            IsDebateLive = true;
            CurrentRound = session.Title;
            CurrentQuestion = firstQuestion?.Question;
            RoundStartTime = DateTime.UtcNow;
            RoundDuration = session.TotalDurationMinutes;
            
            // Broadcast to all clients
            await Clients.All.SendAsync("SessionWentLive", new
            {
                sessionId,
                sessionTitle = session.Title,
                firstQuestion = firstQuestion?.Question,
                totalQuestions = session.Questions.Count,
                timestamp = DateTime.UtcNow
            });
            
            _logger.LogInformation($"Session {sessionId} went live");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error going live with session");
            await Clients.Caller.SendAsync("Error", "Failed to go live");
        }
    }
    
    // Live control actions (admin only)
    [Authorize(Roles = "Admin")]
    public async Task ControlLiveSession(string action, int? extendSeconds = null)
    {
        try
        {
            var liveSession = await _db.LiveSessions
                .Include(l => l.DebateSession)
                    .ThenInclude(s => s!.Questions.OrderBy(q => q.OrderIndex))
                .FirstOrDefaultAsync(l => l.IsLive);
                
            if (liveSession == null)
            {
                await Clients.Caller.SendAsync("Error", "No live session found");
                return;
            }
            
            var questions = liveSession.DebateSession!.Questions.ToList();
            
            switch (action.ToLower())
            {
                case "next":
                    var currentIndex = questions.FindIndex(q => q.Id == liveSession.CurrentQuestionId);
                    if (currentIndex < questions.Count - 1)
                    {
                        var nextQuestion = questions[currentIndex + 1];
                        liveSession.CurrentQuestionId = nextQuestion.Id;
                        liveSession.CurrentQuestion = nextQuestion;
                        liveSession.TimeRemaining = nextQuestion.DurationMinutes * 60;
                        
                        CurrentQuestion = nextQuestion.Question;
                        
                        await Clients.All.SendAsync("NextQuestion", new
                        {
                            question = nextQuestion.Question,
                            duration = nextQuestion.DurationMinutes,
                            questionType = nextQuestion.QuestionType,
                            index = currentIndex + 2,
                            total = questions.Count
                        });
                    }
                    break;
                    
                case "prev":
                case "previous":
                    var currIndex = questions.FindIndex(q => q.Id == liveSession.CurrentQuestionId);
                    if (currIndex > 0)
                    {
                        var prevQuestion = questions[currIndex - 1];
                        liveSession.CurrentQuestionId = prevQuestion.Id;
                        liveSession.CurrentQuestion = prevQuestion;
                        liveSession.TimeRemaining = prevQuestion.DurationMinutes * 60;
                        
                        CurrentQuestion = prevQuestion.Question;
                        
                        await Clients.All.SendAsync("PreviousQuestion", new
                        {
                            question = prevQuestion.Question,
                            duration = prevQuestion.DurationMinutes,
                            questionType = prevQuestion.QuestionType,
                            index = currIndex,
                            total = questions.Count
                        });
                    }
                    break;
                    
                case "pause":
                    liveSession.Status = "Paused";
                    await Clients.All.SendAsync("SessionPaused", new { timestamp = DateTime.UtcNow });
                    break;
                    
                case "resume":
                    liveSession.Status = "Live";
                    await Clients.All.SendAsync("SessionResumed", new { timestamp = DateTime.UtcNow });
                    break;
                    
                case "extend":
                    if (extendSeconds.HasValue)
                    {
                        liveSession.TimeRemaining += extendSeconds.Value;
                        await Clients.All.SendAsync("TimeExtended", new 
                        { 
                            addedSeconds = extendSeconds.Value,
                            newTimeRemaining = liveSession.TimeRemaining 
                        });
                    }
                    break;
                    
                case "end":
                    liveSession.IsLive = false;
                    liveSession.Status = "Ended";
                    liveSession.EndedAt = DateTime.UtcNow;
                    liveSession.DebateSession!.Status = "Completed";
                    
                    IsDebateLive = false;
                    CurrentRound = null;
                    CurrentQuestion = null;
                    
                    await Clients.All.SendAsync("SessionEnded", new { timestamp = DateTime.UtcNow });
                    break;
            }
            
            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error controlling live session with action: {action}");
            await Clients.Caller.SendAsync("Error", "Failed to control session");
        }
    }
    
    // Create debate session
    [Authorize(Roles = "Admin")]
    public async Task CreateDebateSession(string title, string description, string sessionType, int durationMinutes)
    {
        try
        {
            var session = new DebateSession
            {
                Title = title,
                Description = description,
                SessionType = sessionType,
                TotalDurationMinutes = durationMinutes,
                Status = "Draft",
                CreatedAt = DateTime.UtcNow
            };
            
            _db.DebateSessions.Add(session);
            await _db.SaveChangesAsync();
            
            await Clients.Caller.SendAsync("SessionCreated", new
            {
                sessionId = session.Id,
                title = session.Title,
                status = session.Status
            });
            
            // Notify all admins about new session
            await Clients.Group("Admins").SendAsync("NewSessionCreated", new
            {
                sessionId = session.Id,
                title = session.Title,
                createdAt = session.CreatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating debate session");
            await Clients.Caller.SendAsync("Error", "Failed to create session");
        }
    }
    
    // Add question to session
    [Authorize(Roles = "Admin")]
    public async Task AddQuestionToSession(int sessionId, string question, int orderIndex, int durationMinutes, string questionType, string? targetCandidate = null)
    {
        try
        {
            var session = await _db.DebateSessions.FindAsync(sessionId);
            if (session == null)
            {
                await Clients.Caller.SendAsync("Error", "Session not found");
                return;
            }
            
            var newQuestion = new DebateQuestion
            {
                DebateSessionId = sessionId,
                Question = question,
                OrderIndex = orderIndex,
                DurationMinutes = durationMinutes,
                QuestionType = questionType,
                TargetCandidate = targetCandidate,
                CreatedAt = DateTime.UtcNow
            };
            
            _db.DebateQuestions.Add(newQuestion);
            await _db.SaveChangesAsync();
            
            await Clients.Caller.SendAsync("QuestionAdded", new
            {
                questionId = newQuestion.Id,
                sessionId,
                question = newQuestion.Question,
                orderIndex = newQuestion.OrderIndex
            });
            
            // Notify admins
            await Clients.Group("Admins").SendAsync("NewQuestionAdded", new
            {
                sessionId,
                questionId = newQuestion.Id,
                question = newQuestion.Question
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding question to session");
            await Clients.Caller.SendAsync("Error", "Failed to add question");
        }
    }
    
    // Join admin group (for admins only)
    [Authorize(Roles = "Admin")]
    public async Task JoinAdminGroup()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "Admins");
        await Clients.Caller.SendAsync("JoinedAdminGroup", new { timestamp = DateTime.UtcNow });
    }
    
    // Periodic timer update (called by a background service or timer)
    public async Task BroadcastTimerTick()
    {
        if (IsDebateLive)
        {
            var liveSession = await _db.LiveSessions.FirstOrDefaultAsync(l => l.IsLive);
            if (liveSession != null && liveSession.TimeRemaining > 0)
            {
                liveSession.TimeRemaining--;
                await _db.SaveChangesAsync();
                
                await Clients.All.SendAsync("TimerUpdate", new
                {
                    remainingSeconds = liveSession.TimeRemaining,
                    timestamp = DateTime.UtcNow
                });
            }
        }
    }
}