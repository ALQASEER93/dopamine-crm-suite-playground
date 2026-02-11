# OWNER_ACTIONS (Field-Ready Deploy)

## Required UI-only actions
1. In Vercel, create/import the project for `ALQASEER-PWA`.
2. In GitHub repo secrets/actions, add:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
3. Re-run workflow `Field-Ready Deploy` manually (`workflow_dispatch`) for first production publish.

## Optional actions
- Configure custom domain for Jordan-wide access.
- Add environment variables in Vercel project settings (`VITE_API_BASE_URL` etc.).
