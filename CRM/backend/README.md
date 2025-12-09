# Backend

This directory contains a Node.js/Express API backed by SQLite and Sequelize.

## Setup

Install dependencies and run the automated tests:

```
npm install
npm test
```

### Database seeding

Seed scripts live under `backend/scripts/` and can target any SQLite database by
setting the `SQLITE_STORAGE` environment variable (defaults to
`../data/database.sqlite`). Run them in the following order when preparing a new
environment:

1. `npm run seed:roles` â€“ Creates the default `admin`, `manager`, and `rep` roles.
2. `npm run seed:users` â€“ Inserts demo users with bcrypt-hashed passwords and
   associates them with roles.
3. `npm run seed:visits` â€“ Upserts territories, sales reps, HCPs, and sample
   visits that match the Visits dashboard.

For convenience, `npm run seed:all` executes the full sequence, and the legacy
`npm run seed` alias still populates the visit data only. Each script is
idempotent and can be re-run safely (useful for CI or resetting a dev database).

Start the development server on port `5000` (override via `PORT`):

```
node index.js
```

## Key Endpoints

- `POST /api/auth/login` â€“ Validates credentials against the persisted `users`
  table seeded via the scripts above and returns the associated role.
- `GET /api/health` â€“ Lightweight readiness probe.
- `GET /api/hcps` â€“ Lists HCP records ordered alphabetically.
- `POST /api/import/hcps` â€“ Bulk upsert HCP data.
- `GET /api/visits` â€“ Returns paginated visit rows with nested HCP, rep, and territory details.
- `GET /api/visits/summary` â€“ Aggregates visit counts, unique entity totals, and duration statistics for summary cards.
- `GET /api/visits/export` â€“ Streams the filtered visits list as a CSV file.

### Visits Query Parameters

All three visits endpoints support the same filtering contract:

- `page` / `pageSize` â€“ Pagination controls (default: `1` / `25`, max page size 100).
- `sortBy` â€“ `visitDate`, `status`, `durationMinutes`, `hcpName`, `repName`, or `territoryName` (default `visitDate`).
- `sortDirection` â€“ `asc` or `desc` (default `desc`).
- `status` â€“ One or more statuses (`scheduled`, `completed`, `cancelled`).
- `repId`, `hcpId`, `territoryId` â€“ Filter by related identifiers (single value or comma-delimited list).
- `dateFrom` / `dateTo` â€“ Inclusive date range in `YYYY-MM-DD` format.
- `q` â€“ Case-insensitive search across rep name, HCP name, HCP area tag, and territory name.

`/api/visits` responds with a `{ data, meta }` payload, `/api/visits/summary` wraps
the aggregated metrics in `{ data }`, and `/api/visits/export` returns `text/csv`
with a `Content-Disposition: attachment; filename="visits.csv"` header.

## FastAPI layer

- Entry: `main.py` (run with `python -m uvicorn main:app --reload --port 8000` or `.\run-backend-dev.ps1`).
- Uses SQLite by default (`data/fastapi.db` unless `DATABASE_URL` is set).
- For PostgreSQL production, set `APP_ENV=production` and provide `PROD_DATABASE_URL` (SQLAlchemy DSN such as `postgresql+psycopg://user:pass@host:5432/db`); optional `PROD_ECHO_SQL=false` keeps logs quiet.
- Auth/roles: validates JWT signed with `JWT_SECRET` (default `development-secret`) and enforces `admin` / `sales_manager` on admin routes.
- If the project drive blocks SQLite writes, the app falls back to `%TEMP%\crm_fastapi_fallback.sqlite`; set `DATABASE_URL` to an accessible path to persist data.

## API Overview

- Base URL (dev): `http://127.0.0.1:8000`
- Key endpoints:
  - `/` â†’ Welcome message
  - `/status` â†’ Health check
  - `/api/hcps` â†’ CRUD for HCPs
  - `/api/admin/dpm-ledger/...` â†’ Pharmacy/area ledger summaries & statements
  - `/api/admin/ai/...` â†’ AI insights, tasks, drafts, collection plans
  - `/api/dev/token` â†’ Dev-only JWT for local testing (not for production)
- Docs: `/docs` (Swagger) and `/redoc`

## Frontend / PWA Integration

- Set `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000` in the frontend.
- All REST calls should use `{NEXT_PUBLIC_API_BASE_URL}/api/...`.
- Endpoint mapping reference: `backend/docs/frontend_api_mapping.md`.

## Tests

- Install dev deps: `python -m pip install -r requirements.txt`
- Run tests: `python -m pytest -q` (or `.\scripts\run_tests.ps1`)
- Tests use a separate DB: `data/crm_backend_test.db` (set automatically in `tests/conftest.py`).

## DPM Ledger (legacy accounting integration)

- Ledger SQLite directory: `C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\AlJazeera\ledger_sqlite` (env `DPM_LEDGER_DB_DIR`).
- Active ledger year: env `DPM_LEDGER_ACTIVE_YEAR` (default `2024`).
- Convert MDB â†’ SQLite: run `scripts/convert_aljazeera_mdb.ps1` (uses WSL `mdb-tools`).
- Analyzer: `python -m dpm_ledger.analyzer` regenerates `backend/docs/dpm_ledger_schema_report.md`.
- API routes (FastAPI, JWT required): `/api/admin/dpm-ledger/pharmacies/{legacy_id}/summary`, `/statement`, `/api/admin/dpm-ledger/areas/{area_id}/summary`.

## AI Core and Agents

- Config env vars: `LLM_PROVIDER` (`none` | `local_http` | `openai`), `LLM_LOCAL_HTTP_URL`, `OPENAI_API_KEY`, `AI_SCHEDULER_ENABLED`.
- Tables (auto-created): `ai_insights`, `ai_tasks`, `ai_message_drafts`, `collection_plan`, `ledger_audit_log`.
- Agent runner: `python -m ai_agents.scheduler` (honors `AI_SCHEDULER_ENABLED=1`).
- Admin AI API: `/api/admin/ai/insights`, `/tasks`, `/tasks/{id}` (PATCH), `/drafts`, `/collection-plan`.
- Agent descriptions: see `backend/ai_agents_overview.md`.

