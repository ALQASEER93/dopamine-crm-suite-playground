Mission: Extend ALQASEER CRM backend using FastAPI.

Project Root: 'CRM'
Backend Root: 'CRM/backend'

=== Scope of this task ===
1) Read the existing FastAPI app in `CRM/backend/main.py` without breaking the current `/` and `/status` endpoints.
2) Design a clean module structure for the backend:
   - `CRM/backend/api` for routers (hcps, pharmacies, visits, auth, reports).
   - `CRM/backend/core` for config, db, security.
   - `CRM/backend/models` for ORM models.
   - `CRM/backend/schemas` for Pydantic models.
3) Implement **HCP (doctors) basic module** as a first real feature:
   - Create SQLAlchemy (or equivalent) models for HCPs.
   - Add CRUD endpoints under `/api/hcps`:
     - `GET /api/hcps` → paginated list.
     - `GET /api/hcps/{id}`.
     - `POST /api/hcps` → create.
     - `PUT /api/hcps/{id}` → update.
     - `DELETE /api/hcps/{id}` → soft delete (mark as inactive).
4) Add minimal validation + error handling + logging for this module.
5) Make sure the structure is ready to be reused later for:
   - Pharmacies
   - Sales reps
   - Visits
   - Reports

=== Constraints & Rules ===
- DO NOT touch any files outside `CRM` and `ALQASEER-PWA`.
- Use the tools `safe_file_read` and `safe_file_write` only with **relative paths** like:
  - `CRM/backend/main.py`
  - `CRM/backend/api/hcps.py`
- Keep code Pythonic, readable, and commented where needed.
- Prefer Dependency Injection style with FastAPI (use `Depends`).
- Do not change the public API of `/` and `/status`.

=== Expected Output ===
- New or updated backend files under `CRM/backend/...` implementing:
  - Backend folder structure.
  - HCP model, schemas, and full CRUD routes.
- The final QA report must summarize:
  - What files were created/updated.
  - How to run and test the backend.
  - Any TODOs for next tasks.
