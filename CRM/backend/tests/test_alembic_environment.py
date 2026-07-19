from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock


ENV_PATH = Path(__file__).resolve().parents[1] / "alembic" / "env.py"


def _load_function_source():
    source = ENV_PATH.read_text(encoding="utf-8")
    start = source.index("def ensure_empty_database_baseline")
    end = source.index("\n\ndef run_migrations_offline", start)
    namespace = {}
    exec("from sqlalchemy import inspect\n" + source[start:end], namespace)
    return namespace["ensure_empty_database_baseline"]


def test_empty_database_creates_model_baseline(monkeypatch) -> None:
    ensure_baseline = _load_function_source()
    inspector = SimpleNamespace(
        get_schema_names=lambda: ["main"],
        get_table_names=lambda schema: [],
    )
    metadata = MagicMock()
    ensure_baseline.__globals__["target_metadata"] = metadata
    monkeypatch.setitem(ensure_baseline.__globals__, "inspect", lambda _connection: inspector)

    connection = object()
    assert ensure_baseline(connection) is True
    metadata.create_all.assert_called_once_with(connection)


def test_nonempty_database_is_never_bootstrapped(monkeypatch) -> None:
    ensure_baseline = _load_function_source()
    inspector = SimpleNamespace(
        get_schema_names=lambda: ["public"],
        get_table_names=lambda schema: ["users"],
    )
    metadata = MagicMock()
    ensure_baseline.__globals__["target_metadata"] = metadata
    monkeypatch.setitem(ensure_baseline.__globals__, "inspect", lambda _connection: inspector)

    assert ensure_baseline(object()) is False
    metadata.create_all.assert_not_called()
