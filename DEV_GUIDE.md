# Dev Guide

This guide covers local development for the FastAPI backend, CRM frontend, and PWA.

## Backend (FastAPI)

```
cd CRM/backend
python -m venv .venv || true
. .venv/bin/activate || true
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

## CRM Frontend (Vite/React)

```
cd CRM/frontend
npm install
npm run dev
```

Env: set `VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1`.

## ALQASEER-PWA (Vite)

```
cd ALQASEER-PWA
npm install
npm run dev
```

Env: set `VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1`.

## Ports

- FastAPI: `http://127.0.0.1:8000`
- CRM frontend: `http://127.0.0.1:5173`
- PWA: `http://127.0.0.1:5173` (Vite default; change if needed)

## Notes

- FastAPI is the source of truth for API changes.
- Legacy Express lives under `CRM/backend/legacy-express/` and is deprecated.
