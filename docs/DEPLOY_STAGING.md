# Staging Deployment Runbook

This runbook documents a production-like staging setup without provisioning cloud resources. It focuses on repeatable local or existing infrastructure deployment steps.

## Overview
- Backend: FastAPI (CRM/backend)
- Frontend: Vite React (CRM/frontend)
- PWA: Vite (ALQASEER-PWA)
- API base URL must remain: http://127.0.0.1:8000/api/v1

## Backend (prod-like)

### Environment configuration
Use environment variables or a `.env` file (do not commit secrets). Start from `.env.example` or `.env.prod.example`.

Recommended variables:
- `APP_ENV=staging`
- `DATABASE_URL=postgresql+psycopg2://<user>:<pass>@<host>:<port>/<db>`
- `JWT_SECRET=<replace>`
- `JWT_ALGORITHM=HS256`
- `CORS_ORIGINS=https://staging.example.com,https://staging-pwa.example.com`
- `LOG_LEVEL=INFO`
- `RATE_LIMIT_ENABLED=true`

### Run backend
From `CRM/backend`:

```powershell
# create venv if needed
python -m venv .venv
. .venv/bin/activate  # Linux/mac
# Windows:
# .\.venv\Scripts\Activate.ps1

pip install -r requirements.txt

# run app (example)
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### Migration
- SQLite is fine for local dev, but staging should use Postgres.
- Prepare migrations or run a bootstrap script before staging traffic.

## Database recommendation (Postgres)

### Why
- Better concurrency, reliability, and observability than SQLite.
- Easier backups and restores.

### Setup (existing infra)
- Provision a Postgres instance on existing staging infra.
- Create a dedicated DB and user with least privilege.
- Set `DATABASE_URL` in the backend environment.

### Backups
- Schedule nightly dumps (e.g., `pg_dump`) to an existing storage location.

## Frontend hosting (CRM/frontend)

### Build
From `CRM/frontend`:

```powershell
npm ci
npm run build
```

### Host
- Serve `CRM/frontend/dist` with a static server (Nginx/Caddy) or existing web host.
- Ensure `/index.html` is served for SPA routes (history fallback).

## PWA hosting (ALQASEER-PWA)

### Build
From `ALQASEER-PWA`:

```powershell
npm ci
npm run build
```

### Host
- Serve `ALQASEER-PWA/dist` via static hosting.
- Ensure `/service-worker.js` and `.well-known/assetlinks.json` are publicly reachable.
- For Android TWA, verify:
  - `/.well-known/assetlinks.json`

## Operational checks
- API health: `http://<host>:8000/api/v1/health`
- Frontend: page loads and API calls succeed.
- PWA: installable and offline queue works for visits.
- Maps and export endpoints remain intact.

## Rollback plan
- Keep previous frontend builds in a timestamped directory.
- Keep database backups before applying schema/data changes.
- Revert to previous build + restore DB if needed.
