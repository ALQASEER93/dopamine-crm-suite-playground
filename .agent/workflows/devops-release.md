---
description: "Antigravity workflow for DevOps & Release."
---

Workflow: devops-release

Attach and obey:
@docs/AGENTS/agents/00_GLOBAL_GUARDRAILS.md
@docs/AGENTS/agents/10_DEVOPS_RELEASE.md

Output policy:
- Create docs/_runs/run_<YYYYMMDD_HHMMSS>/ with logs/ json/ artifacts/.
- Write all artifacts only under docs/_runs/run_<timestamp>/{logs,json,artifacts}/.
- Produce a single report file: docs/_runs/run_<timestamp>/artifacts/DEVOPS_RELEASE_REPORT.md.
- Log to docs/_runs/run_<timestamp>/logs/devops-release.log.
- If a step fails: write docs/_runs/run_<timestamp>/artifacts/PHASE_FAILURE_ANALYSIS.md, apply the smallest fix, and re-run only the failing step.

Task:
- Execute the DevOps & Release mission from the attached docs.
- Keep wording concise and operational.
