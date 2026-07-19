"""reconcile sample distribution customer link constraint

Revision ID: 20260719_235500
Revises: 20260719_170000
Create Date: 2026-07-19 23:55:00
"""

from __future__ import annotations

from alembic import context, op
import sqlalchemy as sa


revision = "20260719_235500"
down_revision = "20260719_170000"
branch_labels = None
depends_on = None


CONSTRAINT_NAME = "ck_sample_distribution_customer_link"
CONSTRAINT_SQL = (
    "("
    "(channel = 'request_fulfillment' AND doctor_id IS NULL AND pharmacy_id IS NULL)"
    " OR "
    "(channel != 'request_fulfillment' AND "
    "((doctor_id IS NOT NULL AND pharmacy_id IS NULL) OR "
    "(pharmacy_id IS NOT NULL AND doctor_id IS NULL)))"
    ")"
)


def _replace_constraint() -> None:
    """Reconcile the constraint for databases that already applied the old revision."""
    if context.is_offline_mode():
        op.drop_constraint(
            CONSTRAINT_NAME,
            "sample_distributions",
            type_="check",
        )
        op.create_check_constraint(
            CONSTRAINT_NAME,
            "sample_distributions",
            CONSTRAINT_SQL,
        )
        return

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = {
        item["name"]
        for item in inspector.get_check_constraints("sample_distributions")
    }

    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("sample_distributions", recreate="always") as batch_op:
            if CONSTRAINT_NAME in existing:
                batch_op.drop_constraint(CONSTRAINT_NAME, type_="check")
            batch_op.create_check_constraint(CONSTRAINT_NAME, CONSTRAINT_SQL)
        return

    if CONSTRAINT_NAME in existing:
        op.drop_constraint(
            CONSTRAINT_NAME,
            "sample_distributions",
            type_="check",
        )
    op.create_check_constraint(
        CONSTRAINT_NAME,
        "sample_distributions",
        CONSTRAINT_SQL,
    )


def upgrade() -> None:
    _replace_constraint()


def downgrade() -> None:
    # Revision 20260219_030000 already defines the same intended constraint.
    # Removing it while downgrading only this reconciliation would create drift.
    pass
