"""phase 3/4: samples + medical affairs schema

Revision ID: 20260216_090000
Revises:
Create Date: 2026-02-16 09:00:00
"""

from __future__ import annotations

from alembic import context, op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260216_090000"
down_revision = None
branch_labels = None
depends_on = None


def _has_table(inspector: sa.Inspector | None, table_name: str) -> bool:
    if inspector is None:
        return False
    return table_name in inspector.get_table_names()


def _has_column(inspector: sa.Inspector | None, table_name: str, column_name: str) -> bool:
    if inspector is None:
        return False
    if table_name not in inspector.get_table_names():
        return False
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def _safe_drop_column(table_name: str, column_name: str) -> None:
    if context.is_offline_mode():
        op.drop_column(table_name, column_name)
        return
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not _has_column(inspector, table_name, column_name):
        return
    try:
        op.drop_column(table_name, column_name)
    except Exception:
        # SQLite versions prior to 3.35 do not support DROP COLUMN.
        pass


def upgrade() -> None:
    inspector = None if context.is_offline_mode() else sa.inspect(op.get_bind())
    known_tables = set(inspector.get_table_names()) if inspector is not None else set()

    # Keep lat/lng additions idempotent for older databases.
    for table_name, column_name in (
        ("doctors", "latitude"),
        ("doctors", "longitude"),
        ("pharmacies", "latitude"),
        ("pharmacies", "longitude"),
        ("visits", "start_lat"),
        ("visits", "start_lng"),
        ("visits", "end_lat"),
        ("visits", "end_lng"),
    ):
        should_emit_add_column = (
            context.is_offline_mode() or table_name in known_tables
        ) and not _has_column(inspector, table_name, column_name)
        if should_emit_add_column:
            op.add_column(table_name, sa.Column(column_name, sa.Float(), nullable=True))

    if not _has_table(inspector, "sample_products"):
        op.create_table(
            "sample_products",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("code", sa.String(length=50), nullable=False, unique=True),
            sa.Column("name", sa.String(length=150), nullable=False),
            sa.Column("unit", sa.String(length=50), nullable=False, server_default="unit"),
            sa.Column("therapeutic_area", sa.String(length=150), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )

    if not _has_table(inspector, "sample_inventory"):
        op.create_table(
            "sample_inventory",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("sample_product_id", sa.Integer(), sa.ForeignKey("sample_products.id"), nullable=False),
            sa.Column(
                "location_type",
                sa.Enum("warehouse", "rep", name="sample_inventory_location_type"),
                nullable=False,
                server_default="warehouse",
            ),
            sa.Column("rep_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("quantity_on_hand", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("reorder_level", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.CheckConstraint(
                "(location_type = 'warehouse' AND rep_id IS NULL) OR "
                "(location_type = 'rep' AND rep_id IS NOT NULL)",
                name="ck_sample_inventory_location",
            ),
            sa.UniqueConstraint(
                "sample_product_id",
                "location_type",
                "rep_id",
                name="uq_sample_inventory_location",
            ),
        )
        op.create_index("idx_sample_inventory_rep", "sample_inventory", ["rep_id"])

    if not _has_table(inspector, "sample_distributions"):
        op.create_table(
            "sample_distributions",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("sample_product_id", sa.Integer(), sa.ForeignKey("sample_products.id"), nullable=False),
            sa.Column("rep_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("doctor_id", sa.Integer(), sa.ForeignKey("doctors.id"), nullable=True),
            sa.Column("pharmacy_id", sa.Integer(), sa.ForeignKey("pharmacies.id"), nullable=True),
            sa.Column("quantity", sa.Integer(), nullable=False),
            sa.Column(
                "channel",
                sa.Enum("in_person", "event", "request_fulfillment", name="sample_distribution_channel"),
                nullable=False,
                server_default="in_person",
            ),
            sa.Column("distributed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.CheckConstraint(
                "("
                "(channel = 'request_fulfillment' AND doctor_id IS NULL AND pharmacy_id IS NULL)"
                " OR "
                "(channel != 'request_fulfillment' AND "
                "((doctor_id IS NOT NULL AND pharmacy_id IS NULL) OR "
                "(pharmacy_id IS NOT NULL AND doctor_id IS NULL)))"
                ")",
                name="ck_sample_distribution_customer_link",
            ),
            sa.CheckConstraint("quantity > 0", name="ck_sample_distribution_quantity_positive"),
        )
        op.create_index("idx_sample_distribution_distributed_at", "sample_distributions", ["distributed_at"])
        op.create_index("ix_sample_distributions_rep_id", "sample_distributions", ["rep_id"])

    if not _has_table(inspector, "sample_requests"):
        op.create_table(
            "sample_requests",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("rep_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("sample_product_id", sa.Integer(), sa.ForeignKey("sample_products.id"), nullable=False),
            sa.Column("quantity_requested", sa.Integer(), nullable=False),
            sa.Column(
                "status",
                sa.Enum("pending", "approved", "rejected", "fulfilled", name="sample_request_status"),
                nullable=False,
                server_default="pending",
            ),
            sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("approver_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("decision_notes", sa.Text(), nullable=True),
            sa.Column(
                "fulfillment_distribution_id",
                sa.Integer(),
                sa.ForeignKey("sample_distributions.id"),
                nullable=True,
            ),
            sa.CheckConstraint("quantity_requested > 0", name="ck_sample_request_quantity_positive"),
        )
        op.create_index("idx_sample_request_status", "sample_requests", ["status"])
        op.create_index("idx_sample_request_requested_at", "sample_requests", ["requested_at"])
        op.create_index("ix_sample_requests_rep_id", "sample_requests", ["rep_id"])

    if not _has_table(inspector, "kols"):
        op.create_table(
            "kols",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(length=150), nullable=False),
            sa.Column("specialty", sa.String(length=150), nullable=True),
            sa.Column("institution", sa.String(length=255), nullable=True),
            sa.Column("city", sa.String(length=100), nullable=True),
            sa.Column("phone", sa.String(length=50), nullable=True),
            sa.Column("email", sa.String(length=255), nullable=True),
            sa.Column(
                "influence_level",
                sa.Enum("A", "B", "C", name="kol_influence_level"),
                nullable=False,
                server_default="B",
            ),
            sa.Column("engagement_score", sa.Float(), nullable=False, server_default="0"),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("idx_kol_name", "kols", ["name"])

    if not _has_table(inspector, "scientific_materials"):
        op.create_table(
            "scientific_materials",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column(
                "material_type",
                sa.Enum("presentation", "pdf", "video", "link", "other", name="scientific_material_type"),
                nullable=False,
            ),
            sa.Column("language", sa.String(length=10), nullable=False, server_default="ar"),
            sa.Column("therapeutic_area", sa.String(length=150), nullable=True),
            sa.Column("url", sa.Text(), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )

    if not _has_table(inspector, "medical_events"):
        op.create_table(
            "medical_events",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column(
                "event_type",
                sa.Enum("conference", "roundtable", "webinar", "cme", "internal", name="medical_event_type"),
                nullable=False,
            ),
            sa.Column(
                "status",
                sa.Enum("planned", "ongoing", "completed", "cancelled", name="medical_event_status"),
                nullable=False,
                server_default="planned",
            ),
            sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("location", sa.String(length=255), nullable=True),
            sa.Column("organizer", sa.String(length=150), nullable=True),
            sa.Column("budget", sa.Numeric(12, 2), nullable=True),
            sa.Column("actual_cost", sa.Numeric(12, 2), nullable=True),
            sa.Column("revenue_impact", sa.Numeric(12, 2), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("idx_medical_event_starts_at", "medical_events", ["starts_at"])

    if not _has_table(inspector, "event_attendees"):
        op.create_table(
            "event_attendees",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("event_id", sa.Integer(), sa.ForeignKey("medical_events.id"), nullable=False),
            sa.Column("doctor_id", sa.Integer(), sa.ForeignKey("doctors.id"), nullable=True),
            sa.Column("kol_id", sa.Integer(), sa.ForeignKey("kols.id"), nullable=True),
            sa.Column("attendee_role", sa.String(length=50), nullable=False, server_default="attendee"),
            sa.Column("attended", sa.Boolean(), nullable=False, server_default=sa.text("0")),
            sa.Column("feedback_score", sa.Float(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.CheckConstraint(
                "(doctor_id IS NOT NULL AND kol_id IS NULL) OR (kol_id IS NOT NULL AND doctor_id IS NULL)",
                name="ck_event_attendee_link",
            ),
            sa.UniqueConstraint("event_id", "doctor_id", name="uq_event_attendee_doctor"),
            sa.UniqueConstraint("event_id", "kol_id", name="uq_event_attendee_kol"),
        )
        op.create_index("idx_event_attendee_event_id", "event_attendees", ["event_id"])


def downgrade() -> None:
    inspector = None if context.is_offline_mode() else sa.inspect(op.get_bind())

    if _has_table(inspector, "event_attendees"):
        op.drop_index("idx_event_attendee_event_id", table_name="event_attendees")
        op.drop_table("event_attendees")

    if _has_table(inspector, "medical_events"):
        op.drop_index("idx_medical_event_starts_at", table_name="medical_events")
        op.drop_table("medical_events")

    if _has_table(inspector, "scientific_materials"):
        op.drop_table("scientific_materials")

    if _has_table(inspector, "kols"):
        op.drop_index("idx_kol_name", table_name="kols")
        op.drop_table("kols")

    if _has_table(inspector, "sample_requests"):
        op.drop_index("ix_sample_requests_rep_id", table_name="sample_requests")
        op.drop_index("idx_sample_request_requested_at", table_name="sample_requests")
        op.drop_index("idx_sample_request_status", table_name="sample_requests")
        op.drop_table("sample_requests")

    if _has_table(inspector, "sample_distributions"):
        op.drop_index("ix_sample_distributions_rep_id", table_name="sample_distributions")
        op.drop_index("idx_sample_distribution_distributed_at", table_name="sample_distributions")
        op.drop_table("sample_distributions")

    if _has_table(inspector, "sample_inventory"):
        op.drop_index("idx_sample_inventory_rep", table_name="sample_inventory")
        op.drop_table("sample_inventory")

    if _has_table(inspector, "sample_products"):
        op.drop_table("sample_products")

    for table_name, column_name in (
        ("visits", "end_lng"),
        ("visits", "end_lat"),
        ("visits", "start_lng"),
        ("visits", "start_lat"),
        ("pharmacies", "longitude"),
        ("pharmacies", "latitude"),
        ("doctors", "longitude"),
        ("doctors", "latitude"),
    ):
        _safe_drop_column(table_name, column_name)
