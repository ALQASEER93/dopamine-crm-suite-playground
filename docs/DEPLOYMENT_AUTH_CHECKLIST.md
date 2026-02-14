# Deployment Auth Checklist (PWA + Backend)

## Why Login Fails On Public Deployments
The PWA is a static frontend. Login can fail even with correct credentials if:
- Backend API is not deployed / not reachable.
- Browser CORS blocks requests when frontend and backend are on different origins.
- `VITE_API_BASE_URL` points to the wrong host/path.
- There is no real admin/user created in the backend database for that environment.

To help differentiate "wrong credentials" vs "API unreachable/CORS" without leaking secrets, the PWA `/login` page includes an opt-in diagnostics panel shown only when `VITE_DEBUG_UI=true`.

## PWA (Vite) Environment Variables
Vite exposes ONLY variables prefixed with `VITE_` to the browser build. Do not put secrets in `VITE_*`.

Required:
- `VITE_API_BASE_URL`
  - Used by the PWA API client as the base for requests.
  - Default in code is `"/api/v1"` (same-origin).

Optional (debug only):
- `VITE_DEBUG_UI`
  - When set to `"true"`, shows diagnostics on `/login`:
    - resolved API base URL string
    - health probe status (2s timeout): `OK / Unreachable / CORS / 401` (tries `/health` then `/api/health`)

Changing env vars requires a redeploy for the relevant environment (Preview/Production).

## Vercel Setup (PWA)
Where to set env vars:
- Project -> Settings -> Environment Variables

What to set:
- `VITE_API_BASE_URL`
  - Example (backend on a separate domain): `https://api.example.com/api/v1`
  - Example (same-origin proxy via rewrites): `/api/v1`

Debugging without secrets:
- Temporarily set `VITE_DEBUG_UI=true` in the same environment to see whether the API is reachable.
- Avoid leaving debug UI enabled in Production long-term.

## Backend Admin Bootstrap (FastAPI)
If your deployed backend has no admin user, the PWA will keep reporting invalid credentials even if the API is reachable.

This repo includes an idempotent bootstrap script:
- `CRM/backend/scripts/bootstrap_admin.py`

It reads ONLY backend env vars (never use `VITE_*` for these):
- `DPM_BOOTSTRAP_ADMIN_EMAIL` (required)
- `DPM_BOOTSTRAP_ADMIN_PASSWORD` (required)
- `DPM_BOOTSTRAP_ADMIN_NAME` (optional)

Safety behavior:
- If any active admin already exists, the script makes no changes (prevents accidental creation of extra admins).
- If the given email exists but is not admin, it refuses to escalate role.
- It never prints the password.

Run:
```bash
cd CRM/backend
python -m scripts.bootstrap_admin
```

## Cloudflare Pages SPA Routing (PWA)
Cloudflare Pages requires SPA fallback routing via `_redirects`.

Place this file in:
- `ALQASEER-PWA/public/_redirects`

Content:
```txt
/* /index.html 200
```

