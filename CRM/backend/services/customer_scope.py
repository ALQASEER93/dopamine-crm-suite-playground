from __future__ import annotations

from sqlalchemy.orm import Query, Session

from models.crm import Route, RouteAccount


def assigned_route_accounts_query(db: Session, rep_id: int) -> Query:
    """Return route-account assignments owned by one representative."""
    return (
        db.query(RouteAccount)
        .join(Route, Route.id == RouteAccount.route_id)
        .filter(Route.rep_id == rep_id)
    )


def is_customer_assigned_to_rep(
    db: Session,
    *,
    rep_id: int,
    customer_type: str,
    customer_id: int,
) -> bool:
    query = assigned_route_accounts_query(db, rep_id).filter(
        RouteAccount.account_type == customer_type
    )
    if customer_type == "doctor":
        query = query.filter(RouteAccount.doctor_id == customer_id)
    elif customer_type == "pharmacy":
        query = query.filter(RouteAccount.pharmacy_id == customer_id)
    else:
        return False
    return query.with_entities(RouteAccount.id).first() is not None
