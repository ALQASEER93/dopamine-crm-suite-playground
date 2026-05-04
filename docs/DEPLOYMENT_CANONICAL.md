# Canonical Deployment Path (Pilot Candidate)

This repository has three supported deployment tracks for internal pilot usage:

1. Field PWA: GitHub Actions direct upload to Cloudflare Pages from `ALQASEER-PWA/dist`, with Pages Functions from `ALQASEER-PWA/functions`.
2. No-card pilot backend: Vercel FastAPI from `CRM/backend` with Aiven Free PostgreSQL.
3. Full internal stack: Docker Compose with FastAPI, CRM, PWA, and Caddy.

## Status

- Preferred field deployment: `.github/workflows/field-ready-deploy-cloudflare.yml`.
- No-card backend pilot: `CRM/backend/vercel.json` plus Aiven Free PostgreSQL.
- Internal full-stack deployment: Docker Compose stack below.
- Non-canonical: standalone Vercel/Next.js guides for PWA-only deployment.

## Cloudflare Pages Field Deployment

Workflow: `.github/workflows/field-ready-deploy-cloudflare.yml`

Required GitHub secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Optional GitHub secret:

- `CLOUDFLARE_PROJECT_NAME`

Production browser API base:

```text
VITE_API_BASE_URL=/api/v1
```

The Cloudflare workflow intentionally builds the field PWA against the same-origin API base. Browser requests go to:

```text
https://dopamine-crm-suite-playground.pages.dev/api/v1/*
```

Cloudflare Pages Function proxy:

```text
ALQASEER-PWA/functions/api/v1/[[path]].js
```

proxies those API requests to the Vercel FastAPI upstream:

```text
https://dopamine-crm-api.vercel.app/api/v1/*
```

The Vercel URL is upstream-only and diagnostic-only for this pilot. Field browsers should not call `https://dopamine-crm-api.vercel.app` directly.

The workflow deploys from inside `ALQASEER-PWA`:

```bash
npx -y wrangler@4 pages deploy dist --project-name "$CLOUDFLARE_PROJECT_NAME_RESOLVED" --branch main
```

This keeps Pages Functions discoverable by direct upload without adding a root Worker entrypoint or root `wrangler.toml`.

Required SPA redirect:

```text
/* /index.html 200
```

This must remain in `ALQASEER-PWA/public/_redirects` so `/login` and other SPA routes do not return 404 after direct navigation.

## No-Card Backend HTTPS API Deployment

Preferred no-card pilot path when Render is blocked by billing/payment requirements:

- Backend host: Vercel Hobby project `dopamine-crm-api` from `CRM/backend`.
- Database: Aiven Free PostgreSQL.
- Frontend/PWA: Cloudflare Pages direct upload workflow.

Deployment pack:

- `CRM/backend/api/index.py`
- `CRM/backend/vercel.json`
- `CRM/backend/.vercelignore`
- `CRM/backend/.env.example`

Smoke endpoint:

```text
GET https://<vercel-backend>.vercel.app/api/v1/health
```

Minimum Vercel env vars:

- `DPM_ENV=production`
- `DATABASE_URL=<aiven-postgresql-url>`
- `PROD_DATABASE_URL=<aiven-postgresql-url>`
- `JWT_SECRET=<strong random secret, at least 16 chars>`
- `ALLOWED_ORIGINS=https://<cloudflare-pages-project>.pages.dev`
- `ALLOWED_ORIGIN_REGEX=^https://<cloudflare-pages-project>(?:-[a-z0-9-]+)?\.pages\.dev$`
- `SEED_DEFAULT_USERS=false`
- `ALLOW_DEV_TOKEN_ENDPOINT=false`
- `ALLOW_DEV_TOKEN=false`

The backend rejects production startup with SQLite. Production must use a managed PostgreSQL URL.

After Vercel returns the HTTPS backend URL, use:

```text
VITE_API_BASE_URL=/api/v1
```

The Cloudflare Pages Function uses the Vercel backend as upstream. The browser must use the same-origin Cloudflare URL, not the Vercel URL directly.

Future custom CRM subdomain options are documented but not active in this task:

- `crm.dopaminepharma.com`
- `app.dopaminepharma.com`

The official company domain and emails are available for later setup. DNS, email, MX, SPF, DKIM, and DMARC are out of scope for this deployment task.

Limits:

- Aiven Free PostgreSQL is pilot-only: 20 max connections, no SLA, 1 GB storage.
- Vercel Hobby is pilot-only and subject to Hobby/serverless limits.
- This path is not the final production architecture.

## Render Backend HTTPS API Deployment

Render is no longer the preferred no-card path for this run because the account returned payment/billing blockers. Keep this section only as a secondary option if the owner later approves Render billing.

Deployment pack:

- `CRM/backend/Dockerfile`
- `CRM/backend/render.yaml`
- `CRM/backend/.env.example`

Smoke endpoint:

```text
GET https://<render-service>.onrender.com/api/v1/health
```

Minimum production env vars:

- `DPM_ENV=production`
- `PROD_DATABASE_URL=<managed PostgreSQL URL>`
- `JWT_SECRET=<strong random secret, at least 16 chars>`
- `ALLOWED_ORIGINS=https://<cloudflare-pages-project>.pages.dev`
- `ALLOWED_ORIGIN_REGEX=^https://<cloudflare-pages-project>(?:-[a-z0-9-]+)?\.pages\.dev$`
- `SEED_DEFAULT_USERS=false`
- `ALLOW_DEV_TOKEN_ENDPOINT=false`
- `ALLOW_DEV_TOKEN=false`

After Render returns the HTTPS service URL, use:

```text
VITE_API_BASE_URL=https://<render-service>.onrender.com/api/v1
```

Set that value in GitHub Actions as a repository variable or secret before running the Cloudflare Pages workflow.

## Docker Compose Full Stack

## Required Environment (`.env.prod`)

Start from `.env.prod.example` and set real values:

- `DPM_ENV=production`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `PROD_DATABASE_URL`
- `JWT_SECRET` (strong, >= 16 chars, non-default)

Operationally required for safe production posture:

- `ALLOWED_ORIGINS` must contain trusted `https://` origins only.
- `ALLOWED_ORIGIN_REGEX` should be tightened to your owned pilot domains.
- Keep `SEED_DEFAULT_USERS=false`.
- Keep `ALLOW_DEV_TOKEN_ENDPOINT=false` and `ALLOW_DEV_TOKEN=false`.

## Deployment Commands

```powershell
copy .env.prod.example .env.prod
# edit .env.prod with real secrets and production origins
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

## Health and Smoke Checks

- Backend health: `GET /api/v1/health`
- CRM shell: `GET /`
- PWA shell: `GET /pwa/`
- PWA installability signals:
  - `GET /pwa/manifest.webmanifest`
  - `GET /pwa/sw.js`

## Known Constraint

This workspace currently cannot execute `docker` commands (`docker` CLI not available here), so Compose execution must be performed by owner/devops on a machine with Docker installed.
