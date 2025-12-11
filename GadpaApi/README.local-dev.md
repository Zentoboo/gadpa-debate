# Local Development Setup

## Quick Start

### 1. Copy Development Config Template
```bash
cp appsettings.Development.json.template appsettings.Development.json
```

This creates your local development configuration file that:
- Uses SQLite database (`gadpa-local.db`) instead of Azure SQL
- Has a local JWT secret key for testing
- Enables detailed EF Core logging

### 2. Restore Packages & Run
```bash
dotnet restore
dotnet run
```

The backend will automatically:
- Detect you're in Development mode
- Create the SQLite database with all tables
- Start at `http://localhost:5076`

## Why This File?

`appsettings.Development.json` is **gitignored** to protect local configurations.
Everyone needs to create their own copy from the template.

## Production vs Development

| Environment | Database | Config File |
|------------|----------|-------------|
| Production | Azure SQL | `appsettings.Production.json` |
| Development | SQLite | `appsettings.Development.json` (from template) |

Your local changes won't affect production! 🎉
