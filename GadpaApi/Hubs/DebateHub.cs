using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace GadpaDebateApi.Hubs;

public class DebateHub : Hub
{
    // Track connected users
    private static readonly ConcurrentDictionary<string, string> ConnectedUsers = new();
    private static int ViewerCount = 0;

    public override async Task OnConnectedAsync()
    {
        Interlocked.Increment(ref ViewerCount);
        ConnectedUsers[Context.ConnectionId] = Context.ConnectionId;
        
        // Notify all clients of new viewer count
        await Clients.All.SendAsync("ViewerCountChanged", ViewerCount);
        
        // Send current debate status to the new connection
        await Clients.Caller.SendAsync("Connected", new { 
            viewerCount = ViewerCount,
            connectionId = Context.ConnectionId 
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

    // Send fire reaction to all connected clients
    public async Task SendFireReaction(string userName, int x, int y)
    {
        await Clients.Others.SendAsync("ReceiveFireReaction", new
        {
            userName = userName ?? "Anonymous",
            x,
            y,
            timestamp = DateTime.UtcNow
        });
    }

    // Broadcast debate status changes
    public async Task BroadcastDebateStatus(bool isLive, string? sessionName, string? currentQuestion, int? timeRemaining)
    {
        await Clients.All.SendAsync("DebateStatusChanged", new
        {
            isLive,
            sessionName,
            currentQuestion,
            timeRemaining,
            timestamp = DateTime.UtcNow
        });
    }

    // Send question change notification
    public async Task NotifyQuestionChange(string question, int duration)
    {
        await Clients.All.SendAsync("QuestionChanged", new
        {
            question,
            duration,
            startTime = DateTime.UtcNow
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

    // Get current viewer count
    public async Task GetViewerCount()
    {
        await Clients.Caller.SendAsync("ViewerCountChanged", ViewerCount);
    }
}