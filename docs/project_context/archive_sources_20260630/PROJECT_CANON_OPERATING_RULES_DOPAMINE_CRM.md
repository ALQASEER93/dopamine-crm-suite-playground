# DOPAMINE CRM Operating Rules

This file is stable operating guidance for local Codex runs. It must not hardcode a latest run folder; dynamic state comes from `docs/_runs/LATEST.txt`.

## Product Definition
DOPAMINE CRM is an Arabic-first, true RTL, dark-mode default, mobile-first Field Force CRM for pharmaceutical field operations in Jordan. It centers doctors/HCPs, pharmacies/HCOs, territories, rep assignments, Customer 360, today route, visit lifecycle, GPS start/end, offline-capable visit capture, monthly frequency targets, due/overdue logic, manager reports, and genuine exports where supported.

## Non-Scope
DOPAMINE CRM is not ERP, billing, accounting, collection, or inventory-selling.

## Repo And Sources
- Repo root: `D:\ALQASEER_DEV\dopamine-crm-suite_PLAYGROUND`
- Working branch: `codex/field-ready-completion`
- Local source directory: `docs/project_context/sources/`
- Do not assume ChatGPT Project Sources exist unless copied locally under that directory.

## Dynamic State Rule
Always read `docs/_runs/LATEST.txt`, open the referenced run folder, and use that evidence before deciding current state. Never hardcode a latest run name in stable sources.

## Vault Rule
If a vault check is needed, construct the path by components only:

```powershell
$VaultRoot = 'D:\ALQASEER_DEV'
$VaultRelative = '_DPM_PRIVATE_VAULT\dpm_crm_local_test_users.md'
$VaultPath = Join-Path $VaultRoot $VaultRelative
```

Do not print vault contents.

## Output Rule
All generated reports, JSON, logs, screenshots, artifacts, and ZIPs must stay under `docs/_runs/run_<YYYYMMDD_HHMMSS>/` with the ZIP beside the folder and `docs/_runs/LATEST.txt` updated after closeout.

## Safety Rules
- No secrets, tokens, cookies, env values, passwords, API keys, private keys, raw connection strings, or vault contents in code, docs, screenshots, logs, JSON, artifacts, PR comments, or ZIPs.
- No deploy, DNS, push, merge, PR mutation, release, or publish without explicit Omar approval.
- No fake data, geocoding, guessed GPS coordinates, customer import/apply, or `route_accounts` mutation without explicit approval.
- Preserve Auth, RBAC, Visits, GPS, Offline, PWA, and Exports.

## Route Contracts
Before field PASS, prove these authenticated routes under the same runtime/DB conditions:
- `/account`
- `/customers`
- `/customers/:id`
- `/customers/:customerType/:customerId`
- `/visits`
- `/today-route`
- `/live-map`
- `/reports`

## Customer Workbook Baseline
- Prepared rows: 3311
- Importable Doctor/Pharmacy rows: 3310
- HCP/Doctor: 1603
- HCO/Pharmacy: 1707
- Office excluded/review-only: 1
- Trusted coordinates: 0
- Rows needing geocoding/review: 3311
- `assigned_rep` filled: 0
- `monthly_frequency_target` filled: 3311

Scenario 5 mismatch rule: importable `monthly_frequency_target` may be 3310 because the Office row is excluded from importable Doctor/Pharmacy rows.

## Verdict Policy
PASS, WARNING, and BLOCKED must be evidence-based. Do not claim PASS from source inspection, DB counts, env existence, build output, or deployment readiness when live/authenticated UI, runtime DB, service worker, real-device offline/GPS, or map-coordinate proof is required.

## Source Refresh Policy
Update stable canon only at milestones. Do not rewrite stable canon every run. Each serious run should update `LATEST.txt`, `CURRENT_STATE.md`, `CURRENT_STATE.json`, and `RUN_INDEX.md`.

## Speed Rule
Read latest state, fix current blockers or warnings, update current state, then move to the next gate.