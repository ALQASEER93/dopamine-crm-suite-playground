from __future__ import annotations

import re
from typing import Annotated

from email_validator import EmailNotValidError, validate_email
from pydantic import AfterValidator

from core.config import settings

_LOCAL_DEV_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.local$")


def _normalize_email_for_env(value: str) -> str:
    email = (value or "").strip().lower()
    if not email:
        raise ValueError("Email is required.")

    try:
        # Keep strict normalization for regular addresses.
        return validate_email(email, check_deliverability=False).normalized
    except EmailNotValidError as exc:
        # Local-only addresses are allowed in non-production for local auth testing.
        if settings.app_env.lower() != "production" and _LOCAL_DEV_EMAIL_RE.fullmatch(email):
            return email
        raise ValueError(str(exc)) from exc


EmailInput = Annotated[str, AfterValidator(_normalize_email_for_env)]
