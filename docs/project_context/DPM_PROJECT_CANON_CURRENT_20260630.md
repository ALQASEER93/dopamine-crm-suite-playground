# DPM Project Canon Current — 2026-06-30

Project: DOPAMINE CRM Suite / dopamine-crm-suite-playground
Status: Active canonical product/source reference. Evidence-first. Not a substitute for the latest repo/run evidence.

## 1. Product identity

DOPAMINE CRM is a real production-track Field Force CRM for a pharmaceutical company in Jordan.

It is:
- Arabic-first.
- True RTL.
- Dark-mode default.
- Mobile-first.
- Focused on field medical/sales force execution for doctors/HCPs and pharmacies/HCOs.

It is not:
- ERP.
- Billing.
- Accounting.
- Collection.
- Inventory-selling.
- A demo/prototype shell.

The product must feel like a serious field tool for medical representatives, not a visual prototype.

## 2. Core domain scope

The CRM focuses on:
- Doctors / HCPs.
- Pharmacies / HCOs.
- Territories.
- Rep assignments.
- Customer 360 profiles.
- Today route.
- Visit lifecycle.
- GPS start/end capture.
- Offline-capable visit capture.
- Monthly frequency targets.
- Due/overdue logic.
- Manager reports.
- Genuine exports where supported.

Preserve:
- Auth.
- RBAC.
- Visits.
- GPS.
- Offline.
- PWA.
- Exports.

## 3. Repo and dynamic state

Repo root:

```text
D:\ALQASEER_DEV\dopamine-crm-suite_PLAYGROUND
```

Main working branch:

```text
codex/field-ready-completion
```

Latest run pointer:

```text
docs/_runs/LATEST.txt
```

Do not hardcode a latest run inside stable sources. Always read `docs/_runs/LATEST.txt`, then open the referenced run folder and JSON files.

## 4. Customer workbook baseline

Workbook role: customer baseline and import-preparation reference only. Use aggregate counts in reports unless Omar explicitly asks for raw local values.

Expected workbook baseline:
- total prepared rows: 3311
- importable Doctor/Pharmacy rows: 3310
- HCP/Doctor: 1603
- HCO/Pharmacy: 1707
- Office: 1 excluded / review-only
- trusted coordinates: 0
- rows needing geocoding/review: 3311
- assigned_rep filled: 0
- monthly_frequency_target filled: 3311

Scenario 5 corrected assignment baseline:
- total customers: 3310
- HCP: 1603
- HCO: 1707
- monthly frequency: 7338
- Rep 1: 662 customers / frequency 1573
- Rep 2: 665 customers / frequency 1494
- Rep 3: 664 customers / frequency 1420
- Rep 4: 660 customers / frequency 1468
- Rep 5: 659 customers / frequency 1383

If a run reports customer counts such as 3428 vs baseline 3310, explain the source before packaging/commit. Possible explanations to audit read-only: different DB/source, old local records, duplicates, demo/test records, non-importable rows included, or outdated local baseline.

## 5. Required route contracts

### `/account`
Must show:
- user identity and role
- territory/territories
- assigned customer counts
- today plan summary
- sync state
- offline queue count if applicable
- GPS/geolocation permission state
- visible build/version for cache proof
- QA/support info without secrets in artifacts

### `/customers`
Must show:
- doctors and pharmacies as distinct customer types
- search and filters
- territory-aware listing
- assignee/rep context
- due/overdue/completed frequency status
- last visit
- monthly frequency target
- Open Profile
- Start Visit

### `/customers/:id` or customer detail drawer
Must show:
- type: HCP/HCO
- specialty/classification/priority
- territory
- assigned rep
- city/area/text address/location context
- monthly frequency target
- actual visits this month
- due/overdue state
- visit timeline
- notes/topics/products
- Start Visit
- Navigate/map context
- Add note
- inquiry/complaint if supported
- no billing/accounting/sales-ledger widgets

### `/visits`
Must show lifecycle:

```text
Planned -> Started -> Checked-in -> In Visit -> Call Recorded -> Ended -> Submitted -> Synced
```

Include customer, type, representative, territory, timestamps, GPS start/end if available, timers, notes, sync status, and lock/submitted status.

### `/today-route`
Must show:
- planned visits
- route order
- territory/area
- due/overdue
- priority
- Start Visit / Open Profile / Map actions
- professional empty states

### `/live-map`
Must be operational, not decorative:
- active visit location if visit is in progress
- assigned nearby customers if supported
- permission/unsupported states
- no fake live-tracking claims
- no guessed coordinates

### `/reports`
Must show:
- planned vs completed visits
- due/overdue customers
- frequency attainment
- rep activity
- territory coverage
- GPS compliance where supported
- genuine exports only where supported

## 6. Product issues Omar already identified

Do not ignore:
- left-side section navigation preferred over bottom navigation
- side drawer/customer detail must remain dark/high-contrast
- Arabic and English support with in-app language switch
- password change UI must be audited/fixed if present but nonfunctional
- customer records must not be name-only
- customer UI must expose city, area, text address/location, specialty, classification, phone, assigned rep, monthly frequency when available
- settings/users previously showed Failed to fetch
- admin role may display incorrectly as sales manager
- Admin Planner should be tested after CSV upload, not just page open
- future geofence around roughly 100m only around trusted coordinates
- no guessed coordinates
- low confidence geocoding remains needs_review

## 7. Evidence policy

Every serious run must include:
- scope
- exact files changed
- tests/builds
- route/browser validation when UI/frontend/PWA is touched
- screenshots when UI is touched
- visible build/version proof
- cache/service-worker proof when PWA is touched
- offline proof when offline is touched
- no unsafe runtime backdoor/auth bypass statement
- no artifact/GitHub secret leakage statement
- no external mutation outside authorization statement
- PASS/WARNING/BLOCKED verdict
- blockers
- next actions

Do not claim PWA/offline/GPS/public staging readiness unless directly proven in the latest evidence.

## 8. Verdict policy

PASS requires direct evidence.
WARNING is for partial evidence, unresolved product gaps, or non-blocking cleanup.
BLOCKED is required for catastrophic or unrecoverable risks, including runtime auth bypass/backdoor, secret leakage into artifacts/GitHub, wrong output path, fake data/GPS/PASS, invalid latest pointer, unsafe deploy/DNS/production mutation, or public build relying on localhost API without a BLOCKED classification.
