# SECURITY NOTES

- Bootstrap is disabled by default; opt-in via DPM_BOOTSTRAP_ADMIN_ON_STARTUP.
- Never logs passwords.
- If the email exists but is not admin: refuses escalation and logs an error (no role change).
