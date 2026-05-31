# DPM Review Bridge

The DPM Review Bridge creates a sanitized handoff package for PR review so Codex, GitHub Actions, and ChatGPT can refer to the same evidence without manual file uploads.

## Scope

- Repository: `ALQASEER93/dopamine-crm-suite-playground`
- Workflow: `.github/workflows/dpm-review-bridge.yml`
- Local bundle script: `scripts/dpm/create-review-bridge-bundle.mjs`
- PR comment script: `scripts/dpm/post-review-bridge-comment.mjs`
- Sanitizer: `scripts/dpm/sanitize-review-bridge.mjs`

The bridge does not deploy, change DNS, merge PRs, mark PRs ready for review, create provisioning endpoints, or create auth bypasses.

## Triggers

- Manual: `workflow_dispatch`
- Automatic: `pull_request`
- Comment: `/dpm-review-bridge`

The comment trigger is limited to PR comments from repository owners, members, or collaborators. For comment-triggered runs, forked PR heads are refused before checkout.

## Generated Run Package

Each run creates:

- `docs/_runs/run_<YYYYMMDD_HHMMSS>/report.md`
- `docs/_runs/run_<YYYYMMDD_HHMMSS>/CHATGPT_HANDOFF.md`
- `docs/_runs/run_<YYYYMMDD_HHMMSS>/json/chatgpt_handoff.json`
- `docs/_runs/run_<YYYYMMDD_HHMMSS>/logs/`
- `docs/_runs/run_<YYYYMMDD_HHMMSS>/artifacts/`
- `docs/_runs/run_<YYYYMMDD_HHMMSS>/artifacts/screenshots/`
- `docs/_runs/run_<YYYYMMDD_HHMMSS>.zip`

GitHub Actions uploads the zip as an artifact with 14-day retention.

## Validation Behavior

The bridge runs available checks and records every command in the run logs:

- `CRM/backend`: Python dependency install if `requirements.txt` exists, then `python -m pytest -q`
- `CRM/frontend`: `npm ci`, `npm test --if-present`, optional `lint` / `typecheck` if scripts exist, then `npm run build`
- `ALQASEER-PWA`: `npm ci`, `npm test --if-present`, optional `lint` / `typecheck` if scripts exist, then `npm run build`

Missing components are marked `skipped`. Failed commands are recorded but do not prevent artifact creation.

## PR Comment

The workflow posts or updates exactly one PR comment containing:

```html
<!-- DPM_REVIEW_BRIDGE -->
```

If a marker comment already exists, it is updated instead of creating a duplicate. If no PR number is available, the workflow still creates and uploads the artifact and marks PR-comment posting as skipped.

## ChatGPT Handoff

`CHATGPT_HANDOFF.md` always includes these sections:

1. RUN
2. VERDICT
3. WHAT CODEX / WORKFLOW DID
4. CHANGED FILES
5. VALIDATION
6. ARTIFACTS
7. SECURITY CHECK
8. DEPLOYMENT CHECK
9. RISKS / BLOCKERS
10. NEXT BEST ACTION

The final section includes the exact one-line block Omar can send to ChatGPT.

## Local Use

From the repository root:

```powershell
node scripts/dpm/create-review-bridge-bundle.mjs
```

This creates a local ignored run folder and zip under `docs/_runs/`. It does not post a PR comment because there is no GitHub Actions artifact ID in local mode.

## Safety Notes

- `docs/_runs/*` and `docs/_runs/*.zip` remain ignored by `.gitignore`.
- The sanitizer scans generated bridge artifacts for common secret patterns.
- Do not add credentials, cookies, tokens, storage state, screenshots with passwords, or environment values to the run package.
- Artifact ID is only available after the GitHub upload step, so local handoffs use `unavailable` or `pending` for artifact fields.
