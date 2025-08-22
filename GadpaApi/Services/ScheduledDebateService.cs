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
                var debatesToStart = await dbContext.Debates
                    .Where(d => d.ScheduledStartTime.HasValue &&
                                d.ScheduledStartTime.Value <= DateTime.UtcNow)
                    .ToListAsync();

                foreach (var debate in debatesToStart)
                {
                    // Check if this debate is already live to prevent duplicates
                    var isAlreadyLive = await dbContext.LiveDebates
                        .AnyAsync(ld => ld.DebateId == debate.Id);

                    if (!isAlreadyLive)
                    {
                        var liveDebate = new LiveDebate
                        {
                            DebateId = debate.Id,
                            Debate = debate,
                            CurrentRound = 1,
                            IsActive = true,
                            StartedAt = DateTime.UtcNow
                        };
                        dbContext.LiveDebates.Add(liveDebate);
                        _logger.LogInformation($"Auto-starting debate '{debate.Title}' (ID: {debate.Id}).");
                    }
                    else
                    {
                        // Set the scheduled time to null so it isn't picked up again
                        debate.ScheduledStartTime = null;
                        dbContext.Debates.Update(debate);
                    }
                }
                await dbContext.SaveChangesAsync();
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