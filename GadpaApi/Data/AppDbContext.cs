using Microsoft.EntityFrameworkCore;

namespace GadpaDebateApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<FireEvent> FireEvents => Set<FireEvent>();
    public DbSet<BannedIp> BannedIps => Set<BannedIp>();
    public DbSet<User> Users => Set<User>();
    public DbSet<AppSetting> AppSettings => Set<AppSetting>();
    
    // Kongres PPI Models
    public DbSet<BpuMember> BpuMembers => Set<BpuMember>();
    public DbSet<BpuTask> BpuTasks => Set<BpuTask>();
    public DbSet<Candidate> Candidates => Set<Candidate>();
    public DbSet<Voter> Voters => Set<Voter>();
    public DbSet<Vote> Votes => Set<Vote>();
    public DbSet<CampaignMonitor> CampaignMonitors => Set<CampaignMonitor>();
    public DbSet<ShiftRecord> ShiftRecords => Set<ShiftRecord>();
    
    // Debate Session Models
    public DbSet<DebateSession> DebateSessions => Set<DebateSession>();
    public DbSet<DebateQuestion> DebateQuestions => Set<DebateQuestion>();
    public DbSet<LiveSession> LiveSessions => Set<LiveSession>();
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

// Kongres PPI Models
public class BpuMember
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty; // Ketua, Wakil Ketua, Sekretaris, etc.
    public DateTime OathDate { get; set; }
    public bool IsActive { get; set; } = true;
    public string? ContactInfo { get; set; }
}

public class BpuTask
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty; // Persiapan, Pelaksanaan, etc.
    public string Status { get; set; } = "Pending"; // Pending, InProgress, Completed
    public int? AssignedToBpuMemberId { get; set; }
    public BpuMember? AssignedToBpuMember { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public string Priority { get; set; } = "Medium"; // High, Medium, Low
}

public class Candidate
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty; // President, Vice President
    public string? VisionMission { get; set; }
    public DateTime RegistrationDate { get; set; } = DateTime.UtcNow;
    public bool IsApproved { get; set; } = false;
    public int TicketNumber { get; set; } // 01, 02, etc.
}

public class Voter
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateTime RegistrationDate { get; set; } = DateTime.UtcNow;
    public bool IsEligible { get; set; } = true;
    public bool HasVoted { get; set; } = false;
    public DateTime? VotedAt { get; set; }
}

public class Vote
{
    public int Id { get; set; }
    public int VoterId { get; set; }
    public Voter Voter { get; set; } = null!;
    public int CandidateId { get; set; }
    public Candidate Candidate { get; set; } = null!;
    public DateTime VotedAt { get; set; } = DateTime.UtcNow;
    public string IpAddress { get; set; } = string.Empty;
}

public class CampaignMonitor
{
    public int Id { get; set; }
    public int BpuMemberId { get; set; }
    public BpuMember BpuMember { get; set; } = null!;
    public string Location { get; set; } = string.Empty;
    public DateTime ShiftStart { get; set; }
    public DateTime ShiftEnd { get; set; }
    public string? Notes { get; set; }
    public bool IsCompleted { get; set; } = false;
}

public class ShiftRecord
{
    public int Id { get; set; }
    public int BpuMemberId { get; set; }
    public BpuMember BpuMember { get; set; } = null!;
    public string Activity { get; set; } = string.Empty; // Campaign Monitoring, Vote Counting, etc.
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
}

// Debate Session Models
public class DebateSession
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty; // "Presidential Debate Round 1"
    public string Description { get; set; } = string.Empty;
    public string SessionType { get; set; } = "Presidential"; // Presidential, OpenFloor, QnA
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ScheduledAt { get; set; }
    public string Status { get; set; } = "Draft"; // Draft, Ready, Live, Completed
    public int TotalDurationMinutes { get; set; } = 60;
    public string? CreatedByAdminId { get; set; }
    
    // Navigation property
    public List<DebateQuestion> Questions { get; set; } = new List<DebateQuestion>();
}

public class DebateQuestion
{
    public int Id { get; set; }
    public int DebateSessionId { get; set; }
    public DebateSession DebateSession { get; set; } = null!;
    public string Question { get; set; } = string.Empty;
    public int OrderIndex { get; set; } // 1, 2, 3... for chronological order
    public int DurationMinutes { get; set; } = 3; // Time allocated per question
    public string QuestionType { get; set; } = "General"; // General, Opening, Closing, Rebuttal
    public string? TargetCandidate { get; set; } // null for all, or specific candidate
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class LiveSession
{
    public int Id { get; set; }
    public int? DebateSessionId { get; set; }
    public DebateSession? DebateSession { get; set; }
    public bool IsLive { get; set; } = false;
    public DateTime? StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public int? CurrentQuestionId { get; set; }
    public DebateQuestion? CurrentQuestion { get; set; }
    public DateTime? CurrentQuestionStartedAt { get; set; }
    public int? TimeRemainingSeconds { get; set; }
    public string? AdminControllerUsername { get; set; }
    public string Status { get; set; } = "Offline"; // Offline, Live, Paused, Ended
}
