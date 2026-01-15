# Pilot Public Runbook

## Goal
Deploy PWA + Backend on public HTTPS for nationwide pilot (not LAN).

## PWA (Vercel) - Production
1) Create a new Vercel project pointing to `ALQASEER-PWA`.
2) Set production environment variables (Project Settings -> Environment Variables):
   - `VITE_API_BASE_URL=https://<public-backend-domain>/api/v1`
   - `VITE_MAP_MODE=links` (or `google` if using Maps)
   - `VITE_GOOGLE_MAPS_API_KEY=<key>` (required if `VITE_MAP_MODE=google`)
   - `VITE_FIREBASE_API_KEY=<key>` (if Firebase is enabled)
   - `VITE_FIREBASE_AUTH_DOMAIN=<domain>`
   - `VITE_FIREBASE_PROJECT_ID=<id>`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID=<id>`
   - `VITE_FIREBASE_APP_ID=<id>`
3) Trigger a production deployment.

## Backend (Render / Fly / Cloud Run)
1) Deploy `CRM/backend` with HTTPS enabled by the provider.
2) Set environment variables:
   - `DPM_ENV=production`
   - `JWT_SECRET=<strong-random-secret>`
   - `PROD_DATABASE_URL=<provider-db-url>` (or set `DATABASE_URL` directly)
   - `DPM_CORS_ORIGINS=https://<vercel-pwa-domain>`
   - `DPM_EXTRA_CORS_ORIGINS=https://<additional-origin-1>,https://<additional-origin-2>` (optional)
   - `SEED_DEFAULT_USERS=false` (optional, explicit)
3) Ensure the public API base is reachable at:
   - `https://<public-backend-domain>/api/v1`

## Verify (Android Chrome)
1) Open the PWA URL on Android Chrome and add to Home screen.
2) Login with a test rep account.
3) Start a visit:
   - Navigate to field visits
   - Start a visit with GPS enabled
   - End the visit and confirm it appears in history
4) Confirm network calls succeed with 200 responses.

## Notes
- CORS is enforced with exact allowlist. Ensure the PWA production origin is listed in `DPM_CORS_ORIGINS`.
- Do not use HTTP in production; HTTPS is required for service worker and geolocation.
