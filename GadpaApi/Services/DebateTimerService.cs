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
    private bool _hasActiveViewers = false;
    private readonly object _viewerLock = new object();

    public DebateTimerService(
        IServiceProvider serviceProvider,
        ILogger<DebateTimerService> logger,
        IHubContext<DebateHub> hubContext)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _hubContext = hubContext;
    }

    public void NotifyViewersChanged(bool hasViewers)
    {
        lock (_viewerLock)
        {
            if (_hasActiveViewers != hasViewers)
            {
                _hasActiveViewers = hasViewers;
                if (hasViewers)
                {
                    _logger.LogInformation("Active viewers detected, resuming timer updates");
                }
                else
                {
                    _logger.LogInformation("No active viewers, timer will skip updates");
                }
            }
        }
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
            // Check if we need to query database at all
            bool hasViewers;
            lock (_viewerLock)
            {
                hasViewers = _hasActiveViewers;
            }

            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            // Always check for scheduled debates that need activation (low cost query with index)
            var scheduledDebates = await db.Debates
                .Where(d => d.ScheduledStartTime.HasValue && 
                           d.ScheduledStartTime <= DateTime.UtcNow)
                .Where(d => !db.LiveDebates.Any(ld => ld.DebateId == d.Id && ld.IsActive))
                .Take(5) // Limit to prevent runaway queries
                .ToListAsync();

            foreach (var debate in scheduledDebates)
            {
                await ActivateScheduledDebate(db, debate);
            }

            // Only do expensive live debate updates if there are active viewers
            if (hasViewers)
            {
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
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating debate timer");
        }
    }

    private async Task ActivateScheduledDebate(AppDbContext db, Debate debate)
    {
        try
        {
            // Create new live debate for scheduled debate
            var liveDebate = new LiveDebate
            {
                DebateId = debate.Id,
                DebateManagerId = debate.CreatedByUserId, // Use creator as initial manager
                CurrentRound = 1,
                StartedAt = DateTime.UtcNow,
                IsActive = true,
                IsPreviewable = false,
                Debate = debate // Set required navigation property
            };

            db.LiveDebates.Add(liveDebate);
            await db.SaveChangesAsync();

            // Broadcast that debate has started
            await _hubContext.Clients.All.SendAsync("DebateStarted", new
            {
                debateId = debate.Id,
                title = debate.Title,
                currentRound = 1,
                totalRounds = await db.DebateQuestions.Where(q => q.DebateId == debate.Id).CountAsync()
            });

            _logger.LogInformation("Scheduled debate {DebateId} activated automatically", debate.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error activating scheduled debate {DebateId}", debate.Id);
        }
    }

    private async Task ProcessLiveDebate(AppDbContext db, LiveDebate liveDebate)
    {
        try
        {
            // Only broadcast timer updates for active debates (viewer optimization)
            var currentQuestion = liveDebate.Debate.Questions
                .FirstOrDefault(q => q.RoundNumber == liveDebate.CurrentRound);

            await _hubContext.Clients.Group($"Debate-{liveDebate.DebateId}").SendAsync("TimerUpdate", new
            {
                debateId = liveDebate.DebateId,
                currentRound = liveDebate.CurrentRound,
                totalRounds = liveDebate.Debate.Questions.Count,
                currentQuestion = currentQuestion?.Question,
                timestamp = DateTime.UtcNow
            });
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