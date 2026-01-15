# Android Native Wrapper (Background Location)

This project wraps the PWA with Capacitor to enable real background location tracking
via a foreground service. The service posts telemetry to the backend and queues
offline points for replay.

## Requirements
- Android Studio (SDK + emulator) or a physical Android device.
- JDK 17.
- Node.js + npm.

## Setup
1) Build the web assets:
   - `cd ALQASEER-PWA`
   - `npm run build`
2) Sync Capacitor:
   - `npx cap sync android`
3) Open Android:
   - `npx cap open android`

### API Base URL
Set `VITE_API_BASE_URL` to a device-accessible backend address. For Android
emulator, use `http://10.0.2.2:8000/api/v1`. For physical devices, use the LAN
IP or a public HTTPS endpoint.

## Background Location Permissions
The native wrapper requests:
- `ACCESS_FINE_LOCATION` (foreground)
- `ACCESS_BACKGROUND_LOCATION` (background)
- `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_LOCATION`
- `POST_NOTIFICATIONS` (Android 13+)

Android requires a persistent notification for foreground services. The service
starts after login and uses the current auth token.

## Runtime Notes
- Telemetry endpoint: `POST /api/v1/telemetry/location`
- Payload fields: `lat`, `lng`, `accuracy`, `speed`, `bearing`, `ts`, `device_info`, `source`
- Offline queue: stored in app private storage and flushed on next success.

## Scripts
- `scripts/build_android_debug.ps1` builds a debug APK.
- `scripts/smoke_android_location.ps1` runs a backend + emulator smoke test and
  verifies telemetry ingestion when possible.
