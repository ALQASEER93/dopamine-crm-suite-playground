# Codex Execution Plan (max 3 phases)

## Phase 0 — Audit, Guardrails, CI (Completed)
- Tasks: update AGENTS with non-destructive/Arabic+Dark/PWA+GPS rules; add CI for backend/frontend/PWA; wire Codex review + auto-fix; publish architecture/progress plans.
- Tests: `python -m pytest -q` (backend), `npm run test:ci && npm run build` (frontend), `npm run build` (PWA).

## Phase 1 — Core CRM (Auth/RBAC + Entities + Visits baseline)
- Tasks: enforce RBAC roles (Admin, Rep-Med, Rep-Sales/Collections, Supervisor); CRUD + pagination for HCPs, pharmacies, reps, territories, products; visits baseline (no GPS) with soft delete; admin user management; audit log; import (CSV/Excel) for HCP/Pharmacy; export visits CSV/Excel; Arabic + dark UI refinements.
- Tests: backend pytest suite for auth/entities/visits; frontend vitest coverage for auth flows, CRUD pages, exports; PWA smoke build.

## Phase 2 — Field Force GPS + Offline + Maps (Killer Feature)
- Tasks: visit Start/End with GPS timestamps/accuracy + validation; offline queue/sync with dedupe; admin map dashboard with trails + flags + geofencing; Google Maps integration; FCM notifications when feasible; exports (CSV/Excel, optional PDF) for visits + flags.
- Tests: backend GPS/validation pytest; frontend/PWA vitest for start/end flows + offline queue; e2e smoke for admin map view; build checks for frontend + PWA.
