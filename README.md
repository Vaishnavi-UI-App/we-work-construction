# We Work Constructions — Website (Backend scaffold)

This repository contains an initial backend scaffold for the We Work Constructions website phase.

What is included:
- Express + TypeScript backend (`/backend`)
- Prisma schema and seed script (`/backend/prisma`)
- Docker Compose with Postgres (`docker-compose.yml`)

Quick start (Windows / WSL / macOS):


This scaffold can run using a local SQLite DB (recommended for quick local development) or Postgres via Docker.

Quick start (SQLite, no Docker required):

1. In PowerShell (from repo root) run:

```powershell
cd backend
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

2. In a second terminal (frontend):

```powershell
cd frontend
npm install
npm run dev
```

3. Open `http://localhost:4001/health` and `http://localhost:5173` (frontend).

If you prefer Docker/Postgres, use `docker-compose up -d` and set `DATABASE_URL` accordingly.

Next steps:
- Add authentication and RBAC checks on the endpoints.
- Build the React frontend and connect to these APIs.
- Add file storage for receipts and generated PDFs (S3 recommended).
- Add CI and deployment manifests.

# we-work
