from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class TerritoryBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    code: str = Field(..., min_length=1, max_length=50)


class TerritoryCreate(TerritoryBase):
    pass


class TerritoryOut(TerritoryBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
