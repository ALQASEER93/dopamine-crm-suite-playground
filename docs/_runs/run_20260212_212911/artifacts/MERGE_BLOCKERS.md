# Merge Blockers Analysis

## Failing checks observed on PR #56
- Workers Builds: dopamine-crm-suite-playground (FAILURE)

## Required checks source
- `scripts/ruleset-guard.mjs` result: `docs/_runs/run_20260212_212911/artifacts/ruleset_guard/summary.md`
- Required checks matched by ruleset: AI Orchestrator, ALQASEER PWA, CRM Backend (FastAPI), CRM Frontend (Vite/React), CodeQL.

## Decision
- `Workers Builds: dopamine-crm-suite-playground` is NOT in required checks.
- Classification: non-blocking noise.

## OWNER_ACTIONS (UI-only, only if you want to remove noise)
1. GitHub repo Settings -> Installed GitHub Apps -> Cloudflare Workers and Pages -> Configure/Uninstall for this repo.
2. Cloudflare Dashboard -> Workers & Pages -> project -> Git integration -> disable automatic GitHub build status reporting.
3. If branch protection is later changed, ensure this check is not added to required checks.
