from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, Sequence

from sqlalchemy import and_, select

from dpm_ledger.config import DEFAULT_ACTIVE_YEAR, get_ledger_engine
from dpm_ledger.models_raw import LedgerTables, load_ledger_tables

logger = logging.getLogger(__name__)

AMOUNT_CANDIDATES = ["net", "total", "amount", "grand_total", "balance", "value"]
DATE_CANDIDATES = ["date", "doc_date", "invoice_date", "trans_date", "entrydate"]
ACCOUNT_CANDIDATES = [
    "pharmacyid",
    "pharmacy_id",
    "customerid",
    "customer_id",
    "accountid",
    "account_id",
    "clientid",
    "client_id",
]
REFERENCE_CANDIDATES = ["number", "no", "reference", "doc_no", "invoice_no", "serial"]


def _normalize_date(value: Any) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value).date()
        except ValueError:
            return None
    return None


def _decimal(value: Any) -> Decimal:
    try:
        if value is None:
            return Decimal("0")
        return Decimal(str(value))
    except Exception:  # noqa: BLE001
        return Decimal("0")


def _choose_column(table, candidates: Sequence[str]):
    if table is None:
        return None
    normalized = {col.name.replace("_", "").lower(): col for col in table.c}
    for candidate in candidates:
        key = candidate.replace("_", "").lower()
        if key in normalized:
            return normalized[key]
    return None


def _fetch_events(
    table,
    legacy_id: str,
    event_type: str,
    date_from: Optional[date],
    date_to: Optional[date],
    amount_candidates: Sequence[str],
    account_candidates: Sequence[str],
    extra_meta: Optional[Dict[str, Any]] = None,
) -> list[dict]:
    if table is None:
        return []

    account_col = _choose_column(table, account_candidates)
    date_col = _choose_column(table, DATE_CANDIDATES)
    amount_col = _choose_column(table, amount_candidates)
    reference_col = _choose_column(table, REFERENCE_CANDIDATES)

    conditions = []
    if account_col is not None:
        conditions.append(account_col == legacy_id)
    if date_col is not None and date_from:
        conditions.append(date_col >= date_from)
    if date_col is not None and date_to:
        conditions.append(date_col <= date_to)

    stmt = select(table)
    if conditions:
        stmt = stmt.where(and_(*conditions))

    events: list[dict] = []
    engine = table.metadata.bind
    if engine is None:
        logger.warning("No engine bound for table %s", table.name)
        return []

    with engine.begin() as conn:
        for row in conn.execute(stmt):
            mapping = row._mapping
            event_date = _normalize_date(mapping.get(date_col.name) if date_col else None) if mapping else None
            amount_value = mapping.get(amount_col.name) if amount_col else None
            amount = _decimal(amount_value)
            reference = mapping.get(reference_col.name) if reference_col else None
            events.append(
                {
                    "event_type": event_type,
                    "date": event_date,
                    "amount": amount,
                    "reference": reference,
                    "meta": {
                        "table": table.name,
                        **(extra_meta or {}),
                    },
                    "raw": dict(mapping),
                }
            )

    return events


@dataclass
class LedgerYearContext:
    year: str
    engines: Dict[str, Any]
    tables: Dict[str, LedgerTables]
    warnings: List[str]


def _load_year(year: Optional[str] = None) -> LedgerYearContext:
    target_year = year or DEFAULT_ACTIVE_YEAR
    engines: Dict[str, Any] = {}
    tables: Dict[str, LedgerTables] = {}
    warnings: List[str] = []

    for kind in ("acc", "other", "stc"):
        try:
            engine = get_ledger_engine(target_year, kind)
        except FileNotFoundError as exc:
            warnings.append(str(exc))
            logger.warning("%s", exc)
            continue
        engines[kind] = engine
        tables[kind] = load_ledger_tables(engine)

    return LedgerYearContext(year=target_year, engines=engines, tables=tables, warnings=warnings)


