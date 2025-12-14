# AGENTS.md — CRM Commands

## Backend (FastAPI)
- Create/activate venv (Windows):
  - .\.venv\Scripts\Activate.ps1
- Run server:
  - .\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
- Tests:
  - .\.venv\Scripts\python.exe -m pytest -q

## Frontend (Vite/React)
- Install:
  - npm ci
- Run:
  - npm run dev
- Build:
  - npm run build

## Notes
- API base: http://127.0.0.1:8000/api/v1
- Default creds:
  - admin@example.com / password
  - rep@example.com / password
