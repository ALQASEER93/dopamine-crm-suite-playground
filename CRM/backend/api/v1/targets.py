from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from api.v1.utils import DEFAULT_PAGE, DEFAULT_PAGE_SIZE, clamp_page_size, paginate
from core.db import get_db
from core.security import get_current_user, require_roles
from models.crm import Product, Target, User
from schemas.common import PaginatedResponse
from schemas.crm import TargetCreate, TargetOut

router = APIRouter(
    prefix="/targets",
    tags=["targets"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/", response_model=PaginatedResponse[TargetOut])
def list_targets(
    page: int = Query(DEFAULT_PAGE, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=500),
    rep_id: int | None = None,
    period: str | None = None,
    db: Session = Depends(get_db),
) -> PaginatedResponse[TargetOut]:
    query = db.query(Target)
    if rep_id:
        query = query.filter(Target.rep_id == rep_id)
    if period:
        query = query.filter(Target.period == period)

    page_size = clamp_page_size(page_size)
    targets, total = paginate(query.order_by(Target.period.desc()), page, page_size)
    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(
        data=targets,
        pagination={"page": page, "page_size": page_size, "total": total, "total_pages": total_pages},
    )


@router.post(
    "/",
    response_model=TargetOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("sales_manager", "admin"))],
)
def create_target(payload: TargetCreate, db: Session = Depends(get_db)) -> Target:
    if not db.get(User, payload.rep_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rep not found.")
    if payload.product_id and not db.get(Product, payload.product_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Product not found.")
    target = Target(**payload.model_dump())
    db.add(target)
    db.commit()
    db.refresh(target)
    return target
