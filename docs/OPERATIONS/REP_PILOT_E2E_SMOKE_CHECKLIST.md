# Rep Pilot E2E Smoke Checklist (Vercel)

## Preconditions
- Frontend production URL is reachable.
- Backend API `/api/v1/health` returns `200`.
- Production env vars are set:
  - `VITE_API_BASE_URL`
  - `VITE_API_URL`
  - `DATABASE_URL` (durable Postgres)

## Smoke Flow
1. Login
- Open frontend production URL.
- Login with rep pilot credentials.
- Expected: successful redirect to dashboard with no CORS errors in browser console.

2. Create Visit
- Navigate to Visits.
- Create a new visit against an existing doctor/pharmacy.
- Expected: new visit row appears and has server-generated ID.

3. Start Visit (GPS)
- Click `Start Visit`.
- Allow location permission.
- Expected: start timestamp + GPS fields are stored, and API response is `2xx`.

4. End Visit
- Click `End Visit`.
- Add required notes/outcome fields.
- Expected: visit status becomes completed with end timestamp.

5. Export Validation
- Open reports/exports screen.
- Export CSV/Excel (and PDF if enabled in current build).
- Expected: download succeeds and includes the created visit.

6. Persistence Through Redeploy
- Trigger backend redeploy (same commit is fine).
- After deployment is `READY`, refresh frontend and open Visits.
- Expected: visit created in this smoke run still exists (same ID/timestamps).

## Pass Criteria
- No auth/CORS blocker.
- Visit lifecycle start/end is persisted.
- Export includes the visit.
- Data survives redeploy.
