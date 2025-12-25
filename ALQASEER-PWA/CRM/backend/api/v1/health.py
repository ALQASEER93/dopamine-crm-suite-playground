from __future__ import annotations

import os

from fastapi import APIRouter

from core.config import settings
from core.db import engine

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "db": engine.url.render_as_string(hide_password=True),
        "version": settings.app_version,
        "vercel_env": os.getenv("VERCEL_ENV"),
        "default_admin_reset_raw": bool(os.getenv("DEFAULT_ADMIN_RESET")),
        "default_admin_reset_bool": settings.default_admin_reset,
        "default_admin_email_set": bool(os.getenv("DEFAULT_ADMIN_EMAIL")),
        "default_admin_password_set": bool(os.getenv("DEFAULT_ADMIN_PASSWORD")),
    }
