# Field-Ready Deployment (Free-First)

## Goal
Enable non-local access for reps across Jordan with a safe CI path and minimal operating cost.

## Current evidence
- Root deployment configs (`firebase.json`, `.firebaserc`, `wrangler.toml`, `vercel.json`): غير مذكور.
- Existing signals: Vercel preview checks already appear in PR checks, and `ALQASEER-PWA/README_DEPLOY.md` references Vercel.

## Free-first options
1. Cloudflare Pages Free (recommended now)
- Strong free tier and global edge.
- Commercial-friendly default for this project.

2. Firebase Hosting (Spark)
- Good static hosting free tier.
- Requires adding Firebase project and hosting config.

3. Vercel
- Existing optional path is kept in repo workflow.
- Important: Vercel Hobby is non-commercial; use Pro for commercial workloads.

## Selected path
Cloudflare Pages for `ALQASEER-PWA` with a safe GitHub workflow (`workflow_dispatch`).
Vercel workflow remains optional for teams that already use Vercel.

## Deployment model
- Trigger: `workflow_dispatch` for Cloudflare workflow.
- Behavior when secrets missing: workflow exits successfully with a clear message (no CI break).
- Behavior when secrets present: deploy production build for `ALQASEER-PWA` via Cloudflare Pages and run smoke checks on `/` and `/login`.

## Required secrets
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_PROJECT_NAME`

## Owner UI-only steps
1. Create a Cloudflare Pages project for `ALQASEER-PWA`.
2. Add repository secrets in GitHub Actions.
3. Optional: add custom domain and DNS records in Cloudflare dashboard.
4. If using optional Vercel workflow, remember Hobby is non-commercial.

## Security notes
- No store publishing/signing in this flow.
- Keep API base URL configured via environment (`VITE_API_BASE_URL`).
