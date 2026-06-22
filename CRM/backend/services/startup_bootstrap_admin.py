from __future__ import annotations

import logging
import os
from typing import Mapping, Optional

from sqlalchemy.orm import Session

from models.crm import User
from services.auth import ensure_bootstrap_admin_user

logger = logging.getLogger(__name__)

ENV_APP_ENV = "DPM_ENV"
ENV_VERCEL_ENV = "VERCEL_ENV"
ENV_BOOTSTRAP_ONCE = "DPM_BOOTSTRAP_ADMIN_ONCE"
ENV_BOOTSTRAP_EMAIL = "DPM_BOOTSTRAP_ADMIN_EMAIL"
ENV_BOOTSTRAP_PASSWORD = "DPM_BOOTSTRAP_ADMIN_PASSWORD"
ENV_BOOTSTRAP_NAME = "DPM_BOOTSTRAP_ADMIN_NAME"

_TRUTHY = {"1", "true", "yes", "y", "on"}
_LOCAL_BOOTSTRAP_APP_ENVS = {"development", "local", "test"}
_BLOCKED_VERCEL_ENVS = {"preview", "production"}


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
    - Local/development only.
    - Refuses Vercel Preview and Production even when the flag is set.
    - Disabled unless DPM_BOOTSTRAP_ADMIN_ONCE is truthy.
    - Runs only for first-admin bootstrap when there are no users.
    - Never logs bootstrap credential values.
    - Delegates idempotency + escalation refusal to ensure_bootstrap_admin_user().
    """
    app_env = (env.get(ENV_APP_ENV) or "").strip().lower()
    vercel_env = (env.get(ENV_VERCEL_ENV) or "").strip().lower()
    logger.info("Startup admin bootstrap local guard evaluated.")
    if vercel_env in _BLOCKED_VERCEL_ENVS or app_env not in _LOCAL_BOOTSTRAP_APP_ENVS:
        logger.info("Startup admin bootstrap skipped by safe guard.")
        return None

    if not _is_truthy(env.get(ENV_BOOTSTRAP_ONCE)):
        logger.info("Startup admin bootstrap skipped by safe guard.")
        return None

    if db.query(User.id).first() is not None:
        logger.info("Startup admin bootstrap skipped by safe guard.")
        return None

    try:
        email = _require_env(env, ENV_BOOTSTRAP_EMAIL)
        password = _require_env(env, ENV_BOOTSTRAP_PASSWORD)
        name = (env.get(ENV_BOOTSTRAP_NAME) or "").strip() or "Admin"

        result = ensure_bootstrap_admin_user(db, email=email, password=password, name=name)
        logger.info("Startup admin bootstrap completed in allowed local environment.")
        return result
    except (RuntimeError, ValueError):
        # Do not block startup; keep configuration details out of logs.
        logger.info("Startup admin bootstrap skipped by safe guard.")
        return None
