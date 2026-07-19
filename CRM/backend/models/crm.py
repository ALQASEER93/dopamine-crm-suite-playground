from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    false,
    func,
)
from sqlalchemy.orm import relationship

from core.db import Base


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True)
    slug = Column(String(50), nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)

    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True, server_default="1")
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    role = relationship(Role, back_populates="users")
    rep_profile = relationship("RepProfile", back_populates="user", uselist=False)


class Territory(Base):
    __tablename__ = "territories"

    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False)
    code = Column(String(50), nullable=False, unique=True)

    rep_profiles = relationship("RepProfile", back_populates="territory")


class RepProfile(Base):
    __tablename__ = "rep_profiles"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    rep_type = Column(String(50), nullable=False, default="medical_rep", server_default="medical_rep")
    territory_id = Column(Integer, ForeignKey("territories.id"), nullable=True)

    user = relationship(User, back_populates="rep_profile")
    territory = relationship(Territory, back_populates="rep_profiles")


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False)
    specialty = Column(String(150), nullable=True)
    clinic = Column(String(255), nullable=True)
    area = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    classification = Column(String(1), nullable=True)  # A/B/C
    phone = Column(String(50), nullable=True)
    mobile = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("name", "clinic", "area", name="uq_doctor_identity"),
        Index("idx_doctor_location", "latitude", "longitude"),
    )

    visits = relationship("Visit", back_populates="doctor")
    orders = relationship("Order", back_populates="doctor")
    collections = relationship("Collection", back_populates="doctor")


class Pharmacy(Base):
    __tablename__ = "pharmacies"

    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False)
    area = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    segment = Column(String(50), nullable=True)
    credit_limit = Column(Numeric(12, 2), nullable=True)
    payment_terms = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("name", "city", "area", name="uq_pharmacy_identity"),
        Index("idx_pharmacy_location", "latitude", "longitude"),
    )

    visits = relationship("Visit", back_populates="pharmacy")
    orders = relationship("Order", back_populates="pharmacy")
    collections = relationship("Collection", back_populates="pharmacy")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    code = Column(String(50), nullable=False, unique=True)
    name = Column(String(150), nullable=False)
    line = Column(String(100), nullable=True)
    pack = Column(String(100), nullable=True)
    cost = Column(Numeric(12, 2), nullable=True)
    selling_price = Column(Numeric(12, 2), nullable=True)
    bonus_rules = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    order_lines = relationship("OrderLine", back_populates="product")
    stock_movements = relationship("StockMovement", back_populates="product")
    targets = relationship("Target", back_populates="product")


class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False)
    rep_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    frequency = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    rep = relationship(User)
    accounts = relationship("RouteAccount", back_populates="route")


class RouteAccount(Base):
    __tablename__ = "route_accounts"

    id = Column(Integer, primary_key=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=False)
    account_type = Column(String(20), nullable=False)  # doctor | pharmacy
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id"), nullable=True)
    visit_frequency = Column(String(50), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "(account_type = 'doctor' AND doctor_id IS NOT NULL AND pharmacy_id IS NULL) OR "
            "(account_type = 'pharmacy' AND pharmacy_id IS NOT NULL AND doctor_id IS NULL)",
            name="ck_route_account_link",
        ),
    )

    route = relationship(Route, back_populates="accounts")
    doctor = relationship(Doctor)
    pharmacy = relationship(Pharmacy)


