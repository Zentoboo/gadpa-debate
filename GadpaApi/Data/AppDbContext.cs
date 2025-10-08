using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using System.ComponentModel.DataAnnotations.Schema;

namespace GadpaDebateApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<FireEvent> FireEvents => Set<FireEvent>();
    public DbSet<BannedIp> BannedIps => Set<BannedIp>();
    public DbSet<User> Users => Set<User>();
    public DbSet<AppSetting> AppSettings => Set<AppSetting>();
    public DbSet<Debate> Debates => Set<Debate>();
    public DbSet<DebateQuestion> DebateQuestions => Set<DebateQuestion>();
    public DbSet<LiveDebate> LiveDebates => Set<LiveDebate>();
    public DbSet<UserSubmittedQuestion> UserSubmittedQuestions => Set<UserSubmittedQuestion>();
    public DbSet<Candidate> Candidates => Set<Candidate>();
    public DbSet<DebateSession> DebateSessions => Set<DebateSession>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Global UTC enforcement for all DateTime properties
        var dateTimeConverter = new ValueConverter<DateTime, DateTime>(
            v => v.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v, DateTimeKind.Utc),
            v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        var nullableDateTimeConverter = new ValueConverter<DateTime?, DateTime?>(
            v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v,
            v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(DateTime))
                {
                    property.SetValueConverter(dateTimeConverter);
                }
                else if (property.ClrType == typeof(DateTime?))
                {
                    property.SetValueConverter(nullableDateTimeConverter);
                }
            }
        }

        // Debate -> DebateQuestions relationship
        modelBuilder.Entity<DebateQuestion>()
            .HasOne<Debate>()
            .WithMany(d => d.Questions)
            .HasForeignKey(q => q.DebateId)
            .OnDelete(DeleteBehavior.Cascade);

        // LiveDebate -> Debate relationship
        modelBuilder.Entity<LiveDebate>()
            .HasOne<Debate>(ld => ld.Debate)
            .WithMany()
            .HasForeignKey(ld => ld.DebateId)
            .OnDelete(DeleteBehavior.Cascade);

        // LiveDebate -> User relationship
        modelBuilder.Entity<LiveDebate>()
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(ld => ld.DebateManagerId)
            .OnDelete(DeleteBehavior.Restrict);

        // FireEvent -> LiveDebate relationship
        modelBuilder.Entity<FireEvent>()
            .HasOne<LiveDebate>(fe => fe.LiveDebate)
            .WithMany()
            .HasForeignKey(fe => fe.LiveDebateId)
            .OnDelete(DeleteBehavior.Cascade);

        // UserSubmittedQuestion -> Debate relationship
        modelBuilder.Entity<UserSubmittedQuestion>()
            .HasOne<Debate>(usq => usq.Debate)
            .WithMany(d => d.UserSubmittedQuestions)
            .HasForeignKey(usq => usq.DebateId)
            .OnDelete(DeleteBehavior.Cascade);

        // Add relationship for Debate to Candidate
        modelBuilder.Entity<Debate>()
            .HasMany(d => d.Candidates)
            .WithOne(c => c.Debate)
            .HasForeignKey(c => c.DebateId)
            .OnDelete(DeleteBehavior.Cascade);

        // DebateSession -> Debate relationship
        modelBuilder.Entity<DebateSession>()
            .HasOne<Debate>(ds => ds.Debate)
            .WithMany()
            .HasForeignKey(ds => ds.DebateId)
            .OnDelete(DeleteBehavior.Cascade);

        // Create index on DebateSession for better performance
        modelBuilder.Entity<DebateSession>()
            .HasIndex(ds => ds.SessionToken)
            .IsUnique();

        modelBuilder.Entity<DebateSession>()
            .HasIndex(ds => ds.ExpiresAt);

        base.OnModelCreating(modelBuilder);
    }
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
    public int FireCount { get; set; } = 0;
    public int LiveDebateId { get; set; }

    [ForeignKey("LiveDebateId")]
    public required LiveDebate LiveDebate { get; set; }
}

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = "";
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

public class Debate
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ScheduledStartTime { get; set; }
    public string? AccessPassword { get; set; }
    public bool RequirePassword { get; set; } = false;
    public bool AllowUserQuestions { get; set; } = false;
    public int MaxQuestionsPerUser { get; set; } = 3;
    public List<DebateQuestion> Questions { get; set; } = new();
    public List<UserSubmittedQuestion> UserSubmittedQuestions { get; set; } = new();
    public List<Candidate> Candidates { get; set; } = new();
}

public class DebateQuestion
{
    public int Id { get; set; }
    public int DebateId { get; set; }
    public int RoundNumber { get; set; }
    public string Question { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class UserSubmittedQuestion
{
    public int Id { get; set; }
    public int DebateId { get; set; }
    public string Question { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public bool IsApproved { get; set; } = false;

    [ForeignKey("DebateId")]
    public required Debate Debate { get; set; }
}

public class LiveDebate
{
    public int Id { get; set; }
    public int DebateId { get; set; }
    public int DebateManagerId { get; set; }
    public int CurrentRound { get; set; } = 1;
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
    public bool IsPreviewable { get; set; } = false;

    [ForeignKey("DebateId")]
    public required Debate Debate { get; set; }
}

public class Candidate
{
    public int Id { get; set; }
    public int DebateId { get; set; }
    public int CandidateNumber { get; set; }
    public string Name { get; set; } = string.Empty;
    // Changed: Store base64 image data instead of URL
    public string? ImageData { get; set; } = null;
    public int VoteCount { get; set; } = 0;

    [ForeignKey("DebateId")]
    public required Debate Debate { get; set; }
}

public class DebateSession
{
    public int Id { get; set; }
    public int DebateId { get; set; }
    public string SessionToken { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddHours(4);
    public bool IsActive { get; set; } = true;

    [ForeignKey("DebateId")]
    public required Debate Debate { get; set; }
}