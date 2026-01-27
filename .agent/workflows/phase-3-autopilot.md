---
description: "Antigravity workflow for phase-3-autopilot."
---

Workflow: phase-3-autopilot

Attach and obey:
@docs/AGENTS/agents/00_GLOBAL_GUARDRAILS.md
@docs/AGENTS/agents/01_PROGRAM_DIRECTOR.md

Output policy:
- Obey .agent/rules/1.md at all times.
- If a run folder is not provided, use the most recent docs/_runs/run_* for AUDIT mode only.
- In EXEC mode, create a new run folder docs/_runs/run_<timestamp>/{artifacts,logs,json}/.
- Write all artifacts only under docs/_runs/run_<timestamp>/{logs,json,artifacts}/.
- Log to docs/_runs/run_<timestamp>/logs/phase-3-autopilot.log.
- If a step fails: write docs/_runs/run_<timestamp>/artifacts/PHASE_FAILURE_ANALYSIS.md, apply the smallest fix, and re-run only the failing step.

Mode selection:
- If ALLOW_REPO_WRITES is not YES, run in AUDIT mode only.
- If ALLOW_REPO_WRITES=YES, run in EXEC mode.
- If APPROVE_RELEASE=YES, release steps are allowed after GO_NO_GO is written.

Task (AUDIT mode):
- Do not write outside docs/_runs/run_<timestamp>/.
- Produce GO_NO_GO.md and blockers only, then stop.
- Note why full execution is blocked and how to re-run with ALLOW_REPO_WRITES=YES.

Task (EXEC mode):
1) Create a new run folder docs/_runs/run_<timestamp>/{artifacts,logs,json}/.
2) Repo cartography: produce artifacts/repo_map.md and artifacts/size_breakdown.md.
3) Phase 2 consistency:
   - Ensure workflow registry + agent docs + RUNBOOK are consistent.
   - Update docs/AGENTS/agents/*.md, .agent/workflows/*.md, docs/AGENTS/RUNBOOK.md as needed.
4) Phase 3 builds/tests:
   - Backend: create venv, install deps, run unit/integration tests, write test output to run folder.
   - CRM frontend: install deps, typecheck/lint/build/tests if present, write logs to run folder.
   - ALQASEER-PWA: install deps, typecheck/lint/build, prepare e2e preconditions, write logs to run folder.
5) Security/QA:
   - Run available checks (bandit/ruff/pip-audit/npm audit/semgrep/gitleaks) if present.
   - Write outputs to run folder.
6) Final artifacts (run folder):
   - SUMMARY.md
   - QA_REPORT.md
   - SECURITY_REPORT.md
   - GO_NO_GO.md
   - CONTRACTS_REPORT.md (if applicable)
7) Release gate:
   - If APPROVE_RELEASE=YES, proceed with release steps (tag/build/deploy scripts if defined).
   - Otherwise stop after GO_NO_GO.md.
