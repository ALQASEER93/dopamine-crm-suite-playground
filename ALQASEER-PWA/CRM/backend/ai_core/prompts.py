from __future__ import annotations

from datetime import date
from typing import Iterable, Optional


def sales_trends_prompt(summary_rows: Iterable[dict]) -> str:
    return (
        "Summarize sales trends for the following data points:\n"
        + "\n".join([str(row) for row in summary_rows])
        + "\nHighlight growth/decline and actionable insights."
    )


def credit_risk_prompt(pharmacy_name: str, balance: float, overdue_days: Optional[int]) -> str:
    return (
        f"Assess credit/collection risk for pharmacy '{pharmacy_name}'. "
        f"Outstanding balance: {balance}. "
        f"Max overdue days: {overdue_days or 'n/a'}. "
        "Provide concise risk level and next steps."
    )


def collection_plan_prompt(pharmacy_name: str, due_items: Iterable[dict]) -> str:
    lines = "\n".join([str(item) for item in due_items])
    return (
        f"Draft a collection plan for {pharmacy_name} based on these dues:\n{lines}\n"
        "Return short bullet recommendations."
    )


def stock_risk_prompt(risk_rows: Iterable[dict]) -> str:
    return (
        "Identify slow movers and stock-out risks from the following dataset:\n"
        + "\n".join([str(row) for row in risk_rows])
        + "\nProvide concise bullets."
    )


def payment_reminder_prompt(pharmacy_name: str, amount: float, due_date: Optional[date]) -> str:
    return (
        f"Create a polite payment reminder for {pharmacy_name} in Arabic and English. "
        f"Amount: {amount}. Due date: {due_date or 'unspecified'}."
    )
