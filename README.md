```markdown
# GADPA Debate Platform

A full-stack web application for managing and hosting debates for the GADPA 2025 presidential election. This version improves scalability, maintainability, and audience interaction features.

## Features
- Debate creation and scheduling  
- User registration and authentication  
- Real-time reactions (e.g., fire emoji heatmap)  
- Debate listings and history  
- Admin management tools  

## Tech Stack
- Backend: .NET / C#  
- Frontend: HTML, CSS, JavaScript  
- Database: Configurable via connection string

## Deployment
- The application, both frontend and backend was deployed to Microsoft Azure via GitHub Actions.

## Project Structure
```

gadpa-debate/
├── GadpaApi/           # Backend API
├── gadpadebateapp/     # Frontend application
├── LoadTests/          # Load testing utilities
└── gadpa-debate.sln

````

## Setup
```bash
git clone https://github.com/Zentoboo/gadpa-debate.git
cd gadpa-debate
````

Configure the database connection string in `GadpaApi/appsettings.json`.

### Run Backend

```bash
cd GadpaApi
dotnet run
```

### Run Frontend

Open `gadpadebateapp` in a browser or run using your chosen web server/tooling.

## Usage

* Users can join and interact during debates.
* Admins can create and manage debate sessions.
