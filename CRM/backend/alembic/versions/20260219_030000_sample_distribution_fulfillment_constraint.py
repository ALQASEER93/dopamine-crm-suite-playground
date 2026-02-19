"""allow request_fulfillment sample distributions without customer target

Revision ID: 20260219_030000
Revises: 20260216_090000
Create Date: 2026-02-19 03:00:00
"""

from __future__ import annotations

from alembic import op
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


def upgrade() -> None:
    with op.batch_alter_table("sample_distributions", recreate="always") as batch_op:
        batch_op.drop_constraint("ck_sample_distribution_customer_link", type_="check")
        batch_op.create_check_constraint(
            "ck_sample_distribution_customer_link",
            NEW_CONSTRAINT,
        )


def downgrade() -> None:
    with op.batch_alter_table("sample_distributions", recreate="always") as batch_op:
        batch_op.drop_constraint("ck_sample_distribution_customer_link", type_="check")
        batch_op.create_check_constraint(
            "ck_sample_distribution_customer_link",
            OLD_CONSTRAINT,
        )
