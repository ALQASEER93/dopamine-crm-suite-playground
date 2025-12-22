from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class HCPBase(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    specialty: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    clinic_address: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None


class HCPCreate(HCPBase):
    pass


class HCPUpdate(BaseModel):
    first_name: Optional[str] = Field(default=None, min_length=1)
    last_name: Optional[str] = Field(default=None, min_length=1)
    specialty: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    clinic_address: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    is_active: Optional[bool] = None


class HCPOut(HCPBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
