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

            // Only do expensive live debate updates if there are active viewers
            if (hasViewers)
            {
                using var scope = _serviceProvider.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var liveDebates = await db.LiveDebates
                    .Where(ld => ld.IsActive)
                    .Include(ld => ld.Debate)
                    .ThenInclude(d => d.Questions.OrderBy(q => q.RoundNumber))
                    .ToListAsync();

                foreach (var liveDebate in liveDebates)
                {
                    await ProcessLiveDebate(liveDebate);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating debate timer");
        }
    }

    private async Task ProcessLiveDebate(LiveDebate liveDebate)
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