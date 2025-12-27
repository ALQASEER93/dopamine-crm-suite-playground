# CRM MVP Progress

This document tracks progress against the CRM MVP rubric (target score: 100). Point weights follow the rubric provided by Omar (sum = 110); the percentage below is normalized against those weights.

## Current Score
- Points: 24 / 110 (≈22% of MVP)
- Snapshot rationale: Auth flow works with persisted tokens and cache resets, frontend tests now pass with jsdom setup, but most modules still need full CRUD workflows and reporting.

## Rubric Checklist
| Area | Max Points | Current | Notes |
| --- | --- | --- | --- |
| A) Auth + Roles + Permissions | 10 | 7 | Login flow works, token handling is resilient, and queries refetch after login; role-based UI still light. |
| B1) Doctors CRUD | 10 | 2 | Listing and forms exist but need validation, paging, and e2e coverage. |
| B2) Pharmacies CRUD | 10 | 2 | Similar state as doctors; basic views only. |
| B3) Products CRUD | 10 | 1 | Skeleton present without full UX. |
| C) Routes / Territories | 8 | 0 | Not implemented. |
| D) Visits end-to-end | 12 | 4 | Dashboard summary and latest visits work; creation/editing flows incomplete. |
| E) Orders | 10 | 0 | Not implemented. |
| F) Collections | 10 | 0 | Not implemented. |
| G) Stock / Inventory | 8 | 1 | Basic placeholder only. |
| H) Targets | 6 | 1 | Placeholder. |
| I) Reports (≥3) | 10 | 2 | Stubs exist; real data and endpoints needed. |
| J) Settings / Admin | 4 | 2 | Basic user listing; management features missing. |
| K) QA + DX | 2 | 2 | Backend pytest + smoke scripts pass; frontend build + tests now green after jsdom setup. |

## Baseline Verification (current run)
- Backend: `python -m pytest -q` (pass)
- Backend smoke: `python scripts/smoke_login.py` (pass), `python scripts/smoke_dashboard.py` (pass)
- Frontend: `npm run build` (pass); `npm test` (pass after jsdom setup)
