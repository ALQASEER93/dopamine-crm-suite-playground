# Field-Ready Deployment (Free-First)

## Goal
Enable non-local access for reps across Jordan with a safe CI path and minimal operating cost.

## Current evidence
- Root deployment configs (`firebase.json`, `.firebaserc`, `wrangler.toml`, `vercel.json`): غير مذكور.
- Existing signals: Vercel preview checks already appear in PR checks, and `ALQASEER-PWA/README_DEPLOY.md` references Vercel.

## Free-first options
1. Vercel Free (recommended now)
- Best fit with existing repo signals.
- Fastest route to stable public URL for PWA.

2. Cloudflare Pages Free
- Strong free tier and global edge.
- Requires separate Pages project setup.

3. Firebase Hosting (Spark)
- Good static hosting free tier.
- Requires adding Firebase project and hosting config.

## Selected path
Vercel Free for `ALQASEER-PWA` with a safe GitHub workflow.

## Deployment model
- Trigger: `workflow_dispatch` and `push` on `main`.
- Behavior when secrets missing: workflow exits successfully with a clear message (no CI break).
- Behavior when secrets present: deploy production build for `ALQASEER-PWA` via Vercel CLI.

## Required secrets
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## Owner UI-only steps
1. Create a Vercel project linked to `ALQASEER-PWA`.
2. Add repository secrets in GitHub Actions.
3. Optional: add custom domain and DNS records in Vercel dashboard.

## Security notes
- No store publishing/signing in this flow.
- Keep API base URL configured via environment (`VITE_API_BASE_URL`).
