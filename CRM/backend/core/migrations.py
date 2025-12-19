from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

from alembic import command
from alembic.config import Config
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

from core.config import settings

logger = logging.getLogger(__name__)


def _build_config(engine_url: str) -> Config:
    root = Path(__file__).resolve().parent.parent
    ini_path = root / "alembic.ini"
    if not ini_path.exists():
        raise FileNotFoundError(f"Alembic config not found at {ini_path}")

    config = Config(str(ini_path))
    script_location = root / "alembic"
    config.set_main_option("script_location", str(script_location))
    config.set_main_option("sqlalchemy.url", engine_url)
    return config


def run_migrations(engine: Optional[Engine] = None) -> None:
    """Run Alembic migrations up to head using the provided engine URL."""

    engine_url = str(engine.url) if engine is not None else settings.database_url
    config = _build_config(engine_url)
    try:
        command.upgrade(config, "head")
    except SQLAlchemyError:
        logger.exception("Database migration failed for %s", engine_url)
        raise
