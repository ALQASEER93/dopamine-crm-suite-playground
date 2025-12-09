## Backend changes (this round)
- Switched Pydantic schemas to `ConfigDict(from_attributes=True)` for AI payloads (`schemas/ai.py`).
- Added central settings module (`config/settings.py`, `core/config.py`) and `.env.example` for DB/JWT/debug defaults.
- Introduced `/api/v1/health` with DB and version info; documented endpoints in `docs/backend_overview.md`.
- Kept tests isolated to temp SQLite DB; expanded health coverage (`tests/test_health.py`).

## Files touched
- `schemas/ai.py`, `config/settings.py`, `core/config.py`
- `api/v1/health.py`, `api/v1/__init__.py`, `main.py`
- `tests/test_health.py`, `tests/conftest.py`
- `docs/backend_overview.md`, `.env.example`, `LOG.md`

## Commands run (exit code 0)
- `python -m pytest -q`
- `npm test`
- `npm run build`

## How to run
- Tests: `python -m pytest -q` (or `npm test`)
- Build: `npm run build`
- API (dev): `uvicorn main:app --reload --port 8000`
