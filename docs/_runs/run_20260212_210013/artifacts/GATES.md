# Local Validation Gates

## Backend
- Command: `cd CRM/backend && python -m pytest -q`
- Result: FAIL
- Exit code: 101 (fallback `py -3 -m pytest -q` launcher failure)
- Notes: `python` not found on PATH; `py -3` points to missing interpreter.
- Needed to complete evidence: install/repair Python 3 runtime and rerun `python -m pytest -q`.

## Frontend
- Command: `cd CRM/frontend && npm ci && npm test --if-present && npm run build`
- Result: PASS
- Exit code: 0

## ALQASEER-PWA
- Command: `cd ALQASEER-PWA && npm ci && npm test --if-present && npm run build`
- Result: PASS
- Exit code: 0

## Logs
- `docs/_runs/run_20260212_210013/logs/backend_pytest.log`
- `docs/_runs/run_20260212_210013/logs/frontend_gate.log`
- `docs/_runs/run_20260212_210013/logs/pwa_gate.log`
