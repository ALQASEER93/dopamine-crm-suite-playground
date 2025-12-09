from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from core.db import get_db
from core.security import require_roles
from models.ai import AIInsight, AIMessageDraft, AITask, CollectionPlan
from schemas.ai import (
    AIInsightOut,
    AIMessageDraftOut,
    AITaskOut,
    AITaskUpdate,
    CollectionPlanOut,
)

router = APIRouter()


def _paginate(query, page: int, page_size: int, order_by_column):
    total = query.count()
    items = (
        query.order_by(order_by_column)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    meta = {
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size if total else 0,
    }
    return items, meta


@router.get("/insights", response_model=dict)
def list_insights(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    agent_name: str | None = None,
    entity_type: str | None = None,
    user=Depends(require_roles("admin", "sales_manager")),
    db: Session = Depends(get_db),
):
    query = db.query(AIInsight)
    if agent_name:
        query = query.filter(AIInsight.agent_name == agent_name)
    if entity_type:
        query = query.filter(AIInsight.entity_type == entity_type)
    items, meta = _paginate(query, page, page_size, AIInsight.created_at.desc())
    data = [AIInsightOut.model_validate(item) for item in items]
    return {"data": data, "meta": meta}


@router.get("/tasks", response_model=dict)
def list_tasks(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    status_filter: str | None = Query(default=None, alias="status"),
    user=Depends(require_roles("admin", "sales_manager")),
    db: Session = Depends(get_db),
):
    query = db.query(AITask)
    if status_filter:
        query = query.filter(AITask.status == status_filter)
    items, meta = _paginate(query, page, page_size, AITask.created_at.desc())
    data = [AITaskOut.model_validate(item) for item in items]
    return {"data": data, "meta": meta}


@router.patch("/tasks/{task_id}", response_model=AITaskOut)
def update_task(
    task_id: int,
    payload: AITaskUpdate,
    user=Depends(require_roles("admin", "sales_manager")),
    db: Session = Depends(get_db),
):
    task = db.query(AITask).filter(AITask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return AITaskOut.model_validate(task)


@router.get("/drafts", response_model=dict)
def list_drafts(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    channel: str | None = None,
    user=Depends(require_roles("admin", "sales_manager")),
    db: Session = Depends(get_db),
):
    query = db.query(AIMessageDraft)
    if channel:
        query = query.filter(AIMessageDraft.channel == channel)
    total = query.count()
    items = (
        query.order_by(AIMessageDraft.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    meta = {
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size if total else 0,
    }
    data = [AIMessageDraftOut.model_validate(item) for item in items]
    return {"data": data, "meta": meta}


@router.get("/collection-plan", response_model=dict)
def list_collection_plan(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    status_filter: str | None = Query(default=None, alias="status"),
    user=Depends(require_roles("admin", "sales_manager")),
    db: Session = Depends(get_db),
):
    query = db.query(CollectionPlan)
    if status_filter:
        query = query.filter(CollectionPlan.status == status_filter)
    total = query.count()
    items = (
        query.order_by(CollectionPlan.planned_date.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    meta = {
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size if total else 0,
    }
    data = [CollectionPlanOut.model_validate(item) for item in items]
    return {"data": data, "meta": meta}
