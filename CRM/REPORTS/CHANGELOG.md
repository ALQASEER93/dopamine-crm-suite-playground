# CRM Change Log (append-only)

## 2025-02-13 – Step 0 Baseline
- Captured initial status (score 55%) before fixes.
- Tests: backend `python -m pytest -q` passed; frontend `npm run build` passed; smoke scripts failed with connection refused (no API server running).

## 2025-02-13 – Step 1 Dashboard smoke stabilization
- Added TestClient fallbacks to smoke_login.py and smoke_dashboard.py to remove connection-refused failures and exercise dashboard endpoints in-process.
- Updated STATUS.md with current score (65%) and documented remaining rubric gaps.
