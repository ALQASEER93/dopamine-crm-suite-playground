from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, inspect, pool

from config.settings import settings
from core.db import Base
import models  # noqa: F401


config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

config.set_main_option("sqlalchemy.url", settings.database_url.replace("%", "%%"))
target_metadata = Base.metadata


def ensure_empty_database_baseline(connection) -> bool:
    """Create the model baseline only when the target database is completely empty.

    The legacy Alembic chain starts with phase 3/4 additive migrations and cannot
    create the core CRM tables by itself. Keeping this guard in the migration
    environment makes a fresh database upgradeable while leaving every existing
    database untouched.
    """
    inspector = inspect(connection)
    existing_tables = {
        table_name
        for schema_name in inspector.get_schema_names()
        if schema_name not in {"information_schema", "pg_catalog", "neon_auth"}
        for table_name in inspector.get_table_names(schema=schema_name)
        if table_name != "alembic_version"
    }
    if existing_tables:
        return False
    target_metadata.create_all(connection)
    return True


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        ensure_empty_database_baseline(connection)
        # Metadata inspection/create_all uses SQLAlchemy autobegin. Close that
        # transaction before Alembic owns migration/version-table commits.
        if connection.in_transaction():
            connection.commit()
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
