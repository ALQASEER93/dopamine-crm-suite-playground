# Deployment Auth Checklist (Backend + PWA)

## 1) Common Reasons Login Fails On Public Deployments
The PWA is a static frontend. Login can fail even with correct credentials if:
- Backend API is not deployed / not reachable.
- `VITE_API_BASE_URL` points to the wrong host/path.
- CORS blocks requests when frontend and backend are on different origins.
- There is no real admin/user created in the backend database for that environment.

## 2) PWA (Vite) Environment Variables
Vite exposes ONLY variables prefixed with `VITE_` to the browser build. Do not put secrets in `VITE_*`.

Required:
- `VITE_API_BASE_URL`
  - API base used by the PWA.
  - Default in code is `"/api/v1"` (same-origin).

Optional (debug only):
- `VITE_DEBUG_UI`
  - When set to `"true"`, `/login` shows a diagnostics panel with:
    - resolved API base URL string
    - health probe status (2s timeout): `OK / Unreachable / CORS / 401`

Changing env vars requires a redeploy for the relevant environment (Preview/Production).

## 3) Backend Admin Bootstrap (FastAPI)
If your deployed backend has no admin user, the PWA will keep reporting invalid credentials even if the API is reachable.

This repo includes an idempotent bootstrap script:
- `CRM/backend/scripts/bootstrap_admin.py`

It reads ONLY backend env vars:
- `DPM_BOOTSTRAP_ADMIN_EMAIL` (required)
- `DPM_BOOTSTRAP_ADMIN_PASSWORD` (required)
- `DPM_BOOTSTRAP_ADMIN_NAME` (optional)

Safety behavior:
- If any active admin already exists, the script makes **no changes** (prevents accidental creation of extra admins).
- If the given email exists but is not admin, it refuses to escalate.
- It never prints the password.

Run:
```bash
cd CRM/backend
python -m scripts.bootstrap_admin
```

## 4) Cloudflare Pages SPA Routing
Cloudflare Pages requires SPA fallback routing via `_redirects`.

Place this file in:
- `ALQASEER-PWA/public/_redirects`

Content:
```txt
/* /index.html 200
```

