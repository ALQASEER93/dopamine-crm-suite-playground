# PHASE4_LAUNCH_PLAN

## Scope
Phase 4 focuses on internal launch readiness with Arabic-first UX, Dark Mode default, visits+GPS integrity, and offline/PWA stability.

## Order of Execution
1. CRM + PWA (web) hardening and rollout.
2. Android internal distribution via Capacitor (APK).
3. iOS later (TestFlight or MDM path, not part of Phase 4).

## CRM + PWA (First)
- Verify visit lifecycle (Start/End with GPS, timestamp, accuracy).
- Validate offline queue behavior for visits.
- Confirm reports and exports (CSV/Excel/PDF) remain intact.
- Run CI-equivalent gates locally before merge.

## Android via Capacitor (Second)
- Initialize Capacitor and wire web build output.
- Configure Android permissions for foreground location service.
- Ensure incremental permission prompts for background location.
- Produce signed internal APK for managed device distribution.
- Test on a representative device set (Android versions used in field).

## iOS (Later)
- Plan for iOS packaging after Android stabilization.
- Decide distribution channel (internal TestFlight/MDM).
- Re-validate location permissions and background modes on iOS.

## Acceptance Criteria
- Gates pass locally and in CI.
- Visits+GPS+offline unchanged or improved.
- Internal Android rollout plan documented and repeatable.
