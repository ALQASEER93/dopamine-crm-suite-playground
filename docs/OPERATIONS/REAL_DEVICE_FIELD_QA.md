# Real Device Field QA

This checklist is for controlled DOPAMINE PWA field readiness on Android and iPhone. Use only clearly labeled QA/demo customers such as `DPM QA TEST CUSTOMER - SAFE TO DELETE`.

## Verdict Model
- `WEB_CI_VERDICT`: build, lint, tests, screenshots, and bridge artifact status.
- `REAL_DEVICE_VERDICT`: Android/iPhone or emulator evidence status.
- `FIELD_PILOT_VERDICT`: whether a limited pilot can start after device proof.

Do not convert browser-emulated GPS into a physical-device pass. Browser proof is useful for regression checks; field pilot proof requires a real phone/tablet or a clearly labeled emulator run.

## Automated Android Discovery
The DPM Review Bridge runs `scripts/dpm/discover_android_device.mjs` in read-only mode.

It records:
- adb availability and version.
- connected Android device or emulator state.
- Android version/model/viewport when a device is authorized.
- exact owner action when adb is missing, unauthorized, or no device is connected.

The discovery step does not install tools, deploy, mutate data, or store credentials.

## Android Chrome PWA
- Open `https://dopamine-crm-suite-playground.pages.dev` over HTTPS.
- Log in with a temporary QA rep account without recording credentials.
- Confirm `/account`, `/customers`, `/today-route`, `/visits`, `/reports`, and `/live-map` open without redirecting to login.
- Install/open the PWA from Chrome when available.
- Grant precise location when prompted.
- If Windows/adb shows an RSA prompt, unlock the device and approve USB debugging for the QA machine.
- Start a visit from a QA customer profile.
- Confirm GPS start shows latitude/longitude/accuracy/timestamp or a clear Arabic error.
- Start Call, wait at least 30 seconds, add a structured QA note, and end the call.
- Switch offline, add one queueable action if supported, and confirm an offline/pending indicator.
- Reconnect and verify sync completes without duplicate visits.
- End Visit and confirm GPS end is captured.
- Verify the visit appears in `/visits`, customer history, and reports.

## iPhone Safari PWA
- Open the same HTTPS URL in Safari.
- Use Add to Home Screen and launch from the home-screen icon.
- Repeat login, route access, GPS allow/deny, Start Visit, Start Call, End Visit, and offline/reconnect checks.
- Confirm Safari location prompt text and whether precise location is available on the target iOS version.
- Record any Safari storage, service-worker, background sync, or install limitation as WARNING, not PASS.

## HTTPS And Permission Requirements
- Geolocation requires HTTPS in production; use only the canonical Pages URL for device proof.
- Denied GPS must leave the visit screen usable and show an Arabic limitation/error.
- Unavailable/timeout GPS must not fake coordinates.
- Approximate/low-accuracy GPS must be recorded as warning evidence, not as a clean pass.

## Visit Flow Matrix
For each device run, record PASS/WARNING/BLOCKED for:
- App open and authenticated rep account.
- Customer selection from the assigned list.
- Start Visit and duplicate active-visit prevention.
- GPS allowed.
- GPS denied.
- GPS unavailable/timeout where possible.
- Active visit resume after refresh.
- Start Call / discussion timer.
- Structured note entry.
- Offline pending note or action.
- Reconnect/retry sync.
- End Visit with GPS end.
- Visit appears in `/visits`, customer profile history, and reports.
- No duplicate visit and no real doctor/pharmacy record mutation.

## PWA Diagnostics To Capture
- Browser/platform and viewport.
- PWA installed/standalone mode vs browser mode.
- Online/offline state.
- Service worker registration/update state.
- App build/version marker.
- Geolocation permission state.
- Last sync and pending queue count.
- API base is same-origin `/api/v1`.

## What Can Be Automated
- Browser route checks.
- Screenshot capture.
- Build/version/service worker checks.
- Browser-emulated GPS and offline simulation.

## What Omar Must Test Physically
- Actual Android/iPhone GPS permission prompts.
- Precise vs approximate location behavior.
- Mobile network interruption and reconnect.
- PWA install/open behavior on the target devices.
- Camera/OS/browser permission UI if introduced later.

## Pass Criteria Before Field Pilot
- Rep login succeeds on the real device.
- Start Visit captures GPS start or shows a correct Arabic limitation.
- Start Call timer runs and the note is saved.
- Offline queue or limitation is visible and does not lose the session.
- Reconnect does not duplicate the visit.
- End Visit captures GPS end.
- The visit appears in history and reports.
- No real doctor/pharmacy record is damaged.
- No credentials or session data are stored in reports or artifacts.

## Go / No-Go
- GO: all pass criteria are met on at least one Android device and one iPhone/Safari PWA path is understood.
- CONDITIONAL: Android passes but iPhone or offline sync has documented limitations.
- NO-GO: login, Start Visit, GPS capture, End Visit, or sync integrity fails.
