# Superseded Source Notice

This file is historical after the 2026-06-30 source refresh if it conflicts with `docs/project_context/DPM_CODEX_OPERATING_RULES_20260630.md`, `docs/project_context/DPM_PROJECT_CANON_CURRENT_20260630.md`, or `docs/project_context/PROJECT_SOURCES_ACTIVE_INDEX.md`.

# DOPAMINE Project Instructions Clean Current

This file is the concise execution instruction layer referenced by `AGENTS.md`. The current product source of truth remains `docs/project_context/PROJECT_CANON_CURRENT.md`.

## Product Scope

- DOPAMINE CRM is an Arabic-first, true RTL, dark-mode, mobile-first Field Force CRM for pharmaceutical field operations in Jordan.
- Keep work centered on doctors/HCPs, pharmacies/HCOs, territories, rep assignments, customer profiles, routes, visits, GPS, offline/PWA, reports, exports, RBAC, and auth.
- Do not steer DOPAMINE into ERP, billing, accounting, collection, payment, inventory-selling, fake/demo CRM, or visual-only prototype work.

## Hard Safety Rules

- No fake data, fake doctors, fake pharmacies, fake phone numbers, fake addresses, fake areas, or fake coordinates.
- Do not import real customer data unless Omar explicitly approves the exact target DB and command.
- Do not geocode or generate coordinates without explicit Omar approval and trusted geocoding evidence.
- Do not expose secrets, tokens, cookies, OAuth URLs, env values, passwords, API keys, private keys, credentials, or raw connection strings.
- Do not create provisioning endpoints, bootstrap endpoints, hidden admin routes, auth bypasses, temporary login bypasses, or backdoors.
- Do not deploy, change DNS, push, merge, release, publish, or change PR state without explicit Omar approval.
- Preserve Visits, GPS, Offline, PWA, Exports, RBAC, and Auth.

## Evidence Discipline

- All generated reports, logs, JSON, screenshots, artifacts, and ZIPs must stay under `docs/_runs/run_<YYYYMMDD_HHMMSS>/`.
- Every serious run must document scope, branch/status, files inspected, files changed, checks run, skipped checks and reasons, no-secrets status, no external mutation status, verdict, blockers, and next actions.
- Do not claim PASS unless the required proof actually ran. Local source inspection does not prove live/authenticated UI, runtime DB, service worker, real-device GPS/offline, or map-coordinate behavior.

## Assignment Source Rule

- Trusted route assignment sources must be reviewed before apply.
- `review_status` must be `approved` before any apply path is allowed.
- Blank or ambiguous assigned rep fields must never create `route_accounts`.
- Missing phone/email stays blank. Latitude/longitude stays blank unless trusted geocoding succeeds with acceptable confidence/status.