class CustomerImportRun(Base):
    __tablename__ = "customer_import_runs"

    id = Column(Integer, primary_key=True)
    actor_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    dry_run = Column(Boolean, nullable=False, default=False, server_default=false())
    original_filename = Column(String(255), nullable=False)
    content_hash = Column(String(64), nullable=False, index=True)
    file_size = Column(Integer, nullable=False)
    source_sheet = Column(String(100), nullable=False)
    total_parsed_rows = Column(Integer, nullable=False, default=0, server_default="0")
    doctors_count = Column(Integer, nullable=False, default=0, server_default="0")
    pharmacies_count = Column(Integer, nullable=False, default=0, server_default="0")
    created_count = Column(Integer, nullable=False, default=0, server_default="0")
    updated_count = Column(Integer, nullable=False, default=0, server_default="0")
    unchanged_count = Column(Integer, nullable=False, default=0, server_default="0")
    skipped_missing_name_count = Column(Integer, nullable=False, default=0, server_default="0")
    skipped_missing_type_count = Column(Integer, nullable=False, default=0, server_default="0")
    skipped_unsupported_type_count = Column(Integer, nullable=False, default=0, server_default="0")
    review_needed_count = Column(Integer, nullable=False, default=0, server_default="0")
    duplicate_review_count = Column(Integer, nullable=False, default=0, server_default="0")
    with_trusted_coordinates_count = Column(Integer, nullable=False, default=0, server_default="0")
    route_assignment_pending_count = Column(Integer, nullable=False, default=0, server_default="0")
    status = Column(String(20), nullable=False, default="planned", server_default="planned")
    skipped_counts_json = Column(Text, nullable=True)
    error_summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    actor = relationship(User)
    staging_items = relationship(
        "CustomerImportStagingItem",
        back_populates="import_run",
        cascade="all, delete-orphan",
    )


class CustomerImportStagingItem(Base):
    __tablename__ = "customer_import_staging_items"

    id = Column(Integer, primary_key=True)
    import_run_id = Column(Integer, ForeignKey("customer_import_runs.id"), nullable=False, index=True)
    row_number = Column(Integer, nullable=False)
    row_hash = Column(String(64), nullable=False, index=True)
    customer_type = Column(String(20), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id"), nullable=True)
    import_action = Column(String(20), nullable=False)
    monthly_frequency_target = Column(Integer, nullable=True)
    requires_review = Column(Boolean, nullable=False, default=False, server_default=false())
    review_reason = Column(Text, nullable=True)
    location_status = Column(String(50), nullable=True)
    assigned_rep_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=True)
    route_account_id = Column(Integer, ForeignKey("route_accounts.id"), nullable=True)
    assignment_status = Column(String(50), nullable=False)
    assignment_blocker = Column(Text, nullable=True)
    reviewed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint(
            "(customer_type = 'doctor' AND pharmacy_id IS NULL) OR "
            "(customer_type = 'pharmacy' AND doctor_id IS NULL)",
            name="ck_customer_import_staging_customer_link",
        ),
        Index("idx_customer_import_staging_customer", "customer_type", "doctor_id", "pharmacy_id"),
    )

    import_run = relationship("CustomerImportRun", back_populates="staging_items")
    doctor = relationship(Doctor)
    pharmacy = relationship(Pharmacy)
    assigned_rep = relationship(User, foreign_keys=[assigned_rep_user_id])
    route = relationship(Route, foreign_keys=[route_id])
    route_account = relationship(RouteAccount)
    reviewed_by = relationship(User, foreign_keys=[reviewed_by_user_id])


class CustomerRouteAssignmentRun(Base):
    __tablename__ = "customer_route_assignment_runs"

    id = Column(Integer, primary_key=True)
    actor_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    dry_run = Column(Boolean, nullable=False, default=False, server_default=false())
    status = Column(String(30), nullable=False, default="planned", server_default="planned")
    total_rows = Column(Integer, nullable=False, default=0, server_default="0")
    created_count = Column(Integer, nullable=False, default=0, server_default="0")
    updated_count = Column(Integer, nullable=False, default=0, server_default="0")
    unchanged_count = Column(Integer, nullable=False, default=0, server_default="0")
    skipped_count = Column(Integer, nullable=False, default=0, server_default="0")
    blocked_count = Column(Integer, nullable=False, default=0, server_default="0")
    route_accounts_created_count = Column(Integer, nullable=False, default=0, server_default="0")
    route_accounts_updated_count = Column(Integer, nullable=False, default=0, server_default="0")
    blocked_counts_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    actor = relationship(User)


