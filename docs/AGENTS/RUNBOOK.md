# Antigravity Runbook

Use Workspace + Open editor for execution.

Golden order:
1) /program-director
2) /repo-cartographer
3) Parallel: /backend-lead + /crm-frontend-lead + /pwa-lead
4) /data-integrations
5) /qa-verification
6) /security-compliance
7) /mobile-packager
8) /devops-release
9) /field-rep-simulator
10) /unblocker-incident (only if needed)

How to start a new run:
- Run /program-director to create the shared run folder.
- Use the same run folder for all subsequent agents.

How to resume an existing run:
- Identify the latest docs/_runs/run_* folder.
- Run the next agent and point it to that run folder.

Artifacts live only under:
docs/_runs/run_<timestamp>/{logs,json,artifacts}/

All agents write into the same shared run folder created by Program Director.
