# GitHub Actions Setup — Codex + CI

## Required secrets
- `OPENAI_API_KEY`: API key for Codex review bot and auto-fix workflows.
- (Optional) `OPENAI_BASE_URL`, `OPENAI_MODEL`: use if routing through a compatible provider.

## Actions permissions
1. In **Settings → Actions → General**, set **Workflow permissions** to **Read and write** (required for auto-fix PRs).
2. Allow GitHub Actions to create and approve pull requests.
3. Enable **Allow all actions and reusable workflows** or include `openai/codex-action` and `peter-evans/create-pull-request` in the allow list.

## Branch protection (recommended)
- Protect `main` with required status checks: CI (backend pytest, frontend test:ci + build, PWA build).
- Require PR reviews before merge; block force-pushes and deletions.
- Add `CODEOWNERS` with leads for backend, frontend, and PWA scopes to enforce approvals.

## How Codex workflows behave
- **codex-review-bot.yml**: triggers on PR open/sync or `@codex review` comment; read AGENTS.md; comments P0/P1 risks.
- **codex-auto-fix.yml**: triggers when CI fails; if `OPENAI_API_KEY` is missing it exits gracefully; otherwise Codex applies minimal fixes, reruns CI steps, and opens a PR.

## Local verification
- Mirror CI locally before pushing:
  - Backend: `cd CRM/backend && python -m pytest -q`
  - Frontend: `cd CRM/frontend && npm ci && npm run test:ci && npm run build`
  - PWA: `cd ALQASEER-PWA && npm ci && npm run build`
