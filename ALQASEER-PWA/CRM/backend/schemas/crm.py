from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

from schemas.user import RoleOut, UserOut


class DoctorBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    specialty: Optional[str] = Field(None, max_length=150)
    clinic: Optional[str] = Field(None, max_length=255)
    area: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=100)
    classification: Optional[str] = Field(None, pattern="^[ABC]?$")
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None


class DoctorCreate(DoctorBase):
    ...


class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    specialty: Optional[str] = None
    clinic: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    classification: Optional[str] = Field(None, pattern="^[ABC]?$")
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None


class DoctorOut(DoctorBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PharmacyBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    area: Optional[str] = None
    city: Optional[str] = None
    segment: Optional[str] = None
    credit_limit: Optional[Decimal] = None
    payment_terms: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class PharmacyCreate(PharmacyBase):
    ...


class PharmacyUpdate(BaseModel):
    name: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    segment: Optional[str] = None
    credit_limit: Optional[Decimal] = None
    payment_terms: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class PharmacyOut(PharmacyBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PharmacyMini(BaseModel):
    id: int
    name: str
    city: Optional[str] = None
    area: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ProductBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=2, max_length=150)
    line: Optional[str] = None
    pack: Optional[str] = None
    cost: Optional[Decimal] = None
    selling_price: Optional[Decimal] = None
    bonus_rules: Optional[str] = None


class ProductCreate(ProductBase):
    ...


class ProductUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    line: Optional[str] = None
    pack: Optional[str] = None
    cost: Optional[Decimal] = None
    selling_price: Optional[Decimal] = None
    bonus_rules: Optional[str] = None


class ProductOut(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VisitBase(BaseModel):
    visit_date: date
    rep_id: int
    doctor_id: Optional[int] = None
    pharmacy_id: Optional[int] = None
    notes: Optional[str] = None
    samples_given: Optional[str] = None
    next_action: Optional[str] = None
    next_action_date: Optional[date] = None
    status: Literal["scheduled", "in_progress", "completed", "cancelled"] = "scheduled"

    @field_validator("pharmacy_id")
    @classmethod
    def ensure_one_account(cls, v, info):  # noqa: D401
        """Ensure either doctor or pharmacy is provided."""
        doctor_id = info.data.get("doctor_id")
        pharmacy_id = v
        if not doctor_id and not pharmacy_id:
            raise ValueError("Either doctor_id or pharmacy_id is required.")
        if doctor_id and pharmacy_id:
            raise ValueError("Provide only one of doctor_id or pharmacy_id.")
        return v


class VisitCreate(VisitBase):
    ...


class VisitUpdate(BaseModel):
    visit_date: Optional[date] = None
    rep_id: Optional[int] = None
    doctor_id: Optional[int] = None
    pharmacy_id: Optional[int] = None
    notes: Optional[str] = None
    samples_given: Optional[str] = None
    next_action: Optional[str] = None
    next_action_date: Optional[date] = None
    status: Optional[Literal["scheduled", "in_progress", "completed", "cancelled"]] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    start_lat: Optional[float] = None
    start_lng: Optional[float] = None
    start_accuracy: Optional[float] = None
    end_lat: Optional[float] = None
    end_lng: Optional[float] = None
    end_accuracy: Optional[float] = None
    duration_seconds: Optional[int] = Field(default=None, ge=0)

    @field_validator("pharmacy_id")
    @classmethod
    def ensure_one_account(cls, v, info):  # noqa: D401
        """Ensure either doctor or pharmacy is provided when updating customer link."""
        data = info.data
        doctor_id = data.get("doctor_id")
        pharmacy_id = v
        if doctor_id and pharmacy_id:
            raise ValueError("Provide only one of doctor_id or pharmacy_id.")
        return v


class VisitOut(VisitBase):
    id: int
    rep: Optional[UserOut] = None
    doctor: Optional[DoctorOut] = None
    pharmacy: Optional[PharmacyMini] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    start_lat: Optional[float] = None
    start_lng: Optional[float] = None
    start_accuracy: Optional[float] = None
    end_lat: Optional[float] = None
    end_lng: Optional[float] = None
    end_accuracy: Optional[float] = None
    duration_seconds: Optional[int] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @computed_field  # type: ignore[misc]
    @property
    def duration_minutes(self) -> Optional[float]:
        """Expose duration in minutes for UI consumption."""
        if self.duration_seconds is not None:
            return round(self.duration_seconds / 60, 2)
        if self.started_at and self.ended_at:
            return round((self.ended_at - self.started_at).total_seconds() / 60, 2)
        return None


class VisitStart(BaseModel):
    started_at: Optional[datetime] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    accuracy: Optional[float] = None

    model_config = ConfigDict(populate_by_name=True)


class VisitEnd(BaseModel):
    ended_at: Optional[datetime] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    accuracy: Optional[float] = None

    model_config = ConfigDict(populate_by_name=True)


class RouteAccountBase(BaseModel):
    account_type: Literal["doctor", "pharmacy"]
    doctor_id: Optional[int] = None
    pharmacy_id: Optional[int] = None
    visit_frequency: Optional[str] = None

    @field_validator("pharmacy_id")
    @classmethod
    def validate_account(cls, v, info):  # noqa: D401
        """Ensure account matches the account type."""
        account_type = info.data.get("account_type")
        doctor_id = info.data.get("doctor_id")
        pharmacy_id = v
        if account_type == "doctor" and not doctor_id:
            raise ValueError("doctor_id is required for doctor account type.")
        if account_type == "pharmacy" and not pharmacy_id:
            raise ValueError("pharmacy_id is required for pharmacy account type.")
        return v


class RouteAccountCreate(RouteAccountBase):
    ...


class RouteAccountOut(RouteAccountBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class RouteBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    rep_id: int
    frequency: Optional[str] = None
    notes: Optional[str] = None


class RouteCreate(RouteBase):
    accounts: List[RouteAccountCreate] = []


class RouteOut(RouteBase):
    id: int
    accounts: List[RouteAccountOut] = []

    model_config = ConfigDict(from_attributes=True)


class RouteStopLocation(BaseModel):
    lat: float
    lng: float

    model_config = ConfigDict(populate_by_name=True)


class RouteStopOut(BaseModel):
    id: int
    customer_id: int = Field(..., alias="customerId")
    customer_name: str = Field(..., alias="customerName")
    customer_type: Literal["doctor", "pharmacy"] = Field(..., alias="customerType")
    address: Optional[str] = None
    status: Literal["planned", "in-progress", "done", "skipped"] = "planned"
    scheduled_for: Optional[datetime] = Field(None, alias="scheduledFor")
    location: Optional[RouteStopLocation] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class OrderLineBase(BaseModel):
    product_id: int
    quantity: int = Field(..., ge=1)
    price: Decimal = Field(..., ge=0)
    discount: float = Field(0, ge=0)
    bonus: Optional[int] = None


class OrderLineCreate(OrderLineBase):
    ...


class OrderLineOut(OrderLineBase):
    id: int
    product: Optional[ProductOut] = None

    model_config = ConfigDict(from_attributes=True)


class OrderBase(BaseModel):
    order_date: date
    status: str = "draft"
    payment_status: str = "pending"
    doctor_id: Optional[int] = None
    pharmacy_id: Optional[int] = None
    aljazeera_ref: Optional[str] = None
    lines: List[OrderLineCreate] = []

    @field_validator("pharmacy_id")
    @classmethod
    def validate_customer(cls, v, info):  # noqa: D401
        """Ensure exactly one customer is provided."""
        doctor_id = info.data.get("doctor_id")
        pharmacy_id = v
        if not doctor_id and not pharmacy_id:
            raise ValueError("Either doctor_id or pharmacy_id is required.")
        if doctor_id and pharmacy_id:
            raise ValueError("Provide only one of doctor_id or pharmacy_id.")
        return v


class OrderCreate(OrderBase):
    ...


class OrderOut(OrderBase):
    id: int
    total_amount: Decimal
    doctor: Optional[DoctorOut] = None
    pharmacy: Optional[PharmacyOut] = None
    lines: List[OrderLineOut] = []

    model_config = ConfigDict(from_attributes=True)


class StockLocationBase(BaseModel):
    name: str
    location_type: Literal["warehouse", "rep_car"]
    rep_id: Optional[int] = None


class StockLocationCreate(StockLocationBase):
    ...


class StockLocationOut(StockLocationBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class StockMovementBase(BaseModel):
    location_from_id: Optional[int] = None
    location_to_id: Optional[int] = None
    product_id: int
    quantity: int = Field(..., ge=1)
    reason: Literal["sale", "samples", "return", "damage", "expiry"]
    notes: Optional[str] = None


class StockMovementCreate(StockMovementBase):
    movement_date: Optional[datetime] = None


class StockMovementOut(StockMovementBase):
    id: int
    movement_date: datetime

    model_config = ConfigDict(from_attributes=True)


class TargetBase(BaseModel):
    rep_id: int
    period: str = Field(..., min_length=4, max_length=20)
    product_id: Optional[int] = None
    target_amount: Decimal
    achieved_amount: Optional[Decimal] = None


class TargetCreate(TargetBase):
    ...


class TargetOut(TargetBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class CollectionBase(BaseModel):
    collection_date: date
    amount: Decimal
    method: str
    reference: Optional[str] = None
    doctor_id: Optional[int] = None
    pharmacy_id: Optional[int] = None
    notes: Optional[str] = None

    @field_validator("pharmacy_id")
    @classmethod
    def validate_customer(cls, v, info):  # noqa: D401
        """Ensure exactly one customer is provided."""
        doctor_id = info.data.get("doctor_id")
        pharmacy_id = v
        if not doctor_id and not pharmacy_id:
            raise ValueError("Either doctor_id or pharmacy_id is required.")
        if doctor_id and pharmacy_id:
            raise ValueError("Provide only one of doctor_id or pharmacy_id.")
        return v


class CollectionCreate(CollectionBase):
    ...


class CollectionOut(CollectionBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
