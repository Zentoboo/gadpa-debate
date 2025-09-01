using Microsoft.Extensions.Caching.Memory;

namespace GadpaDebateApi.Middleware;

public record AuthRateLimitEntry(int Count, DateTime WindowStart, bool IsBanned, DateTime? BanExpiry);

public class AuthRateLimitMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IMemoryCache _cache;
    private readonly ILogger<AuthRateLimitMiddleware> _logger;

    // Configurable limits
    private const int LOGIN_LIMIT_PER_WINDOW = 5;
    private const int REGISTER_LIMIT_PER_WINDOW = 3;
    private readonly TimeSpan WINDOW = TimeSpan.FromMinutes(15);
    private readonly TimeSpan BAN_DURATION = TimeSpan.FromHours(1);

    public AuthRateLimitMiddleware(RequestDelegate next, IMemoryCache cache, ILogger<AuthRateLimitMiddleware> logger)
    {
        _next = next;
        _cache = cache;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Only apply to auth endpoints
        var path = context.Request.Path.Value?.ToLower();
        if (!IsAuthEndpoint(path))
        {
            await _next(context);
            return;
        }

        var ip = GetClientIp(context);
        var limit = GetLimitForEndpoint(path);

        if (!await CheckRateLimit(context, ip, path, limit))
        {
            return; // Rate limit exceeded, response already set
        }

        await _next(context);
    }

    private bool IsAuthEndpoint(string? path)
    {
        return path != null && (
            path.Equals("/admin/login", StringComparison.OrdinalIgnoreCase) ||
            path.Equals("/admin/register", StringComparison.OrdinalIgnoreCase)
        );
    }

    private int GetLimitForEndpoint(string? path)
    {
        return path?.Contains("login") == true ? LOGIN_LIMIT_PER_WINDOW : REGISTER_LIMIT_PER_WINDOW;
    }

    private async Task<bool> CheckRateLimit(HttpContext context, string ip, string? path, int limit)
    {
        var key = $"auth:rl:{ip}:{path}";
        var now = DateTime.UtcNow;

        if (!_cache.TryGetValue<AuthRateLimitEntry>(key, out var entry) || entry == null)
        {
            // First request
            entry = new AuthRateLimitEntry(1, now, false, null);
            _cache.Set(key, entry, WINDOW);
            return true;
        }

        // Check if currently banned
        if (entry.IsBanned && entry.BanExpiry.HasValue && now < entry.BanExpiry)
        {
            var remainingBan = (int)Math.Ceiling((entry.BanExpiry.Value - now).TotalSeconds);
            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.Headers["Retry-After"] = remainingBan.ToString();

            await context.Response.WriteAsJsonAsync(new
            {
                message = "IP temporarily banned due to excessive requests.",
                retryAfterSeconds = remainingBan,
                banned = true
            });

            _logger.LogWarning("Banned IP {IP} attempted access to {Path}", ip, path);
            return false;
        }

        // Check if window has expired
        if (now - entry.WindowStart >= WINDOW)
        {
            // Reset window
            entry = new AuthRateLimitEntry(1, now, false, null);
            _cache.Set(key, entry, WINDOW);
            return true;
        }

        // Check rate limit
        if (entry.Count >= limit)
        {
            // Ban the IP for repeated abuse
            var banExpiry = now.Add(BAN_DURATION);
            entry = entry with { IsBanned = true, BanExpiry = banExpiry };
            _cache.Set(key, entry, BAN_DURATION);

            var retryAfter = (int)Math.Ceiling(BAN_DURATION.TotalSeconds);
            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.Headers["Retry-After"] = retryAfter.ToString();

            await context.Response.WriteAsJsonAsync(new
            {
                message = "Too many attempts. IP has been temporarily banned.",
                retryAfterSeconds = retryAfter,
                banned = true
            });

            _logger.LogWarning("IP {IP} banned for {Duration} minutes due to excessive requests to {Path}",
                ip, BAN_DURATION.TotalMinutes, path);
            return false;
        }

        // Increment count
        entry = entry with { Count = entry.Count + 1 };
        _cache.Set(key, entry, entry.WindowStart.Add(WINDOW) - now);
        return true;
    }

    private string GetClientIp(HttpContext context)
    {
        if (context.Request.Headers.TryGetValue("X-Forwarded-For", out var xff) && !string.IsNullOrWhiteSpace(xff))
        {
            var first = xff.ToString().Split(',').First().Trim();
            if (!string.IsNullOrWhiteSpace(first)) return first;
        }

        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}

// Extension method for easy registration
public static class AuthRateLimitMiddlewareExtensions
{
    public static IApplicationBuilder UseAuthRateLimit(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<AuthRateLimitMiddleware>();
    }
}