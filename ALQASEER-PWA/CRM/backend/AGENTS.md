# AGENTS — CRM/backend (FastAPI)

## Commands
- Run tests: `python -m pytest -q` (ensure `pip install -r requirements.txt`).

## Rules
- No destructive operations (no table drops or mass deletes); prefer migrations and soft deletes.
- All endpoints must be RBAC protected and enforce rep scoping for visits/accounts.
- Arabic-first defaults; keep visit Start/End + GPS + offline/PWA support in mind when changing APIs.
- Add/adjust Pydantic schemas when models change.
- Prefer small migrations and seed updates.
- No secrets in code/logs.
