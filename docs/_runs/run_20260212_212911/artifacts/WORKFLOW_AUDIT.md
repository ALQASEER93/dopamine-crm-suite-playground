# Workflow Audit

File: `.github/workflows/field-ready-deploy-cloudflare.yml`

## Result
- A) No `--branch` in deploy command: PASS
- B) `WRANGLER_VERSION` pinned: PASS (`4.64.0`)
- C) Project ensure exact-match by JSON + node strict equality: PASS
- D) Smoke checks deployment + production URLs (`/` and `/login`) and writes step summary: PASS
- E) Uploads `project-ensure.log`, `deploy.log`, `smoke.log` as artifact: PASS

## Evidence (line references)
- `WRANGLER_VERSION: "4.64.0"` at line 13.
- Deploy command: `wrangler pages deploy ... --project-name "$CLOUDFLARE_PROJECT_NAME_RESOLVED"` at line 146 (no `--branch`).
- Project listing uses `wrangler pages project list --json` at line 89.
- Exact match logic in Node: `return name === target;` inside ensure step (lines around 99-108).
- Smoke URL vars include both deploy and production:
  - `DEPLOY_ROOT="${DEPLOY_URL%/}/"` line 164
  - `PRODUCTION_ROOT="${PROD_URL%/}/"` line 166
- Smoke checks execute all four probes:
  - deploy root/login lines 196-197
  - prod root/login lines 198-199
- Step summary writes both URLs and both status pairs to `$GITHUB_STEP_SUMMARY` (lines 216-225).
- Artifact upload includes:
  - `.github/_ci_logs/cloudflare/project-ensure.log` line 234
  - `.github/_ci_logs/cloudflare/deploy.log` line 235
  - `.github/_ci_logs/cloudflare/smoke.log` line 236

## Commands used for audit
```bash
rg -n "WRANGLER_VERSION|pages deploy|--branch|pages project list --json|DEPLOY_URL|PROD_URL|check_url_with_retry|GITHUB_STEP_SUMMARY|upload-artifact|project-ensure.log|deploy.log|smoke.log" .github/workflows/field-ready-deploy-cloudflare.yml
```
