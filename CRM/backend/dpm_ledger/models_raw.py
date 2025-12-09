from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, Optional

from sqlalchemy import MetaData, Table, inspect
from sqlalchemy.engine import Engine
from sqlalchemy.ext.automap import automap_base

PHARMACY_TABLE_CANDIDATES = [
    "pharmacies",
    "pharmacy",
    "customers",
    "customer",
    "accounts",
    "account",
    "clients",
    "client",
]
INVOICE_TABLE_CANDIDATES = [
    "invoices",
    "invoice",
    "sales_invoices",
    "salesinvoice",
    "acc_invoice",
    "main_invoice",
]
RETURN_TABLE_CANDIDATES = [
    "returns",
    "sales_returns",
    "returns_invoice",
    "credit_notes",
    "creditnote",
]
CASH_RECEIPT_CANDIDATES = [
    "receipts",
    "cash_receipts",
    "cashreceipt",
    "cash_rec",
]
CHEQUE_RECEIPT_CANDIDATES = [
    "cheques",
    "cheque_receipts",
    "cheque_rec",
    "chequereceipts",
    "bank_receipts",
]


def reflect_engine(engine: Engine) -> tuple[MetaData, Dict[str, Table]]:
    metadata = MetaData()
    metadata.reflect(bind=engine)
    metadata.bind = engine
    tables = {name.lower(): table for name, table in metadata.tables.items()}
    return metadata, tables


def find_table(tables: Dict[str, Table], candidates: Iterable[str]) -> Optional[Table]:
    lowered = {name.lower(): tbl for name, tbl in tables.items()}
    normalized = {name.replace("_", "").lower(): tbl for name, tbl in tables.items()}
    for candidate in candidates:
        key = candidate.lower()
        if key in lowered:
            return lowered[key]
        normalized_key = key.replace("_", "")
        if normalized_key in normalized:
            return normalized[normalized_key]
    return None


@dataclass
class LedgerTables:
    metadata: MetaData
    pharmacies: Optional[Table]
    invoices: Optional[Table]
    returns: Optional[Table]
    receipts_cash: Optional[Table]
    receipts_cheque: Optional[Table]


def load_ledger_tables(engine: Engine) -> LedgerTables:
    metadata, tables = reflect_engine(engine)
    return LedgerTables(
        metadata=metadata,
        pharmacies=find_table(tables, PHARMACY_TABLE_CANDIDATES),
        invoices=find_table(tables, INVOICE_TABLE_CANDIDATES),
        returns=find_table(tables, RETURN_TABLE_CANDIDATES),
        receipts_cash=find_table(tables, CASH_RECEIPT_CANDIDATES),
        receipts_cheque=find_table(tables, CHEQUE_RECEIPT_CANDIDATES),
    )


def list_tables(engine: Engine) -> list[str]:
    inspector = inspect(engine)
    return inspector.get_table_names()
