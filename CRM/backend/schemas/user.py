from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from schemas.email_policy import EmailInput


class RoleOut(BaseModel):
    id: int
    slug: str
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailInput
    role_id: int
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailInput] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=6)


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailInput
    is_active: bool
    role: RoleOut

    model_config = ConfigDict(from_attributes=True)


class RepCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailInput
    password: str = Field(..., min_length=6)
    is_active: bool = True
    role_slug: str = "medical_rep"
    role_id: Optional[int] = None


class RepUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailInput] = None
    password: Optional[str] = Field(default=None, min_length=6)
    is_active: Optional[bool] = None
    role_slug: Optional[str] = None
    role_id: Optional[int] = None


class SalesRepInfo(BaseModel):
    repType: str
    territoryId: Optional[int] = None
    territoryName: Optional[str] = None


class AdminUserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailInput
    password: str = Field(..., min_length=6)
    userType: str = Field(..., min_length=1)
    territoryId: Optional[int] = None


class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailInput] = None
    password: Optional[str] = Field(default=None, min_length=6)
    userType: Optional[str] = None
    territoryId: Optional[int] = None
    isActive: Optional[bool] = None


class AdminUserOut(BaseModel):
    id: int
    name: str
    email: EmailInput
    isActive: bool
    role: RoleOut
    salesRep: Optional[SalesRepInfo] = None

    model_config = ConfigDict(from_attributes=True)
