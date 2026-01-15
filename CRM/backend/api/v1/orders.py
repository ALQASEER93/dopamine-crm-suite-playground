from __future__ import annotations

from datetime import date
from decimal import Decimal

import csv
import io

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from api.v1.utils import DEFAULT_PAGE, DEFAULT_PAGE_SIZE, clamp_page_size, paginate
from core.db import get_db
from core.security import get_current_user, require_roles
from models.crm import Doctor, Order, OrderLine, Pharmacy, Product
from schemas.common import PaginatedResponse
from schemas.crm import OrderCreate, OrderLineOut, OrderOut, OrderUpdate

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
    db: Session = Depends(get_db),
) -> PaginatedResponse[OrderOut]:
    query = db.query(Order)
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


@router.put(
    "/{order_id:int}",
    response_model=OrderOut,
    dependencies=[Depends(require_roles("sales_manager", "medical_rep", "admin"))],
)
def update_order(order_id: int, payload: OrderUpdate, db: Session = Depends(get_db)) -> Order:
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    updates = payload.model_dump(exclude_unset=True)
    if "doctor_id" in updates and updates["doctor_id"]:
        if not db.get(Doctor, updates["doctor_id"]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor not found.")
    if "pharmacy_id" in updates and updates["pharmacy_id"]:
        if not db.get(Pharmacy, updates["pharmacy_id"]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pharmacy not found.")

    lines_payload = updates.pop("lines", None)
    for key, value in updates.items():
        setattr(order, key, value)

    if lines_payload is not None:
        order.lines.clear()
        lines: list[OrderLine] = []
        for line in lines_payload:
            line_data = line if isinstance(line, dict) else line.model_dump()
            product_id = line_data.get("product_id")
            product = db.get(Product, product_id)
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product {product_id} not found.",
                )
            order_line = OrderLine(
                order_id=order.id,
                product_id=product_id,
                quantity=line_data.get("quantity"),
                price=line_data.get("price"),
                discount=line_data.get("discount", 0),
                bonus=line_data.get("bonus"),
            )
            db.add(order_line)
            lines.append(order_line)
        db.flush()
        order.total_amount = _calculate_total(lines)
    else:
        order.total_amount = _calculate_total(order.lines)

    db.commit()
    db.refresh(order)
    return order


@router.get("/{order_id:int}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)) -> Order:
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    return order


@router.get("/{order_id:int}/lines", response_model=list[OrderLineOut])
def list_order_lines(order_id: int, db: Session = Depends(get_db)) -> list[OrderLine]:
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    return order.lines


@router.delete(
    "/{order_id:int}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    dependencies=[Depends(require_roles("sales_manager", "admin"))],
)
def delete_order(order_id: int, db: Session = Depends(get_db)) -> Response:
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    db.delete(order)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/export", dependencies=[Depends(require_roles("sales_manager", "admin"))])
def export_orders(
    status_filter: str | None = None,
    payment_status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
) -> Response:
    query = db.query(Order)
    if status_filter:
        query = query.filter(Order.status == status_filter)
    if payment_status:
        query = query.filter(Order.payment_status == payment_status)
    if date_from:
        query = query.filter(Order.order_date >= date_from)
    if date_to:
        query = query.filter(Order.order_date <= date_to)

    buffer = io.StringIO()
    writer = csv.DictWriter(
        buffer,
        fieldnames=[
            "id",
            "order_date",
            "status",
            "payment_status",
            "total_amount",
            "aljazeera_ref",
            "customer_type",
            "customer_name",
            "lines_count",
        ],
    )
    writer.writeheader()
    for order in query.order_by(Order.order_date.desc()).all():
        if order.doctor:
            customer_type = "doctor"
            customer_name = order.doctor.name
        elif order.pharmacy:
            customer_type = "pharmacy"
            customer_name = order.pharmacy.name
        else:
            customer_type = ""
            customer_name = ""
        writer.writerow(
            {
                "id": order.id,
                "order_date": order.order_date.isoformat(),
                "status": order.status,
                "payment_status": order.payment_status,
                "total_amount": order.total_amount,
                "aljazeera_ref": order.aljazeera_ref or "",
                "customer_type": customer_type,
                "customer_name": customer_name,
                "lines_count": len(order.lines or []),
            }
        )

    headers = {"Content-Disposition": 'attachment; filename="orders.csv"'}
    return Response(content=buffer.getvalue(), media_type="text/csv", headers=headers)
