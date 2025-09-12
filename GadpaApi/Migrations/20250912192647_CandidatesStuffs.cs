using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GadpaApi.Migrations
{
    /// <inheritdoc />
    public partial class CandidatesStuffs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsUsed",
                table: "UserSubmittedQuestions");

            migrationBuilder.AddColumn<bool>(
                name: "AllowVoting",
                table: "Debates",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "Candidates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DebateId = table.Column<int>(type: "int", nullable: false),
                    CandidateNumber = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    VoteCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Candidates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Candidates_Debates_DebateId",
                        column: x => x.DebateId,
                        principalTable: "Debates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Candidates_DebateId",
                table: "Candidates",
                column: "DebateId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Candidates");

            migrationBuilder.DropColumn(
                name: "AllowVoting",
                table: "Debates");

            migrationBuilder.AddColumn<bool>(
                name: "IsUsed",
                table: "UserSubmittedQuestions",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }
    }
}
