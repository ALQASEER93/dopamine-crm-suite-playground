# Canonical Deployment Path (Pilot Candidate)

This repository has two supported deployment tracks for internal pilot usage:

1. Field PWA: GitHub Actions direct upload to Cloudflare Pages from `ALQASEER-PWA/dist`.
2. Full internal stack: Docker Compose with FastAPI, CRM, PWA, and Caddy.

## Status

- Preferred field deployment: `.github/workflows/field-ready-deploy-cloudflare.yml`.
- Internal full-stack deployment: Docker Compose stack below.
- Non-canonical: standalone Vercel/Next.js guides for PWA-only deployment.

## Cloudflare Pages Field Deployment

Workflow: `.github/workflows/field-ready-deploy-cloudflare.yml`

Required GitHub secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Optional GitHub secret:

- `CLOUDFLARE_PROJECT_NAME`

Required GitHub repository variable or secret:

- `VITE_API_BASE_URL`

`VITE_API_BASE_URL` must be the deployed HTTPS FastAPI API base, for example:

```text
https://api.example.com/api/v1
```

The Cloudflare workflow blocks localhost, relative paths, and invalid API URLs for production Pages builds. It deploys the already built static PWA via Wrangler Pages direct upload and does not require a root Worker entrypoint or root `wrangler.toml`.

Required SPA redirect:

```text
/* /index.html 200
```

This must remain in `ALQASEER-PWA/public/_redirects` so `/login` and other SPA routes do not return 404 after direct navigation.

## Backend HTTPS API Deployment

Preferred pilot path when no existing hosted backend URL is available: Render Web Service from `CRM/backend/Dockerfile`.

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
