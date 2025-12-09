from __future__ import annotations

from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class Pagination(BaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(25, ge=1, le=500)
    total: int
    total_pages: int


class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    pagination: Pagination


class MessageResponse(BaseModel):
    message: str


class IdResponse(BaseModel):
    id: int

    model_config = ConfigDict(from_attributes=True)
