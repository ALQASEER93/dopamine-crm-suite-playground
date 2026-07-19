# DOPAMINE CRM Current Project Canon

Generated: 2026-06-22 06:11:22 Asia/Amman

## Current State
- Repo root: `D:\ALQASEER_DEV\dopamine-crm-suite_PLAYGROUND`
- Branch: `codex/field-ready-completion`
- Latest local source commit before this canon update: `6293109 feat(admin): add safe customer import and assignment workflow`
- Latest evidence run at canon update: `docs/_runs/run_20260622_061122/`
- Previous evidence run: `docs/_runs/run_20260622_055833/`
- Previous verdict: `PASS_LOCAL_COMMITS_READY`
- Branch is local-only ahead of origin. No push, deploy, DNS change, PR mutation, external DB mutation, or live import has been performed in the June 22 local cleanup.
- Remote GitHub checks, CodeQL, Preview deployment, authenticated Preview browser proof, runtime DB proof, real-device GPS/offline proof, and customer UI proof remain pending until explicitly approved and run.

## Product Identity
DOPAMINE CRM is a real Arabic-first, RTL, dark-mode, mobile-first Field Force CRM for pharmaceutical field operations in Jordan.

It is not ERP, billing, accounting, inventory-selling, a fake/demo CRM, or a visual-only prototype. Collection and stock-adjacent modules may exist only where they support field operations and must not steer the product away from visits, routes, customers, GPS, offline/PWA, reports, exports, RBAC, and auth.

## Real Customer Data Rule
- Authoritative workbook for the next data path: `D:\ALQASEER_DEV\dopamine-crm-suite_PLAYGROUND\docs\DPM_HCPs_CRM_Import_Location_Preparation.xlsx`
- Do not invent doctors, pharmacies, customer names, phone numbers, addresses, areas, or coordinates.
- Do not import real customer data unless Omar explicitly approves the target DB and the command is a safe reviewed import path.
- Test-only fixtures are allowed inside tests when clearly labeled and not used as product truth.
- Low-confidence or ungeocoded locations must stay blank/review. Do not generate GPS coordinates without trusted geocoding evidence and confidence/status.

## Vault And Secrets
- Local secrets, tokens, env files, and vault materials may be inspected and used only when required for project execution.
- Never publish or leak raw secrets, raw connection strings, private credentials, cookies, API keys, passwords, env values, screenshots with credentials, or vault contents to GitHub, commits, public logs, reports, screenshots, artifacts, PR comments, ZIPs, or third-party-visible locations.
- Evidence may name a missing file/key/secret name when needed, but must not print raw secret values.

## External Services
Vercel, Cloudflare, Neon, GitHub, and other already-used project infrastructure are valid when needed. Do not default to local-only assumptions. However, do not deploy, mutate DNS, push, merge, release, publish, change PR state, or touch `www.dopaminepharma.com` without explicit Omar approval.

## Current Tooling Stance
- Codex App on Omar's Windows laptop is currently blocked by Not Responding / Disk 100% / forced restart behavior.
- Codex CLI is the active execution engine for current runs.
- Do not use Computer Use or Codex App Browser Use for this blocked state.
- If browser proof is needed, prefer CLI-safe local Playwright or existing stable project tooling.
- Do not install or enable broad MCP/plugin sets during sprint work. Use configured tools read-only when they directly support the task.

## Required Routes
The field PWA path must preserve and prove these routes before field PASS:
- `/account`
- `/customers`
- `/customers/:id`
- `/customers/:customerType/:customerId`
- `/visits`
- `/today-route`
- `/live-map`
- `/reports`

The PWA customer path must prove the live UI and `/api/v1/pwa/customers` agree under authenticated runtime conditions before claiming customer visibility PASS.

## Definition Of Done
For product changes, run the relevant checks before PR:
- Backend: `cd CRM/backend && python -m pytest -q`
- CRM frontend: `cd CRM/frontend && npm ci && npm test && npm run build`
- PWA: `cd ALQASEER-PWA && npm ci && npm test --if-present && npm run build`

