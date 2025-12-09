# FastAPI Backend (ALQASEER CRM)

## What changed
- Added a structured FastAPI backend under `CRM/backend` with modular folders (`core/`, `models/`, `schemas/`, `api/`, `tests/`).
- Implemented HCP (doctors) CRUD with soft delete and pagination.
- Standardized configuration via `pydantic-settings` and SQLite by default (`data/fastapi.db`).
- Updated `run-backend-dev.ps1` to install Python deps and launch `uvicorn`.
- AI-Orchestrator configured for Ollama `llama3`; tool-calling disabled by default (set `CREW_ENABLE_TOOLS=true` to enable safe file toolsâ€”may require an OpenAI model that supports function calling).

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

## Configuration
- Settings live in `config/settings.py` and load from `.env` (see `.env.example`).
- Default profile: `APP_ENV=development` uses `DATABASE_URL` (SQLite path by default) and `ECHO_SQL` for SQLAlchemy logging.
- Production profile: set `APP_ENV=production` and supply `PROD_DATABASE_URL=postgresql+psycopg://user:pass@host:5432/db` (plus optional `PROD_ECHO_SQL=false` to keep logs lean). JWT and other fields are shared across profiles.

## Example API calls
- Health: `GET http://localhost:8000/status`
- List HCPs: `GET http://localhost:8000/api/hcps?page=1&page_size=25`
- Get one: `GET http://localhost:8000/api/hcps/1`
- Create:
  ```json
  POST http://localhost:8000/api/hcps
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
  PUT http://localhost:8000/api/hcps/1
  {
    "phone": "+97151111111",
    "city": "Abu Dhabi"
  }
  ```
- Soft delete: `DELETE http://localhost:8000/api/hcps/1` (returns 204; marks `is_active=false`).

## AI-Orchestrator notes
- Env vars standardized in `AI-Orchestrator/.env`:
  - `OPENAI_API_KEY=ollama`
  - `OPENAI_BASE_URL=http://127.0.0.1:11434/v1`
  - `OPENAI_MODEL=llama3`
  - `OPENAI_TEMPERATURE=0.2`
- `main.py` now runs a sanity check before the crew; output is non-empty.
- Tool calling is OFF by default to avoid Ollama function-calling issues; set `CREW_ENABLE_TOOLS=true` to allow `safe_file_read/write` (works best with an OpenAI-compatible model that supports tool calls).

## TODO / Next steps
- Add auth/JWT and role-based guards in `core/security.py`.
- Extend modules: pharmacies, sales reps, visits, reports.
- Flesh out pytest suite with TestClient for the new endpoints.
- Add migrations/alembic if schema changes become frequent.

