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

Current production test domain:

```text
https://dopamine-crm-suite-playground.pages.dev
```

Browser API calls must stay same-origin:

```text
https://dopamine-crm-suite-playground.pages.dev/api/v1/*
```

`ALQASEER-PWA/functions/api/v1/[[path]].js` proxies those requests to the Vercel FastAPI upstream:

```text
https://dopamine-crm-api.vercel.app/api/v1/*
```

The direct Vercel URL is upstream-only and diagnostic-only. It is not the field browser API target.

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
3. Optional after field testing: add custom CRM subdomain in Cloudflare dashboard.
4. If using optional Vercel workflow, remember Hobby is non-commercial.

Future custom CRM subdomain options are planned only and not activated in this task:

- `crm.dopaminepharma.com`
- `app.dopaminepharma.com`

Official company emails/domain are available for later operational setup, but email and DNS records are out of scope here.

## Security notes
- No store publishing/signing in this flow.
- Keep field API base URL set to same-origin (`VITE_API_BASE_URL=/api/v1`) for Cloudflare Pages.
