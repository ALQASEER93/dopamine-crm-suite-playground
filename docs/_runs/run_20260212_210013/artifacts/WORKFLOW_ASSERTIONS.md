# Workflow Assertions

- File checked: `.github/workflows/field-ready-deploy-cloudflare.yml`
- A) Deploy command has no `--branch`: PASS (after patch)
- B) Project exact-match via `wrangler pages project list --json` + strict Node equality: PASS
- C) `deployment_url` parsing + `production_url` + retry/backoff/timeouts: PASS
- D) `project-ensure.log`, `deploy.log`, `smoke.log` uploaded as artifacts: PASS
- E) `WRANGLER_VERSION: "4.64.0"`: PASS

Rule recorded: passing `--branch` in `wrangler pages deploy` targets preview deployments; production deploy should rely on default production target.
