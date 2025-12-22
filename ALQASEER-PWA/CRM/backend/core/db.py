from __future__ import annotations

import logging
from pathlib import Path
import tempfile
from typing import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from core.config import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Base class for SQLAlchemy models."""


def _create_engine(url: str) -> Engine:
    connect_args = {}
    normalized_url = url

    if url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}

        if url.startswith("sqlite:///"):
            relative_db_path = url.replace("sqlite:///", "")
            db_path = Path(relative_db_path)
            if not db_path.is_absolute():
                db_path = Path(__file__).resolve().parent.parent / relative_db_path
            db_path = db_path.resolve()
            db_path.parent.mkdir(parents=True, exist_ok=True)
            normalized_url = f"sqlite:///{db_path.as_posix()}"

    engine = create_engine(normalized_url, echo=settings.echo_sql, connect_args=connect_args)

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except OperationalError as exc:
        msg = str(exc).lower()
        if "disk i/o error" in msg or "readonly" in msg:
            logger.error(
                "Primary DB path unavailable (%s): %s. Falling back to temp SQLite.",
                normalized_url,
                exc,
            )
            engine = build_fallback_engine()
        else:
            raise

    return engine


def build_fallback_engine() -> Engine:
    fallback_path = Path(tempfile.gettempdir()) / "crm_fastapi_fallback.sqlite"
    fallback_path.parent.mkdir(parents=True, exist_ok=True)
    fallback_url = f"sqlite:///{fallback_path.as_posix()}"
    engine = create_engine(
        fallback_url,
        echo=settings.echo_sql,
        connect_args={"check_same_thread": False},
    )
    logger.warning("Using fallback SQLite DB at %s", fallback_url)
    return engine


def swap_engine(new_engine: Engine) -> None:
    global engine, SessionLocal
    engine = new_engine
    SessionLocal.configure(bind=new_engine)


engine = _create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
