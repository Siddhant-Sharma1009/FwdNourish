from datetime import datetime

from pydantic import BaseModel, Field


class DonationCreate(BaseModel):

    tenant_id: int

    inventory_id: int

    quantity: float = Field(
        gt=0,
    )

    pickup_location: str | None = None

    pickup_latitude: float | None = None

    pickup_longitude: float | None = None

    available_from: datetime

    available_until: datetime

    note: str | None = None

    # ---------------------------------------------------------
    # NGO SELECTION
    # ---------------------------------------------------------

    # Manual NGO selection
    ngo_id: int | None = None

    # AI-selected match
    match_id: int | None = None


class DonationResponse(BaseModel):

    id: int

    tenant_id: int

    inventory_id: int

    quantity: float

    committed_quantity: float

    remaining_quantity: float

    pickup_location: str | None

    pickup_latitude: float | None

    pickup_longitude: float | None

    available_from: datetime | None

    available_until: datetime | None

    donation_status: str

    note: str | None

    created_at: datetime

    donated_at: datetime | None

    class Config:
        from_attributes = True