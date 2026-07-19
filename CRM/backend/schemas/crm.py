from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator, model_validator

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
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
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
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
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
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)


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
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)


class PharmacyOut(PharmacyBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PharmacyFieldCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    area: Optional[str] = None
    city: Optional[str] = None
    segment: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)


class PharmacyFieldUpdate(BaseModel):
    name: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    segment: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)


class PharmacyFieldOut(PharmacyFieldCreate):
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


class ProductFieldCreate(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=2, max_length=150)
    line: Optional[str] = None
    pack: Optional[str] = None


class ProductFieldUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    line: Optional[str] = None
    pack: Optional[str] = None


class ProductFieldOut(ProductFieldCreate):
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
    model_config = ConfigDict(extra="forbid")

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
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    accuracy: Optional[float] = Field(None, ge=0)

    model_config = ConfigDict(populate_by_name=True)


class VisitEnd(BaseModel):
    ended_at: Optional[datetime] = None
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    accuracy: Optional[float] = Field(None, ge=0)

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
    is_demo: bool = Field(False, alias="isDemo")
    data_origin: Optional[str] = Field(None, alias="dataOrigin")
    visit_frequency: Optional[str] = Field(None, alias="visitFrequency")
    monthly_frequency_target: Optional[int] = Field(None, alias="monthlyFrequencyTarget")

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
    rep_id: Optional[int] = None
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
    rep: Optional[UserOut] = None
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
    rep_id: Optional[int] = None
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
    rep: Optional[UserOut] = None

    model_config = ConfigDict(from_attributes=True)


class SampleProductBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=2, max_length=150)
    unit: str = Field(default="unit", min_length=1, max_length=50)
    therapeutic_area: Optional[str] = Field(default=None, max_length=150)
    is_active: bool = True


class SampleProductCreate(SampleProductBase):
    ...


class SampleProductOut(SampleProductBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SampleInventoryAdjust(BaseModel):
    sample_product_id: int
    location_type: Literal["warehouse", "rep"] = "warehouse"
    rep_id: Optional[int] = None
    delta: int
    reorder_level: Optional[int] = Field(default=None, ge=0)
    notes: Optional[str] = None

    @field_validator("rep_id")
    @classmethod
    def validate_rep_location(cls, value, info):  # noqa: D401
        """Ensure rep_id exists only for rep location rows."""
        location_type = info.data.get("location_type")
        if location_type == "rep" and not value:
            raise ValueError("rep_id is required for rep location.")
        if location_type == "warehouse" and value is not None:
            raise ValueError("rep_id must be empty for warehouse location.")
        return value

    @field_validator("delta")
    @classmethod
    def validate_delta_non_zero(cls, value: int) -> int:
        if value == 0:
            raise ValueError("delta cannot be zero.")
        return value


class SampleInventoryOut(BaseModel):
    id: int
    sample_product_id: int
    location_type: Literal["warehouse", "rep"]
    rep_id: Optional[int] = None
    quantity_on_hand: int
    reorder_level: int
    updated_at: datetime
    sample_product: Optional[SampleProductOut] = None
    rep: Optional[UserOut] = None

    model_config = ConfigDict(from_attributes=True)


class SampleDistributionBase(BaseModel):
    sample_product_id: int
    rep_id: Optional[int] = None
    doctor_id: Optional[int] = None
    pharmacy_id: Optional[int] = None
    quantity: int = Field(..., ge=1)
    channel: Literal["in_person", "event", "request_fulfillment"] = "in_person"
    notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_customer(self):  # noqa: D401
        """Ensure customer target rules based on channel."""
        if self.channel == "request_fulfillment":
            if self.doctor_id or self.pharmacy_id:
                raise ValueError("request_fulfillment must not include doctor_id or pharmacy_id.")
            return self
        if self.doctor_id and self.pharmacy_id:
            raise ValueError("Provide only one of doctor_id or pharmacy_id.")
        if not self.doctor_id and not self.pharmacy_id:
            raise ValueError("Either doctor_id or pharmacy_id is required.")
        return self


class SampleDistributionCreate(SampleDistributionBase):
    ...


class SampleDistributionOut(SampleDistributionBase):
    id: int
    distributed_at: datetime
    sample_product: Optional[SampleProductOut] = None
    rep: Optional[UserOut] = None
    doctor: Optional[DoctorOut] = None
    pharmacy: Optional[PharmacyMini] = None

    model_config = ConfigDict(from_attributes=True)


class SampleRequestCreate(BaseModel):
    sample_product_id: int
    quantity_requested: int = Field(..., ge=1)
    notes: Optional[str] = None


class SampleRequestStatusUpdate(BaseModel):
    status: Literal["approved", "rejected", "fulfilled"]
    decision_notes: Optional[str] = None


class SampleRequestOut(BaseModel):
    id: int
    rep_id: int
    sample_product_id: int
    quantity_requested: int
    status: Literal["pending", "approved", "rejected", "fulfilled"]
    requested_at: datetime
    decided_at: Optional[datetime] = None
    approver_id: Optional[int] = None
    notes: Optional[str] = None
    decision_notes: Optional[str] = None
    fulfillment_distribution_id: Optional[int] = None
    rep: Optional[UserOut] = None
    approver: Optional[UserOut] = None
    sample_product: Optional[SampleProductOut] = None

    model_config = ConfigDict(from_attributes=True)


class KOLBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    specialty: Optional[str] = Field(default=None, max_length=150)
    institution: Optional[str] = Field(default=None, max_length=255)
    city: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=50)
    email: Optional[str] = Field(default=None, max_length=255)
    influence_level: Literal["A", "B", "C"] = "B"
    engagement_score: float = Field(default=0, ge=0)
    notes: Optional[str] = None


