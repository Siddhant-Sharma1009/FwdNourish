from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PickupCreate(BaseModel):
    match_id: int

    scheduled_start: datetime
    scheduled_end: datetime

    notes: str | None = Field(
        default=None,
        max_length=1000,
    )


class PickupResponse(BaseModel):
    id: int

    donation_id: int
    match_id: int
    ngo_id: int

    scheduled_start: datetime
    scheduled_end: datetime

    pickup_location: str

    status: str

    ngo_confirmation: str
    business_confirmation: str
    confirmation_status: str

    notes: str | None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )