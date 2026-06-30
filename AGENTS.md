# AGENTS.md - DOPAMINE CRM Suite Root Guardrails

This root file is a routing and safety guardrail for Codex work in this repository. Keep it small, stable, and defer product truth to the current canon.

## Read First

Before implementation, audit, or planning work that depends on project context, read:

- `docs/project_context/DPM_CURRENT_STATE_DYNAMIC_POINTER.md`
- `docs/project_context/DPM_PROJECT_CANON_CURRENT_20260630.md`
- `docs/project_context/DPM_CODEX_OPERATING_RULES_20260630.md`
- `docs/project_context/PROJECT_SOURCES_ACTIVE_INDEX.md`
- `docs/project_context/PROJECT_CANON_CURRENT.md`
- `docs/project_context/PROJECT_INSTRUCTIONS_CLEAN_CURRENT.md`
- `docs/_runs/LATEST.txt` if present

## Source Of Truth

- `docs/project_context/DPM_PROJECT_CANON_CURRENT_20260630.md` is the current project source of truth.
- `docs/project_context/PROJECT_SOURCES_ACTIVE_INDEX.md` defines which source files are active versus superseded.
- `AGENTS.md` is a root routing and guardrail file only.
- If `AGENTS.md` conflicts with the active 2026-06-30 canon, the canon wins.
- `README.md`, `MASTER_PACK.md`, old reports, old deployment notes, and chat attachments are references only, not current truth unless verified.

## Project Identity

DOPAMINE CRM is an Arabic-first, true RTL, dark-mode, mobile-first Field Force CRM for pharmaceutical field operations in Jordan.

It is not ERP, billing, accounting, collection, payment, inventory-selling, fake/demo CRM, or visual-only prototype work.

Core scope includes doctors/HCPs, pharmacies/HCOs, territories, rep assignments, customer profiles, today route, visit lifecycle, GPS start/end, offline-capable visit capture, monthly frequency targets, due/overdue logic, manager reports, and genuine exports where supported.

## Project Layout

- `CRM/backend` - FastAPI backend
- `CRM/frontend` - CRM frontend
- `ALQASEER-PWA` - field PWA
- `docs/project_context` - current project canon and instructions
- `docs/_runs` - generated evidence runs only

## Hard Safety Rules

- No fake PASS, DONE, or READY.
- Evidence first.
- No destructive operations or broad folder wipes.
- No deploy, DNS change, push, merge, release, publish, or PR state change without explicit Omar approval.
- Do not touch `www.dopaminepharma.com` unless explicitly requested.
- Do not create provisioning endpoints, bootstrap endpoints, hidden admin routes, auth bypasses, temporary login bypasses, or backdoors.
- Do not expose secrets, tokens, cookies, env values, passwords, API keys, private keys, private credentials, or raw connection strings in code, docs, screenshots, reports, logs, JSON, artifacts, PR comments, or ZIPs.
- Do not invent real-looking doctors, pharmacies, customer names, phone numbers, emails, areas, addresses, or coordinates.
- Do not import real customer data into any DB unless Omar explicitly approves the target DB and command.
- Do not generate GPS coordinates unless from trusted geocoding with confidence/status. Low-confidence and ungeocoded locations stay blank/review.
- Preserve Visits, GPS, Offline, PWA, Exports, RBAC, and Auth.
- Arabic must render as real Arabic, not unicode escapes.
- UI must be true RTL and mobile-first.
- Dark mode is default.

## Real Customer Data

- Current real workbook path: `docs/DPM_HCPs_CRM_Import_Location_Preparation.xlsx`
- Do not import it without explicit approval.
- Do not geocode it without explicit approval.
- Dry-run profiling is allowed only if it performs no DB writes and does not print raw customer values.
- Test fixtures are allowed only when synthetic, tiny, and clearly labeled test-only.
- Missing phone/email remains blank, not placeholder-filled.
- Latitude/longitude remains blank unless trusted geocoding succeeds with acceptable confidence/status.

## Required CRM Routes Before Field PASS

Field PASS requires these routes to exist and work under the relevant authenticated runtime:

- `/account`
- `/customers`
- `/customers/:id`
- `/customers/:customerType/:customerId`
- `/visits`
- `/today-route`
- `/live-map`
- `/reports`

Before claiming customer visibility PASS, prove authenticated live UI and `/api/v1/pwa/customers` agree under the same runtime/DB conditions.

## API Routing

- Local development may use `http://127.0.0.1:8000/api/v1`.
- Public, preview, production, field, Cloudflare Pages, Vercel, or real-device browser builds must not point browser API traffic to localhost.
- For public, preview, or field builds, use same-origin `/api/v1` or an explicitly approved and audited proxy/API route.
- Any public or field build that sends browser traffic to `127.0.0.1`, `localhost`, or an accidental direct backend domain is BLOCKED until audited.

## Cloudflare And Deployment Caution

- Do not mix Cloudflare Pages and Workers accidentally.
- Do not add a random Worker entrypoint or root `wrangler.toml` just to satisfy a deploy command.
- Cloudflare Pages Direct Upload or GitHub Actions may be used only when explicitly requested and audited.
- No deploy, DNS, Pages project mutation, Worker mutation, or production change without explicit Omar approval.

