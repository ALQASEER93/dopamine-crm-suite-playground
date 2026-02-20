# MCP + Skills Execution Protocol (DPM)

## Objective
Ensure Codex features are used in a real, measurable, and repeatable way across `CRM/backend`, `CRM/frontend`, and `ALQASEER-PWA`.

## Mandatory execution order
1. Scope check:
   - Identify touched surfaces (`backend`, `frontend`, `pwa`, `ops/docs`).
2. Skill selection:
   - If task matches a listed skill, use it before fallback.
3. MCP-first action:
   - For external systems (GitHub/Linear/Notion/Slack/Vercel), use MCP/App tools first.
4. Multi-agent split:
   - Use parallel agents when more than one surface is touched.
5. Gate verification:
   - Run only relevant gates for changed surfaces before PR.

## Required ownership model (multi-agent)
1. Agent A: backend-only ownership (`CRM/backend/**`).
2. Agent B: frontend-only ownership (`CRM/frontend/**`).
3. Agent C: PWA-only ownership (`ALQASEER-PWA/**`).
4. Agent D: ops/docs/workflows ownership (`docs/**`, `.github/**`, scripts).
5. Each agent must report:
   - changed files
   - commands run
   - residual risks

## Skill routing by project-critical workflows
1. CI failure triage:
   - `gh-fix-ci` first.
2. PR comment handling:
   - `gh-address-comments`.
3. Visit/GPS/offline validation:
   - `playwright` + relevant tests.
4. Security-hardening tasks:
   - `security-best-practices` and/or `security-threat-model`.
5. OpenAI/Codex product/API guidance:
   - `openai-docs` only.
6. Reporting exports:
   - `spreadsheet` (CSV/XLSX) and `pdf` (PDF output).
7. Notion knowledge sync:
   - `notion-*` skills when stakeholder documentation is requested.

## MCP usage policy (enforced)
1. External operation without MCP discovery is non-compliant.
2. If connector is unavailable:
   - mark blocker/non-blocker
   - document fallback and impact in run artifacts.
3. Never expose secrets in MCP prompts/comments.

## Quality and speed KPIs
1. Parallelization KPI:
   - multi-agent used for all cross-surface tasks.
2. Delivery KPI:
   - each PR includes verification commands and outputs.
3. Rework KPI:
   - avoid repeat CI failures by running local gates for touched surfaces.
4. Security KPI:
   - no P0/P1 unresolved findings in RBAC, visits/GPS/offline, or secrets handling.

## PR checklist extension (must include)
1. Which skills were used and why.
2. Which MCP tools/apps were used.
3. Whether multi-agent split was used; if not, why not.
4. Exact validation commands run per changed surface.
