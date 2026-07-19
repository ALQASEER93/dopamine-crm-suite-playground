"""customer import audit and staging

Revision ID: 20260621_075112
Revises: 20260219_030000
Create Date: 2026-06-21 07:51:12
"""

from __future__ import annotations

from alembic import context, op
import sqlalchemy as sa

revision = "20260621_075112"
down_revision = "20260219_030000"
branch_labels = None
depends_on = None


def _has_table(inspector: sa.Inspector | None, table_name: str) -> bool:
    if inspector is None:
        return False
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    inspector = None if context.is_offline_mode() else sa.inspect(op.get_bind())

    if not _has_table(inspector, "customer_import_runs"):
        op.create_table(
            "customer_import_runs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("dry_run", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("original_filename", sa.String(length=255), nullable=False),
            sa.Column("content_hash", sa.String(length=64), nullable=False),
            sa.Column("file_size", sa.Integer(), nullable=False),
            sa.Column("source_sheet", sa.String(length=100), nullable=False),
            sa.Column("total_parsed_rows", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("doctors_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("pharmacies_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("created_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("updated_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("unchanged_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("skipped_missing_name_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("skipped_missing_type_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("skipped_unsupported_type_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("review_needed_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("duplicate_review_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("with_trusted_coordinates_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("route_assignment_pending_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="planned"),
            sa.Column("skipped_counts_json", sa.Text(), nullable=True),
            sa.Column("error_summary", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("idx_customer_import_runs_actor", "customer_import_runs", ["actor_user_id"])
        op.create_index("idx_customer_import_runs_hash", "customer_import_runs", ["content_hash"])

    if not _has_table(inspector, "customer_import_staging_items"):
        op.create_table(
            "customer_import_staging_items",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("import_run_id", sa.Integer(), sa.ForeignKey("customer_import_runs.id"), nullable=False),
            sa.Column("row_number", sa.Integer(), nullable=False),
            sa.Column("row_hash", sa.String(length=64), nullable=False),
            sa.Column("customer_type", sa.String(length=20), nullable=False),
            sa.Column("doctor_id", sa.Integer(), sa.ForeignKey("doctors.id"), nullable=True),
            sa.Column("pharmacy_id", sa.Integer(), sa.ForeignKey("pharmacies.id"), nullable=True),
            sa.Column("import_action", sa.String(length=20), nullable=False),
            sa.Column("monthly_frequency_target", sa.Integer(), nullable=True),
            sa.Column("requires_review", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("review_reason", sa.Text(), nullable=True),
            sa.Column("location_status", sa.String(length=50), nullable=True),
            sa.Column("assignment_status", sa.String(length=50), nullable=False),
            sa.Column("assignment_blocker", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.CheckConstraint(
                "(customer_type = 'doctor' AND pharmacy_id IS NULL) OR "
                "(customer_type = 'pharmacy' AND doctor_id IS NULL)",
                name="ck_customer_import_staging_customer_link",
            ),
        )
        op.create_index(
            "idx_customer_import_staging_run",
            "customer_import_staging_items",
            ["import_run_id"],
        )
        op.create_index(
            "idx_customer_import_staging_hash",
            "customer_import_staging_items",
            ["row_hash"],
        )
        op.create_index(
            "idx_customer_import_staging_customer",
            "customer_import_staging_items",
            ["customer_type", "doctor_id", "pharmacy_id"],
        )


def downgrade() -> None:
    if context.is_offline_mode():
        op.drop_table("customer_import_staging_items")
        op.drop_table("customer_import_runs")
        return

    inspector = sa.inspect(op.get_bind())
    if _has_table(inspector, "customer_import_staging_items"):
        op.drop_table("customer_import_staging_items")
    if _has_table(inspector, "customer_import_runs"):
        op.drop_table("customer_import_runs")
