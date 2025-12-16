"""Initial schema for FastAPI CRM."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

from core.db import Base
import models  # noqa: F401

revision = "0001_init_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind)

    inspector = sa.inspect(bind)
    visit_columns = {col["name"] for col in inspector.get_columns("visits")}

    if "status" not in visit_columns:
        op.add_column(
            "visits",
            sa.Column("status", sa.String(length=20), nullable=False, server_default="completed"),
        )
        op.execute(sa.text("UPDATE visits SET status='completed' WHERE status IS NULL"))
        op.alter_column("visits", "status", server_default="completed")

    if "duration_minutes" not in visit_columns:
        op.add_column("visits", sa.Column("duration_minutes", sa.Integer(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind)
