# TODO Master Checklist (Pharma CRM)

## P0 — Guardrails, CI, Automation (this PR)
- [x] Enforce AGENTS.md with non-destructive rules, Arabic/Dark defaults, visits + GPS/PWA focus.
- [x] CI runs backend pytest, frontend test:ci + build, and PWA build on push/PR.
- [x] Codex review + auto-fix workflows wired with OPENAI_API_KEY guardrails and PR-first policy.
- [x] Architecture + execution plan + progress docs committed.

## P1 — Core CRM (Auth/RBAC + Entities + Visits baseline)
- [ ] Implement RBAC roles (Admin, Rep-Med, Rep-Sales/Collections, Supervisor optional) enforced on APIs and UI routes.
- [ ] CRUD + search + pagination for doctors/HCPs, pharmacies/accounts, reps, territories (account assignment), products.
- [ ] Visits baseline without GPS: create/list/update with server-side pagination and soft delete.
- [ ] Admin user management endpoints + UI; audit log for create/update/soft-delete actions.
- [ ] Import (CSV/Excel) for HCP/Pharmacy; export visits to CSV/Excel.
- [ ] Tests green across backend/frontend/PWA.

## P2 — Field Force GPS + Offline + Maps (Killer Feature)
- [ ] Visit Start/End with GPS timestamps/accuracy; validation prevents end before start or duplicate open visits.
- [ ] Offline queue + sync for visit actions; dedupe on sync.
- [ ] Admin dashboard with maps (Google Maps), per-rep timeline, and suspicion flags (short visits, jumps, low accuracy, outside geofence).
- [ ] Geofencing rules per account radius; flag start/end outside boundary.
- [ ] Notifications via FCM where feasible (alerts + reminders) without breaking auth/PWA.
- [ ] Exports for visits + flags (CSV/Excel; PDF optional if stable).
- [ ] All tests green; mobile-first PWA remains Arabic + dark by default.
