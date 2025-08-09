using Microsoft.EntityFrameworkCore;

namespace GadpaDebateApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<FireEvent> FireEvents => Set<FireEvent>();
    public DbSet<BannedIp> BannedIps => Set<BannedIp>();
    public DbSet<User> Users => Set<User>();
    public DbSet<AppSetting> AppSettings => Set<AppSetting>();  // Added for registration control
}

public class BannedIp
{
    public int Id { get; set; }
    public string IpAddress { get; set; } = string.Empty;
}

public class FireEvent
{
    public int Id { get; set; }
    public string IpAddress { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    // FireCount stores total fires from this IP (we increment it)
    public int FireCount { get; set; } = 0;
}

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = "";
    // Store hashed password
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = "Admin";
}

public class AppSetting
{
    public int Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}