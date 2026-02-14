"""
Idempotent admin bootstrap (safe-by-default).

Reads credentials from environment variables:
- DPM_BOOTSTRAP_ADMIN_EMAIL
- DPM_BOOTSTRAP_ADMIN_PASSWORD
- DPM_BOOTSTRAP_ADMIN_NAME (optional)

Behavior:
- Refuses to run if required env vars are missing.
- Does NOT print the password.
- If an active admin already exists:
  - If it matches the provided email: no-op (exit 0)
  - Otherwise: no-op (exit 0) to avoid creating extra admins unintentionally.
- If no active admin exists:
  - Creates the admin user (or re-activates an existing admin with the same email).

Usage:
  cd CRM/backend
  python -m scripts.bootstrap_admin
"""

from __future__ import annotations

import os
import sys

from sqlalchemy.orm import Session

from core.db import SessionLocal
from services.auth import ensure_bootstrap_admin_user


def _require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required env var: {name}")
    return value


def run(db: Session) -> int:
    email = _require_env("DPM_BOOTSTRAP_ADMIN_EMAIL")
    password = _require_env("DPM_BOOTSTRAP_ADMIN_PASSWORD")
    name = os.environ.get("DPM_BOOTSTRAP_ADMIN_NAME", "").strip() or "Admin"

    result = ensure_bootstrap_admin_user(db, email=email, password=password, name=name)
    if result.created:
        print(f"Admin created: {result.email}")
        return 0
    print(f"No changes: {result.reason} (email={result.email})")
    return 0


def main() -> int:
    try:
        with SessionLocal() as session:
            return run(session)
    except Exception as exc:
        # Do not leak secrets; just print the error message.
        print(f"bootstrap_admin failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

