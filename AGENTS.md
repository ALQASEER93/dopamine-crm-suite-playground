# AGENTS.md — dopamine-crm-suite-playground

## Project layout
- CRM/backend = FastAPI (Python)
- CRM/frontend = Vite/React (Node)

## How to run tests (must run before PR)
### Backend
cd CRM/backend
python -m venv .venv || true
# Linux/mac:
. .venv/bin/activate || true
# Windows (if available):
# .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m pytest -q

### Frontend
cd CRM/frontend
npm ci
npm run build
npm test --if-present

## Definition of Done for any task
- Backend pytest passes (python -m pytest -q)
- Frontend build passes (npm run build)
- Update README if behavior or run steps changed
- Keep API base URL stable: http://127.0.0.1:8000/api/v1
