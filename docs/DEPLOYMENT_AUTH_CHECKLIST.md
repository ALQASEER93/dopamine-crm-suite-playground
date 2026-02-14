# Deployment Auth Checklist (Vercel / Cloudflare Pages)

## Why Login Fails On Public Deployments
The PWA is a static frontend. If the backend API is not deployed, not reachable, or blocked by CORS, login will fail even with correct credentials.

Common causes:
- Backend not deployed for the same environment (Vercel Preview deploys frontend only).
- `VITE_API_BASE_URL` points to the wrong host/path.
- Browser CORS blocks requests when frontend and backend are on different origins without correct CORS settings.

To make this obvious without leaking secrets, the `/login` page includes a small diagnostics panel that is shown only when `VITE_DEBUG_UI=true`.

## Required Vite Environment Variables
Vite exposes ONLY variables prefixed with `VITE_` to the browser build.

Required:
- `VITE_API_BASE_URL`
  - Used by the PWA API client as the base for requests.
  - Default in code is `"/api/v1"` (relative to the frontend origin).

Optional (debug only):
- `VITE_DEBUG_UI`
  - When set to `"true"`, shows a debug panel on `/login` with:
    - Resolved `API_BASE_URL` string
    - Health-check status (2s timeout) against `/health` then `/api/health`

## Vercel Setup
Where to set env vars:
- Project -> Settings -> Environment Variables

What to set:
- `VITE_API_BASE_URL`
  - Example (backend on a separate domain): `https://api.example.com/api/v1`
  - Example (same-origin proxy via rewrites): `/api/v1`

Important:
- Any change to env vars requires a new deployment (redeploy) for the Preview/Production environment that uses them.

Debugging without secrets:
- Temporarily set `VITE_DEBUG_UI=true` in the same environment to see whether the API is reachable (OK / Unreachable / CORS / 401).
- Do not enable debug UI for Production unless you explicitly need it.

## Cloudflare Pages Notes
SPA routing:
- Cloudflare Pages requires a `_redirects` file to route all paths to `index.html`.
- This repo includes `ALQASEER-PWA/public/_redirects` with SPA fallback:
  - `/* /index.html 200`

Backend reachability:
- If frontend and backend are on different origins, ensure backend CORS allows the Cloudflare Pages domain(s).

