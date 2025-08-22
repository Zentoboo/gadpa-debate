using GadpaDebateApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace GadpaDebateApi.Services
{
    public class ScheduledDebateService : IHostedService, IDisposable
    {
        private readonly ILogger<ScheduledDebateService> _logger;
        private readonly IServiceScopeFactory _scopeFactory;
        private Timer? _timer = null;

        public ScheduledDebateService(ILogger<ScheduledDebateService> logger, IServiceScopeFactory scopeFactory)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Scheduled Debate Service is starting.");
            _timer = new Timer(DoWork, null, TimeSpan.Zero, TimeSpan.FromMinutes(1)); // Check every minute
            return Task.CompletedTask;
        }

        private async void DoWork(object? state)
        {
            _logger.LogInformation("Checking for scheduled debates to start.");
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            try
            {
                var now = DateTime.UtcNow;

                // Find debates that should start now and have existing LiveDebate entries that are previewable
                var debatesToActivate = await dbContext.LiveDebates
                    .Include(ld => ld.Debate)
                    .Where(ld => ld.IsPreviewable &&
                                 !ld.IsActive &&
                                 ld.Debate.ScheduledStartTime.HasValue &&
                                 ld.Debate.ScheduledStartTime.Value <= now)
                    .ToListAsync();

                foreach (var liveDebate in debatesToActivate)
                {
                    // Transition from previewable to active
                    liveDebate.IsPreviewable = false;
                    liveDebate.IsActive = true;
                    liveDebate.StartedAt = now; // Update the actual start time

                    _logger.LogInformation($"Auto-activating scheduled debate '{liveDebate.Debate.Title}' (ID: {liveDebate.Debate.Id}).");
                }

                // Handle standalone scheduled debates (not created via Go Live)
                var standaloneDebatesToStart = await dbContext.Debates
                    .Where(d => d.ScheduledStartTime.HasValue &&
                                d.ScheduledStartTime.Value <= now &&
                                !dbContext.LiveDebates.Any(ld => ld.DebateId == d.Id))
                    .ToListAsync();

                foreach (var debate in standaloneDebatesToStart)
                {
                    var liveDebate = new LiveDebate
                    {
                        DebateId = debate.Id,
                        Debate = debate,
                        CurrentRound = 1,
                        IsActive = true,
                        IsPreviewable = false,
                        StartedAt = now,
                        DebateManagerId = debate.CreatedByUserId
                    };
                    dbContext.LiveDebates.Add(liveDebate);
                    _logger.LogInformation($"Auto-starting standalone scheduled debate '{debate.Title}' (ID: {debate.Id}).");
                }

                if (debatesToActivate.Any() || standaloneDebatesToStart.Any())
                {
                    await dbContext.SaveChangesAsync();
                    _logger.LogInformation($"Processed {debatesToActivate.Count + standaloneDebatesToStart.Count} scheduled debates.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while running the scheduled debate task.");
            }
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Scheduled Debate Service is stopping.");
            _timer?.Change(Timeout.Infinite, 0);
            return Task.CompletedTask;
        }

        public void Dispose()
        {
            _timer?.Dispose();
        }
    }
}