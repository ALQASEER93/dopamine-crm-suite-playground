from __future__ import annotations

import logging
import os
from typing import Mapping, Optional

from sqlalchemy.orm import Session

from models.crm import User
from services.auth import ensure_bootstrap_admin_user

logger = logging.getLogger(__name__)

ENV_APP_ENV = "DPM_ENV"
ENV_BOOTSTRAP_ONCE = "DPM_BOOTSTRAP_ADMIN_ONCE"
ENV_BOOTSTRAP_EMAIL = "DPM_BOOTSTRAP_ADMIN_EMAIL"
ENV_BOOTSTRAP_PASSWORD = "DPM_BOOTSTRAP_ADMIN_PASSWORD"
ENV_BOOTSTRAP_NAME = "DPM_BOOTSTRAP_ADMIN_NAME"

_TRUTHY = {"1", "true", "yes", "y", "on"}


def _is_truthy(value: str | None) -> bool:
    if value is None:
        return False
    return value.strip().lower() in _TRUTHY


def _require_env(env: Mapping[str, str], name: str) -> str:
    value = (env.get(name) or "").strip()
    if not value:
        raise RuntimeError(f"Missing required env var: {name}")
    return value


def maybe_bootstrap_admin_on_startup(
    db: Session,
    *,
    env: Mapping[str, str] = os.environ,
) -> Optional[object]:
    """
    Opt-in admin bootstrap on app startup.

    Safe-by-default:
    - Production only (DPM_ENV=production).
    - Disabled unless DPM_BOOTSTRAP_ADMIN_ONCE is truthy.
    - Runs only for first-admin bootstrap when there are no users.
    - Never logs the password.
    - Delegates idempotency + escalation refusal to ensure_bootstrap_admin_user().
    """
    app_env = (env.get(ENV_APP_ENV) or "").strip().lower()
    if app_env != "production":
        return None

    if not _is_truthy(env.get(ENV_BOOTSTRAP_ONCE)):
        return None

    if db.query(User.id).first() is not None:
        logger.warning("Startup admin bootstrap skipped: users already exist.")
        return None

    try:
        email = _require_env(env, ENV_BOOTSTRAP_EMAIL)
        password = _require_env(env, ENV_BOOTSTRAP_PASSWORD)
        name = (env.get(ENV_BOOTSTRAP_NAME) or "").strip() or "Admin"

        logger.info("Startup admin bootstrap enabled; attempting bootstrap for email=%s", email.strip().lower())
        result = ensure_bootstrap_admin_user(db, email=email, password=password, name=name)
        logger.info(
            "Startup admin bootstrap result: created=%s reason=%s email=%s",
            result.created,
            result.reason,
            result.email,
        )
        return result
    except (RuntimeError, ValueError) as exc:
        # Do not block startup; refuse escalation / misconfiguration should be visible via logs.
        logger.error("Startup admin bootstrap skipped: %s", exc)
        return None
