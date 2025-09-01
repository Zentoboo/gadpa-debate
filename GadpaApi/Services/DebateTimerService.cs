using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using GadpaDebateApi.Data;
using GadpaDebateApi.Hubs;

namespace GadpaDebateApi.Services;

public class DebateTimerService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<DebateTimerService> _logger;
    private readonly IHubContext<DebateHub> _hubContext;
    private Timer? _timer;

    public DebateTimerService(
        IServiceProvider serviceProvider,
        ILogger<DebateTimerService> logger,
        IHubContext<DebateHub> hubContext)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _hubContext = hubContext;
    }

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _timer = new Timer(
            async _ => await UpdateDebateTimer(),
            null,
            TimeSpan.Zero,
            TimeSpan.FromSeconds(1)
        );

        return Task.CompletedTask;
    }

    private async Task UpdateDebateTimer()
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            // Get all active live debates
            var liveDebates = await db.LiveDebates
                .Where(ld => ld.IsActive)
                .Include(ld => ld.Debate)
                .ThenInclude(d => d.Questions.OrderBy(q => q.RoundNumber))
                .ToListAsync();

            foreach (var liveDebate in liveDebates)
            {
                await ProcessLiveDebate(db, liveDebate);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating debate timer");
        }
    }

    private async Task ProcessLiveDebate(AppDbContext db, LiveDebate liveDebate)
    {
        try
        {
            // Check if debate is scheduled and should become active
            if (liveDebate.IsPreviewable && 
                liveDebate.Debate.ScheduledStartTime.HasValue &&
                DateTime.UtcNow >= liveDebate.Debate.ScheduledStartTime.Value)
            {
                // Activate the debate
                liveDebate.IsActive = true;
                liveDebate.IsPreviewable = false;
                await db.SaveChangesAsync();

                // Broadcast that debate has started
                await _hubContext.Clients.All.SendAsync("DebateStarted", new
                {
                    debateId = liveDebate.DebateId,
                    title = liveDebate.Debate.Title,
                    currentRound = liveDebate.CurrentRound,
                    totalRounds = liveDebate.Debate.Questions.Count
                });

                _logger.LogInformation("Debate {DebateId} has started automatically", liveDebate.DebateId);
            }

            // Broadcast regular timer update for active debates
            if (liveDebate.IsActive)
            {
                var currentQuestion = liveDebate.Debate.Questions
                    .FirstOrDefault(q => q.RoundNumber == liveDebate.CurrentRound);

                await _hubContext.Clients.All.SendAsync("TimerUpdate", new
                {
                    debateId = liveDebate.DebateId,
                    currentRound = liveDebate.CurrentRound,
                    totalRounds = liveDebate.Debate.Questions.Count,
                    currentQuestion = currentQuestion?.Question,
                    timestamp = DateTime.UtcNow
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing live debate {DebateId}", liveDebate.DebateId);
        }
    }

    public override void Dispose()
    {
        _timer?.Dispose();
        base.Dispose();
    }
}