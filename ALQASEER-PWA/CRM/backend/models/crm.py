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
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
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
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("name", "clinic", "area", name="uq_doctor_identity"),
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
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("name", "city", "area", name="uq_pharmacy_identity"),
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
    )

    rep = relationship(User)
    doctor = relationship(Doctor, back_populates="visits")
    pharmacy = relationship(Pharmacy, back_populates="visits")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    order_date = Column(Date, nullable=False, default=date.today)
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

    doctor = relationship(Doctor, back_populates="collections")
    pharmacy = relationship(Pharmacy, back_populates="collections")
