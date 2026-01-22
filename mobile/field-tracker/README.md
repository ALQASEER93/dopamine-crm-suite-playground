# Field Tracker (Android)

## Telemetry Sample Scenario
1) Launch the app and grant foreground/background location permissions.
2) Tap "Start Tracking" and wait for location updates.
3) Toggle airplane mode to simulate offline queueing.
4) Tap "Stop Tracking".
5) Disable airplane mode and tap "Sync Now" to flush queued telemetry.

## Notes
- The backend telemetry endpoints are `/api/v1/telemetry/session/start`, `/api/v1/telemetry/location`, and `/api/v1/telemetry/session/stop`.
- The SDK location must remain external at `D:\Android\Sdk`.