For evidence or canon-only runs, minimum proof is:
- branch and HEAD
- before/after working tree status
- files inspected
- commands/checks run
- generated run folder under `docs/_runs/run_<YYYYMMDD_HHMMSS>/`
- ZIP under `docs/_runs/run_<YYYYMMDD_HHMMSS>.zip`
- no raw secret exposure
- explicit skipped checks and reasons

## No Fake PASS
PASS requires direct evidence. Do not claim PASS from DB counts, deployment readiness, env existence, build output, or source inspection alone when the requirement is live/authenticated UI, runtime DB, service worker activation, real-device offline/GPS, or map-coordinate proof.

## Known Conflicts / Current Corrections
- `docs/DEPLOYMENT_CANONICAL.md` still documents an older Aiven Free PostgreSQL no-card pilot path. The current accepted stance allows Vercel, Cloudflare, Neon, GitHub, and other already-used infrastructure as needed, with no local-only bias and no mutation without Omar approval.
- Older frontend planning docs mention products, stock, collections, and ERP-adjacent flows. Current canon keeps DOPAMINE scoped to Field Force CRM; these cannot become the product center or justify demo-only work.
- Pre-existing untracked files under `docs/project_context/docs/_runs/run_20260619_065836/` and `docs/project_context/run_20260619_065836.zip` were observed in the working tree before this canon run and must not be silently overwritten or treated as current evidence.
- `.gitignore` now protects top-level `docs/_runs` evidence plus nested copied evidence under `docs/project_context/docs/_runs/` and `docs/project_context/*.zip`; generated run bundles remain untracked unless Omar explicitly requests otherwise.

## Current Local Implementation State
- The active HTTP auth bootstrap endpoint has been removed locally from both backend auth route copies:
  - `CRM/backend/api/v1/auth.py`
  - `ALQASEER-PWA/CRM/backend/api/v1/auth.py`
- Startup bootstrap remains a local guarded service path only. It refuses Preview/Production, requires explicit local opt-in, skips when users already exist, and uses constant-only safe log messages.
- Normal `POST /api/v1/auth/login` and `GET /api/v1/auth/me` are preserved in both auth route copies.
- Admin customer import/export v2 exists locally under `/api/v1/admin/customers`, protected by admin role checks.
- Customer import supports dry-run planning, apply with audit/staging records, skipped counters, duplicate/review counters, and trusted-coordinate gating.
- Trusted coordinates require valid latitude/longitude, status `trusted`, `geocoded`, or `verified`, and confidence `>= 0.8`. Missing or low-confidence coordinates remain blank/review.
- Route assignment apply exists locally as an admin-reviewed workflow. It blocks unapproved review, blank or ambiguous rep, invalid rep, missing route, route/rep mismatch, missing customer link, missing monthly frequency target, duplicate other-route assignment, and ambiguous route account.
- Route accounts are not created automatically from incomplete workbook assignment source data.
- The CRM frontend has an admin-only Arabic customer-data page for dry-run import, reviewed apply messaging, and CSV export.

## Current Local Verification
- Backend targeted tests passed locally:
  - `test_auth.py`: 4 passed
  - `test_security_surface_guards.py`: 10 passed
  - `test_startup_bootstrap_admin.py`: 7 passed
  - `test_admin_customer_import.py`: 9 passed
- Full backend tests passed locally: 114 passed.
- CRM frontend tests passed locally: 9 passed, 1 skipped.
- CRM frontend production build passed locally.
- No-localhost production guard passed locally.
- These checks are local-only and do not prove GitHub/CodeQL/Preview/live field readiness.

## Next Data Path
- Do not import the real workbook until Omar explicitly approves the target DB and command.
- Do not geocode the workbook or generate coordinates without explicit approval and trusted geocoding evidence.
- Use the admin import dry-run path first, without DB writes, to review create/update/skip/review counts.
- Keep missing phone/email blank rather than placeholder-filled.
- Keep latitude/longitude blank unless trusted geocoding succeeds with acceptable confidence/status.
- Keep live import and field readiness blocked until a trusted assignment source exists and an admin-reviewed route assignment apply run is approved.
- Prove `/api/v1/pwa/customers` and authenticated live UI agree under the same runtime/DB before claiming customer visibility PASS.
