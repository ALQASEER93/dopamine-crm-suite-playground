# Codex Features Runbook (Multi-agent + Apps)

## Purpose
Standardize how the team uses Codex features introduced in recent updates so results stay consistent across `CRM/backend`, `CRM/frontend`, and `ALQASEER-PWA`.

## Team baseline
1. Use the shared template at `tools/codex/config.toml.example`.
2. Keep `multi_agent` and `apps` enabled by default for contributor machines.
3. Use `--enable multi_agent` and `--enable apps` in scripted runs (`tools/codex/RUN_CODEX.ps1` already does both by default).
4. Apply the execution discipline in `docs/OPERATIONS/MCP_SKILLS_EXECUTION_PROTOCOL.md` for every cross-surface task.

## When to use Multi-agent
Use multi-agent for tasks that naturally split into independent tracks.

### Required in this project
1. Backend + Frontend + PWA coordinated changes.
2. CI failure triage when multiple jobs fail.
3. Security/RBAC review plus test-gap review in parallel.
4. Reporting/export work that touches API + UI + docs.

### Avoid for small tasks
1. Single-file documentation edits.
2. One-line config tweaks with no cross-surface impact.

## Multi-agent ownership pattern (required)
1. Define ownership per agent before execution.
2. Typical split:
   - Agent A: `CRM/backend`
   - Agent B: `CRM/frontend`
   - Agent C: `ALQASEER-PWA`
3. Merge only after each agent reports:
   - changed files
   - tests run
   - residual risks

## Apps usage in this project
Use Apps only when they add direct delivery value and record external actions.

### Preferred Apps by workflow
1. GitHub: PR checks, comments, review status, release workflow.
2. Linear: issue sync and implementation tracking.
3. Slack: stakeholder updates and incident comms.
4. Notion: formal decision and runbook capture.

### Guardrails
1. Follow `docs/OPERATIONS/MCP_APPS_POLICY.md`.
2. Never paste secrets/tokens in prompts or comments.
3. Log external actions in run artifacts when used for delivery decisions.

## Proxy support for restricted networks
If WebSocket access is restricted, set:
1. `WS_PROXY`
2. `WSS_PROXY`

Set these in CI/environment management (not in tracked secrets files).

## CI integration expectations
1. `codex-review-bot.yml` and `codex-auto-fix.yml` must safely skip when `OPENAI_API_KEY` is missing.
2. `.github/workflows/ci.yml` must validate workflow syntax/lint to avoid broken automation merges.

## Verification checklist
1. Local scripted run uses multi-agent by default:
   - `tools/codex/RUN_CODEX.ps1 -PromptPath <file>`
2. Disable switch works when needed:
   - `tools/codex/RUN_CODEX.ps1 -PromptPath <file> -DisableMultiAgent`
   - `tools/codex/RUN_CODEX.ps1 -PromptPath <file> -DisableApps`
3. GitHub workflow lint passes in CI.
4. Codex review workflow posts comment when key exists.
