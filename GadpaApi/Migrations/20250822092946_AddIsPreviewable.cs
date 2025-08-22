using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GadpaApi.Migrations
{
    /// <inheritdoc />
    public partial class AddIsPreviewable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPreviewable",
                table: "LiveDebates",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsPreviewable",
                table: "LiveDebates");
        }
    }
}
