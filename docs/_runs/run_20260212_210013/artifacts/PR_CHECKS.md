# PR #56 Checks

- Command: `gh pr checks 56 --watch=false`
- Command exit code: 1 (because at least one check is failing)

## Raw Output
```COMMAND: gh pr checks 56 --watch=false
Workers Builds: dopamine-crm-suite-playground	fail	0	https://dash.cloudflare.com/e4c9a910e74d7709cb3ab379ae89f46c/workers/services/view/dopamine-crm-suite-playground/production/builds/4ee7fd2a-353c-44d7-b5aa-3391690b1c0d	
AI Orchestrator	pass	17s	https://github.com/ALQASEER93/dopamine-crm-suite-playground/actions/runs/21954351517/job/63413801927	
ALQASEER PWA	pass	21s	https://github.com/ALQASEER93/dopamine-crm-suite-playground/actions/runs/21954351517/job/63413801930	
CRM Backend (FastAPI)	pass	35s	https://github.com/ALQASEER93/dopamine-crm-suite-playground/actions/runs/21954351517/job/63413802028	
CRM Frontend (Vite/React)	pass	20s	https://github.com/ALQASEER93/dopamine-crm-suite-playground/actions/runs/21954351517/job/63413801971	
CodeQL	pass	2s	https://github.com/ALQASEER93/dopamine-crm-suite-playground/actions/runs/21954351541/job/63427963964	
CodeQL	pass	8s	https://github.com/ALQASEER93/dopamine-crm-suite-playground/runs/63413919621	
CodeQL (javascript)	pass	1m11s	https://github.com/ALQASEER93/dopamine-crm-suite-playground/actions/runs/21954351541/job/63427818697	
CodeQL (python)	pass	1m0s	https://github.com/ALQASEER93/dopamine-crm-suite-playground/actions/runs/21954351541/job/63427818760	
Vercel	pass	0	https://vercel.com/alqaseer93s-projects/dopamine-crm-suite-playground/Hhm9nQQviuffFqBvSXhDaHrzyb79	Deployment has completed
Vercel Preview Comments	pass	0	https://vercel.com/github	
```

## Assessment
- Failing check: `Workers Builds: dopamine-crm-suite-playground` (Cloudflare GitHub App).
- Ruleset evidence (`json/ruleset_11206241.json`, `json/ruleset_12264639.json`) shows required checks are AI Orchestrator, ALQASEER PWA, CRM Backend, CRM Frontend, CodeQL.
- `Workers Builds: dopamine-crm-suite-playground` is not listed as a required check in active rulesets for `main` or `fix/phase3-security`.
- Classification: non-blocking noise (for merge rules).

## OWNER_ACTIONS (UI-only, optional)
- Disable or uninstall the Cloudflare Workers/Pages GitHub App check for this repository if the noise is undesired.
- Or remove that App status from required checks if repository rules are changed later to include it.
