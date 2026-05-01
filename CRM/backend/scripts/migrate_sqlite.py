from __future__ import annotations

import logging
from typing import Iterable

from sqlalchemy import text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


def _get_sqlite_columns(conn, table_name: str) -> Iterable[str]:
    """Return column names for a SQLite table."""
    result = conn.execute(text(f"PRAGMA table_info('{table_name}')"))
    return [row[1] for row in result]


def _ensure_visits_is_deleted(engine: Engine) -> None:
    """Add visits.is_deleted if missing (SQLite only)."""
    if engine.url.get_backend_name() != "sqlite":
        return

    with engine.begin() as conn:
        columns = _get_sqlite_columns(conn, "visits")
        if not columns:
            logger.info("visits table not found; skipping is_deleted migration.")
            return

        if "is_deleted" in columns:
            return

        logger.info("Adding visits.is_deleted column (INTEGER NOT NULL DEFAULT 0).")
        conn.execute(
            text("ALTER TABLE visits ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0")
        )


def _ensure_optional_column(
    engine: Engine,
    *,
    table_name: str,
    column_name: str,
    sqlite_type: str,
) -> None:
    """Add an optional SQLite column when missing."""
    if engine.url.get_backend_name() != "sqlite":
        return

    with engine.begin() as conn:
        columns = _get_sqlite_columns(conn, table_name)
        if not columns:
            logger.info("%s table not found; skipping %s migration.", table_name, column_name)
            return

        if column_name in columns:
            return

        logger.info("Adding %s.%s column (%s).", table_name, column_name, sqlite_type)
        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {sqlite_type}"))


def run_sqlite_migrations(engine: Engine) -> None:
    """
    Run lightweight SQLite migrations to keep schema aligned with models.
    Safe to execute on every startup.
    """
    _ensure_visits_is_deleted(engine)
    # Keep geo columns aligned with ORM models for older SQLite databases.
    for table_name, column_name, sqlite_type in (
        ("doctors", "latitude", "REAL"),
        ("doctors", "longitude", "REAL"),
        ("pharmacies", "latitude", "REAL"),
        ("pharmacies", "longitude", "REAL"),
        ("visits", "start_lat", "REAL"),
        ("visits", "start_lng", "REAL"),
        ("visits", "end_lat", "REAL"),
        ("visits", "end_lng", "REAL"),
        ("orders", "rep_id", "INTEGER"),
        ("collections", "rep_id", "INTEGER"),
    ):
        _ensure_optional_column(
            engine,
            table_name=table_name,
            column_name=column_name,
            sqlite_type=sqlite_type,
        )
