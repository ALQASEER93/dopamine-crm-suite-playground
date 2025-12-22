from __future__ import annotations

from sqlalchemy import (
    JSON,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Integer,
    Numeric,
    String,
    Text,
    func,
)

from core.db import Base


class AIInsight(Base):
    __tablename__ = "ai_insights"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    agent_name = Column(String(100), nullable=False)
    level = Column(String(20), nullable=False)  # info | warning | critical
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    meta = Column(JSON, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "level in ('info', 'warning', 'critical')",
            name="ck_ai_insights_level",
        ),
    )


class AITask(Base):
    __tablename__ = "ai_tasks"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    agent_name = Column(String(100), nullable=False)
    assigned_to_user_id = Column(Integer, nullable=True)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=False)
    due_date = Column(Date, nullable=True)
    status = Column(String(20), nullable=False, default="open", server_default="open")
    priority = Column(String(20), nullable=False, default="medium", server_default="medium")
    description = Column(Text, nullable=False)
    meta = Column(JSON, nullable=True)

    __table_args__ = (
        CheckConstraint("status in ('open', 'in_progress', 'done')", name="ck_ai_tasks_status"),
        CheckConstraint("priority in ('low', 'medium', 'high')", name="ck_ai_tasks_priority"),
    )


class AIMessageDraft(Base):
    __tablename__ = "ai_message_drafts"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    channel = Column(String(20), nullable=False)  # whatsapp/email/sms/other
    target_type = Column(String(100), nullable=False)
    target_id = Column(String(100), nullable=False)
    language = Column(String(10), nullable=False)  # ar/en
    subject = Column(String(255), nullable=True)
    body = Column(Text, nullable=False)
    suggested_by_agent = Column(String(100), nullable=True)
    meta = Column(JSON, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "channel in ('whatsapp', 'email', 'sms', 'other')",
            name="ck_ai_message_drafts_channel",
        ),
        CheckConstraint("language in ('ar', 'en')", name="ck_ai_message_drafts_language"),
    )


class CollectionPlan(Base):
    __tablename__ = "collection_plan"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    pharmacy_id = Column(Integer, nullable=True, index=True)
    planned_date = Column(Date, nullable=False)
    amount_expected = Column(Numeric(12, 2), nullable=False)
    status = Column(String(20), nullable=False, default="planned", server_default="planned")
    notes = Column(Text, nullable=True)
    source = Column(String(20), nullable=False, default="manual", server_default="manual")

    __table_args__ = (
        CheckConstraint(
            "status in ('planned', 'done', 'cancelled')",
            name="ck_collection_plan_status",
        ),
        CheckConstraint("source in ('ai', 'manual')", name="ck_collection_plan_source"),
    )


class LedgerAuditLog(Base):
    __tablename__ = "ledger_audit_log"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    user_id = Column(Integer, nullable=True, index=True)
    action = Column(String(50), nullable=False)
    target_type = Column(String(50), nullable=False)
    target_id = Column(String(100), nullable=False)
    meta = Column(JSON, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "action in ('view_statement', 'export_statement', 'other')",
            name="ck_ledger_audit_action",
        ),
        CheckConstraint(
            "target_type in ('pharmacy', 'area')",
            name="ck_ledger_audit_target_type",
        ),
    )
