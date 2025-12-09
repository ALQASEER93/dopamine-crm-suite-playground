from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class LedgerEvent(BaseModel):
    event_type: Literal["invoice", "return", "cash_receipt", "cheque_receipt"]
    date: Optional[date] = None
    amount: Decimal = Field(default=Decimal("0"))
    reference: Optional[str] = None
    meta: Dict[str, Any] = Field(default_factory=dict)
    raw: Dict[str, Any] = Field(default_factory=dict)


class LedgerTotals(BaseModel):
    invoices: Decimal = Field(default=Decimal("0"))
    returns: Decimal = Field(default=Decimal("0"))
    cash_receipts: Decimal = Field(default=Decimal("0"))
    cheque_receipts: Decimal = Field(default=Decimal("0"))
    balance: Decimal = Field(default=Decimal("0"))


class PharmacyStatement(BaseModel):
    pharmacy_legacy_id: str
    year: str
    events: List[LedgerEvent]
    summary: LedgerTotals
    warnings: List[str] = Field(default_factory=list)


class PharmacySummary(BaseModel):
    pharmacy_legacy_id: str
    year: str
    totals: LedgerTotals
    warnings: List[str] = Field(default_factory=list)


class AreaSummary(BaseModel):
    area_id: str
    year: str
    pharmacies: List[PharmacySummary]
    totals: LedgerTotals
    warnings: List[str] = Field(default_factory=list)