def _gather_pharmacy_events(
    ctx: LedgerYearContext,
    legacy_id: str,
    date_from: Optional[date],
    date_to: Optional[date],
) -> list[dict]:
    events: list[dict] = []
    for kind, ledger_tables in ctx.tables.items():
        events.extend(
            _fetch_events(
                ledger_tables.invoices,
                legacy_id,
                "invoice",
                date_from,
                date_to,
                amount_candidates=AMOUNT_CANDIDATES,
                account_candidates=ACCOUNT_CANDIDATES,
                extra_meta={"db_kind": kind},
            )
        )
        events.extend(
            _fetch_events(
                ledger_tables.returns,
                legacy_id,
                "return",
                date_from,
                date_to,
                amount_candidates=AMOUNT_CANDIDATES,
                account_candidates=ACCOUNT_CANDIDATES,
                extra_meta={"db_kind": kind},
            )
        )
        events.extend(
            _fetch_events(
                ledger_tables.receipts_cash,
                legacy_id,
                "cash_receipt",
                date_from,
                date_to,
                amount_candidates=AMOUNT_CANDIDATES,
                account_candidates=ACCOUNT_CANDIDATES,
                extra_meta={"db_kind": kind},
            )
        )
        events.extend(
            _fetch_events(
                ledger_tables.receipts_cheque,
                legacy_id,
                "cheque_receipt",
                date_from,
                date_to,
                amount_candidates=AMOUNT_CANDIDATES,
                account_candidates=ACCOUNT_CANDIDATES,
                extra_meta={"db_kind": kind},
            )
        )
    events.sort(key=lambda e: (e.get("date") or date.min, e.get("event_type")))
    return events


def _summarize_events(events: Sequence[dict]) -> dict:
    totals = {"invoices": Decimal("0"), "returns": Decimal("0"), "cash_receipts": Decimal("0"), "cheque_receipts": Decimal("0")}
    for event in events:
        amount: Decimal = event.get("amount", Decimal("0"))
        if event["event_type"] == "invoice":
            totals["invoices"] += amount
        elif event["event_type"] == "return":
            totals["returns"] += amount
        elif event["event_type"] == "cash_receipt":
            totals["cash_receipts"] += amount
        elif event["event_type"] == "cheque_receipt":
            totals["cheque_receipts"] += amount
    balance = totals["invoices"] - totals["returns"] - totals["cash_receipts"] - totals["cheque_receipts"]
    totals["balance"] = balance
    return totals


def get_pharmacy_detailed_statement(
    legacy_id: str,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    year: Optional[str] = None,
) -> dict:
    ctx = _load_year(year)
    events = _gather_pharmacy_events(ctx, legacy_id, date_from, date_to)
    summary = _summarize_events(events)
    return {
        "pharmacy_legacy_id": legacy_id,
        "year": ctx.year,
        "events": events,
        "summary": summary,
        "warnings": ctx.warnings,
    }


def get_pharmacy_account_summary(
    legacy_id: str,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    year: Optional[str] = None,
) -> dict:
    statement = get_pharmacy_detailed_statement(legacy_id, date_from, date_to, year)
    summary = statement["summary"]
    return {
        "pharmacy_legacy_id": legacy_id,
        "year": statement["year"],
        "totals": summary,
        "warnings": statement["warnings"],
    }


def _find_area_pharmacies(ledger_tables: LedgerTables, area_id: str) -> list[str]:
    if not ledger_tables.pharmacies:
        return []
    area_col = _choose_column(ledger_tables.pharmacies, ["area", "area_id", "territoryid", "territory"])
    account_col = _choose_column(ledger_tables.pharmacies, ACCOUNT_CANDIDATES)
    if not area_col or not account_col:
        return []

    stmt = select(account_col).where(area_col == area_id)
    ids: list[str] = []
    with ledger_tables.pharmacies.metadata.bind.begin() as conn:
        for row in conn.execute(stmt):
            val = row[0]
            if val is not None:
                ids.append(str(val))
    return ids


def get_area_summary(
    area_id: str,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    year: Optional[str] = None,
) -> dict:
    ctx = _load_year(year)
    pharmacy_ids: set[str] = set()
    for ledger_tables in ctx.tables.values():
        pharmacy_ids.update(_find_area_pharmacies(ledger_tables, area_id))

    summaries = []
    for pid in sorted(pharmacy_ids):
        summaries.append(get_pharmacy_account_summary(pid, date_from, date_to, ctx.year))

    totals = {"invoices": Decimal("0"), "returns": Decimal("0"), "cash_receipts": Decimal("0"), "cheque_receipts": Decimal("0")}
    for item in summaries:
        subtotals = item["totals"]
        for key in totals.keys():
            totals[key] += subtotals.get(key, Decimal("0"))
    totals["balance"] = totals["invoices"] - totals["returns"] - totals["cash_receipts"] - totals["cheque_receipts"]

    return {
        "area_id": area_id,
        "year": ctx.year,
        "pharmacies": summaries,
        "totals": totals,
        "warnings": ctx.warnings,
    }
