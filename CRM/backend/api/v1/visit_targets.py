from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from api.v1.utils import DEFAULT_PAGE, DEFAULT_PAGE_SIZE, clamp_page_size, paginate
from core.db import get_db
from core.security import get_current_user, has_any_role, require_roles
from models.crm import User, VisitTarget
from schemas.common import PaginatedResponse
from schemas.crm import VisitTargetCreate, VisitTargetOut

router = APIRouter(
    prefix="/visit-targets",
    tags=["visit_targets"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/", response_model=PaginatedResponse[VisitTargetOut])
def list_visit_targets(
    page: int = Query(DEFAULT_PAGE, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=500),
    rep_id: int | None = None,
    period: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaginatedResponse[VisitTargetOut]:
    query = db.query(VisitTarget)
    effective_rep_id = rep_id
    if has_any_role(current_user, ["medical_rep"]) and effective_rep_id is None:
        effective_rep_id = current_user.id
    if effective_rep_id:
        query = query.filter(VisitTarget.rep_id == effective_rep_id)
    if period:
        query = query.filter(VisitTarget.period == period)

    page_size = clamp_page_size(page_size)
    targets, total = paginate(query.order_by(VisitTarget.period.desc()), page, page_size)
    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(
        data=targets,
        pagination={"page": page, "page_size": page_size, "total": total, "total_pages": total_pages},
    )


@router.post(
    "/",
    response_model=VisitTargetOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("sales_manager", "admin"))],
)
def upsert_visit_target(payload: VisitTargetCreate, db: Session = Depends(get_db)) -> VisitTarget:
    if not db.get(User, payload.rep_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rep not found.")

    existing = (
        db.query(VisitTarget)
        .filter(VisitTarget.rep_id == payload.rep_id, VisitTarget.period == payload.period)
        .first()
    )
    if existing:
        existing.daily_target_visits = payload.daily_target_visits
        existing.monthly_target_visits = payload.monthly_target_visits
        db.commit()
        db.refresh(existing)
        return existing

    target = VisitTarget(**payload.model_dump())
    db.add(target)
    db.commit()
    db.refresh(target)
    return target
