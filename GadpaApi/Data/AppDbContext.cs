using Microsoft.EntityFrameworkCore;
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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
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
    
    // User question submission settings
    public bool AllowUserQuestions { get; set; } = false;
    public int MaxQuestionsPerUser { get; set; } = 3;
    public bool AllowQuestionsWhenLive { get; set; } = false; // If true, allows during live; if false, only when not live

    public List<DebateQuestion> Questions { get; set; } = new();
    public List<UserSubmittedQuestion> UserSubmittedQuestions { get; set; } = new();
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
    public bool IsUsed { get; set; } = false; // Track if question has been added to debate rounds

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

    [ForeignKey("DebateId")]
    public required Debate Debate { get; set; }
}