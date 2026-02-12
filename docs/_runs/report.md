# Field-Ready Evidence Report

- Run folder: docs/_runs/run_20260212_210013
- Scope: CI/workflows + deploy evidence packaging for PR #56
- Branch: codex/fix-cloudflare-field-ready-evidence-20260212
- Commit (local): 5233192eb7b85efd13bce3edf0fa0bde8e9f2f67

## Outcomes
- Workflow patched to production deploy behavior (removed --branch from Wrangler pages deploy).
- Local gates: backend failed (runtime missing), frontend passed, PWA passed.
- Cloudflare field-ready workflow dispatched via gh, completed successfully, artifacts downloaded.
- PR checks analyzed; failing Cloudflare Workers App check is not in active required checks rulesets.
- Merge readiness: NO-GO pending backend pytest evidence. Cloudflare evidence is from post-push run 21958521508 on patched SHA.

## Core Evidence
- docs/_runs/run_20260212_210013/artifacts/STATE.md
- docs/_runs/run_20260212_210013/artifacts/WORKFLOW_ASSERTIONS.md
- docs/_runs/run_20260212_210013/artifacts/WF_PATCH.md
- docs/_runs/run_20260212_210013/artifacts/GATES.md
- docs/_runs/run_20260212_210013/artifacts/SPA_GATE.md
- docs/_runs/run_20260212_210013/artifacts/CLOUDFLARE_DEPLOY_EVIDENCE.md
- docs/_runs/run_20260212_210013/artifacts/PR_CHECKS.md
- docs/_runs/run_20260212_210013/artifacts/GO_NO_GO.md

