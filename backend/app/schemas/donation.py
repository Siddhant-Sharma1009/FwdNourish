from datetime import datetime

from pydantic import BaseModel, Field


class DonationCreate(BaseModel):

    tenant_id: int
    inventory_id: int
    quantity: float = Field(gt=0,)
    pickup_location: str | None = None
    pickup_latitude: float | None = None
    pickup_longitude: float | None = None
    available_from: datetime
    available_until: datetime
    note: str | None = None
    ngo_id: int | None = None
    match_id: int | None = None


class DonationResponse(BaseModel):
    id: int
    tenant_id: int
    inventory_id: int
    quantity: float
    committed_quantity: float
    remaining_quantity: float
    recipient_name: str | None = None
    pickup_location: str | None = None
    pickup_latitude: float | None = None
    pickup_longitude: float | None = None
    available_from: datetime | None = None
    available_until: datetime | None = None
    donation_status: str
    note: str | None = None
    donated_at: datetime | None = None
    created_at: datetime
    ngo_id: int | None = None
    ngo_name: str | None = None
    ngo_contact_name: str | None = None
    ngo_contact_phone: str | None = None
    ngo_contact_email: str | None = None
    pickup_notes: str | None = None
    pickup_scheduled_start: datetime | None = None
    pickup_scheduled_end: datetime | None = None

    class Config:
        from_attributes = True
