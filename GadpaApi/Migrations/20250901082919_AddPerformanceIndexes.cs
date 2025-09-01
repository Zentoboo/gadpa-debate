using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GadpaApi.Migrations
{
    /// <inheritdoc />
    public partial class AddPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Critical indexes for fire reaction performance
            // Index for rate limiting query: f.IpAddress AND f.Timestamp > DateTime.UtcNow.AddSeconds(-1)
            migrationBuilder.CreateIndex(
                name: "IX_FireEvents_IpAddress_Timestamp",
                table: "FireEvents",
                columns: new[] { "IpAddress", "Timestamp" });

            // Index for total fires query: f.LiveDebateId
            migrationBuilder.CreateIndex(
                name: "IX_FireEvents_LiveDebateId_FireCount",
                table: "FireEvents", 
                columns: new[] { "LiveDebateId", "FireCount" });

            // Index for live debates queries
            migrationBuilder.CreateIndex(
                name: "IX_LiveDebates_IsActive_DebateId",
                table: "LiveDebates",
                columns: new[] { "IsActive", "DebateId" });

            // Index for scheduled debate activation
            migrationBuilder.CreateIndex(
                name: "IX_Debates_ScheduledStartTime",
                table: "Debates",
                column: "ScheduledStartTime");

            // Index for banned IP checks (high frequency lookup)
            migrationBuilder.CreateIndex(
                name: "IX_BannedIps_IpAddress",
                table: "BannedIps",
                column: "IpAddress");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_FireEvents_IpAddress_Timestamp",
                table: "FireEvents");

            migrationBuilder.DropIndex(
                name: "IX_FireEvents_LiveDebateId_FireCount",
                table: "FireEvents");

            migrationBuilder.DropIndex(
                name: "IX_LiveDebates_IsActive_DebateId",
                table: "LiveDebates");

            migrationBuilder.DropIndex(
                name: "IX_Debates_ScheduledStartTime",
                table: "Debates");

            migrationBuilder.DropIndex(
                name: "IX_BannedIps_IpAddress",
                table: "BannedIps");
        }
    }
}
