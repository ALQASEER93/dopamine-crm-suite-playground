# FastAPI Backend (ALQASEER CRM)

## What changed
- Added a structured FastAPI backend under `CRM/backend` with modular folders (`core/`, `models/`, `schemas/`, `api/`, `tests/`).
- Implemented HCP (doctors) CRUD with soft delete and pagination.
- Standardized configuration via `pydantic-settings` and SQLite by default (`data/fastapi.db`).
- Updated `run-backend-dev.ps1` to install Python deps and launch `uvicorn`.
- AI-Orchestrator configured for Ollama `llama3`; tool-calling disabled by default (set `CREW_ENABLE_TOOLS=true` to enable safe file toolsâ€”may require an OpenAI model that supports function calling).

## Phase 3/4 additions (Samples + Medical Affairs)
- Added Samples domain:
  - Models: `SampleProduct`, `SampleInventory`, `SampleDistribution`, `SampleRequest`
  - APIs: `/api/v1/samples/products`, `/inventory`, `/inventory/adjust`, `/distribute`, `/history`, `/request`
- Added Medical Affairs domain:
  - Models: `MedicalEvent`, `EventAttendee`, `KOL`, `ScientificMaterial`
  - APIs: `/api/v1/medical-affairs/events`, `/kols`, `/materials`, `/reports/event-roi`, `/reports/kol-engagement`
- Added/updated tests:
  - `tests/test_samples_medical_affairs.py`
- Added Alembic scaffold and migration:
  - `alembic.ini`
  - `alembic/env.py`
  - `alembic/versions/20260216_090000_phase34_samples_medical_affairs.py`

## Project layout
- `main.py` â€” FastAPI entrypoint; keeps `/` and `/status`, mounts `/api` routers, and auto-creates tables on startup.
- `core/config.py` â€” Pydantic settings (`DATABASE_URL`, `ECHO_SQL`).
- `core/db.py` â€” SQLAlchemy engine/session and `get_db` dependency.
- `core/security.py` â€” Placeholder for auth/JWT.
- `models/hcp.py` â€” ORM model with timestamps and `is_active` soft delete flag.
- `schemas/hcp.py` â€” Pydantic models for create/update/output.
- `api/hcps.py` â€” CRUD routes with pagination and logging.
- `tests/test_hcps.py` â€” Placeholder pytest smoke test.
- `requirements.txt` â€” FastAPI + SQLAlchemy + Pydantic deps.

## How to run
From `C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\CRM\backend`:
1. Install deps (first run): `python -m pip install -r requirements.txt`
2. Start dev server: `python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload`
   - Or use the helper script: `.\run-backend-dev.ps1`

## Frontend pairing and default login
- Backend: run uvicorn on port 8000 (above). User and demo-data seeding are disabled by default; test fixtures opt in explicitly.
- Frontend: from `../frontend`, run `npm install` (first time) then `npm run dev -- --host --port 5173`. The SPA local-dev default is `http://127.0.0.1:8000/api/v1` (primary env `VITE_API_BASE_URL`, fallback alias `VITE_API_URL`).
- PWA local-dev default is also `http://127.0.0.1:8000/api/v1` (`VITE_API_BASE_URL`). Next-based PWA utilities read `NEXT_PUBLIC_CRM2_API_BASE` (fallback `NEXT_PUBLIC_API_BASE`) when configured.
- Default credentials: `<ADMIN_EMAIL>` / `<ADMIN_PASSWORD>` (admin),
  `<SALES_MANAGER_EMAIL>` / `<SALES_MANAGER_PASSWORD>` (sales manager),
  and `<REP1_EMAIL>` / `<REP1_PASSWORD>` (medical rep).
- Smoke test (FastAPI must be running): `python scripts/smoke_login.py` (override target with `API_BASE_URL`, `SMOKE_LOGIN_EMAIL`, `SMOKE_LOGIN_PASSWORD`).

## Configuration
- Settings live in `config/settings.py` and load from `.env` (see `.env.example`).
- Default profile: `APP_ENV=development` uses `DATABASE_URL` (SQLite path by default) and `ECHO_SQL` for SQLAlchemy logging.
- Production profile: set `APP_ENV=production` and supply `PROD_DATABASE_URL=postgresql+psycopg://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:5432/<DB_NAME>` (plus optional `PROD_ECHO_SQL=false` to keep logs lean).
- Security-critical production requirements:
  - `JWT_SECRET` must be strong (16+ chars and not default/dev values).
  - `SEED_DEFAULT_USERS` and `SEED_DEMO_DATA` are forced off in protected Preview and Production runtimes.
  - `ALLOWED_ORIGINS` must not contain `*`, `localhost`, or `127.0.0.1`.
  - Optional JWT hardening: set `JWT_ISSUER` and `JWT_AUDIENCE` to enforce issuer/audience validation.

## Visit lifecycle integrity
- Lifecycle fields (`status`, timestamps, GPS start/end, duration) are not editable via generic `PUT /api/v1/visits/{id}`.
- Lifecycle changes must happen only through:
  - `POST /api/v1/visits/{id}/start`
  - `POST /api/v1/visits/{id}/end`
- `POST /api/v1/pwa/visits` only creates a scheduled visit and does not accept client-controlled lifecycle state.

## Running migration (optional but recommended)
From `CRM/backend`:
1. `pip install -r requirements.txt`
2. Ensure Alembic targets the same DB used by the app:
   - PowerShell: `$env:DATABASE_URL="sqlite:///./data/fastapi.db"`
3. `alembic upgrade head`
4. To rollback one step: `alembic downgrade -1`

## Local example API calls
- Health: `GET http://127.0.0.1:8000/status`
- List HCPs: `GET http://127.0.0.1:8000/api/hcps?page=1&page_size=25`
- Get one: `GET http://127.0.0.1:8000/api/hcps/1`
- Create:
  ```json
  POST http://127.0.0.1:8000/api/hcps
  {
    "first_name": "Aisha",
    "last_name": "Khan",
    "specialty": "Cardiology",
    "phone": "+97150000000",
    "email": "aisha.khan@example.com",
    "clinic_address": "123 Main St",
    "area": "Downtown",
    "city": "Dubai"
  }
  ```
- Update:
  ```json
  PUT http://127.0.0.1:8000/api/hcps/1
  {
    "phone": "+97151111111",
    "city": "Abu Dhabi"
  }
  ```
- Soft delete: `DELETE http://127.0.0.1:8000/api/hcps/1` (returns 204; marks `is_active=false`).

## AI-Orchestrator notes
- Env vars standardized in `AI-Orchestrator/.env`:
  - `OPENAI_API_KEY=<OPENAI_API_KEY>`
  - `OPENAI_BASE_URL=http://127.0.0.1:11434/v1`
  - `OPENAI_MODEL=llama3`
  - `OPENAI_TEMPERATURE=0.2`
- `main.py` now runs a sanity check before the crew; output is non-empty.
- Tool calling is OFF by default to avoid Ollama function-calling issues; set `CREW_ENABLE_TOOLS=true` to allow `safe_file_read/write` (works best with an OpenAI-compatible model that supports tool calls).

## TODO / Next steps
- Add auth/JWT and role-based guards in `core/security.py`.
- Extend modules: pharmacies, sales reps, visits, reports.
- Flesh out pytest suite with TestClient for the new endpoints.
- Expand migration coverage for legacy schemas and historical data backfills.

