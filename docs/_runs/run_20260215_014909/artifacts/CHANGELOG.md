# CHANGELOG

- Backend: add opt-in startup admin bootstrap gated by DPM_BOOTSTRAP_ADMIN_ON_STARTUP (idempotent; refuses role escalation).
- Docs: document no-manual-command path (set envs + restart).
- Tests: cover env-gated startup bootstrap helper.
