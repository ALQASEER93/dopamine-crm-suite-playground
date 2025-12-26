# Legacy Express Backend (Deprecated)

This folder contains the retired Node.js/Express + Sequelize backend.
FastAPI is now the single source of truth for the CRM APIs.

## When to use

Only for reference, audits, or one-off comparisons. New work should target FastAPI.

## Running (if needed)

```
cd CRM/backend
npm install
npm run dev
```

By default it starts on port `5000`.

## Notes

- The primary backend lives at `CRM/backend/main.py` (FastAPI).
- Frontends should point to the FastAPI base URL: `http://127.0.0.1:8000/api/v1`.
