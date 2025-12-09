from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.db import get_db
from core.security import require_roles
from dpm_ledger import services
from models.ai import LedgerAuditLog
from models.crm import User
from schemas.dpm_ledger import AreaSummary, PharmacyStatement, PharmacySummary

router = APIRouter()


def _log_audit(
    db: Session,
    user: User,
    action: str,
    target_type: str,
    target_id: str,
    meta: dict | None = None,
) -> None:
    resolved_user_id = None
    if user and user.id is not None:
        resolved_user_id = int(user.id)

    entry = LedgerAuditLog(
        user_id=resolved_user_id,
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        meta=meta or {},
    )
    db.add(entry)
    db.commit()


@router.get(
    "/pharmacies/{legacy_id}/summary",
    response_model=PharmacySummary,
)
def pharmacy_summary(
    legacy_id: str,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    year: Optional[str] = None,
    user: User = Depends(require_roles("admin", "sales_manager")),
    db: Session = Depends(get_db),
):
    summary = services.get_pharmacy_account_summary(legacy_id, date_from, date_to, year)
    _log_audit(db, user, "view_statement", "pharmacy", legacy_id, meta={"mode": "summary"})
    return summary


@router.get(
    "/pharmacies/{legacy_id}/statement",
    response_model=PharmacyStatement,
)
def pharmacy_statement(
    legacy_id: str,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    year: Optional[str] = None,
    user: User = Depends(require_roles("admin", "sales_manager")),
    db: Session = Depends(get_db),
):
    statement = services.get_pharmacy_detailed_statement(legacy_id, date_from, date_to, year)
    _log_audit(db, user, "view_statement", "pharmacy", legacy_id, meta={"mode": "statement"})
    return statement


@router.get(
    "/areas/{area_id}/summary",
    response_model=AreaSummary,
)
def area_summary(
    area_id: str,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    year: Optional[str] = None,
    user: User = Depends(require_roles("admin", "sales_manager")),
    db: Session = Depends(get_db),
):
    summary = services.get_area_summary(area_id, date_from, date_to, year)
    _log_audit(db, user, "view_statement", "area", area_id, meta={"mode": "area_summary"})
    return summary
