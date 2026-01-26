---
description: "Antigravity workflow for Security & Compliance."
---

Workflow: security-compliance

Attach and obey:
@docs/AGENTS/agents/00_GLOBAL_GUARDRAILS.md
@docs/AGENTS/agents/08_SECURITY_COMPLIANCE.md

Output policy:
- Create docs/_runs/run_<YYYYMMDD_HHMMSS>/ with logs/ json/ artifacts/.
- Write all artifacts only under docs/_runs/run_<timestamp>/{logs,json,artifacts}/.
- Produce a single report file: docs/_runs/run_<timestamp>/artifacts/SECURITY_COMPLIANCE_REPORT.md.
- Log to docs/_runs/run_<timestamp>/logs/security-compliance.log.
- If a step fails: write docs/_runs/run_<timestamp>/artifacts/PHASE_FAILURE_ANALYSIS.md, apply the smallest fix, and re-run only the failing step.

Task:
- Execute the Security & Compliance mission from the attached docs.
- Keep wording concise and operational.
