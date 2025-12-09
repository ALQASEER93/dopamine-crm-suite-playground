from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field

from schemas.user import UserOut


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class AuthResponse(BaseModel):
    token: str
    user: UserOut
