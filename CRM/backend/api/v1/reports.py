from __future__ import annotations

import csv
import io
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.db import get_db
from core.security import get_current_user, require_roles
from models.crm import Order, OrderLine, Product, SalesRep, Territory, User, Visit

router = APIRouter(prefix="/reports", tags=["reports"], dependencies=[Depends(get_current_user)])


def _parse_dates(from_str: Optional[str], to_str: Optional[str]) -> tuple[Optional[date], Optional[date]]:
    from_date = date.fromisoformat(from_str) if from_str else None
    to_date = date.fromisoformat(to_str) if to_str else None
    return from_date, to_date


def _apply_date_range(query, field, from_date: Optional[date], to_date: Optional[date]):
    if from_date:
        query = query.filter(field >= from_date)
    if to_date:
        query = query.filter(field <= to_date)
    return query


@router.get("/overview")
def reports_overview(
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None, alias="to"),
    db: Session = Depends(get_db),
):
    from_date, to_date = _parse_dates(from_, to)

    visit_query = _apply_date_range(db.query(Visit), Visit.visit_date, from_date, to_date)
    total_visits = visit_query.count()

    order_query = _apply_date_range(db.query(Order), Order.order_date, from_date, to_date)
    orders_count = order_query.count()
    orders_total = order_query.with_entities(func.coalesce(func.sum(Order.total_amount), 0)).scalar() or 0

    data = {
        "totalVisits": total_visits,
        "successfulVisits": total_visits,
        "ordersCount": orders_count,
        "ordersTotal": float(orders_total),
    }
    return {"data": data}


@router.get("/rep-performance")
def rep_performance(
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None, alias="to"),
    db: Session = Depends(get_db),
):
    from_date, to_date = _parse_dates(from_, to)

    reps = (
        db.query(User)
        .outerjoin(SalesRep, SalesRep.user_id == User.id)
        .outerjoin(Territory, Territory.id == SalesRep.territory_id)
        .all()
    )

    rows = []
    for rep in reps:
        visit_query = db.query(Visit).filter(Visit.rep_id == rep.id)
        order_query = db.query(Order).filter(Order.pharmacy_id.isnot(None))
        if from_date or to_date:
            visit_query = _apply_date_range(visit_query, Visit.visit_date, from_date, to_date)
            order_query = _apply_date_range(order_query, Order.order_date, from_date, to_date)

        total_visits = visit_query.count()
        unique_accounts = (
            visit_query.with_entities(func.count(func.distinct(func.coalesce(Visit.doctor_id, Visit.pharmacy_id)))).scalar()
            or 0
        )
        total_order_value = order_query.with_entities(func.coalesce(func.sum(Order.total_amount), 0)).scalar() or 0
        avg_order_value = total_order_value / orders_count if (orders_count := order_query.count()) else 0

        territory_names = []
        if rep.sales_rep_profile and rep.sales_rep_profile.territory:
            territory_names.append(rep.sales_rep_profile.territory.name)

        rows.append(
            {
                "repId": rep.id,
                "repName": rep.name,
                "repEmail": rep.email,
                "territoryNames": territory_names,
                "totalVisits": total_visits,
                "completedVisits": total_visits,
                "scheduledVisits": 0,
                "cancelledVisits": 0,
                "uniqueAccounts": unique_accounts,
                "totalOrderValueJOD": float(total_order_value),
                "avgOrderValueJOD": float(avg_order_value),
                "avgRating": 0,
            }
        )

    return rows


@router.get("/rep-performance/export", dependencies=[Depends(require_roles("sales_manager"))])
def rep_performance_export(
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None, alias="to"),
    db: Session = Depends(get_db),
):
    rows = rep_performance(from_, to, db)  # type: ignore[arg-type]
    buffer = io.StringIO()
    writer = csv.DictWriter(
        buffer,
        fieldnames=[
            "repId",
            "repName",
            "repEmail",
            "territoryNames",
            "totalVisits",
            "completedVisits",
            "scheduledVisits",
            "cancelledVisits",
            "uniqueAccounts",
            "totalOrderValueJOD",
            "avgOrderValueJOD",
            "avgRating",
        ],
    )
    writer.writeheader()
    for row in rows:
        row_copy = row.copy()
        row_copy["territoryNames"] = ", ".join(row_copy.get("territoryNames") or [])
        writer.writerow(row_copy)

    csv_bytes = buffer.getvalue().encode("utf-8")
    filename = f"rep-performance-{from_ or 'start'}-{to or 'end'}.csv"
    return Response(content=csv_bytes, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.get("/product-performance")
def product_performance(
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None, alias="to"),
    db: Session = Depends(get_db),
):
    from_date, to_date = _parse_dates(from_, to)

    line_query = db.query(OrderLine, Order).join(Order, OrderLine.order_id == Order.id)
    if from_date or to_date:
        line_query = _apply_date_range(line_query, Order.order_date, from_date, to_date)

    aggregates = (
        line_query.join(Product, Product.id == OrderLine.product_id)
        .with_entities(
            Product.name.label("product_name"),
            func.count(OrderLine.id).label("visits_count"),
            func.sum(OrderLine.quantity).label("total_qty"),
            func.sum(OrderLine.price * OrderLine.quantity).label("total_value"),
        )
        .group_by(Product.name)
        .all()
    )

    rows = []
    for agg in aggregates:
        visits_count = agg.visits_count or 0
        total_qty = agg.total_qty or 0
        rows.append(
            {
                "productName": agg.product_name,
                "visitsCount": int(visits_count),
                "totalQuantity": int(total_qty),
                "avgQuantityPerVisit": float(total_qty) / visits_count if visits_count else 0,
                "totalOrderValueJOD": float(agg.total_value or 0),
            }
        )
    return rows


@router.get("/territory-performance")
def territory_performance(
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None, alias="to"),
    db: Session = Depends(get_db),
):
    from_date, to_date = _parse_dates(from_, to)

    territories = db.query(Territory).all()
    rows = []
    for territory in territories:
        rep_ids = [rep.user_id for rep in territory.sales_reps]
        visit_query = db.query(Visit)
        if rep_ids:
            visit_query = visit_query.filter(Visit.rep_id.in_(rep_ids))
        if from_date or to_date:
            visit_query = _apply_date_range(visit_query, Visit.visit_date, from_date, to_date)

        total_visits = visit_query.count()
        unique_accounts = (
            visit_query.with_entities(func.count(func.distinct(func.coalesce(Visit.doctor_id, Visit.pharmacy_id)))).scalar()
            or 0
        )

        order_query = db.query(Order)
        if rep_ids:
            order_query = order_query.join(User, User.id == Order.pharmacy_id)  # placeholder association
        if from_date or to_date:
            order_query = _apply_date_range(order_query, Order.order_date, from_date, to_date)

        total_order_value = order_query.with_entities(func.coalesce(func.sum(Order.total_amount), 0)).scalar() or 0
        avg_order_value = total_order_value / order_query.count() if order_query.count() else 0

        rows.append(
            {
                "territoryId": territory.id,
                "territoryName": territory.name,
                "totalVisits": total_visits,
                "completedVisits": total_visits,
                "uniqueAccounts": unique_accounts,
                "totalOrderValueJOD": float(total_order_value),
                "avgOrderValueJOD": float(avg_order_value),
                "avgRating": 0,
            }
        )
    return rows
