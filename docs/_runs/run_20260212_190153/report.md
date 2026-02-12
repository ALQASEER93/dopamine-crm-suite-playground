# Field-Ready Deploy Report

Run: `run_20260212_190153`
Area: `ALQASEER-PWA`

## Summary
- Workflow was audited and corrected for:
  - `wrangler pages deploy ... --branch "main"`
  - smoke curl timeouts
  - safe summary output lines
- Local build/SPA gates passed.
- GitHub Actions deploy proof is now present (URL + smoke 200/200).

## Cloud evidence
- Run URL: `https://github.com/ALQASEER93/dopamine-crm-suite-playground/actions/runs/21954161951`
- Deploy URL: `https://ed90f20f.dopamine-crm-suite-playground.pages.dev/`
- Production URL: `https://dopamine-crm-suite-playground.pages.dev/`
- Smoke:
  - Deploy `/` = 200
  - Deploy `/login` = 200
  - Prod `/` = 200
  - Prod `/login` = 200

## Logs/Artifacts
- Job log: `logs/github_run.log`
- Downloaded artifact logs:
  - `logs/gha_artifact/deploy.log`
  - `logs/gha_artifact/smoke.log`
  - `logs/gha_artifact/project-ensure.log`
