# CRM Project Agent — Dopamine Pharma (DPM)

## Scope & Stack
- Monorepo segments under `CRM/`: `backend/` (FastAPI + Python) and `frontend/` (Vite/React, Arabic-first, dark mode).
- Default ports: backend `http://127.0.0.1:8000` (`/api/v1`), frontend `http://127.0.0.1:5173`.
- Core domain: reps (medical + sales/collections), admins, doctors/HCPs, pharmacies/accounts, territories, products, visits.

## Guardrails (do not skip)
- No destructive operations (no `rm -rf`, no wiping folders/db`).
- Always branch + PR; keep commits small and reversible.
- Arabic UI + Dark Mode defaults everywhere.
- Visits lifecycle (Start/End + GPS + offline/PWA) is critical; never regress it.
- RBAC is mandatory on APIs and UI routes; reps only see their own scope.
- Keep reports/exports (CSV/Excel/PDF) and maps/geofencing considerations intact.

## Commands
- Backend: `cd backend && python -m pytest -q` (install deps with `pip install -r requirements.txt`).
- Frontend: `cd frontend && npm ci && npm run test:ci && npm run build` (Arabic strings + dark theme by default).

## Collaboration & QA
- Summaries must list changed files + tests + quick verification steps.
- Prefer minimal patches that keep the repo runnable at all times.
- If fixing bugs: reproduce, check console/network, apply smallest fix.
