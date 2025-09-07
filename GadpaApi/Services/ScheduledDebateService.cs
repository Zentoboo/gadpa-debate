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
        private readonly SemaphoreSlim _semaphore = new SemaphoreSlim(1, 1);

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
            // Prevent multiple instances from running simultaneously
            if (!await _semaphore.WaitAsync(100))
            {
                _logger.LogDebug("Skipping scheduled debate check - previous check still running");
                return;
            }

            try
            {
                _logger.LogDebug("Checking for scheduled debates to start.");
                using var scope = _scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var now = DateTime.UtcNow;
                int processedCount = 0;

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
                    processedCount++;
                }

                // Handle standalone scheduled debates (not created via Go Live)
                // Use a more robust query to prevent race conditions
                var standaloneDebatesToStart = await dbContext.Database
                    .SqlQueryRaw<int>(@"
                        SELECT d.Id 
                        FROM Debates d 
                        WHERE d.ScheduledStartTime IS NOT NULL 
                        AND d.ScheduledStartTime <= {0}
                        AND NOT EXISTS (
                            SELECT 1 FROM LiveDebates ld 
                            WHERE ld.DebateId = d.Id
                        )", now)
                    .ToListAsync();

                foreach (var debateId in standaloneDebatesToStart)
                {
                    // Double-check that no LiveDebate was created since our query
                    var existingLive = await dbContext.LiveDebates
                        .AnyAsync(ld => ld.DebateId == debateId);

                    if (existingLive)
                    {
                        _logger.LogDebug($"Skipping debate {debateId} - LiveDebate already exists");
                        continue;
                    }

                    var debate = await dbContext.Debates
                        .FirstOrDefaultAsync(d => d.Id == debateId);

                    if (debate == null) continue;

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
                    processedCount++;
                }

                if (processedCount > 0)
                {
                    await dbContext.SaveChangesAsync();
                    _logger.LogInformation($"Processed {processedCount} scheduled debates.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while running the scheduled debate task.");
            }
            finally
            {
                _semaphore.Release();
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
            _semaphore?.Dispose();
        }
    }
}