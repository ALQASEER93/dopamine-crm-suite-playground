from __future__ import annotations

from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from api.v1.utils import DEFAULT_PAGE, DEFAULT_PAGE_SIZE, clamp_page_size, paginate
from core.db import get_db
from core.security import get_current_user, require_roles
from models.crm import Doctor, Order, OrderLine, Pharmacy, Product
from schemas.common import PaginatedResponse
from schemas.crm import OrderCreate, OrderLineOut, OrderOut

router = APIRouter(
    prefix="/orders",
    tags=["orders"],
    dependencies=[Depends(get_current_user)],
)


def _calculate_total(lines: list[OrderLine]) -> Decimal:
    total = Decimal("0")
    for line in lines:
        line_total = Decimal(line.price) * Decimal(line.quantity)
        if line.discount:
            discount = Decimal(str(line.discount))
            line_total = line_total * (Decimal("1") - discount)
        total += line_total
    return total


@router.get("/", response_model=PaginatedResponse[OrderOut])
def list_orders(
    page: int = Query(DEFAULT_PAGE, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=500),
    status_filter: str | None = None,
    payment_status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaginatedResponse[OrderOut]:
    from core.security import has_any_role
    from models.crm import Visit
    
    query = db.query(Order)
    # Rep-scoped filtering: medical_rep can only see orders linked to their visits
    # Note: This is a simplified approach - in a real scenario, orders might have direct rep_id
    if has_any_role(current_user, ["medical_rep"]):
        # Get rep's visits and filter orders by associated doctors/pharmacies
        rep_visits = db.query(Visit).filter(Visit.rep_id == current_user.id).all()
        rep_doctor_ids = {v.doctor_id for v in rep_visits if v.doctor_id}
        rep_pharmacy_ids = {v.pharmacy_id for v in rep_visits if v.pharmacy_id}
        if rep_doctor_ids or rep_pharmacy_ids:
            from sqlalchemy import or_
            conditions = []
            if rep_doctor_ids:
                conditions.append(Order.doctor_id.in_(list(rep_doctor_ids)))
            if rep_pharmacy_ids:
                conditions.append(Order.pharmacy_id.in_(list(rep_pharmacy_ids)))
            if conditions:
                query = query.filter(or_(*conditions))
        else:
            # No visits = no orders to show
            query = query.filter(Order.id == -1)  # Empty result set
    if status_filter:
        query = query.filter(Order.status == status_filter)
    if payment_status:
        query = query.filter(Order.payment_status == payment_status)
    if date_from:
        query = query.filter(Order.order_date >= date_from)
    if date_to:
        query = query.filter(Order.order_date <= date_to)

    page_size = clamp_page_size(page_size)
    orders, total = paginate(query.order_by(Order.order_date.desc()), page, page_size)
    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(
        data=orders,
        pagination={"page": page, "page_size": page_size, "total": total, "total_pages": total_pages},
    )


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=OrderOut,
    dependencies=[Depends(require_roles("sales_manager", "medical_rep", "admin"))],
)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)) -> Order:
    if payload.doctor_id and not db.get(Doctor, payload.doctor_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor not found.")
    if payload.pharmacy_id and not db.get(Pharmacy, payload.pharmacy_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pharmacy not found.")

    order = Order(
        order_date=payload.order_date,
        status=payload.status,
        payment_status=payload.payment_status,
        aljazeera_ref=payload.aljazeera_ref,
        doctor_id=payload.doctor_id,
        pharmacy_id=payload.pharmacy_id,
    )
    db.add(order)
    db.flush()

    lines: list[OrderLine] = []
    for line in payload.lines:
        product = db.get(Product, line.product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product {line.product_id} not found.",
            )
        order_line = OrderLine(
            order_id=order.id,
            product_id=line.product_id,
            quantity=line.quantity,
            price=line.price,
            discount=line.discount,
            bonus=line.bonus,
        )
        db.add(order_line)
        lines.append(order_line)

    db.flush()
    order.total_amount = _calculate_total(lines)
    db.commit()
    db.refresh(order)
    return order


@router.get("/{order_id}", response_model=OrderOut)
def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Order:
    from core.security import has_any_role
    from models.crm import Visit
    
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    
    # Rep-scoped access: medical_rep can only access orders linked to their visits
    if has_any_role(current_user, ["medical_rep"]):
        rep_visit = (
            db.query(Visit)
            .filter(
                Visit.rep_id == current_user.id,
                (Visit.doctor_id == order.doctor_id) | (Visit.pharmacy_id == order.pharmacy_id),
            )
            .first()
        )
        if not rep_visit:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted.")
    
    return order


@router.get("/{order_id}/lines", response_model=list[OrderLineOut])
def list_order_lines(order_id: int, db: Session = Depends(get_db)) -> list[OrderLine]:
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    return order.lines
