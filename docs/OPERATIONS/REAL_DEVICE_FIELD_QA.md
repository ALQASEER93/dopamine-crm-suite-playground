# Real Device Field QA

This checklist is for controlled DOPAMINE PWA field readiness on Android and iPhone. Use only clearly labeled QA/demo customers such as `DPM QA TEST CUSTOMER - SAFE TO DELETE`.

## Android Chrome PWA
- Open `https://dopamine-crm-suite-playground.pages.dev` over HTTPS.
- Log in with a temporary QA rep account without recording credentials.
- Confirm `/account`, `/customers`, `/today-route`, `/visits`, `/reports`, and `/live-map` open without redirecting to login.
- Install/open the PWA from Chrome when available.
- Grant precise location when prompted.
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
- Record any Safari storage or service-worker limitation as WARNING, not PASS.

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
