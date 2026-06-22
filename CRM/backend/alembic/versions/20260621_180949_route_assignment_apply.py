"""route assignment apply audit

Revision ID: 20260621_180949
Revises: 20260621_075112
Create Date: 2026-06-21 18:09:49
"""

from __future__ import annotations

from alembic import context, op
import sqlalchemy as sa

revision = "20260621_180949"
down_revision = "20260621_075112"
branch_labels = None
depends_on = None


def _has_table(inspector: sa.Inspector | None, table_name: str) -> bool:
    if inspector is None:
        return False
    return table_name in inspector.get_table_names()


def _has_column(inspector: sa.Inspector | None, table_name: str, column_name: str) -> bool:
    if inspector is None or table_name not in inspector.get_table_names():
        return False
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def _add_staging_column(inspector: sa.Inspector | None, column: sa.Column) -> None:
    if context.is_offline_mode() or _has_table(inspector, "customer_import_staging_items"):
        if not _has_column(inspector, "customer_import_staging_items", column.name):
            op.add_column("customer_import_staging_items", column)


def upgrade() -> None:
    inspector = None if context.is_offline_mode() else sa.inspect(op.get_bind())

    _add_staging_column(inspector, sa.Column("assigned_rep_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True))
    _add_staging_column(inspector, sa.Column("route_id", sa.Integer(), sa.ForeignKey("routes.id"), nullable=True))
    _add_staging_column(inspector, sa.Column("route_account_id", sa.Integer(), sa.ForeignKey("route_accounts.id"), nullable=True))
    _add_staging_column(inspector, sa.Column("reviewed_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True))
    _add_staging_column(inspector, sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True))

    if not _has_table(inspector, "customer_route_assignment_runs"):
        op.create_table(
            "customer_route_assignment_runs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("dry_run", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("status", sa.String(length=30), nullable=False, server_default="planned"),
            sa.Column("total_rows", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("created_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("updated_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("unchanged_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("skipped_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("blocked_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("route_accounts_created_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("route_accounts_updated_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("blocked_counts_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index(
            "idx_customer_route_assignment_runs_actor",
            "customer_route_assignment_runs",
            ["actor_user_id"],
        )


def downgrade() -> None:
    if context.is_offline_mode():
        op.drop_table("customer_route_assignment_runs")
        return

    inspector = sa.inspect(op.get_bind())
    if _has_table(inspector, "customer_route_assignment_runs"):
        op.drop_table("customer_route_assignment_runs")
