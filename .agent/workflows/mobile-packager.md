---
description: "Antigravity workflow for Mobile Packager."
---

Workflow: mobile-packager

Attach and obey:
@docs/AGENTS/agents/00_GLOBAL_GUARDRAILS.md
@docs/AGENTS/agents/09_MOBILE_PACKAGER.md

Output policy:
- Create docs/_runs/run_<YYYYMMDD_HHMMSS>/ with logs/ json/ artifacts/.
- Write all artifacts only under docs/_runs/run_<timestamp>/{logs,json,artifacts}/.
- Produce a single report file: docs/_runs/run_<timestamp>/artifacts/MOBILE_PACKAGER_REPORT.md.
- Log to docs/_runs/run_<timestamp>/logs/mobile-packager.log.
- If a step fails: write docs/_runs/run_<timestamp>/artifacts/PHASE_FAILURE_ANALYSIS.md, apply the smallest fix, and re-run only the failing step.

Task:
- Execute the Mobile Packager mission from the attached docs.
- Keep wording concise and operational.