## Required Output Discipline

All generated reports, logs, JSON, screenshots, artifacts, and ZIPs must go under:

`docs/_runs/run_<YYYYMMDD_HHMMSS>/`

Required structure:

```text
docs/_runs/run_<YYYYMMDD_HHMMSS>/
  report.md
  master_audit.md
  size_breakdown.md
  logs/
  json/
  artifacts/
docs/_runs/run_<YYYYMMDD_HHMMSS>.zip
docs/_runs/LATEST.txt
```

Never write final outputs to repo root, `docs_runs/`, `reports/`, random temp folders, or outside the repo. If a tool creates output elsewhere, copy/move it into the current run folder and document original and final locations in `report.md`.

Generated run outputs should remain untracked unless intentionally committed as templates or README-only documentation.

## Evidence Rules

Every serious run must include:

- scope
- branch and HEAD
- before/after working tree status
- files inspected
- files changed
- commands/checks run
- tests/build results
- skipped checks and reasons
- screenshots when UI is touched
- browser validation when frontend/PWA runtime behavior is touched
- visible build/version proof when UI/PWA is touched
- service-worker/cache proof when PWA is touched
- offline queue proof when offline behavior is touched
- no-secrets statement
- no deploy/DNS/push/merge/PR mutation statement
- PASS, WARNING, or BLOCKED verdict
- remaining blockers
- next actions

PASS requires direct evidence. Do not claim PASS from DB counts, source inspection, build output, env existence, or deployment readiness alone when the requirement is live/authenticated UI, runtime DB, service worker activation, real-device offline/GPS, or map-coordinate proof.

## Quality Gates

Run only gates relevant to files changed.

For an `AGENTS.md`-only governance task, do not run backend, frontend, or PWA full tests unless needed. At minimum run:

- `git status --short`
- `git diff -- AGENTS.md`
- a repository-safe text scan over `AGENTS.md` for duplicate H1 headings and forbidden/conflicting text
- any available markdown lint/check if already configured and safe

Document skipped backend, frontend, and PWA tests when application code was not changed.

Standard gates for future product changes:

Backend:

```powershell
cd CRM/backend
python -m pytest -q
```

CRM frontend:

```powershell
cd CRM/frontend
npm ci
npm test --if-present
npm run build
```

PWA:

```powershell
cd ALQASEER-PWA
npm ci
npm test --if-present
npm run build
```

## Git And PR Rules

- Work through branch and PR.
- Keep commits small and traceable.
- No direct push to main.
- No push at all without explicit Omar approval.
- No merge or PR state change without explicit Omar approval.
- PR notes must say what changed, how it was tested, and what remains.

## Codex Tooling Stance

- Current active execution engine: Codex CLI.
- Use the strongest suitable tools allowed by `docs/project_context/DPM_CODEX_OPERATING_RULES_20260630.md`.
- Codex App, Browser/Chrome, Computer Use, Playwright, plugins, MCPs, Skills, and service tools are allowed when they improve execution or evidence.
- Prefer CLI-safe local Playwright or stable existing project tooling when browser proof is needed and it is sufficient.
- Mutating external services requires an explicit authorization envelope.
- Do not install or enable broad tool/plugin sets unless they directly support the task.

## Source-Access Gate Before Implementation

Before implementation work that depends on project context, Codex must prove it can read:

- `AGENTS.md`
- `docs/project_context/DPM_PROJECT_CANON_CURRENT_20260630.md`
- `docs/project_context/DPM_CODEX_OPERATING_RULES_20260630.md`
- `docs/project_context/DPM_CURRENT_STATE_DYNAMIC_POINTER.md`
- `docs/project_context/PROJECT_SOURCES_ACTIVE_INDEX.md`
- `docs/project_context/PROJECT_CANON_CURRENT.md`
- `docs/project_context/PROJECT_INSTRUCTIONS_CLEAN_CURRENT.md`

The proof must include exact paths, SHA256 hashes, first/last lines, and confirmation that hard rules and required routes are present. The 2026-06-30 active sources win over superseded compatibility files.

## Review Priorities

Prioritize P0/P1 issues:

- secrets leakage
- RBAC/auth regressions
- backdoors/provisioning/bootstrap/auth bypass
- visit lifecycle bugs
- GPS start/end bugs
- offline queue duplication/loss
- PWA/service-worker/cache regressions
- reports/exports regressions
- public build accidentally using a local-only API host
- fake field workflow
- fake customer data

## Skills Guidance

- Do not bloat `AGENTS.md` with long repeated workflows.
- Reusable workflows should become repo skills under `.agents/skills/` when needed.
- Suggested future skills:
  - `dpm-run-bundle`
  - `dpm-field-crm-audit`
  - `dpm-pwa-gps-offline-audit`
  - `dpm-cloudflare-deploy-audit`
  - `dpm-no-fake-pass-review`
  - `dpm-customer-data-safety`
- Keep `AGENTS.md` small, stable, and focused on rules that must apply every time.
