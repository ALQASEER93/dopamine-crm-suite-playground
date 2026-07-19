# Backend

FastAPI is the primary backend. The former Express/Sequelize API has been moved under
`legacy-express/` for reference only.

## Setup (FastAPI)

Install dependencies and run the automated tests:

```
python -m pip install -r requirements.txt
python -m pytest -q
```

### Database seeding

Legacy Express and seed sources remain under `legacy-express/` as historical reference only.
They are not installed, executed, deployed, or used by CI. The active backend and all supported
data workflows are Python/FastAPI based.

## Legacy Express Endpoints (deprecated)

- `POST /api/auth/login` - Validates credentials against the persisted `users`
  table seeded via the scripts above and returns the associated role.
- `GET /api/health` - Lightweight readiness probe.
- `GET /api/hcps` - Lists HCP records ordered alphabetically.
- `POST /api/import/hcps` - Bulk upsert HCP data.
- `GET /api/visits` - Returns paginated visit rows with nested HCP, rep, and territory details.
- `GET /api/visits/summary` - Aggregates visit counts, unique entity totals, and duration statistics for summary cards.
- `GET /api/visits/export` - Streams the filtered visits list as a CSV file.

### Visits Query Parameters

All three visits endpoints support the same filtering contract:

- `page` / `pageSize` - Pagination controls (default: `1` / `25`, max page size 100).
- `sortBy` - `visitDate`, `status`, `durationMinutes`, `hcpName`, `repName`, or `territoryName` (default `visitDate`).
- `sortDirection` - `asc` or `desc` (default `desc`).
- `status` - One or more statuses (`scheduled`, `completed`, `cancelled`).
- `repId`, `hcpId`, `territoryId` - Filter by related identifiers (single value or comma-delimited list).
- `dateFrom` / `dateTo` - Inclusive date range in `YYYY-MM-DD` format.
- `q` - Case-insensitive search across rep name, HCP name, HCP area tag, and territory name.

`/api/visits` responds with a `{ data, meta }` payload, `/api/visits/summary` wraps
the aggregated metrics in `{ data }`, and `/api/visits/export` returns `text/csv`
with a `Content-Disposition: attachment; filename="visits.csv"` header.

## FastAPI layer

- Entry: `main.py` (run with `python -m uvicorn main:app --reload --port 8000` or `.\run-backend-dev.ps1`).
- Uses SQLite by default (`data/fastapi.db` unless `DATABASE_URL` is set).
- For PostgreSQL production, set `APP_ENV=production` and provide `PROD_DATABASE_URL` (SQLAlchemy DSN such as `postgresql+psycopg://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:5432/<DB_NAME>`); optional `PROD_ECHO_SQL=false` keeps logs quiet.
- Auth/roles: validates JWT signed with `JWT_SECRET`; protected Preview and Production runtimes fail closed when the secret is missing/weak, user or demo seeding is enabled, GPS override is enabled, or CORS contains insecure entries.
- Vercel/serverless: startup schema creation and seeding are skipped for every Vercel runtime so cold starts never mutate a managed database. Apply reviewed migrations explicitly to the isolated target before deploying source that depends on them.
- Local-only bootstrap: `DPM_BOOTSTRAP_ADMIN_ONCE` is blocked in Preview/Production and exists only for an explicit local empty-database setup. Managed environments require an audited out-of-band admin lifecycle.
- Legacy ERP API guard: `DPM_ENABLE_LEGACY_ERP_API` defaults to `false`. In the default Field CRM runtime, order, stock, collections, ledger, and ERP-like admin AI collection-plan routes are not mounted and do not appear in OpenAPI. Production startup rejects `DPM_ENABLE_LEGACY_ERP_API=true`; enabling it would require a future audited decision outside the default field-force CRM scope.
- GPS guardrails:
  - `ALLOW_GPS_OVERRIDE` controls test-only `gpsOverride=true` usage in visit start. It defaults to `false` in every runtime and is rejected in protected Preview/Production runtimes.
  - `GEOFENCE_REQUIRE_TARGET_COORDS` controls strict geofence target enforcement. Defaults to `false` in non-production and `true` in production when unset.
  - Override execution is still role-restricted to `admin`/`sales_manager`, and override logs include visit/user/location metadata.
- If the project drive blocks SQLite writes, the app falls back to `%TEMP%\crm_fastapi_fallback.sqlite`; set `DATABASE_URL` to an accessible path to persist data.

## API Overview

- Base URL (dev): `http://127.0.0.1:8000/api/v1`
- Key endpoints:
  - `/` -> Welcome message
  - `/status` -> Health check
  - `/api/v1/hcps` -> CRUD for HCPs (FastAPI-compatible shape)
  - `/api/v1/reports/...` -> Reporting endpoints for CRM dashboards
  - `/api/v1/territories` -> Territory listing for admin and filters
  - `/api/v1/admin/users` -> Admin user management
  - `/api/dev/token` -> Dev-only JWT for local testing, exposed only when `DPM_ENV=development` and `ALLOW_DEV_TOKEN_ENDPOINT=true`
- Docs: `/docs` (Swagger) and `/redoc`

## Frontend / PWA Integration

- Set `VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1` in the frontend/PWA env.
- All REST calls should use `{VITE_API_BASE_URL}/...`.
- Endpoint mapping reference: `backend/docs/frontend_api_mapping.md`.

## Tests

- Install dev deps: `python -m pip install -r requirements.txt`
- Run tests: `python -m pytest -q` (or `.\scripts\run_tests.ps1`)
- Tests use a separate DB: `data/crm_backend_test.db` (set automatically in `tests/conftest.py`).

## DPM Ledger (legacy accounting integration, disabled by default)

The ledger integration is legacy accounting functionality and is not part of the default Field Force CRM runtime. Its routes are mounted only when `DPM_ENABLE_LEGACY_ERP_API=true`, which is rejected in production by configuration validation.

- Ledger SQLite directory: `C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\AlJazeera\ledger_sqlite` (env `DPM_LEDGER_DB_DIR`).
- Active ledger year: env `DPM_LEDGER_ACTIVE_YEAR` (default `2024`).
- Convert MDB -> SQLite: run `scripts/convert_aljazeera_mdb.ps1` (uses WSL `mdb-tools`).
- Analyzer: `python -m dpm_ledger.analyzer` regenerates `backend/docs/dpm_ledger_schema_report.md`.
- Legacy API routes when explicitly enabled (FastAPI, JWT required): `/api/admin/dpm-ledger/pharmacies/{legacy_id}/summary`, `/statement`, `/api/admin/dpm-ledger/areas/{area_id}/summary`.

## AI Core and Agents

- Config env vars: `LLM_PROVIDER` (`none` | `local_http` | `openai`), `LLM_LOCAL_HTTP_URL`, `OPENAI_API_KEY`, `AI_SCHEDULER_ENABLED`.
- Tables (auto-created): `ai_insights`, `ai_tasks`, `ai_message_drafts`, `collection_plan`, `ledger_audit_log`.
- Agent runner: `python -m ai_agents.scheduler` (honors `AI_SCHEDULER_ENABLED=1`).
- Admin AI API is also behind `DPM_ENABLE_LEGACY_ERP_API` because the current module includes ERP-like collection planning. When explicitly enabled, routes include `/api/admin/ai/insights`, `/tasks`, `/tasks/{id}` (PATCH), `/drafts`, `/collection-plan`.
- Agent descriptions: see `backend/ai_agents_overview.md`.

