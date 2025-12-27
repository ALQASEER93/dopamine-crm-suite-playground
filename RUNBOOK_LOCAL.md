# Local Runbook

This runbook is the source of truth for running the FastAPI backend, CRM frontend, and ALQASEER PWA locally.

## Prerequisites
- Windows PowerShell 7+ (or Windows PowerShell 5.1)
- Python 3.11+
- Node.js 18+ and npm
- Git

## One-command smoke run
```
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\RUN_SMOKE_LOCAL.ps1
```

## Services and ports
- FastAPI backend: http://127.0.0.1:8000
- CRM frontend: http://127.0.0.1:5173
- ALQASEER PWA: http://127.0.0.1:5174 (use `npm run dev -- --port 5174`)

## Run backend (FastAPI)
```
cd CRM/backend
python -m venv .venv || true
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

Health check:
```
Invoke-RestMethod http://127.0.0.1:8000/api/v1/health
```

## Run CRM frontend
```
cd CRM/frontend
npm install
npm run dev
```
Env: set `VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1`.

## Run ALQASEER PWA
```
cd ALQASEER-PWA
npm install
npm run dev -- --port 5174
```
Env: set `VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1`.

## Credentials (from code + seeds)
Default users are seeded by `CRM/backend/services/auth.py` when `SEED_DEFAULT_USERS=true`
(default in development). These are real credentials in code:
- Admin: `admin@example.com` / `Admin12345!`
- Sales manager: `manager@example.com` / `password`
- Medical rep: `rep@example.com` / `Rep12345!`

Bootstrap admin (when seed users are disabled):
- Set `BOOTSTRAP_CODE` in `CRM/backend/.env`.
- Call `POST /api/v1/auth/bootstrap` with `code`, `email`, `name`, `password`.
Example:
```
Invoke-RestMethod http://127.0.0.1:8000/api/v1/auth/bootstrap -Method Post -ContentType "application/json" -Body '{
  "code": "your-bootstrap-code",
  "email": "admin@example.com",
  "name": "Admin User",
  "password": "Admin12345!"
}'
```

## Reset database (local)
Stop the backend, then remove the local SQLite file:
```
Remove-Item -Force CRM/backend/data/fastapi.db
```
Restart FastAPI to recreate and re-seed.

## Notes
- API base URL must remain `http://127.0.0.1:8000/api/v1`.
- Production deploys should use `npm ci --omit=dev`.
