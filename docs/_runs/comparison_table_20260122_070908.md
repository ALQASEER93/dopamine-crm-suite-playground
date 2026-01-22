# Comparison Table (Security Baseline)

| Area | Status | Evidence |
| --- | --- | --- |
| Secrets | cleaned | `docs/_runs/gitleaks_20260122_070908.json` (no leaks) |
| Gitleaks config | enabled | `.gitleaks.toml:4-11`, `.github/workflows/security-gitleaks.yml:18-21` |
| npm audit - CRM/frontend | 0 vulns | `docs/_runs/npm_audit_CRM_frontend_20260122_070908.json` |
| npm audit - ALQASEER-PWA | 0 vulns | `docs/_runs/npm_audit_ALQASEER-PWA_20260122_070908.json` |
| npm audit - CRM/backend | 6 HIGH | `docs/_runs/npm_audit_CRM_backend_20260122_070908.json` (tar/xlsx chain) |
| npm audit - AI-Orchestrator | 0 vulns | `docs/_runs/npm_audit_AI-Orchestrator_20260122_070908.json` |
| Rate limiting | enforced | `CRM/backend/middleware/rate_limit.py:82-97`, `CRM/backend/main.py:95` |
| Dev token endpoint | hardened | `CRM/backend/api/dev.py:23-62`, `CRM/backend/tests/test_dev_token.py:7-34` |
| Python toolchain | CI enforced | `.github/workflows/security-python-audit.yml:24-36`, `CRM/backend/requirements-dev.txt:1-4` |
