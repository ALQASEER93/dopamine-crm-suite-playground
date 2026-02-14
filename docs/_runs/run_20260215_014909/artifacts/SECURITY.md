# SECURITY NOTES

- Bootstrap is disabled by default and only runs when DPM_BOOTSTRAP_ADMIN_ON_STARTUP is truthy.
- Password is never logged; only email + result reason are logged.
- If the email exists but is not admin, the bootstrap refuses escalation (ValueError from ensure_bootstrap_admin_user).
