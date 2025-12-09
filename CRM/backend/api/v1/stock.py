from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from api.v1.utils import DEFAULT_PAGE, DEFAULT_PAGE_SIZE, clamp_page_size, paginate
from core.db import get_db
from core.security import get_current_user, require_roles
from models.crm import Product, StockLocation, StockMovement
from schemas.common import PaginatedResponse
from schemas.crm import StockLocationCreate, StockLocationOut, StockMovementCreate, StockMovementOut

router = APIRouter(
    prefix="/stock",
    tags=["stock"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/locations", response_model=list[StockLocationOut])
def list_locations(db: Session = Depends(get_db)) -> list[StockLocation]:
    return db.query(StockLocation).order_by(StockLocation.name.asc()).all()


@router.post(
    "/locations",
    status_code=status.HTTP_201_CREATED,
    response_model=StockLocationOut,
    dependencies=[Depends(require_roles("sales_manager", "admin"))],
)
def create_location(payload: StockLocationCreate, db: Session = Depends(get_db)) -> StockLocation:
    loc = StockLocation(**payload.model_dump())
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc


@router.get("/movements", response_model=PaginatedResponse[StockMovementOut])
def list_movements(
    page: int = Query(DEFAULT_PAGE, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=500),
    product_id: int | None = None,
    location_id: int | None = None,
    db: Session = Depends(get_db),
) -> PaginatedResponse[StockMovementOut]:
    query = db.query(StockMovement)
    if product_id:
        query = query.filter(StockMovement.product_id == product_id)
    if location_id:
        query = query.filter(
            (StockMovement.location_from_id == location_id)
            | (StockMovement.location_to_id == location_id)
        )
    page_size = clamp_page_size(page_size)
    movements, total = paginate(query.order_by(StockMovement.movement_date.desc()), page, page_size)
    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(
        data=movements,
        pagination={"page": page, "page_size": page_size, "total": total, "total_pages": total_pages},
    )


@router.post(
    "/movements",
    status_code=status.HTTP_201_CREATED,
    response_model=StockMovementOut,
    dependencies=[Depends(require_roles("sales_manager", "admin", "medical_rep"))],
)
def create_movement(payload: StockMovementCreate, db: Session = Depends(get_db)) -> StockMovement:
    if not db.get(Product, payload.product_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Product not found.")
    movement = StockMovement(**payload.model_dump())
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement
