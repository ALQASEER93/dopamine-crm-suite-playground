from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from api.v1.utils import DEFAULT_PAGE, DEFAULT_PAGE_SIZE, clamp_page_size, paginate
from core.db import get_db
from core.security import get_current_user, has_any_role, require_roles
from models.crm import (
    Doctor,
    Pharmacy,
    SampleDistribution,
    SampleInventory,
    SampleProduct,
    SampleRequest,
    User,
)
from schemas.common import PaginatedResponse
from schemas.crm import (
    SampleDistributionCreate,
    SampleDistributionOut,
    SampleInventoryAdjust,
    SampleInventoryOut,
    SampleProductCreate,
    SampleProductOut,
    SampleRequestCreate,
    SampleRequestOut,
    SampleRequestStatusUpdate,
)

router = APIRouter(
    prefix="/samples",
    tags=["samples"],
    dependencies=[Depends(get_current_user)],
)


def _resolve_rep_id(current_user: User, provided_rep_id: Optional[int]) -> int:
    if has_any_role(current_user, ["medical_rep"]):
        if provided_rep_id and provided_rep_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted.")
        return current_user.id
    if provided_rep_id:
        return provided_rep_id
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="rep_id is required for non-rep users.")


def _parse_iso_date(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format.") from exc


@router.get(
    "/products",
    response_model=list[SampleProductOut],
    dependencies=[Depends(require_roles("admin", "sales_manager", "medical_rep"))],
)
def list_sample_products(
    active_only: bool = True,
    db: Session = Depends(get_db),
) -> list[SampleProduct]:
    query = db.query(SampleProduct).order_by(SampleProduct.name.asc())
    if active_only:
        query = query.filter(SampleProduct.is_active.is_(True))
    return query.all()


@router.post(
    "/products",
    response_model=SampleProductOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "sales_manager"))],
)
def create_sample_product(
    payload: SampleProductCreate,
    db: Session = Depends(get_db),
) -> SampleProduct:
    exists = db.query(SampleProduct).filter(SampleProduct.code == payload.code).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Sample product code already exists.")
    item = SampleProduct(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get(
    "/inventory",
    response_model=list[SampleInventoryOut],
    dependencies=[Depends(require_roles("admin", "sales_manager", "medical_rep"))],
)
def list_sample_inventory(
    rep_id: int | None = None,
    location_type: str | None = Query(default=None, pattern="^(warehouse|rep)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SampleInventory]:
    query = db.query(SampleInventory).options(
        joinedload(SampleInventory.sample_product),
        joinedload(SampleInventory.rep).joinedload(User.role),
    )
    if has_any_role(current_user, ["medical_rep"]):
        if rep_id and rep_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted.")
        query = query.filter(
            SampleInventory.location_type == "rep",
            SampleInventory.rep_id == current_user.id,
        )
    else:
        if rep_id:
            query = query.filter(
                SampleInventory.location_type == "rep",
                SampleInventory.rep_id == rep_id,
            )
    if location_type:
        query = query.filter(SampleInventory.location_type == location_type)
    return query.order_by(SampleInventory.updated_at.desc()).all()


@router.post(
    "/inventory/adjust",
    response_model=SampleInventoryOut,
    dependencies=[Depends(require_roles("admin", "sales_manager"))],
)
def adjust_sample_inventory(
    payload: SampleInventoryAdjust,
    db: Session = Depends(get_db),
) -> SampleInventory:
    sample_product = db.get(SampleProduct, payload.sample_product_id)
    if not sample_product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sample product not found.")

    if payload.location_type == "rep":
        rep = db.get(User, payload.rep_id)
        if not rep:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rep not found.")

    inventory = (
        db.query(SampleInventory)
        .filter(
            SampleInventory.sample_product_id == payload.sample_product_id,
            SampleInventory.location_type == payload.location_type,
            SampleInventory.rep_id == payload.rep_id,
        )
        .first()
    )
    if not inventory:
        if payload.delta < 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient stock.")
        inventory = SampleInventory(
            sample_product_id=payload.sample_product_id,
            location_type=payload.location_type,
            rep_id=payload.rep_id,
            quantity_on_hand=0,
            reorder_level=payload.reorder_level or 0,
        )
        db.add(inventory)
        db.flush()

    next_qty = int(inventory.quantity_on_hand or 0) + payload.delta
    if next_qty < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient stock.")

    inventory.quantity_on_hand = next_qty
    if payload.reorder_level is not None:
        inventory.reorder_level = payload.reorder_level
    db.commit()
    db.refresh(inventory)
    return inventory


@router.post(
    "/distribute",
    response_model=SampleDistributionOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "sales_manager", "medical_rep"))],
)
def distribute_samples(
    payload: SampleDistributionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SampleDistribution:
    sample_product = db.get(SampleProduct, payload.sample_product_id)
    if not sample_product or not sample_product.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sample product not found.")

    rep_id = _resolve_rep_id(current_user, payload.rep_id)
    if payload.doctor_id and not db.get(Doctor, payload.doctor_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found.")
    if payload.pharmacy_id and not db.get(Pharmacy, payload.pharmacy_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pharmacy not found.")

    rep_inventory = (
        db.query(SampleInventory)
        .filter(
            SampleInventory.sample_product_id == payload.sample_product_id,
            SampleInventory.location_type == "rep",
            SampleInventory.rep_id == rep_id,
        )
        .first()
    )
    if not rep_inventory or int(rep_inventory.quantity_on_hand or 0) < payload.quantity:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient rep sample inventory.")

    rep_inventory.quantity_on_hand = int(rep_inventory.quantity_on_hand or 0) - payload.quantity

    distribution = SampleDistribution(
        sample_product_id=payload.sample_product_id,
        rep_id=rep_id,
        doctor_id=payload.doctor_id,
        pharmacy_id=payload.pharmacy_id,
        quantity=payload.quantity,
        channel=payload.channel,
        notes=payload.notes,
    )
    db.add(distribution)
    db.commit()
    db.refresh(distribution)
    return distribution


@router.get(
    "/history",
    response_model=PaginatedResponse[SampleDistributionOut],
    dependencies=[Depends(require_roles("admin", "sales_manager", "medical_rep"))],
)
def sample_distribution_history(
    page: int = Query(DEFAULT_PAGE, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=500),
    rep_id: int | None = None,
    sample_product_id: int | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaginatedResponse[SampleDistributionOut]:
    page_size = clamp_page_size(page_size)
    from_ts = _parse_iso_date(from_date)
    to_ts = _parse_iso_date(to_date)

    query = db.query(SampleDistribution).options(
        joinedload(SampleDistribution.sample_product),
        joinedload(SampleDistribution.rep).joinedload(User.role),
        joinedload(SampleDistribution.doctor),
        joinedload(SampleDistribution.pharmacy),
    )
    if has_any_role(current_user, ["medical_rep"]):
        if rep_id and rep_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted.")
        query = query.filter(SampleDistribution.rep_id == current_user.id)
    elif rep_id:
        query = query.filter(SampleDistribution.rep_id == rep_id)

    if sample_product_id:
        query = query.filter(SampleDistribution.sample_product_id == sample_product_id)
    if from_ts:
        query = query.filter(SampleDistribution.distributed_at >= from_ts)
    if to_ts:
        query = query.filter(SampleDistribution.distributed_at <= to_ts)

    rows, total = paginate(query.order_by(SampleDistribution.distributed_at.desc()), page, page_size)
    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(
        data=rows,
        pagination={"page": page, "page_size": page_size, "total": total, "total_pages": total_pages},
    )


@router.post(
    "/request",
    response_model=SampleRequestOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "sales_manager", "medical_rep"))],
)
def create_sample_request(
    payload: SampleRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SampleRequest:
    sample_product = db.get(SampleProduct, payload.sample_product_id)
    if not sample_product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sample product not found.")
    request_row = SampleRequest(
        rep_id=current_user.id,
        sample_product_id=payload.sample_product_id,
        quantity_requested=payload.quantity_requested,
        notes=payload.notes,
        status="pending",
    )
    db.add(request_row)
    db.commit()
    db.refresh(request_row)
    return request_row


@router.get(
    "/request",
    response_model=PaginatedResponse[SampleRequestOut],
    dependencies=[Depends(require_roles("admin", "sales_manager", "medical_rep"))],
)
def list_sample_requests(
    page: int = Query(DEFAULT_PAGE, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=500),
    rep_id: int | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaginatedResponse[SampleRequestOut]:
    page_size = clamp_page_size(page_size)
    query = db.query(SampleRequest).options(
        joinedload(SampleRequest.rep).joinedload(User.role),
        joinedload(SampleRequest.sample_product),
        joinedload(SampleRequest.approver).joinedload(User.role),
    )
    if has_any_role(current_user, ["medical_rep"]):
        if rep_id and rep_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted.")
        query = query.filter(SampleRequest.rep_id == current_user.id)
    elif rep_id:
        query = query.filter(SampleRequest.rep_id == rep_id)

    if status_filter:
        query = query.filter(SampleRequest.status == status_filter)

    rows, total = paginate(query.order_by(SampleRequest.requested_at.desc()), page, page_size)
    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(
        data=rows,
        pagination={"page": page, "page_size": page_size, "total": total, "total_pages": total_pages},
    )


@router.patch(
    "/request/{request_id}/status",
    response_model=SampleRequestOut,
    dependencies=[Depends(require_roles("admin", "sales_manager"))],
)
def update_sample_request_status(
    request_id: int,
    payload: SampleRequestStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SampleRequest:
    request_row = db.get(SampleRequest, request_id)
    if not request_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sample request not found.")

    if payload.status == "fulfilled":
        warehouse_inventory = (
            db.query(SampleInventory)
            .filter(
                SampleInventory.sample_product_id == request_row.sample_product_id,
                SampleInventory.location_type == "warehouse",
                SampleInventory.rep_id.is_(None),
            )
            .first()
        )
        if not warehouse_inventory or int(warehouse_inventory.quantity_on_hand or 0) < request_row.quantity_requested:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient warehouse stock to fulfill request.",
            )
        rep_inventory = (
            db.query(SampleInventory)
            .filter(
                SampleInventory.sample_product_id == request_row.sample_product_id,
                SampleInventory.location_type == "rep",
                SampleInventory.rep_id == request_row.rep_id,
            )
            .first()
        )
        if not rep_inventory:
            rep_inventory = SampleInventory(
                sample_product_id=request_row.sample_product_id,
                location_type="rep",
                rep_id=request_row.rep_id,
                quantity_on_hand=0,
                reorder_level=0,
            )
            db.add(rep_inventory)
            db.flush()
        warehouse_inventory.quantity_on_hand = (
            int(warehouse_inventory.quantity_on_hand or 0) - request_row.quantity_requested
        )
        rep_inventory.quantity_on_hand = int(rep_inventory.quantity_on_hand or 0) + request_row.quantity_requested
        fulfillment_distribution = SampleDistribution(
            sample_product_id=request_row.sample_product_id,
            rep_id=request_row.rep_id,
            quantity=request_row.quantity_requested,
            channel="request_fulfillment",
            notes=f"Fulfillment transfer for sample request #{request_row.id}",
        )
        db.add(fulfillment_distribution)
        db.flush()
        request_row.fulfillment_distribution_id = fulfillment_distribution.id

    request_row.status = payload.status
    request_row.approver_id = current_user.id
    request_row.decided_at = datetime.now(timezone.utc)
    request_row.decision_notes = payload.decision_notes
    db.commit()
    db.refresh(request_row)
    return request_row
