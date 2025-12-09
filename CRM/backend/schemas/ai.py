from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field


class AIInsightOut(BaseModel):
    id: int
    created_at: datetime
    agent_name: str
    level: str
    entity_type: str
    entity_id: str
    title: str
    body: str
    meta: Dict[str, Any] | None = None

    model_config = ConfigDict(from_attributes=True)


class AITaskOut(BaseModel):
    id: int
    created_at: datetime
    agent_name: str
    assigned_to_user_id: int | None
    entity_type: str
    entity_id: str
    due_date: date | None
    status: str
    priority: str
    description: str
    meta: Dict[str, Any] | None = None

    model_config = ConfigDict(from_attributes=True)


class AITaskUpdate(BaseModel):
    assigned_to_user_id: int | None = None
    status: str | None = None
    priority: str | None = None
    due_date: date | None = None
    description: str | None = None


class AIMessageDraftOut(BaseModel):
    id: int
    created_at: datetime
    channel: str
    target_type: str
    target_id: str
    language: str
    subject: str | None
    body: str
    suggested_by_agent: str | None
    meta: Dict[str, Any] | None = None

    model_config = ConfigDict(from_attributes=True)


class CollectionPlanOut(BaseModel):
    id: int
    created_at: datetime
    pharmacy_id: int | None
    planned_date: date
    amount_expected: float
    status: str
    notes: str | None
    source: str

    model_config = ConfigDict(from_attributes=True)
