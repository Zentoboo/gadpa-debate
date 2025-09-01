using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GadpaApi.Migrations
{
    /// <inheritdoc />
    public partial class RegenerateModelSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AppSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Key = table.Column<string>(type: "TEXT", nullable: false),
                    Value = table.Column<string>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BannedIps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    IpAddress = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BannedIps", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Debates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedByUserId = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ScheduledStartTime = table.Column<DateTime>(type: "TEXT", nullable: true),
                    AllowUserQuestions = table.Column<bool>(type: "INTEGER", nullable: false),
                    MaxQuestionsPerUser = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Debates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Username = table.Column<string>(type: "TEXT", nullable: false),
                    PasswordHash = table.Column<string>(type: "TEXT", nullable: false),
                    Role = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DebateQuestions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DebateId = table.Column<int>(type: "INTEGER", nullable: false),
                    RoundNumber = table.Column<int>(type: "INTEGER", nullable: false),
                    Question = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DebateQuestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DebateQuestions_Debates_DebateId",
                        column: x => x.DebateId,
                        principalTable: "Debates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserSubmittedQuestions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DebateId = table.Column<int>(type: "INTEGER", nullable: false),
                    Question = table.Column<string>(type: "TEXT", nullable: false),
                    IpAddress = table.Column<string>(type: "TEXT", nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsApproved = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsUsed = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserSubmittedQuestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserSubmittedQuestions_Debates_DebateId",
                        column: x => x.DebateId,
                        principalTable: "Debates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LiveDebates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DebateId = table.Column<int>(type: "INTEGER", nullable: false),
                    DebateManagerId = table.Column<int>(type: "INTEGER", nullable: false),
                    CurrentRound = table.Column<int>(type: "INTEGER", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsPreviewable = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LiveDebates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LiveDebates_Debates_DebateId",
                        column: x => x.DebateId,
                        principalTable: "Debates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LiveDebates_Users_DebateManagerId",
                        column: x => x.DebateManagerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "FireEvents",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    IpAddress = table.Column<string>(type: "TEXT", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false),
                    FireCount = table.Column<int>(type: "INTEGER", nullable: false),
                    LiveDebateId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FireEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FireEvents_LiveDebates_LiveDebateId",
                        column: x => x.LiveDebateId,
                        principalTable: "LiveDebates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DebateQuestions_DebateId",
                table: "DebateQuestions",
                column: "DebateId");

            migrationBuilder.CreateIndex(
                name: "IX_FireEvents_LiveDebateId",
                table: "FireEvents",
                column: "LiveDebateId");

            migrationBuilder.CreateIndex(
                name: "IX_LiveDebates_DebateId",
                table: "LiveDebates",
                column: "DebateId");

            migrationBuilder.CreateIndex(
                name: "IX_LiveDebates_DebateManagerId",
                table: "LiveDebates",
                column: "DebateManagerId");

            migrationBuilder.CreateIndex(
                name: "IX_UserSubmittedQuestions_DebateId",
                table: "UserSubmittedQuestions",
                column: "DebateId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppSettings");

            migrationBuilder.DropTable(
                name: "BannedIps");

            migrationBuilder.DropTable(
                name: "DebateQuestions");

            migrationBuilder.DropTable(
                name: "FireEvents");

            migrationBuilder.DropTable(
                name: "UserSubmittedQuestions");

            migrationBuilder.DropTable(
                name: "LiveDebates");

            migrationBuilder.DropTable(
                name: "Debates");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
