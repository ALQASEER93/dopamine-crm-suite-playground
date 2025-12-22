from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field

from schemas.user import UserOut


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class BootstrapRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: str = Field(..., min_length=2, max_length=150)
    code: str = Field(..., min_length=6)


class AuthResponse(BaseModel):
    token: str
    user: UserOut
