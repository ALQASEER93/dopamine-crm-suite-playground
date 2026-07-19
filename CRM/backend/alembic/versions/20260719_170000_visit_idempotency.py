"""add persistent visit creation idempotency

Revision ID: 20260719_170000
Revises: 20260621_180949
Create Date: 2026-07-19 17:00:00
"""

from __future__ import annotations

from alembic import context, op
import sqlalchemy as sa


revision = "20260719_170000"
down_revision = "20260621_180949"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = None if context.is_offline_mode() else sa.inspect(op.get_bind())
    columns = [] if inspector is None else inspector.get_columns("visits")
    if inspector is None or not any(column["name"] == "client_request_id" for column in columns):
        op.add_column("visits", sa.Column("client_request_id", sa.String(length=200), nullable=True))

    indexes = [] if inspector is None else inspector.get_indexes("visits")
    if inspector is None or not any(index["name"] == "uq_visit_rep_client_request" for index in indexes):
        op.create_index(
            "uq_visit_rep_client_request",
            "visits",
            ["rep_id", "client_request_id"],
            unique=True,
        )


def downgrade() -> None:
    op.drop_index("uq_visit_rep_client_request", table_name="visits")
    op.drop_column("visits", "client_request_id")
