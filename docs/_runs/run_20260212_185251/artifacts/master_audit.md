# master_audit

## Workflow references
- .github/workflows/field-ready-deploy-cloudflare.yml:11 adds WRANGLER_VERSION = 4.64.0.
- .github/workflows/field-ready-deploy-cloudflare.yml:89 uses pages project list --json with Node exact-name match.
- .github/workflows/field-ready-deploy-cloudflare.yml:127 creates project with --production-branch main when missing.
- .github/workflows/field-ready-deploy-cloudflare.yml:146 deploys via wrangler pages deploy (no --branch flag).
- .github/workflows/field-ready-deploy-cloudflare.yml:175 smoke checks deploy URL + production URL with retry/backoff.
- .github/workflows/field-ready-deploy-cloudflare.yml:221 writes URLs and HTTP codes to GITHUB_STEP_SUMMARY.
- .github/workflows/field-ready-deploy-cloudflare.yml:233 uploads project-ensure.log, deploy.log, smoke.log as workflow artifacts.

## Evidence status
- Local build gate: PASS.
- Live deployment evidence from CI run: غير مذكور.
- Needed file/log: GitHub Actions logs/artifacts for deploy and smoke steps.
