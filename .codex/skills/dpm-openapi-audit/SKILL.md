---
name: dpm-openapi-audit
description: Audit the FastAPI /openapi.json contract for required DPM CRM routes and GPS field enforcement. Use when verifying that key endpoints exist and visit start/end require lat/lng/accuracy.
---

# DPM OpenAPI Audit

## Run

```powershell
powershell -ExecutionPolicy Bypass -File .codex/skills/dpm-openapi-audit/scripts/run.ps1
```

## Output
- `docs/_runs/openapi_audit_<timestamp>.md`
