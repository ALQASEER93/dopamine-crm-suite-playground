from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from api.v1.utils import DEFAULT_PAGE, DEFAULT_PAGE_SIZE, clamp_page_size, paginate
from core.db import get_db
from core.security import get_current_user, require_roles
from models.crm import Territory
from schemas.common import PaginatedResponse
from schemas.territory import TerritoryCreate, TerritoryOut

router = APIRouter(
    prefix="/territories",
    tags=["territories"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=PaginatedResponse[TerritoryOut])
def list_territories(
    page: int = Query(DEFAULT_PAGE, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=500, alias="pageSize"),
    db: Session = Depends(get_db),
) -> PaginatedResponse[TerritoryOut]:
    page_size = clamp_page_size(page_size)
    query = db.query(Territory)
    territories, total = paginate(query.order_by(Territory.name.asc()), page, page_size)
    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(
        data=territories,
        pagination={"page": page, "page_size": page_size, "total": total, "total_pages": total_pages},
    )


@router.post(
    "",
    response_model=TerritoryOut,
    dependencies=[Depends(require_roles("sales_manager", "admin"))],
)
def create_territory(payload: TerritoryCreate, db: Session = Depends(get_db)) -> Territory:
    territory = Territory(name=payload.name, code=payload.code)
    db.add(territory)
    db.commit()
    db.refresh(territory)
    return territory
