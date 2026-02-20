## الملخص (Summary)
- What changed:
- Why:
- Related issue/ticket:

## النطاق (Scope)
- In scope:
- Out of scope:

## الاختبارات المنفذة (Tests Run)
- [ ] `cd CRM/backend && python -m pytest -q` (if backend touched)
- [ ] `cd CRM/frontend && npm ci && npm test && npm run build` (if frontend touched)
- [ ] `cd CRM/frontend && npm audit --omit=dev --audit-level=high` (if frontend touched)
- [ ] `cd ALQASEER-PWA && npm ci && npm run test:vitest && npm run build` (if PWA touched on macOS/Linux)
- [ ] `pwsh -File scripts/windows_safe_npm_ci.ps1 -AppPath ALQASEER-PWA -AppName ALQASEER-PWA -RunDir <run_dir> -LogsDir <run_logs> -AdditionalNpmCommands @('npm audit --omit=dev --audit-level=high','npm run test:vitest')` (if PWA touched on Windows)
- [ ] Additional manual checks:

## التحقق من المسارات الحرجة (Critical Flow Verification)
- [ ] Visits Start/End not regressed
- [ ] GPS timestamp/accuracy not regressed (if relevant)
- [ ] Offline queue/sync not regressed (if relevant)
- [ ] Exports CSV/Excel/PDF not regressed (if relevant)
- [ ] Arabic-first and default dark mode expectations preserved (if relevant)

## MCP / Apps / Skills (if used)
- MCP queries and selected tools:
- Apps used (GitHub/Linear/Slack/Vercel/etc.):
- Skills used:
- Connector gaps/fallbacks:
- [ ] `Skills` were used for matching tasks (or explicit reason documented)
- [ ] `MCP` discovery/results were logged for external-system actions
- [ ] `Multi-agent` was used for cross-surface changes (or reason documented)
- [ ] `Apps` were used when connectors were available (or reason documented)
- [ ] `why_no_mcp` documented for any fallback path

## Deployment and Run Artifacts
- docs/_runs current reference (must remain stable unless owner-approved): `docs/_runs/LATEST.txt`
- run outputs path: `docs/_runs/run_<YYYYMMDD_HHMMSS>/`
- zipped artifact created under run folder (e.g. `artifacts.zip`)
- Run/report helper docs reviewed:
  - [ ] `docs/_runs/README.md`
  - [ ] `docs/_runs/REPORT_ROTATION_POLICY.txt`
- Deployment links / environment notes:

## Release Governance
- [ ] Default release gate preserved as `APPROVE_RELEASE=NO` unless explicitly owner-approved
- [ ] `OWNER_ACTIONS` are UI-only (GitHub/Vercel/Linear/etc.), no manual shell execution
- [ ] No instructions asking the user to run manual shell commands

## المخاطر والمتابعة (Risks and Follow-up)
- Residual risks:
- Follow-up items:

## Checklist
- [ ] Closest `AGENTS.md` rules followed
- [ ] No destructive operations
- [ ] No secrets added to code/logs
- [ ] API base assumptions kept stable (`http://127.0.0.1:8000/api/v1`)
- [ ] PR body includes: what changed, validation commands, residual risks
