using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GadpaApi.Migrations
{
    /// <inheritdoc />
    public partial class PasswordsandSessionsForDebates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AccessPassword",
                table: "Debates",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "RequirePassword",
                table: "Debates",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "DebateSessions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DebateId = table.Column<int>(type: "int", nullable: false),
                    SessionToken = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    IpAddress = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DebateSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DebateSessions_Debates_DebateId",
                        column: x => x.DebateId,
                        principalTable: "Debates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DebateSessions_DebateId",
                table: "DebateSessions",
                column: "DebateId");

            migrationBuilder.CreateIndex(
                name: "IX_DebateSessions_ExpiresAt",
                table: "DebateSessions",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_DebateSessions_SessionToken",
                table: "DebateSessions",
                column: "SessionToken",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DebateSessions");

            migrationBuilder.DropColumn(
                name: "AccessPassword",
                table: "Debates");

            migrationBuilder.DropColumn(
                name: "RequirePassword",
                table: "Debates");
        }
    }
}
