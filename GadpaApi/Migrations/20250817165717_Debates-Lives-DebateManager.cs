using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GadpaApi.Migrations
{
    /// <inheritdoc />
    public partial class DebatesLivesDebateManager : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LiveDebateId",
                table: "FireEvents",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

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
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Debates", x => x.Id);
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
                name: "LiveDebates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DebateId = table.Column<int>(type: "INTEGER", nullable: false),
                    DebateManagerId = table.Column<int>(type: "INTEGER", nullable: false),
                    CurrentRound = table.Column<int>(type: "INTEGER", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false)
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

            migrationBuilder.CreateIndex(
                name: "IX_FireEvents_LiveDebateId",
                table: "FireEvents",
                column: "LiveDebateId");

            migrationBuilder.CreateIndex(
                name: "IX_DebateQuestions_DebateId",
                table: "DebateQuestions",
                column: "DebateId");

            migrationBuilder.CreateIndex(
                name: "IX_LiveDebates_DebateId",
                table: "LiveDebates",
                column: "DebateId");

            migrationBuilder.CreateIndex(
                name: "IX_LiveDebates_DebateManagerId",
                table: "LiveDebates",
                column: "DebateManagerId");

            migrationBuilder.AddForeignKey(
                name: "FK_FireEvents_LiveDebates_LiveDebateId",
                table: "FireEvents",
                column: "LiveDebateId",
                principalTable: "LiveDebates",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FireEvents_LiveDebates_LiveDebateId",
                table: "FireEvents");

            migrationBuilder.DropTable(
                name: "DebateQuestions");

            migrationBuilder.DropTable(
                name: "LiveDebates");

            migrationBuilder.DropTable(
                name: "Debates");

            migrationBuilder.DropIndex(
                name: "IX_FireEvents_LiveDebateId",
                table: "FireEvents");

            migrationBuilder.DropColumn(
                name: "LiveDebateId",
                table: "FireEvents");
        }
    }
}
