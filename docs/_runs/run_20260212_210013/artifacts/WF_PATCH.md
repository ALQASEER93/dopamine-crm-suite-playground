# Workflow Patch

- File: `.github/workflows/field-ready-deploy-cloudflare.yml`
- Reason: production deploy to Cloudflare Pages must not pass `--branch`; using `--branch` targets preview environments instead of default production deployment.

## Applied Change
```diff
- wrangler pages deploy ... --project-name "$CLOUDFLARE_PROJECT_NAME_RESOLVED" --branch "main"
+ wrangler pages deploy ... --project-name "$CLOUDFLARE_PROJECT_NAME_RESOLVED"
```

## Assertion Status After Patch
- A) No `--branch` in deploy command: PASS
- B) Project exact-match via `wrangler pages project list --json` + Node strict equality: PASS
- C) Smoke checks include parsed `deployment_url`, computed `production_url`, retries/backoff/timeouts: PASS
- D) Log artifacts uploaded (`project-ensure.log`, `deploy.log`, `smoke.log`): PASS
- E) `WRANGLER_VERSION` pinned to `4.64.0`: PASS
