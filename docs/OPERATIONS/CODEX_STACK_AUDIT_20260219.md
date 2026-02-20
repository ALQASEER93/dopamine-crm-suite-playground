# Codex Stack Audit — 2026-02-19

## Scope
- Verify practical adoption of latest Codex usage model in this repo:
  - `Multi-agent`
  - `Apps`
  - `MCP`
  - `Skills`
- Confirm high-impact P1 fixes were applied for delivery quality/speed.

## Execution evidence (this run)
- Multi-agent review executed in parallel across:
  - Backend
  - Frontend/PWA
  - Ops/Docs
- Apps/MCP connectivity checks:
  - GitHub identity: `mcp__github__get_me` (OK)
  - GitHub installed repos search: `mcp__codex_apps__github_search_installed_repositories_v2` (OK)
  - Linear teams read: `mcp__linear__list_teams` (OK)
  - Notion search: `mcp__notion__notion-search` (OK)
  - Vercel docs search: `mcp__codex_apps__vercel_search_vercel_documentation` (OK)

## Adoption status
1. Multi-agent
- Status: Adopted
- Evidence:
  - `tools/codex/RUN_CODEX.ps1` enables `--enable multi_agent` by default.
  - `docs/OPERATIONS/CODEX_FEATURES_RUNBOOK.md`
  - `docs/OPERATIONS/MCP_SKILLS_EXECUTION_PROTOCOL.md`

2. Apps
- Status: Adopted
- Evidence:
  - `tools/codex/RUN_CODEX.ps1` enables `--enable apps` by default.
  - `docs/OPERATIONS/CODEX_FEATURES_RUNBOOK.md`

3. MCP
- Status: Enforced policy
- Evidence:
  - `docs/OPERATIONS/MCP_APPS_POLICY.md` updated with stronger fallback logging (`why_no_mcp`).
  - `docs/OPERATIONS/MCP_SKILLS_EXECUTION_PROTOCOL.md` mandates MCP-first external operations.

4. Skills
- Status: Enforced policy
- Evidence:
  - `docs/OPERATIONS/SKILLS_USAGE_MATRIX.md` updated with multi-agent and fallback rationale requirements.
  - `docs/OPERATIONS/MCP_SKILLS_EXECUTION_PROTOCOL.md` routes project workflows to matching skills.

5. PR governance for feature usage
- Status: Enforced
- Evidence:
  - `.github/PULL_REQUEST_TEMPLATE.md` now includes explicit checkboxes for Skills/MCP/Multi-agent/Apps usage and fallback rationale.

## Applied P1 fixes in this cycle
1. Offline location replay endpoint alignment:
- `ALQASEER-PWA/src/pwa/routes/live-map/LiveMapPage.tsx`
- `ALQASEER-PWA/tests/pwa/offline-queue.test.ts`

2. Frontend medical route role guards:
- `CRM/frontend/src/App.jsx`

3. Alembic default DB alignment + migration guidance:
- `CRM/backend/alembic.ini`
- `CRM/backend/README_FASTAPI.md`

4. Deployment doc hardening for JWT secret generation:
- `docs/FREE_DEPLOYMENT_PLAN.md`

## Validation executed
- Backend targeted tests:
  - `CRM/backend/.venv/Scripts/python.exe -m pytest -q CRM/backend/tests/test_samples_medical_affairs.py`
  - Result: `3 passed`
- Frontend build:
  - `cd CRM/frontend && npm run build`
  - Result: success
- PWA targeted tests:
  - `cd ALQASEER-PWA && npm test -- offline-queue.test.ts`
  - Result: `5 passed`

## Remaining gaps (next priority)
1. `SampleRequest.fulfillment_distribution_id` linkage not yet implemented during fulfillment flow.
2. `Caddyfile` serves on `:80` only; confirm TLS termination path for direct exposure.
3. `docs/report manual admin from codex vs code/PLAN.md` encoding should be normalized to UTF-8.

## Conclusion
Core Codex productivity features are now operationalized with policy, defaults, and PR enforcement.
The remaining gaps are implementation/deployment hardening items, not capability-adoption blockers.
