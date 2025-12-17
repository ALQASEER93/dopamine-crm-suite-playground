# Architecture Map

## Repository layout
- `CRM/backend/` — FastAPI service (SQLite by default), pytest suite, Pydantic settings.
- `CRM/frontend/` — Vite/React SPA (Arabic-first, dark mode) targeting backend `/api/v1`.
- `ALQASEER-PWA/` — PWA/Next/Vite hybrid for field reps with offline and maps.
- `AI-Orchestrator/` — AI helper config/scripts (optional), shares OPENAI-style env vars.
- `.github/workflows/` — CI, Codex review bot, and Codex auto-fix pipelines.

## Local ports
- Backend (FastAPI): `http://127.0.0.1:8000` (main API prefix `/api/v1`).
- Frontend (Vite dev): `http://127.0.0.1:5173`.
- PWA (Next/Vite dev): defaults to `http://127.0.0.1:3000`.

## Environment variables (names only)
- Backend: `APP_ENV`, `DATABASE_URL`, `PROD_DATABASE_URL`, `ECHO_SQL`, `PROD_ECHO_SQL`, `JWT_SECRET`, `JWT_ALGORITHM`, `JWT_EXPIRES_MINUTES`.
- Frontend: `VITE_API_BASE_URL`, `VITE_API_URL`.
- PWA/Maps/Notifications: `VITE_API_BASE_URL`, `NEXT_PUBLIC_API_BASE`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_FIREBASE_*`, `VITE_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_CRM2_API_BASE`, `MONGODB_URI`, `OPENAI_API_KEY`.
- AI/automation: `OPENAI_API_KEY` (Codex/AI orchestrator), optional `OPENAI_BASE_URL`, `OPENAI_MODEL`.
