# Run Dopamine CRM Suite on Windows

This guide provides exact PowerShell commands to run the CRM backend, frontend, and PWA on Windows.

## Prerequisites

- **Python 3.11+** (with `pip`)
- **Node.js 18+** (includes `npm`)
- **Git**
- **PowerShell 5+** (or PowerShell 7)

---

## Quick Start

From a PowerShell window at the repo root:

```powershell
cd D:\ALQASEER_DEV\dopamine-crm-suite-playground_CURSORSAFE
```

## One-click startup

Use the one-click helpers to start backend + frontend, wait for ports, and open the browser:

```powershell
.\tools\START_CRM_DEV.cmd
```

Smoke test visits GPS start/end (requires backend running):

```powershell
.\tools\SMOKE_VISIT_GPS.ps1
```

**Default credentials**:
- **Admin**: `admin@example.com` / `password`
- **Rep**: `rep@example.com` / `password`

**URLs**:
- Backend API: `http://127.0.0.1:8000/api/v1`
- Frontend: `http://127.0.0.1:5173`

**Idempotent behavior**: If ports `8000` or `5173` are already in use, the script skips starting that service and continues waiting for the ports to be reachable.

---

## 1) Backend (FastAPI)

### First-time setup

```powershell
cd CRM\backend

# Install dependencies
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# Initialize database and seed demo users
python -m main init-db
```

This creates `CRM\backend\data\fastapi.db` and seeds:
- **Admin**: `admin@example.com` / `password`
- **Rep**: `rep@example.com` / `password`

### Run development server

```powershell
cd CRM\backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Or use the helper script:

```powershell
.\run-backend-dev.ps1
```

**Backend API base URL**: `http://127.0.0.1:8000/api/v1`

### Reset database / reseed users

To reset the database and reseed demo users (idempotent):

```powershell
cd CRM\backend
python -m main init-db
```

This will:
- Ensure all tables exist
- Reset passwords for `admin@example.com` and `rep@example.com` to `password`
- Seed reference data (doctors, pharmacies, products, routes, visits, orders, etc.)

---

## 2) Frontend (CRM React SPA)

### First-time setup

Open a **new PowerShell window**:

```powershell
cd D:\ALQASEER_DEV\dopamine-crm-suite-playground_CURSORSAFE\CRM\frontend

# Install dependencies
npm ci
```

### Run development server

```powershell
cd CRM\frontend
npm run dev -- --host --port 5173
```

Or use the helper script:

```powershell
.\start-frontend-dev.ps1
```

**Frontend URL**: `http://127.0.0.1:5173`

### Login credentials

- **Admin**: `admin@example.com` / `password`
- **Rep**: `rep@example.com` / `password`

---

## 3) ALQASEER PWA

### First-time setup

Open another **new PowerShell window**:

```powershell
cd D:\ALQASEER_DEV\dopamine-crm-suite-playground_CURSORSAFE\ALQASEER-PWA

# Install dependencies
npm ci
```

### Run development server (if available)

```powershell
npm run dev
```

### Build for production

```powershell
npm run build
```

**Note**: Ensure PWA is configured to use the backend API base URL:
- `http://127.0.0.1:8000/api/v1`

---

## 4) Smoke Tests

### Backend smoke tests

With the backend running, open a new PowerShell window:

```powershell
cd D:\ALQASEER_DEV\dopamine-crm-suite-playground_CURSORSAFE\CRM\backend

# Test login endpoint
python scripts\smoke_login.py

# Test visits/dashboard endpoints
python scripts\smoke_dashboard.py
```

### Frontend tests

```powershell
cd CRM\frontend

# Run tests (CI mode)
npm run test:ci

# Build for production
npm run build
```

### Backend pytest

```powershell
cd CRM\backend
python -m pytest -q
```

---

## 5) Full Stack Test (All Services)

Run all tests to verify CI readiness:

```powershell
# Backend
cd CRM\backend
python -m pytest -q

# Frontend
cd ..\frontend
npm ci
npm run test:ci
npm run build

# PWA
cd ..\..\ALQASEER-PWA
npm ci
npm run build
```

---

## Troubleshooting

### Backend won't start

1. Check Python version: `python --version` (should be 3.11+)
2. Verify dependencies: `python -m pip list | Select-String -Pattern "fastapi|sqlalchemy|uvicorn"`
3. Check database path: `CRM\backend\data\fastapi.db` should exist after `init-db`
4. Check port 8000 is free: `netstat -ano | findstr :8000`

### Frontend won't start

1. Check Node.js version: `node --version` (should be 18+)
2. Clear node_modules and reinstall: `Remove-Item -Recurse -Force node_modules; npm ci`
3. Check port 5173 is free: `netstat -ano | findstr :5173`

### Database reset

If you need to completely reset the database:

```powershell
cd CRM\backend
# Backup existing DB (optional)
Copy-Item data\fastapi.db data\fastapi.db.backup -ErrorAction SilentlyContinue
# Remove DB
Remove-Item data\fastapi.db -ErrorAction SilentlyContinue
# Reinitialize
python -m main init-db
```

---

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@example.com` | `password` |
| Medical Rep | `rep@example.com` | `password` |

**Note**: These credentials are seeded automatically on `python -m main init-db` and reset to `password` each time the command runs.

---

## API Base URL

All frontend/PWA clients should use:

```
http://127.0.0.1:8000/api/v1
```

This is configured via:
- Frontend: `VITE_API_BASE_URL` environment variable (defaults to above)
- PWA: Check `lib/api-config.ts` or equivalent

---

## Next Steps

- See `AGENTS.md` for development guidelines
- See `CRM/backend/README_FASTAPI.md` for backend API documentation
- See `CRM/frontend/README.md` for frontend documentation

