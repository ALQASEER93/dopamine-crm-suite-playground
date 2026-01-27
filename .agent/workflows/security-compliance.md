---
description: "Antigravity workflow for security-compliance."
---

Workflow: security-compliance

Attach and obey:
@docs/AGENTS/agents/00_GLOBAL_GUARDRAILS.md
@docs/AGENTS/agents/08_SECURITY_COMPLIANCE.md

Output policy:
- Do not create a new run folder if one already exists for the current run.
- If a run folder is not provided, use the most recent docs/_runs/run_*.
- If no run folder exists, stop and ask Program Director to create one.
- Write all artifacts only under docs/_runs/run_<timestamp>/{logs,json,artifacts}/.
- Produce a single report file: docs/_runs/run_<timestamp>/artifacts/security-compliance_report.md.
- Log to docs/_runs/run_<timestamp>/logs/security-compliance.log.
- If a step fails: write docs/_runs/run_<timestamp>/artifacts/PHASE_FAILURE_ANALYSIS.md, apply the smallest fix, and re-run only the failing step.

Task:
- Execute the mission from the attached docs.
- Keep wording concise and operational.
