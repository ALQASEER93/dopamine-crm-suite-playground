---
name: dpm-backend-restart-verify
description: Restart and verify the DPM FastAPI backend on Windows. Use when you need to stop the process bound to port 8000, start the backend from this repo, wait for /api/v1/meta/version, and write timestamped logs to docs/_runs.
---

# DPM Backend Restart + Verify

## Run

```powershell
powershell -ExecutionPolicy Bypass -File .codex/skills/dpm-backend-restart-verify/scripts/run.ps1
```

## Behavior
- Stops only the process bound to port 8000.
- Starts the backend from `CRM/backend` using a repo dev script when available.
- Waits for `http://127.0.0.1:8000/api/v1/meta/version`.

## Output
- `docs/_runs/server_version_<timestamp>.json`
- `docs/_runs/backend_<timestamp>.log`
- `docs/_runs/backend_<timestamp>.err.log`
