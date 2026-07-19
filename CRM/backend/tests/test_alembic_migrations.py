from __future__ import annotations

import importlib.util
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock


HISTORICAL_MIGRATION_PATH = (
    Path(__file__).resolve().parents[1]
    / "alembic"
    / "versions"
    / "20260219_030000_sample_distribution_fulfillment_constraint.py"
)
RECONCILE_MIGRATION_PATH = (
    Path(__file__).resolve().parents[1]
    / "alembic"
    / "versions"
    / "20260719_235500_sample_distribution_constraint_reconcile.py"
)


def _load_migration(path: Path = HISTORICAL_MIGRATION_PATH):
    spec = importlib.util.spec_from_file_location(f"migration_{path.stem}", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_postgresql_constraint_change_does_not_recreate_referenced_table(monkeypatch) -> None:
    migration = _load_migration()
    bind = SimpleNamespace(dialect=SimpleNamespace(name="postgresql"))
    inspector = SimpleNamespace(
        get_check_constraints=lambda _table: [{"name": "ck_sample_distribution_customer_link"}]
    )
    batch_alter_table = MagicMock(side_effect=AssertionError("PostgreSQL must not recreate this table"))
    drop_constraint = MagicMock()
    create_check_constraint = MagicMock()

    monkeypatch.setattr(migration.context, "is_offline_mode", lambda: False)
    monkeypatch.setattr(migration.op, "get_bind", lambda: bind)
    monkeypatch.setattr(migration.op, "batch_alter_table", batch_alter_table)
    monkeypatch.setattr(migration.op, "drop_constraint", drop_constraint)
    monkeypatch.setattr(migration.op, "create_check_constraint", create_check_constraint)
    monkeypatch.setattr(migration.sa, "inspect", lambda _bind: inspector)

    migration.upgrade()

    batch_alter_table.assert_not_called()
    drop_constraint.assert_called_once_with(
        "ck_sample_distribution_customer_link",
        "sample_distributions",
        type_="check",
    )
    create_check_constraint.assert_called_once_with(
        "ck_sample_distribution_customer_link",
        "sample_distributions",
        migration.NEW_CONSTRAINT,
    )


def test_postgresql_constraint_change_handles_missing_legacy_constraint(monkeypatch) -> None:
    migration = _load_migration()
    bind = SimpleNamespace(dialect=SimpleNamespace(name="postgresql"))
    inspector = SimpleNamespace(get_check_constraints=lambda _table: [])
    drop_constraint = MagicMock()
    create_check_constraint = MagicMock()

    monkeypatch.setattr(migration.context, "is_offline_mode", lambda: False)
    monkeypatch.setattr(migration.op, "get_bind", lambda: bind)
    monkeypatch.setattr(migration.op, "drop_constraint", drop_constraint)
    monkeypatch.setattr(migration.op, "create_check_constraint", create_check_constraint)
    monkeypatch.setattr(migration.sa, "inspect", lambda _bind: inspector)

    migration.upgrade()

    drop_constraint.assert_not_called()
    create_check_constraint.assert_called_once()


def test_historical_sqlite_path_uses_batch_recreation(monkeypatch) -> None:
    migration = _load_migration()
    bind = SimpleNamespace(dialect=SimpleNamespace(name="sqlite"))
    batch_context = MagicMock()
    batch_alter_table = MagicMock()
    batch_alter_table.return_value.__enter__.return_value = batch_context

    monkeypatch.setattr(migration.context, "is_offline_mode", lambda: False)
    monkeypatch.setattr(migration.op, "get_bind", lambda: bind)
    monkeypatch.setattr(migration.op, "batch_alter_table", batch_alter_table)

    migration.upgrade()

    batch_alter_table.assert_called_once_with("sample_distributions", recreate="always")
    batch_context.drop_constraint.assert_called_once_with(
        "ck_sample_distribution_customer_link",
        type_="check",
    )
    batch_context.create_check_constraint.assert_called_once_with(
        "ck_sample_distribution_customer_link",
        migration.NEW_CONSTRAINT,
    )


def test_historical_postgresql_downgrade_restores_old_constraint(monkeypatch) -> None:
    migration = _load_migration()
    bind = SimpleNamespace(dialect=SimpleNamespace(name="postgresql"))
    inspector = SimpleNamespace(
        get_check_constraints=lambda _table: [{"name": "ck_sample_distribution_customer_link"}]
    )
    create_check_constraint = MagicMock()

    monkeypatch.setattr(migration.context, "is_offline_mode", lambda: False)
    monkeypatch.setattr(migration.op, "get_bind", lambda: bind)
    monkeypatch.setattr(migration.op, "drop_constraint", MagicMock())
    monkeypatch.setattr(migration.op, "create_check_constraint", create_check_constraint)
    monkeypatch.setattr(migration.sa, "inspect", lambda _bind: inspector)

    migration.downgrade()

    assert create_check_constraint.call_args.args[-1] == migration.OLD_CONSTRAINT


def test_forward_reconcile_repairs_already_applied_postgresql_revision(monkeypatch) -> None:
    migration = _load_migration(RECONCILE_MIGRATION_PATH)
    bind = SimpleNamespace(dialect=SimpleNamespace(name="postgresql"))
    inspector = SimpleNamespace(
        get_check_constraints=lambda _table: [{"name": migration.CONSTRAINT_NAME}]
    )
    drop_constraint = MagicMock()
    create_check_constraint = MagicMock()

    monkeypatch.setattr(migration.context, "is_offline_mode", lambda: False)
    monkeypatch.setattr(migration.op, "get_bind", lambda: bind)
    monkeypatch.setattr(migration.op, "drop_constraint", drop_constraint)
    monkeypatch.setattr(migration.op, "create_check_constraint", create_check_constraint)
    monkeypatch.setattr(migration.sa, "inspect", lambda _bind: inspector)

    migration.upgrade()

    drop_constraint.assert_called_once_with(
        migration.CONSTRAINT_NAME,
        "sample_distributions",
        type_="check",
    )
    create_check_constraint.assert_called_once_with(
        migration.CONSTRAINT_NAME,
        "sample_distributions",
        migration.CONSTRAINT_SQL,
    )


def test_forward_reconcile_sqlite_handles_missing_constraint(monkeypatch) -> None:
    migration = _load_migration(RECONCILE_MIGRATION_PATH)
    bind = SimpleNamespace(dialect=SimpleNamespace(name="sqlite"))
    inspector = SimpleNamespace(get_check_constraints=lambda _table: [])
    batch_context = MagicMock()
    batch_alter_table = MagicMock()
    batch_alter_table.return_value.__enter__.return_value = batch_context

    monkeypatch.setattr(migration.context, "is_offline_mode", lambda: False)
    monkeypatch.setattr(migration.op, "get_bind", lambda: bind)
    monkeypatch.setattr(migration.op, "batch_alter_table", batch_alter_table)
    monkeypatch.setattr(migration.sa, "inspect", lambda _bind: inspector)

    migration.upgrade()

    batch_context.drop_constraint.assert_not_called()
    batch_context.create_check_constraint.assert_called_once_with(
        migration.CONSTRAINT_NAME,
        migration.CONSTRAINT_SQL,
    )