class KOLCreate(KOLBase):
    ...


class KOLUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    specialty: Optional[str] = Field(default=None, max_length=150)
    institution: Optional[str] = Field(default=None, max_length=255)
    city: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=50)
    email: Optional[str] = Field(default=None, max_length=255)
    influence_level: Optional[Literal["A", "B", "C"]] = None
    engagement_score: Optional[float] = Field(default=None, ge=0)
    notes: Optional[str] = None


class KOLOut(KOLBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScientificMaterialBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    material_type: Literal["presentation", "pdf", "video", "link", "other"]
    language: str = Field(default="ar", min_length=2, max_length=10)
    therapeutic_area: Optional[str] = Field(default=None, max_length=150)
    url: Optional[str] = None
    is_active: bool = True


class ScientificMaterialCreate(ScientificMaterialBase):
    ...


class ScientificMaterialUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=200)
    material_type: Optional[Literal["presentation", "pdf", "video", "link", "other"]] = None
    language: Optional[str] = Field(default=None, min_length=2, max_length=10)
    therapeutic_area: Optional[str] = Field(default=None, max_length=150)
    url: Optional[str] = None
    is_active: Optional[bool] = None


class ScientificMaterialOut(ScientificMaterialBase):
    id: int
    created_by_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MedicalEventBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    event_type: Literal["conference", "roundtable", "webinar", "cme", "internal"]
    status: Literal["planned", "ongoing", "completed", "cancelled"] = "planned"
    starts_at: datetime
    ends_at: datetime
    location: Optional[str] = Field(default=None, max_length=255)
    organizer: Optional[str] = Field(default=None, max_length=150)
    notes: Optional[str] = None


class MedicalEventCreate(MedicalEventBase):
    ...


class MedicalEventUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=200)
    event_type: Optional[Literal["conference", "roundtable", "webinar", "cme", "internal"]] = None
    status: Optional[Literal["planned", "ongoing", "completed", "cancelled"]] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    location: Optional[str] = Field(default=None, max_length=255)
    organizer: Optional[str] = Field(default=None, max_length=150)
    notes: Optional[str] = None


class EventAttendeeCreate(BaseModel):
    doctor_id: Optional[int] = None
    kol_id: Optional[int] = None
    attendee_role: str = Field(default="attendee", min_length=2, max_length=50)
    attended: bool = False
    feedback_score: Optional[float] = Field(default=None, ge=0, le=5)
    notes: Optional[str] = None

    @field_validator("kol_id")
    @classmethod
    def validate_attendee_link(cls, value, info):  # noqa: D401
        """Ensure attendee maps to either doctor or KOL."""
        doctor_id = info.data.get("doctor_id")
        if doctor_id and value:
            raise ValueError("Provide only one of doctor_id or kol_id.")
        if not doctor_id and not value:
            raise ValueError("Either doctor_id or kol_id is required.")
        return value


class EventAttendeeUpdate(BaseModel):
    attendee_role: Optional[str] = Field(default=None, min_length=2, max_length=50)
    attended: Optional[bool] = None
    feedback_score: Optional[float] = Field(default=None, ge=0, le=5)
    notes: Optional[str] = None


class EventAttendeeOut(BaseModel):
    id: int
    event_id: int
    doctor_id: Optional[int] = None
    kol_id: Optional[int] = None
    attendee_role: str
    attended: bool
    feedback_score: Optional[float] = None
    notes: Optional[str] = None
    doctor: Optional[DoctorOut] = None
    kol: Optional[KOLOut] = None

    model_config = ConfigDict(from_attributes=True)


class MedicalEventOut(MedicalEventBase):
    id: int
    created_by_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    attendees: list[EventAttendeeOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class MedicalEventEngagementOut(BaseModel):
    event_id: int
    title: str
    starts_at: datetime
    attendees_count: int


class KOLEngagementOut(BaseModel):
    kol_id: int
    kol_name: str
    events_count: int
    attended_count: int
    avg_feedback_score: Optional[float] = None
