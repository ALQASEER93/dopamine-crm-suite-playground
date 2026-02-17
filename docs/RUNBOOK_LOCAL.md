# Local Runbook (Dev Only)

This document is local-dev only. Do not use `127.0.0.1` or `localhost` for field/staging/production deployments.
Use deployed HTTPS API hosts via app env vars:
- CRM frontend: `VITE_API_BASE_URL` (fallback alias `VITE_API_URL`)
- ALQASEER-PWA (Vite paths): `VITE_API_BASE_URL`
- ALQASEER-PWA (Next-based paths/utilities): `NEXT_PUBLIC_CRM2_API_BASE` (fallback `NEXT_PUBLIC_API_BASE`)

## Seeded Credentials Policy (Dev-only)
`SEED_DEFAULT_USERS` is dev-only. Never keep or share real seeded passwords in docs.

Use placeholders only:
- Admin: `<ADMIN_EMAIL>` / `<ADMIN_PASSWORD_PLACEHOLDER>`
- Sales manager: `<SALES_MANAGER_EMAIL>` / `<SALES_MANAGER_PASSWORD_PLACEHOLDER>`
- Medical rep: `<REP1_EMAIL>` / `<REP1_PASSWORD_PLACEHOLDER>`
- Medical rep: `<REP2_EMAIL>` / `<REP2_PASSWORD_PLACEHOLDER>`
- Medical rep: `<REP3_EMAIL>` / `<REP3_PASSWORD_PLACEHOLDER>`

## Team Workflow References
- `docs/OPERATIONS/AGENT_OS_PLAYBOOK.md`
- `docs/OPERATIONS/PR_EXECUTION_CHECKLIST.md`
- `docs/OPERATIONS/INCIDENT_RUNBOOK.md`
