using Microsoft.EntityFrameworkCore;
using GadpaDebateApi.Data;
using System.Security.Cryptography;

namespace GadpaDebateApi.Services;

public class DebateSessionService
{
    private readonly AppDbContext _db;
    private readonly ILogger<DebateSessionService> _logger;

    public DebateSessionService(AppDbContext db, ILogger<DebateSessionService> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Creates a new session for a user who has provided the correct password for a debate
    /// </summary>
    public async Task<DebateAccessResponse> CreateSessionAsync(int debateId, string ipAddress, string providedPassword)
    {
        try
        {
            var debate = await _db.Debates.FirstOrDefaultAsync(d => d.Id == debateId);
            if (debate == null)
            {
                return new DebateAccessResponse(false, "Debate not found");
            }

            // Check if password is required
            if (!debate.RequirePassword)
            {
                return new DebateAccessResponse(true, "No password required");
            }

            // Validate password
            if (string.IsNullOrEmpty(debate.AccessPassword) || debate.AccessPassword != providedPassword)
            {
                return new DebateAccessResponse(false, "Invalid password");
            }

            // Clean up expired sessions for this IP and debate (optional cleanup)
            await CleanupExpiredSessionsAsync(debateId, ipAddress);

            // Check if user already has an active session
            var existingSession = await _db.DebateSessions
                .FirstOrDefaultAsync(ds => ds.DebateId == debateId &&
                                         ds.IpAddress == ipAddress &&
                                         ds.IsActive &&
                                         ds.ExpiresAt > DateTime.UtcNow);

            if (existingSession != null)
            {
                // Extend existing session
                existingSession.ExpiresAt = DateTime.UtcNow.AddHours(24);
                await _db.SaveChangesAsync();

                return new DebateAccessResponse(true, "Session extended", existingSession.SessionToken, 24);
            }

            // Create new session
            var sessionToken = GenerateSessionToken();
            var newSession = new DebateSession
            {
                DebateId = debateId,
                SessionToken = sessionToken,
                IpAddress = ipAddress,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddHours(24),
                IsActive = true,
                Debate = debate
            };

            _db.DebateSessions.Add(newSession);
            await _db.SaveChangesAsync();

            return new DebateAccessResponse(true, "Access granted", sessionToken, 24);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating debate session for debate {DebateId}", debateId);
            return new DebateAccessResponse(false, "An error occurred while creating session");
        }
    }

    /// <summary>
    /// Validates a session token for a specific debate
    /// </summary>
    public async Task<SessionValidationResult> ValidateSessionAsync(int debateId, string sessionToken, string ipAddress)
    {
        try
        {
            if (string.IsNullOrEmpty(sessionToken))
            {
                return new SessionValidationResult(false, null, "No session token provided");
            }

            var session = await _db.DebateSessions
                .Include(ds => ds.Debate)
                .FirstOrDefaultAsync(ds => ds.SessionToken == sessionToken &&
                                         ds.DebateId == debateId &&
                                         ds.IpAddress == ipAddress &&
                                         ds.IsActive);

            if (session == null)
            {
                return new SessionValidationResult(false, null, "Invalid session");
            }

            if (session.ExpiresAt <= DateTime.UtcNow)
            {
                // Deactivate expired session
                session.IsActive = false;
                await _db.SaveChangesAsync();
                return new SessionValidationResult(false, null, "Session expired");
            }

            // Check if the debate still requires password
            if (!session.Debate.RequirePassword)
            {
                // If debate no longer requires password, session is still valid
                return new SessionValidationResult(true, debateId);
            }

            return new SessionValidationResult(true, debateId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating session for debate {DebateId}", debateId);
            return new SessionValidationResult(false, null, "Error validating session");
        }
    }

    /// <summary>
    /// Checks if a debate requires password authentication
    /// </summary>
    public async Task<bool> DoesDebateRequirePasswordAsync(int debateId)
    {
        var debate = await _db.Debates.FirstOrDefaultAsync(d => d.Id == debateId);
        return debate?.RequirePassword ?? false;
    }

    /// <summary>
    /// Clean up expired sessions for database maintenance
    /// </summary>
    public async Task CleanupExpiredSessionsAsync(int? debateId = null, string? ipAddress = null)
    {
        var query = _db.DebateSessions.Where(ds => ds.ExpiresAt <= DateTime.UtcNow || !ds.IsActive);

        if (debateId.HasValue)
        {
            query = query.Where(ds => ds.DebateId == debateId.Value);
        }

        if (!string.IsNullOrEmpty(ipAddress))
        {
            query = query.Where(ds => ds.IpAddress == ipAddress);
        }

        var expiredSessions = await query.ToListAsync();
        if (expiredSessions.Any())
        {
            _db.DebateSessions.RemoveRange(expiredSessions);
            await _db.SaveChangesAsync();
            _logger.LogInformation("Cleaned up {Count} expired sessions", expiredSessions.Count);
        }
    }

    /// <summary>
    /// Deactivate a session (logout)
    /// </summary>
    public async Task<bool> DeactivateSessionAsync(string sessionToken, string ipAddress)
    {
        try
        {
            var session = await _db.DebateSessions
                .FirstOrDefaultAsync(ds => ds.SessionToken == sessionToken && ds.IpAddress == ipAddress);

            if (session != null)
            {
                session.IsActive = false;
                await _db.SaveChangesAsync();
                return true;
            }
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deactivating session");
            return false;
        }
    }

    /// <summary>
    /// Generate a secure session token
    /// </summary>
    private static string GenerateSessionToken()
    {
        using var rng = RandomNumberGenerator.Create();
        var bytes = new byte[32]; // 256 bits
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").Replace("=", "");
    }
}