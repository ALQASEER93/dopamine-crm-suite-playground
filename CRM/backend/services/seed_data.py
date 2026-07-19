from __future__ import annotations

from sqlalchemy.orm import Session

from services.auth import seed_admin_and_rep


def seed_reference_data(db: Session) -> None:
    """Create non-sensitive reference roles only.

    Runtime startup must never create production-looking customers, visits,
    coordinates, financial records, or default user credentials. Explicit
    synthetic QA fixtures live under ``tests`` and isolated Preview setup is a
    separately reviewed operation.
    """

    seed_admin_and_rep(db)
