"""allow request_fulfillment sample distributions without customer target

Revision ID: 20260219_030000
Revises: 20260216_090000
Create Date: 2026-02-19 03:00:00
"""

from __future__ import annotations

from alembic import context, op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260219_030000"
down_revision = "20260216_090000"
branch_labels = None
depends_on = None


NEW_CONSTRAINT = (
    "("
    "(channel = 'request_fulfillment' AND doctor_id IS NULL AND pharmacy_id IS NULL)"
    " OR "
    "(channel != 'request_fulfillment' AND "
    "((doctor_id IS NOT NULL AND pharmacy_id IS NULL) OR "
    "(pharmacy_id IS NOT NULL AND doctor_id IS NULL)))"
    ")"
)

OLD_CONSTRAINT = (
    "(doctor_id IS NOT NULL AND pharmacy_id IS NULL) OR "
    "(pharmacy_id IS NOT NULL AND doctor_id IS NULL)"
)


def _replace_customer_link_constraint(condition: str) -> None:
    """Replace the check without recreating PostgreSQL tables referenced by FKs."""
    if context.is_offline_mode():
        with op.batch_alter_table("sample_distributions", recreate="always") as batch_op:
            batch_op.drop_constraint("ck_sample_distribution_customer_link", type_="check")
            batch_op.create_check_constraint(
                "ck_sample_distribution_customer_link",
                condition,
            )
        return

    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("sample_distributions", recreate="always") as batch_op:
            batch_op.drop_constraint("ck_sample_distribution_customer_link", type_="check")
            batch_op.create_check_constraint(
                "ck_sample_distribution_customer_link",
                condition,
            )
        return

    inspector = sa.inspect(bind)
    existing_constraints = {
        constraint["name"]
        for constraint in inspector.get_check_constraints("sample_distributions")
    }
    if "ck_sample_distribution_customer_link" in existing_constraints:
        op.drop_constraint(
            "ck_sample_distribution_customer_link",
            "sample_distributions",
            type_="check",
        )
    op.create_check_constraint(
        "ck_sample_distribution_customer_link",
        "sample_distributions",
        condition,
    )


def upgrade() -> None:
    _replace_customer_link_constraint(NEW_CONSTRAINT)


def downgrade() -> None:
    _replace_customer_link_constraint(OLD_CONSTRAINT)
