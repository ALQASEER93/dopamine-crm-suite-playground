from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Optional

from sqlalchemy.orm import Session

from core.db import SessionLocal
from models.ai import AIInsight, AIMessageDraft, AITask, CollectionPlan

logger = logging.getLogger(__name__)


class AgentBase:
    name: str = "agent_base"

    def __init__(self, db_session: Optional[Session] = None):
        self._external_session = db_session
        self.db: Session = db_session or SessionLocal()

    async def run(self) -> None:  # pragma: no cover - to be overridden
        raise NotImplementedError

    def add_insight(
        self,
        title: str,
        body: str,
        level: str = "info",
        entity_type: str = "general",
        entity_id: str = "-",
        meta: Optional[dict] = None,
    ) -> AIInsight:
        insight = AIInsight(
            agent_name=self.name,
            level=level,
            entity_type=entity_type,
            entity_id=str(entity_id),
            title=title,
            body=body,
            meta=meta or {},
        )
        self.db.add(insight)
        self.db.commit()
        self.db.refresh(insight)
        logger.info("[%s] Insight recorded id=%s", self.name, insight.id)
        return insight

    def add_task(
        self,
        description: str,
        entity_type: str,
        entity_id: str,
        due_date: Optional[datetime] = None,
        priority: str = "medium",
        status: str = "open",
        assigned_to_user_id: Optional[int] = None,
        meta: Optional[dict] = None,
    ) -> AITask:
        task = AITask(
            agent_name=self.name,
            description=description,
            entity_type=entity_type,
            entity_id=str(entity_id),
            due_date=due_date.date() if isinstance(due_date, datetime) else due_date,
            priority=priority,
            status=status,
            assigned_to_user_id=assigned_to_user_id,
            meta=meta or {},
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        logger.info("[%s] Task recorded id=%s", self.name, task.id)
        return task

    def add_collection_plan(
        self,
        pharmacy_id: Optional[int],
        planned_date,
        amount_expected,
        notes: str = "",
        source: str = "ai",
        status: str = "planned",
        meta: Optional[dict] = None,
    ) -> CollectionPlan:
        plan = CollectionPlan(
            pharmacy_id=pharmacy_id,
            planned_date=planned_date,
            amount_expected=amount_expected,
            notes=notes,
            source=source,
            status=status,
        )
        self.db.add(plan)
        self.db.commit()
        self.db.refresh(plan)
        logger.info("[%s] Collection plan recorded id=%s", self.name, plan.id)
        return plan

    def close(self) -> None:
        if not self._external_session:
            self.db.close()

    def add_message_draft(
        self,
        channel: str,
        target_type: str,
        target_id: str,
        language: str,
        body: str,
        subject: str | None = None,
        suggested_by_agent: str | None = None,
        meta: Optional[dict] = None,
    ) -> AIMessageDraft:
        draft = AIMessageDraft(
            channel=channel,
            target_type=target_type,
            target_id=str(target_id),
            language=language,
            subject=subject,
            body=body,
            suggested_by_agent=suggested_by_agent or self.name,
            meta=meta or {},
        )
        self.db.add(draft)
        self.db.commit()
        self.db.refresh(draft)
        logger.info("[%s] Message draft recorded id=%s", self.name, draft.id)
        return draft

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        self.close()
