# GADPA Debate Platform

A real-time debate management platform built for the GADPA 2025 presidential election, featuring live audience interaction and administrative controls.

## Features

- **Real-Time Interaction** - Live fire emoji reactions with animated heatmaps using SignalR WebSockets
- **Debate Management** - Create, schedule, and manage debate sessions with participant tracking
- **Authentication & Authorization** - JWT-based auth with role-based access control (Admin, Debate Manager)
- **Rate Limiting** - Multi-tier protection: middleware for auth endpoints, in-memory cache for audience actions
- **Live Dashboard** - Real-time audience engagement metrics and reaction analytics

## Tech Stack

**Backend:**
- .NET 8.0 / C#
- SignalR for real-time WebSockets
- Entity Framework Core
- JWT Authentication
- Swagger/OpenAPI documentation

**Frontend:**
- React
- HTML5/CSS3

**Infrastructure:**
- Microsoft Azure (App Service)
- MSSQL Database
- GitHub Actions CI/CD

## Quick Start

### Prerequisites

- [.NET 8.0 SDK](https://dotnet.microsoft.com/download)
- [Node.js 18+](https://nodejs.org/) & npm
- MSSQL Server (local or remote)

### Backend Setup
```bash
# Clone repository
git clone https://github.com/Zentoboo/gadpa-debate.git
cd gadpa-debate/GadpaApi

# Configure database connection
# Edit appsettings.json with your connection string

# Apply migrations
dotnet ef database update

# Run API
dotnet run
```

API will be available at `https://localhost:7000` (or configured port)  
Swagger documentation: `https://localhost:7000/swagger`

### Frontend Setup
```bash
cd gadpadebateapp

# Install dependencies
npm install

# Start development server
npm start
```

Frontend will be available at `http://localhost:3000`

## Configuration

### Database Connection

Update `GadpaApi/appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=GadpaDebate;Trusted_Connection=True;"
  }
}
```

### Environment Variables (Production)
```bash
ASPNETCORE_ENVIRONMENT=Production
JWT_SECRET=your-secret-key-here
DATABASE_CONNECTION_STRING=your-connection-string
```

## Authentication

The platform uses JWT tokens for authentication:

1. Register/Login via `/api/auth/login`
2. Receive JWT token
3. Include token in `Authorization: Bearer <token>` header

**Roles:**
- `Admin` - Full platform access
- `DebateManager` - Debate creation and management
- `User` - Audience participation and viewing

## Key Features Implementation

### Real-Time Fire Reactions

Uses SignalR WebSockets with rate limiting to prevent spam:
- Sliding window rate limit per user
- Aggregated heatmap updates every 500ms
- Automatic cooldown periods

### Multi-Tier Rate Limiting

- **Authentication endpoints** - ASP.NET middleware (10 req/min)
- **Fire emoji events** - In-memory cache with sliding window
- **Question submissions** - Per-user throttling (1 req/30s)

## Deployment

Automatically deployed to Azure via GitHub Actions on push to `main` branch.

### Manual Deployment
```bash
# Backend
cd GadpaApi
dotnet publish -c Release
# Deploy to Azure App Service

# Frontend
cd gadpadebateapp
npm run build
# Deploy build folder to Azure Static Web Apps
```

## Testing
```bash
# Run backend tests
cd GadpaApi
dotnet test

# Load testing
cd LoadTests
dotnet run
```

## 📝 API Documentation

Full API documentation available at `/swagger` when running the backend.

**Key Endpoints:**
- `POST /api/auth/login` - User authentication
- `GET /api/debates` - List all debates
- `POST /api/debates` - Create debate (Admin only)
- `POST /api/reactions/fire` - Send fire emoji reaction

## Contributing

This project was developed for GADPA 2025. While the event has concluded, the codebase serves as a reference implementation for real-time debate platforms.

## Author

**Christopher Bertrand**
- GitHub: [@Zentoboo](https://github.com/Zentoboo)
- Email: c.bertrandtjo@gmail.com

---

**Note:** This project was developed for the GADPA 2025 presidential debate event and is now archived as a portfolio demonstration.
