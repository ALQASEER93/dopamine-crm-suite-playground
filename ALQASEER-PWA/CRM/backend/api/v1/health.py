from __future__ import annotations

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
    }
