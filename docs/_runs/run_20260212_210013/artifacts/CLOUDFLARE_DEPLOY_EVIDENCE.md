# Cloudflare Deploy Evidence

- workflow: `.github/workflows/field-ready-deploy-cloudflare.yml`
- run URL: https://github.com/ALQASEER93/dopamine-crm-suite-playground/actions/runs/21958357056
- deployment_url: https://af2ad777.dopamine-crm-suite-playground.pages.dev/
- production_url: https://dopamine-crm-suite-playground.pages.dev/

## HTTP Smoke Evidence
- deployment_url `/`: 200
- deployment_url `/login`: 200
- production_url `/`: 200
- production_url `/login`: 200

## Source Logs
- `docs/_runs/run_20260212_210013/artifacts/gh_artifacts/cloudflare-deploy-smoke-logs-21958357056/deploy.log`
- `docs/_runs/run_20260212_210013/artifacts/gh_artifacts/cloudflare-deploy-smoke-logs-21958357056/smoke.log`

## Missing Evidence
- غير مذكور: none
