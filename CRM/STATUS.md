# CRM Progress Status

## Current Score
- **65%** — based on rubric coverage and current automation results.

## Rubric Checklist
- **A) Core platform (20%) – 16/20**
  - Auth login/token issuance present; central API client with error normalization on the frontend.
  - Role-aware filtering implemented for visits and rep-scoped data, but broader enforcement/CI hardening still pending.
- **B) Master data CRUD (25%) – 15/25**
  - Doctors CRUD is complete; pharmacies/products lack delete endpoints and UI coverage remains light.
  - Routes/rep linkage exists but needs richer alias/territory management.
- **C) Field execution (25%) – 17/25**
  - Visits CRUD plus dashboard summary/latest endpoints implemented and now covered by smoke checks.
  - Routes module supports creation/listing but lacks updates and deeper planning UX.
- **D) Commercial workflows (20%) – 12/20**
  - Orders/collections/stock/targets have basic create/list flows; updates/status transitions and deletes are missing.
- **E) Quality & Ops (10%) – 5/10**
  - Backend pytest and frontend build succeed; smoke scripts now run in-process when no server is running.
  - Alembic/seed pipelines and CI workflows are still absent.

## Known Failures / Gaps
- No Alembic migration pipeline or GitHub Actions CI is configured yet.
- Master data (pharmacies/products) and commercial modules lack full update/delete coverage in both API and UI.
- Routes/territories do not yet support editing or alias management, limiting planning robustness.
- Orders/collections/stock/targets have only minimal status handling; end-to-end workflows need extension.