class Visit(Base):
    __tablename__ = "visits"

    id = Column(Integer, primary_key=True)
    visit_date = Column(Date, nullable=False)
    rep_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id"), nullable=True)
    notes = Column(Text, nullable=True)
    samples_given = Column(Text, nullable=True)
    next_action = Column(Text, nullable=True)
    next_action_date = Column(Date, nullable=True)
    status = Column(
        Enum("scheduled", "in_progress", "completed", "cancelled", name="visit_status"),
        nullable=False,
        default="scheduled",
        server_default="scheduled",
    )
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    start_lat = Column(Float, nullable=True)
    start_lng = Column(Float, nullable=True)
    start_accuracy = Column(Float, nullable=True)
    end_lat = Column(Float, nullable=True)
    end_lng = Column(Float, nullable=True)
    end_accuracy = Column(Float, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    client_request_id = Column(String(200), nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False, server_default="0")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "(doctor_id IS NOT NULL AND pharmacy_id IS NULL) OR "
            "(pharmacy_id IS NOT NULL AND doctor_id IS NULL)",
            name="ck_visit_account_link",
        ),
        Index("idx_visit_date", "visit_date"),
        Index("idx_visit_rep_id", "rep_id"),
        Index("idx_visit_doctor_id", "doctor_id"),
        Index("idx_visit_status", "status"),
        Index("idx_visit_is_deleted", "is_deleted"),
        Index("uq_visit_rep_client_request", "rep_id", "client_request_id", unique=True),
    )

    rep = relationship(User)
    doctor = relationship(Doctor, back_populates="visits")
    pharmacy = relationship(Pharmacy, back_populates="visits")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    order_date = Column(Date, nullable=False, default=date.today)
    rep_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    status = Column(String(50), nullable=False, default="draft")
    payment_status = Column(String(50), nullable=False, default="pending")
    total_amount = Column(Numeric(12, 2), nullable=False, default=0)
    aljazeera_ref = Column(String(100), nullable=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "(doctor_id IS NOT NULL AND pharmacy_id IS NULL) OR "
            "(pharmacy_id IS NOT NULL AND doctor_id IS NULL)",
            name="ck_order_customer_link",
        ),
    )

    rep = relationship(User)
    doctor = relationship(Doctor, back_populates="orders")
    pharmacy = relationship(Pharmacy, back_populates="orders")
    lines = relationship("OrderLine", back_populates="order", cascade="all, delete-orphan")


class OrderLine(Base):
    __tablename__ = "order_lines"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Numeric(12, 2), nullable=False)
    discount = Column(Float, nullable=False, default=0)
    bonus = Column(Integer, nullable=True)

    order = relationship(Order, back_populates="lines")
    product = relationship(Product, back_populates="order_lines")


class StockLocation(Base):
    __tablename__ = "stock_locations"

    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False)
    location_type = Column(String(50), nullable=False)  # warehouse | rep_car
    rep_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    rep = relationship(User)
    outgoing_movements = relationship(
        "StockMovement",
        back_populates="location_from",
        foreign_keys="StockMovement.location_from_id",
    )
    incoming_movements = relationship(
        "StockMovement",
        back_populates="location_to",
        foreign_keys="StockMovement.location_to_id",
    )


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True)
    movement_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    location_from_id = Column(Integer, ForeignKey("stock_locations.id"), nullable=True)
    location_to_id = Column(Integer, ForeignKey("stock_locations.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    reason = Column(
        Enum("sale", "samples", "return", "damage", "expiry", name="stock_movement_reason"),
        nullable=False,
    )
    notes = Column(Text, nullable=True)

    location_from = relationship(
        StockLocation, foreign_keys=[location_from_id], back_populates="outgoing_movements"
    )
    location_to = relationship(
        StockLocation, foreign_keys=[location_to_id], back_populates="incoming_movements"
    )
    product = relationship(Product, back_populates="stock_movements")


class Target(Base):
    __tablename__ = "targets"

    id = Column(Integer, primary_key=True)
    rep_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    period = Column(String(20), nullable=False)  # e.g., 2024-11
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    target_amount = Column(Numeric(12, 2), nullable=False)
    achieved_amount = Column(Numeric(12, 2), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    rep = relationship(User)
    product = relationship(Product, back_populates="targets")


class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True)
    collection_date = Column(Date, nullable=False)
    rep_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    method = Column(String(50), nullable=False)
    reference = Column(String(100), nullable=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "(doctor_id IS NOT NULL AND pharmacy_id IS NULL) OR "
            "(pharmacy_id IS NOT NULL AND doctor_id IS NULL)",
            name="ck_collection_customer_link",
        ),
    )

    rep = relationship(User)
    doctor = relationship(Doctor, back_populates="collections")
    pharmacy = relationship(Pharmacy, back_populates="collections")


