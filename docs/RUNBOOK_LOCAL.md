# Local Runbook (Dev Only)

## Seeded Credentials (Change for Production)

These accounts are seeded for local/dev convenience. Rotate or disable before any production use.

- Admin: `admin@example.com` / `Admin12345!`
- Sales manager: `sales_manager@example.com` / `Sales12345!`
- Medical rep: `rep1@example.com` / `Rep12345!`
- Medical rep: `rep2@example.com` / `Rep12345!`
- Medical rep: `rep3@example.com` / `Rep12345!`

## RUNBOOK: verify_pack + Android emulator smoke
Local verify_pack (runs backend + frontend + PWA checks and writes `docs/_runs/verify_pack_*.md`):
- `pwsh -NoProfile -File scripts/verify_pack.ps1`

Local Android emulator smoke (builds debug APK, runs emulator, injects geo, verifies telemetry, writes `docs/_runs/android_smoke_*.md`):
- Prereqs: Android SDK/AVD, JDK 17, Node.js, and backend running on `http://127.0.0.1:8000`.
- Emulator API base URL: set `DPM_ANDROID_API_BASE_URL=http://10.0.2.2:8000/api/v1`.
- Run: `pwsh -NoProfile -File scripts/smoke_android_location.ps1`

CI (GitHub Actions):
- PRs: `.github/workflows/verify-pack-android-smoke.yml` runs `scripts/verify_pack.ps1`.
- Nightly: same workflow runs the emulator smoke and uploads `docs/_runs` artifacts (reports + logs).
