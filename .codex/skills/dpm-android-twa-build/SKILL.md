---
name: dpm-android-twa-build
description: Generate Android TWA assetlinks.json template and audit build toolchain for the DPM repo. Use when preparing TWA packaging, validating packageId, and optionally attempting a Gradle build if JDK/SDK are present; writes timestamped outputs under docs/_runs.
---

# DPM Android TWA Build

## Run

```powershell
powershell -ExecutionPolicy Bypass -File .codex/skills/dpm-android-twa-build/scripts/run.ps1
```

## Output
- `docs/_runs/assetlinks_<timestamp>.json`
- `docs/_runs/android_build_<timestamp>.md`
