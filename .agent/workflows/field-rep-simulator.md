---
description: "Antigravity workflow for Field Rep Simulator."
---

Workflow: field-rep-simulator

Attach and obey:
@docs/AGENTS/agents/00_GLOBAL_GUARDRAILS.md
@docs/AGENTS/agents/11_FIELD_REP_SIMULATOR.md

Output policy:
- Create docs/_runs/run_<YYYYMMDD_HHMMSS>/ with logs/ json/ artifacts/.
- Write all artifacts only under docs/_runs/run_<timestamp>/{logs,json,artifacts}/.
- Produce a single report file: docs/_runs/run_<timestamp>/artifacts/FIELD_REP_SIMULATOR_REPORT.md.
- Log to docs/_runs/run_<timestamp>/logs/field-rep-simulator.log.
- If a step fails: write docs/_runs/run_<timestamp>/artifacts/PHASE_FAILURE_ANALYSIS.md, apply the smallest fix, and re-run only the failing step.

Task:
- Execute the Field Rep Simulator mission from the attached docs.
- Keep wording concise and operational.
