using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GadpaApi.Migrations
{
    /// <inheritdoc />
    public partial class AddDebateSessionModels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DebateSessions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    SessionType = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ScheduledAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    TotalDurationMinutes = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedByAdminId = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DebateSessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DebateQuestions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DebateSessionId = table.Column<int>(type: "INTEGER", nullable: false),
                    Question = table.Column<string>(type: "TEXT", nullable: false),
                    OrderIndex = table.Column<int>(type: "INTEGER", nullable: false),
                    DurationMinutes = table.Column<int>(type: "INTEGER", nullable: false),
                    QuestionType = table.Column<string>(type: "TEXT", nullable: false),
                    TargetCandidate = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DebateQuestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DebateQuestions_DebateSessions_DebateSessionId",
                        column: x => x.DebateSessionId,
                        principalTable: "DebateSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LiveSessions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DebateSessionId = table.Column<int>(type: "INTEGER", nullable: true),
                    IsLive = table.Column<bool>(type: "INTEGER", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    EndedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CurrentQuestionId = table.Column<int>(type: "INTEGER", nullable: true),
                    CurrentQuestionStartedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    TimeRemainingSeconds = table.Column<int>(type: "INTEGER", nullable: true),
                    AdminControllerUsername = table.Column<string>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LiveSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LiveSessions_DebateQuestions_CurrentQuestionId",
                        column: x => x.CurrentQuestionId,
                        principalTable: "DebateQuestions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_LiveSessions_DebateSessions_DebateSessionId",
                        column: x => x.DebateSessionId,
                        principalTable: "DebateSessions",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_DebateQuestions_DebateSessionId",
                table: "DebateQuestions",
                column: "DebateSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_LiveSessions_CurrentQuestionId",
                table: "LiveSessions",
                column: "CurrentQuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_LiveSessions_DebateSessionId",
                table: "LiveSessions",
                column: "DebateSessionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LiveSessions");

            migrationBuilder.DropTable(
                name: "DebateQuestions");

            migrationBuilder.DropTable(
                name: "DebateSessions");
        }
    }
}
