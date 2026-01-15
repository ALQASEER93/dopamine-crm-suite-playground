from __future__ import annotations

import csv
import io

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
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


@router.get("/locations/export", dependencies=[Depends(require_roles("sales_manager", "admin"))])
def export_locations(db: Session = Depends(get_db)) -> Response:
    buffer = io.StringIO()
    writer = csv.DictWriter(
        buffer,
        fieldnames=["id", "name", "location_type", "rep_id"],
    )
    writer.writeheader()
    for loc in db.query(StockLocation).order_by(StockLocation.name.asc()).all():
        writer.writerow(
            {
                "id": loc.id,
                "name": loc.name,
                "location_type": loc.location_type,
                "rep_id": loc.rep_id or "",
            }
        )

    headers = {"Content-Disposition": 'attachment; filename="stock_locations.csv"'}
    return Response(content=buffer.getvalue(), media_type="text/csv", headers=headers)


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
    if payload.location_from_id is None and payload.location_to_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either location_from_id or location_to_id is required.",
        )
    if payload.location_from_id and payload.location_to_id and payload.location_from_id == payload.location_to_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source and destination locations must be different.",
        )
    movement = StockMovement(**payload.model_dump())
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement


@router.get("/movements/export", dependencies=[Depends(require_roles("sales_manager", "admin"))])
def export_movements(
    product_id: int | None = None,
    location_id: int | None = None,
    db: Session = Depends(get_db),
) -> Response:
    query = db.query(StockMovement)
    if product_id:
        query = query.filter(StockMovement.product_id == product_id)
    if location_id:
        query = query.filter(
            (StockMovement.location_from_id == location_id)
            | (StockMovement.location_to_id == location_id)
        )

    buffer = io.StringIO()
    writer = csv.DictWriter(
        buffer,
        fieldnames=[
            "id",
            "movement_date",
            "product_id",
            "quantity",
            "reason",
            "location_from_id",
            "location_to_id",
            "notes",
        ],
    )
    writer.writeheader()
    for movement in query.order_by(StockMovement.movement_date.desc()).all():
        writer.writerow(
            {
                "id": movement.id,
                "movement_date": movement.movement_date.isoformat(),
                "product_id": movement.product_id,
                "quantity": movement.quantity,
                "reason": movement.reason,
                "location_from_id": movement.location_from_id or "",
                "location_to_id": movement.location_to_id or "",
                "notes": movement.notes or "",
            }
        )

    headers = {"Content-Disposition": 'attachment; filename="stock_movements.csv"'}
    return Response(content=buffer.getvalue(), media_type="text/csv", headers=headers)