class SampleProduct(Base):
    __tablename__ = "sample_products"

    id = Column(Integer, primary_key=True)
    code = Column(String(50), nullable=False, unique=True)
    name = Column(String(150), nullable=False)
    unit = Column(String(50), nullable=False, default="unit", server_default="unit")
    therapeutic_area = Column(String(150), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, server_default="1")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    inventories = relationship("SampleInventory", back_populates="sample_product")
    distributions = relationship("SampleDistribution", back_populates="sample_product")
    requests = relationship("SampleRequest", back_populates="sample_product")


class SampleInventory(Base):
    __tablename__ = "sample_inventory"

    id = Column(Integer, primary_key=True)
    sample_product_id = Column(Integer, ForeignKey("sample_products.id"), nullable=False)
    location_type = Column(
        Enum("warehouse", "rep", name="sample_inventory_location_type"),
        nullable=False,
        default="warehouse",
        server_default="warehouse",
    )
    rep_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    quantity_on_hand = Column(Integer, nullable=False, default=0, server_default="0")
    reorder_level = Column(Integer, nullable=False, default=0, server_default="0")
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "(location_type = 'warehouse' AND rep_id IS NULL) OR "
            "(location_type = 'rep' AND rep_id IS NOT NULL)",
            name="ck_sample_inventory_location",
        ),
        UniqueConstraint(
            "sample_product_id",
            "location_type",
            "rep_id",
            name="uq_sample_inventory_location",
        ),
        Index("idx_sample_inventory_rep", "rep_id"),
    )

    sample_product = relationship("SampleProduct", back_populates="inventories")
    rep = relationship(User)


class SampleDistribution(Base):
    __tablename__ = "sample_distributions"

    id = Column(Integer, primary_key=True)
    sample_product_id = Column(Integer, ForeignKey("sample_products.id"), nullable=False)
    rep_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id"), nullable=True)
    quantity = Column(Integer, nullable=False)
    channel = Column(
        Enum("in_person", "event", "request_fulfillment", name="sample_distribution_channel"),
        nullable=False,
        default="in_person",
        server_default="in_person",
    )
    distributed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "("
            "(channel = 'request_fulfillment' AND doctor_id IS NULL AND pharmacy_id IS NULL)"
            " OR "
            "(channel != 'request_fulfillment' AND "
            "((doctor_id IS NOT NULL AND pharmacy_id IS NULL) OR "
            "(pharmacy_id IS NOT NULL AND doctor_id IS NULL)))"
            ")",
            name="ck_sample_distribution_customer_link",
        ),
        CheckConstraint("quantity > 0", name="ck_sample_distribution_quantity_positive"),
        Index("idx_sample_distribution_distributed_at", "distributed_at"),
    )

    sample_product = relationship("SampleProduct", back_populates="distributions")
    rep = relationship(User)
    doctor = relationship(Doctor)
    pharmacy = relationship(Pharmacy)


class SampleRequest(Base):
    __tablename__ = "sample_requests"

    id = Column(Integer, primary_key=True)
    rep_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    sample_product_id = Column(Integer, ForeignKey("sample_products.id"), nullable=False)
    quantity_requested = Column(Integer, nullable=False)
    status = Column(
        Enum("pending", "approved", "rejected", "fulfilled", name="sample_request_status"),
        nullable=False,
        default="pending",
        server_default="pending",
    )
    requested_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    decided_at = Column(DateTime(timezone=True), nullable=True)
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    decision_notes = Column(Text, nullable=True)
    fulfillment_distribution_id = Column(
        Integer,
        ForeignKey("sample_distributions.id"),
        nullable=True,
    )

    __table_args__ = (
        CheckConstraint("quantity_requested > 0", name="ck_sample_request_quantity_positive"),
        Index("idx_sample_request_status", "status"),
        Index("idx_sample_request_requested_at", "requested_at"),
    )

    rep = relationship(User, foreign_keys=[rep_id])
    sample_product = relationship("SampleProduct", back_populates="requests")
    approver = relationship(User, foreign_keys=[approver_id])
    fulfillment_distribution = relationship("SampleDistribution")


class KOL(Base):
    __tablename__ = "kols"

    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False)
    specialty = Column(String(150), nullable=True)
    institution = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    influence_level = Column(
        Enum("A", "B", "C", name="kol_influence_level"),
        nullable=False,
        default="B",
        server_default="B",
    )
    engagement_score = Column(Float, nullable=False, default=0, server_default="0")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (Index("idx_kol_name", "name"),)

    attendances = relationship("EventAttendee", back_populates="kol")


class ScientificMaterial(Base):
    __tablename__ = "scientific_materials"

    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    material_type = Column(
        Enum("presentation", "pdf", "video", "link", "other", name="scientific_material_type"),
        nullable=False,
    )
    language = Column(String(10), nullable=False, default="ar", server_default="ar")
    therapeutic_area = Column(String(150), nullable=True)
    url = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, server_default="1")
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    created_by = relationship(User)


class MedicalEvent(Base):
    __tablename__ = "medical_events"

    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    event_type = Column(
        Enum("conference", "roundtable", "webinar", "cme", "internal", name="medical_event_type"),
        nullable=False,
    )
    status = Column(
        Enum("planned", "ongoing", "completed", "cancelled", name="medical_event_status"),
        nullable=False,
        default="planned",
        server_default="planned",
    )
    starts_at = Column(DateTime(timezone=True), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=False)
    location = Column(String(255), nullable=True)
    organizer = Column(String(150), nullable=True)
    budget = Column(Numeric(12, 2), nullable=True)
    actual_cost = Column(Numeric(12, 2), nullable=True)
    revenue_impact = Column(Numeric(12, 2), nullable=True)
    notes = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (Index("idx_medical_event_starts_at", "starts_at"),)

    created_by = relationship(User)
    attendees = relationship("EventAttendee", back_populates="event", cascade="all, delete-orphan")


class EventAttendee(Base):
    __tablename__ = "event_attendees"

    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("medical_events.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    kol_id = Column(Integer, ForeignKey("kols.id"), nullable=True)
    attendee_role = Column(String(50), nullable=False, default="attendee", server_default="attendee")
    attended = Column(Boolean, nullable=False, default=False, server_default="0")
    feedback_score = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "(doctor_id IS NOT NULL AND kol_id IS NULL) OR (kol_id IS NOT NULL AND doctor_id IS NULL)",
            name="ck_event_attendee_link",
        ),
        UniqueConstraint("event_id", "doctor_id", name="uq_event_attendee_doctor"),
        UniqueConstraint("event_id", "kol_id", name="uq_event_attendee_kol"),
        Index("idx_event_attendee_event_id", "event_id"),
    )

    event = relationship("MedicalEvent", back_populates="attendees")
    doctor = relationship(Doctor)
    kol = relationship("KOL", back_populates="attendances")
