using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using GadpaDebateApi.Data;

namespace GadpaDebateApi.Hubs;

public class DebateHub : Hub
{
    private readonly AppDbContext _db;
    private readonly ILogger<DebateHub> _logger;
    private static readonly Dictionary<int, HashSet<string>> _debateConnections = new();
    private static readonly object _lock = new object();

    public DebateHub(AppDbContext db, ILogger<DebateHub> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task SendFireReaction(int debateId)
    {
        try
        {
            // Find the live debate
            var liveDebate = await _db.LiveDebates
                .FirstOrDefaultAsync(ld => ld.DebateId == debateId && ld.IsActive);

            if (liveDebate == null)
            {
                await Clients.Caller.SendAsync("Error", "Debate is not currently live");
                return;
            }

            // Get client IP (simplified for SignalR)
            var ipAddress = Context.GetHttpContext()?.Connection.RemoteIpAddress?.ToString() ?? "unknown";

            // Check if IP is banned
            if (await _db.BannedIps.AnyAsync(b => b.IpAddress == ipAddress))
            {
                await Clients.Caller.SendAsync("Error", "You are banned from participating");
                return;
            }

            // Simple rate limiting check (could be enhanced with proper rate limiting)
            var recentFires = await _db.FireEvents
                .Where(f => f.IpAddress == ipAddress && 
                           f.Timestamp > DateTime.UtcNow.AddSeconds(-1))
                .CountAsync();

            if (recentFires > 0)
            {
                await Clients.Caller.SendAsync("Error", "Rate limited: Only 1 fire per second");
                return;
            }

            // Add fire event
            _db.FireEvents.Add(new FireEvent
            {
                IpAddress = ipAddress,
                FireCount = 1,
                Timestamp = DateTime.UtcNow,
                LiveDebateId = liveDebate.Id,
                LiveDebate = liveDebate
            });

            await _db.SaveChangesAsync();

            // Get total fires for this debate
            var totalFires = await _db.FireEvents
                .Where(f => f.LiveDebateId == liveDebate.Id)
                .SumAsync(f => f.FireCount);

            // Broadcast to all clients
            await Clients.All.SendAsync("FireReaction", new
            {
                debateId = debateId,
                totalFires = totalFires,
                timestamp = DateTime.UtcNow
            });

            _logger.LogInformation("Fire reaction added for debate {DebateId}, total: {TotalFires}", debateId, totalFires);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing fire reaction for debate {DebateId}", debateId);
            await Clients.Caller.SendAsync("Error", "Failed to process fire reaction");
        }
    }

    [Authorize(Roles = "DebateManager")]
    public async Task StartRound(int debateId, int roundNumber)
    {
        try
        {
            var userId = int.Parse(Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            var liveDebate = await _db.LiveDebates
                .Include(ld => ld.Debate)
                .ThenInclude(d => d.Questions)
                .FirstOrDefaultAsync(ld => ld.DebateId == debateId && 
                                          ld.DebateManagerId == userId && 
                                          ld.IsActive);

            if (liveDebate == null)
            {
                await Clients.Caller.SendAsync("Error", "Live debate not found or not authorized");
                return;
            }

            var question = liveDebate.Debate.Questions
                .FirstOrDefault(q => q.RoundNumber == roundNumber);

            if (question == null)
            {
                await Clients.Caller.SendAsync("Error", $"Round {roundNumber} not found");
                return;
            }

            // Update current round
            liveDebate.CurrentRound = roundNumber;
            await _db.SaveChangesAsync();

            // Broadcast round start
            await Clients.All.SendAsync("RoundStarted", new
            {
                debateId = debateId,
                roundNumber = roundNumber,
                question = question.Question,
                totalRounds = liveDebate.Debate.Questions.Count,
                timestamp = DateTime.UtcNow
            });

            _logger.LogInformation("Round {RoundNumber} started for debate {DebateId} by user {UserId}", 
                roundNumber, debateId, userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting round {RoundNumber} for debate {DebateId}", roundNumber, debateId);
            await Clients.Caller.SendAsync("Error", "Failed to start round");
        }
    }

    [Authorize(Roles = "DebateManager")]
    public async Task StopRound(int debateId)
    {
        try
        {
            var userId = int.Parse(Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            var liveDebate = await _db.LiveDebates
                .FirstOrDefaultAsync(ld => ld.DebateId == debateId && 
                                          ld.DebateManagerId == userId && 
                                          ld.IsActive);

            if (liveDebate == null)
            {
                await Clients.Caller.SendAsync("Error", "Live debate not found or not authorized");
                return;
            }

            // Broadcast round stop
            await Clients.All.SendAsync("RoundStopped", new
            {
                debateId = debateId,
                currentRound = liveDebate.CurrentRound,
                timestamp = DateTime.UtcNow
            });

            _logger.LogInformation("Round stopped for debate {DebateId} by user {UserId}", debateId, userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error stopping round for debate {DebateId}", debateId);
            await Clients.Caller.SendAsync("Error", "Failed to stop round");
        }
    }

    [Authorize(Roles = "DebateManager")]
    public async Task BroadcastQuestion(int debateId, int roundNumber, string questionText)
    {
        try
        {
            var userId = int.Parse(Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            var liveDebate = await _db.LiveDebates
                .FirstOrDefaultAsync(ld => ld.DebateId == debateId && 
                                          ld.DebateManagerId == userId && 
                                          ld.IsActive);

            if (liveDebate == null)
            {
                await Clients.Caller.SendAsync("Error", "Live debate not found or not authorized");
                return;
            }

            // Broadcast question
            await Clients.All.SendAsync("QuestionBroadcast", new
            {
                debateId = debateId,
                roundNumber = roundNumber,
                question = questionText,
                timestamp = DateTime.UtcNow
            });

            _logger.LogInformation("Question broadcast for debate {DebateId} round {RoundNumber} by user {UserId}", 
                debateId, roundNumber, userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error broadcasting question for debate {DebateId}", debateId);
            await Clients.Caller.SendAsync("Error", "Failed to broadcast question");
        }
    }

    [Authorize(Roles = "DebateManager")]
    public async Task NextQuestion(int debateId)
    {
        try
        {
            var userId = int.Parse(Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            var liveDebate = await _db.LiveDebates
                .Include(ld => ld.Debate)
                .ThenInclude(d => d.Questions.OrderBy(q => q.RoundNumber))
                .FirstOrDefaultAsync(ld => ld.DebateId == debateId && 
                                          ld.DebateManagerId == userId && 
                                          ld.IsActive);

            if (liveDebate == null)
            {
                await Clients.Caller.SendAsync("Error", "Live debate not found or not authorized");
                return;
            }

            var questions = liveDebate.Debate.Questions.ToList();
            var nextRound = liveDebate.CurrentRound + 1;

            if (nextRound > questions.Count)
            {
                await Clients.Caller.SendAsync("Error", "Already at the last question");
                return;
            }

            var nextQuestion = questions.FirstOrDefault(q => q.RoundNumber == nextRound);
            if (nextQuestion == null)
            {
                await Clients.Caller.SendAsync("Error", "Next question not found");
                return;
            }

            // Update current round
            liveDebate.CurrentRound = nextRound;
            await _db.SaveChangesAsync();

            // Broadcast next question
            await Clients.All.SendAsync("NextQuestion", new
            {
                debateId = debateId,
                roundNumber = nextRound,
                question = nextQuestion.Question,
                totalRounds = questions.Count,
                timestamp = DateTime.UtcNow
            });

            _logger.LogInformation("Advanced to next question (round {RoundNumber}) for debate {DebateId}", 
                nextRound, debateId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error advancing to next question for debate {DebateId}", debateId);
            await Clients.Caller.SendAsync("Error", "Failed to advance to next question");
        }
    }

    [Authorize(Roles = "DebateManager")]
    public async Task PreviousQuestion(int debateId)
    {
        try
        {
            var userId = int.Parse(Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            var liveDebate = await _db.LiveDebates
                .Include(ld => ld.Debate)
                .ThenInclude(d => d.Questions.OrderBy(q => q.RoundNumber))
                .FirstOrDefaultAsync(ld => ld.DebateId == debateId && 
                                          ld.DebateManagerId == userId && 
                                          ld.IsActive);

            if (liveDebate == null)
            {
                await Clients.Caller.SendAsync("Error", "Live debate not found or not authorized");
                return;
            }

            var prevRound = liveDebate.CurrentRound - 1;

            if (prevRound < 1)
            {
                await Clients.Caller.SendAsync("Error", "Already at the first question");
                return;
            }

            var prevQuestion = liveDebate.Debate.Questions
                .FirstOrDefault(q => q.RoundNumber == prevRound);

            if (prevQuestion == null)
            {
                await Clients.Caller.SendAsync("Error", "Previous question not found");
                return;
            }

            // Update current round
            liveDebate.CurrentRound = prevRound;
            await _db.SaveChangesAsync();

            // Broadcast previous question
            await Clients.All.SendAsync("PreviousQuestion", new
            {
                debateId = debateId,
                roundNumber = prevRound,
                question = prevQuestion.Question,
                totalRounds = liveDebate.Debate.Questions.Count,
                timestamp = DateTime.UtcNow
            });

            _logger.LogInformation("Returned to previous question (round {RoundNumber}) for debate {DebateId}", 
                prevRound, debateId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error returning to previous question for debate {DebateId}", debateId);
            await Clients.Caller.SendAsync("Error", "Failed to return to previous question");
        }
    }

    public async Task JoinDebateRoom(int debateId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"Debate-{debateId}");
        
        lock (_lock)
        {
            if (!_debateConnections.ContainsKey(debateId))
                _debateConnections[debateId] = new HashSet<string>();
            
            _debateConnections[debateId].Add(Context.ConnectionId);
        }

        var viewerCount = GetViewerCount(debateId);
        await Clients.Group($"Debate-{debateId}").SendAsync("ViewerCountUpdate", new
        {
            debateId = debateId,
            viewerCount = viewerCount,
            timestamp = DateTime.UtcNow
        });

        _logger.LogInformation("Client {ConnectionId} joined debate {DebateId}, viewers: {Count}", 
            Context.ConnectionId, debateId, viewerCount);
    }

    public async Task LeaveDebateRoom(int debateId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Debate-{debateId}");
        
        lock (_lock)
        {
            if (_debateConnections.ContainsKey(debateId))
            {
                _debateConnections[debateId].Remove(Context.ConnectionId);
                if (_debateConnections[debateId].Count == 0)
                    _debateConnections.Remove(debateId);
            }
        }

        var viewerCount = GetViewerCount(debateId);
        await Clients.Group($"Debate-{debateId}").SendAsync("ViewerCountUpdate", new
        {
            debateId = debateId,
            viewerCount = viewerCount,
            timestamp = DateTime.UtcNow
        });

        _logger.LogInformation("Client {ConnectionId} left debate {DebateId}, viewers: {Count}", 
            Context.ConnectionId, debateId, viewerCount);
    }

    public async Task GetViewerCount(int debateId)
    {
        var count = GetViewerCount(debateId);
        await Clients.Caller.SendAsync("ViewerCountUpdate", new
        {
            debateId = debateId,
            viewerCount = count,
            timestamp = DateTime.UtcNow
        });
    }

    private int GetViewerCount(int debateId)
    {
        lock (_lock)
        {
            return _debateConnections.ContainsKey(debateId) ? _debateConnections[debateId].Count : 0;
        }
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client disconnected: {ConnectionId}", Context.ConnectionId);
        
        // Remove from all debate rooms
        lock (_lock)
        {
            var debatesToUpdate = new List<int>();
            foreach (var kvp in _debateConnections)
            {
                if (kvp.Value.Remove(Context.ConnectionId))
                {
                    debatesToUpdate.Add(kvp.Key);
                    if (kvp.Value.Count == 0)
                        _debateConnections.Remove(kvp.Key);
                }
            }
            
            // Update viewer counts for affected debates
            foreach (var debateId in debatesToUpdate)
            {
                var viewerCount = GetViewerCount(debateId);
                _ = Task.Run(async () => 
                {
                    await Clients.Group($"Debate-{debateId}").SendAsync("ViewerCountUpdate", new
                    {
                        debateId = debateId,
                        viewerCount = viewerCount,
                        timestamp = DateTime.UtcNow
                    });
                });
            }
        }

        await base.OnDisconnectedAsync(exception);
    }
}