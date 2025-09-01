using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using GadpaDebateApi.Data;
using GadpaDebateApi.Hubs;

namespace GadpaDebateApi.Services;

public class DebateTimerService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IHubContext<DebateHub> _hubContext;
    private readonly ILogger<DebateTimerService> _logger;
    private Timer? _timer;
    private Timer? _statsTimer;

    public DebateTimerService(
        IServiceProvider serviceProvider,
        IHubContext<DebateHub> hubContext,
        ILogger<DebateTimerService> logger)
    {
        _serviceProvider = serviceProvider;
        _hubContext = hubContext;
        _logger = logger;
    }

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Timer for countdown updates (every second)
        _timer = new Timer(async _ => await UpdateDebateTimer(), null, TimeSpan.Zero, TimeSpan.FromSeconds(1));
        
        // Timer for live stats broadcast (every 5 seconds)
        _statsTimer = new Timer(async _ => await BroadcastLiveStats(), null, TimeSpan.Zero, TimeSpan.FromSeconds(5));
        
        return Task.CompletedTask;
    }

    private async Task UpdateDebateTimer()
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            
            var liveSession = await db.LiveSessions
                .Include(l => l.CurrentQuestion)
                .FirstOrDefaultAsync(l => l.IsLive && l.Status == "Live");
            
            if (liveSession != null && liveSession.TimeRemaining > 0)
            {
                liveSession.TimeRemaining--;
                await db.SaveChangesAsync();
                
                // Broadcast timer update to all clients
                await _hubContext.Clients.All.SendAsync("TimerUpdate", new
                {
                    remainingSeconds = liveSession.TimeRemaining,
                    currentQuestion = liveSession.CurrentQuestion?.Question,
                    timestamp = DateTime.UtcNow
                });
                
                // Auto-advance to next question when timer reaches 0
                if (liveSession.TimeRemaining == 0)
                {
                    await AutoAdvanceQuestion(db, liveSession);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating debate timer");
        }
    }
    
    private async Task AutoAdvanceQuestion(AppDbContext db, LiveSession liveSession)
    {
        try
        {
            var session = await db.DebateSessions
                .Include(s => s.Questions.OrderBy(q => q.OrderIndex))
                .FirstOrDefaultAsync(s => s.Id == liveSession.DebateSessionId);
            
            if (session == null) return;
            
            var questions = session.Questions.ToList();
            var currentIndex = questions.FindIndex(q => q.Id == liveSession.CurrentQuestionId);
            
            if (currentIndex < questions.Count - 1)
            {
                // Move to next question
                var nextQuestion = questions[currentIndex + 1];
                liveSession.CurrentQuestionId = nextQuestion.Id;
                liveSession.CurrentQuestion = nextQuestion;
                liveSession.TimeRemaining = nextQuestion.DurationMinutes * 60;
                
                await db.SaveChangesAsync();
                
                await _hubContext.Clients.All.SendAsync("AutoAdvancedToNextQuestion", new
                {
                    question = nextQuestion.Question,
                    duration = nextQuestion.DurationMinutes,
                    questionType = nextQuestion.QuestionType,
                    index = currentIndex + 2,
                    total = questions.Count,
                    timestamp = DateTime.UtcNow
                });
            }
            else
            {
                // End the session if no more questions
                liveSession.IsLive = false;
                liveSession.Status = "Ended";
                liveSession.EndedAt = DateTime.UtcNow;
                session.Status = "Completed";
                
                await db.SaveChangesAsync();
                
                await _hubContext.Clients.All.SendAsync("SessionAutoEnded", new
                {
                    reason = "All questions completed",
                    timestamp = DateTime.UtcNow
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error auto-advancing question");
        }
    }
    
    private async Task BroadcastLiveStats()
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            
            var liveSession = await db.LiveSessions
                .Include(l => l.DebateSession)
                .Include(l => l.CurrentQuestion)
                .FirstOrDefaultAsync(l => l.IsLive);
            
            if (liveSession != null)
            {
                // Get viewer count from SignalR (this would need to be tracked separately)
                // For now, we'll broadcast the session status
                await _hubContext.Clients.All.SendAsync("LiveStatusUpdate", new
                {
                    isLive = true,
                    sessionTitle = liveSession.DebateSession?.Title,
                    currentQuestion = liveSession.CurrentQuestion?.Question,
                    timeRemaining = liveSession.TimeRemaining,
                    status = liveSession.Status,
                    timestamp = DateTime.UtcNow
                });
            }
            else
            {
                await _hubContext.Clients.All.SendAsync("LiveStatusUpdate", new
                {
                    isLive = false,
                    timestamp = DateTime.UtcNow
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error broadcasting live stats");
        }
    }

    public override void Dispose()
    {
        _timer?.Dispose();
        _statsTimer?.Dispose();
        base.Dispose();
    }
}