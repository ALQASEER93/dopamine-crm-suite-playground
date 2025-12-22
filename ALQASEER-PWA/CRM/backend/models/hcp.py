from __future__ import annotations

from sqlalchemy import Boolean, Column, DateTime, Integer, String, func

from core.db import Base


class HCP(Base):
    __tablename__ = "hcps"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    specialty = Column(String(150), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    clinic_address = Column(String(255), nullable=True)
    area = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, server_default="1")
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
