from __future__ import annotations

import os
from pathlib import Path
from typing import Literal

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

DEFAULT_ACTIVE_YEAR = os.environ.get("DPM_LEDGER_ACTIVE_YEAR", "2024")


def _normalize_db_dir(value: str) -> Path:
    candidate = Path(value).expanduser()
    if not candidate.is_absolute():
        candidate = (Path.cwd() / candidate).resolve()
    else:
        candidate = candidate.resolve()
    return candidate


DEFAULT_DB_DIR = _normalize_db_dir(
    os.environ.get("DPM_LEDGER_DB_DIR", "D:/CRM ALQASEER/AlJazeera/ledger_sqlite")
)


def _sanitize_year(value: str | None) -> str:
    target = value or DEFAULT_ACTIVE_YEAR
    if not target.isdigit() or len(target) != 4:
        raise ValueError("Invalid ledger year.")
    return target


def _safe_join(base_dir: Path, filename: str) -> Path:
    candidate = (base_dir / filename).resolve()
    if base_dir not in candidate.parents and candidate != base_dir:
        raise ValueError("Invalid ledger path.")
    return candidate


def get_db_dir() -> Path:
    return DEFAULT_DB_DIR


def resolve_db_path(year: str | None, kind: Literal["acc", "other", "stc"]) -> Path:
    target_year = _sanitize_year(year)
    filename = f"ledger_{target_year}_{kind}.sqlite"
    db_dir = get_db_dir()
    db_dir.mkdir(parents=True, exist_ok=True)
    return _safe_join(db_dir, filename)


def get_ledger_engine(year: str | None, kind: Literal["acc", "other", "stc"]) -> Engine:
    db_path = resolve_db_path(year, kind)
    if not db_path.exists():
        raise FileNotFoundError(f"Ledger DB not found at {db_path}")

    return create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
