# Local Runbook

This runbook is the source of truth for running the FastAPI backend, CRM frontend, and ALQASEER PWA locally.

## Canonical Deployment Reference
- Internal pilot/staging deployment path is **Docker Compose** (`docker-compose.prod.yml`) as documented in `docs/DEPLOYMENT_CANONICAL.md`.
- Any standalone PWA-only Vercel/Next deployment guide is non-canonical for this monorepo.

## Prerequisites
- Windows PowerShell 7+ (or Windows PowerShell 5.1)
- Python 3.11+
- Node.js 18+ and npm
- Git

## One-command smoke run
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\RUN_SMOKE_LOCAL.ps1
```

## Services and ports
- FastAPI backend: http://127.0.0.1:8000
- CRM frontend: http://127.0.0.1:5173
- ALQASEER PWA: http://127.0.0.1:5174 (use `npm run dev -- --port 5174`)

## Run backend (FastAPI)
```powershell
cd CRM/backend
python -m venv .venv || true
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

Health check:
```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/v1/health
```

## Run CRM frontend
```powershell
cd CRM/frontend
npm install
npm run dev
```
Env: set `VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1`.
For non-local environments (field/staging/production), set the same variable to the deployed HTTPS API base.
CRM frontend also supports `VITE_API_URL` as a fallback alias.
Map mode: set `VITE_MAP_MODE=links` (default, no API key) or `VITE_MAP_MODE=google` with `VITE_GOOGLE_MAPS_API_KEY`.

## Run ALQASEER PWA
```powershell
cd ALQASEER-PWA
npm install
npm run dev -- --port 5174
```
Env: set `VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1`.
For non-local environments (field/staging/production), set `VITE_API_BASE_URL` to the deployed HTTPS API base.
If using Next-based PWA routes/utilities, the configured API base is read from `NEXT_PUBLIC_CRM2_API_BASE` (fallback `NEXT_PUBLIC_API_BASE`).
Map mode: set `VITE_MAP_MODE=links` (default, no API key) or `VITE_MAP_MODE=google` with `VITE_GOOGLE_MAPS_API_KEY`.

## Dev Credentials Policy
`SEED_DEFAULT_USERS` is for development only. Never use seeded/default credentials in staging or production.

Allowed placeholder format in docs:
- `admin@example.com / <set via SEED in dev>`
- Or: `run seed to print dev creds locally` (no credential secret text in docs)

Bootstrap admin (when seed users are disabled):
- Set `BOOTSTRAP_CODE` in `CRM/backend/.env`.
- Call `POST /api/v1/auth/bootstrap` using local values only; do not place credential values in docs.

## Reset database (local)
Stop the backend, then remove the local SQLite file:
```powershell
Remove-Item -Force CRM/backend/data/fastapi.db
```
Restart FastAPI to recreate and re-seed.

## Notes
- This runbook is local-dev only; `http://127.0.0.1:8000/api/v1` must remain the local default.
- Production deploys should use `npm ci --omit=dev`.
- Do not ask users to run ad-hoc shell commands outside documented scripts.

## Team Operating References
- Playbook: `docs/OPERATIONS/AGENT_OS_PLAYBOOK.md`
- Thread charter: `docs/OPERATIONS/THREAD_CHARTER_TEMPLATE.md`
- Sub-agent ownership: `docs/OPERATIONS/SUBAGENT_OWNERSHIP_TEMPLATE.md`
- MCP/apps policy: `docs/OPERATIONS/MCP_APPS_POLICY.md`
- Skills matrix: `docs/OPERATIONS/SKILLS_USAGE_MATRIX.md`
- PR checklist: `docs/OPERATIONS/PR_EXECUTION_CHECKLIST.md`
- Incident runbook: `docs/OPERATIONS/INCIDENT_RUNBOOK.md`
