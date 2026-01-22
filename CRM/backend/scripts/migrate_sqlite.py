from __future__ import annotations

import logging
from typing import Iterable

from sqlalchemy import inspect
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


def _get_sqlite_columns(engine: Engine, table_name: str) -> Iterable[str]:
    """Return column names for a SQLite table."""
    inspector = inspect(engine)
    try:
        return [col["name"] for col in inspector.get_columns(table_name)]
    except Exception:
        return []


def _ensure_visits_is_deleted(engine: Engine) -> None:
    """Add visits.is_deleted if missing (SQLite only)."""
    if engine.url.get_backend_name() != "sqlite":
        return

    with engine.begin() as conn:
        columns = _get_sqlite_columns(engine, "visits")
        if not columns:
            logger.info("visits table not found; skipping is_deleted migration.")
            return

        if "is_deleted" in columns:
            return

        logger.info("Adding visits.is_deleted column (INTEGER NOT NULL DEFAULT 0).")
        conn.exec_driver_sql(
            "ALTER TABLE visits ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0"
        )


def run_sqlite_migrations(engine: Engine) -> None:
    """
    Run lightweight SQLite migrations to keep schema aligned with models.
    Safe to execute on every startup.
    """
    _ensure_visits_is_deleted(engine)

