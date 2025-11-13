# Welcome to your Lovable project

## Overview

This repository hosts a complete enterprise-grade solution for managing dodatne prodajne pozicije in supermarkets. The solution is composed of:

- **backend/** – ASP.NET Core Web API with Entity Framework Core, JWT authentication and role-based authorization.
- **frontend/** – Angular SPA with lazy-loaded feature modules, responsive dashboards and layout designer.
- **src/** – Existing React prototype (kept for reference).

## Tech stack

- ASP.NET Core 8, Entity Framework Core, SQL Server (or compatible provider)
- Angular 17, RxJS, NgxCharts, Angular CDK
- JWT authentication, BCrypt password hashing, Serilog logging

## Local development

### Backend API

```bash
cd backend/src/RetailPositions.Api
dotnet restore
dotnet run
```

Swagger UI: `https://localhost:5001/swagger`

### Angular frontend

```bash
cd frontend
npm install
npm run start
```

App URL: `http://localhost:4200`

### React prototype (optional)

```bash
npm install
npm run dev
```

## Deployment

Deploy backend and frontend separately according to your infrastructure. Ensure environment variables for connection strings and JWT secrets are configured securely.
