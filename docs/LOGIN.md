# Local Login (Dev/Test)

This guide is for local development only. Do not use these credentials in production.

## Default Admin

- Email: `admin@example.com`
- Password: `Admin12345!`

## Reset Admin Password (Local Only)

Use the helper script to reset the admin password in the local SQLite database.

```powershell
python CRM/backend/scripts/reset_admin_password.py
```

Optional overrides:

```powershell
python CRM/backend/scripts/reset_admin_password.py --email admin@example.com --password Admin12345!
```

Safety checks:

- Refuses to run when `DPM_ENV=production`.
- Refuses to run against non-local databases.
