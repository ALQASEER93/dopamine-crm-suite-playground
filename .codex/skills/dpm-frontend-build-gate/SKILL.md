---
name: dpm-frontend-build-gate
description: Runs CRM/frontend and ALQASEER-PWA builds/tests on Windows; if spawn EPERM blocks, falls back to Docker/WSL and reports the best working path.
---

# DPM Frontend Build Gate

Use this skill to run frontend builds/tests with a Windows-first flow and fallback to Docker/WSL if Windows spawn EPERM blocks builds.

## Run

```powershell
powershell -ExecutionPolicy Bypass -File .codex/skills/dpm-frontend-build-gate/scripts/run_frontend_gate.ps1
```

## What it does

- Attempts Windows builds for `CRM/frontend` and `ALQASEER-PWA`.
- If a spawn EPERM is detected, it falls back to Docker (Node 20) and optionally WSL.
- Always writes a consolidated report to `docs/_runs/frontend_gate_<timestamp>.md`.

## Scripts

- `scripts/windows_build.ps1` (Windows build/test flow)
- `scripts/docker_build.ps1` (Docker fallback flow)
- `scripts/wsl_build.ps1` (Optional WSL fallback flow)
- `scripts/run_frontend_gate.ps1` (Orchestrator)

## Notes

- Docker fallback requires Docker Desktop running.
- WSL fallback requires `wsl.exe` and a working Linux distribution.
