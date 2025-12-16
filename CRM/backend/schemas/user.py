from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RoleOut(BaseModel):
    id: int
    slug: str
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    role_id: int
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=6)


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    is_active: bool
    role: RoleOut

    model_config = ConfigDict(from_attributes=True)


class RepCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    is_active: bool = True
    role_slug: str = "medical_rep"
    role_id: Optional[int] = None


class RepUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=6)
    is_active: Optional[bool] = None
    role_slug: Optional[str] = None
    role_id: Optional[int] = None


class AdminUserPayload(BaseModel):
    name: str
    email: EmailStr
    userType: str = Field(..., pattern="^(admin|manager|medical_rep|sales_rep)$")
    territoryId: Optional[int] = None
    password: Optional[str] = Field(default=None, min_length=6)
    isActive: Optional[bool] = True


class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    userType: Optional[str] = Field(default=None, pattern="^(admin|manager|medical_rep|sales_rep)$")
    territoryId: Optional[int] = None
    password: Optional[str] = Field(default=None, min_length=6)
    isActive: Optional[bool] = None
