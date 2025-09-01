using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GadpaApi.Migrations
{
    /// <inheritdoc />
    public partial class AddScheduledStartTime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AllowQuestionsWhenLive",
                table: "Debates");

            migrationBuilder.AddColumn<DateTime>(
                name: "ScheduledStartTime",
                table: "Debates",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ScheduledStartTime",
                table: "Debates");

            migrationBuilder.AddColumn<bool>(
                name: "AllowQuestionsWhenLive",
                table: "Debates",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }
    }
}
