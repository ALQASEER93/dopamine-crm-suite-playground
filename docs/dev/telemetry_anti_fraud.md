# Telemetry Anti-Fraud Baseline

This document defines minimum enforcement required for rep telemetry.

## Required Gates
1) Play Integrity attestation (Android)
- All telemetry requests must include an attestation token.
- Server must verify token freshness, package name, and device verdicts.
- Status: Required; server verification not yet enforced in code.

2) Server-side anomaly checks
- Reject or flag points with impossible speed, large jumps, or inconsistent timestamps.
- Enforce dwell-time rules for geofenced locations.
- Status: Required; implement validation pipeline on ingestion.

3) Background tracking policy compliance
- Use foreground service for continuous tracking.
- Request background location permission with user education and settings toggle.
- Status: Implemented on Android module; server policy enforcement pending.

## Acceptance Criteria
- Attestation verification is mandatory for telemetry endpoints.
- Anomaly checks are applied before storing locations.
- Background tracking follows Android policy and is auditable.
