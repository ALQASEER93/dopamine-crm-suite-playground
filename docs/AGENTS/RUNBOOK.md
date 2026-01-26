# Antigravity Runbook

Use Workspace + Open editor for execution.

Run `/program-director` first.

Then run each workflow as requested:
- repo-cartographer
- backend-lead
- crm-frontend-lead
- pwa-lead
- data-integrations
- qa-verification
- security-compliance
- mobile-packager
- devops-release
- field-rep-simulator
- unblocker-incident (only if needed)

Artifacts live only under:
docs/_runs/run_<timestamp>/{logs,json,artifacts}/

Each workflow writes a single report file in:
docs/_runs/run_<timestamp>/artifacts/
