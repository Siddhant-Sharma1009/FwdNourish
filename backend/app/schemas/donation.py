from datetime import datetime
from pydantic import BaseModel, Field


class DonationCreate(BaseModel):
    tenant_id: int
    inventory_id: int
    quantity: float = Field(gt=0)
    recipient_name: str | None = None
    note: str | None = None

class DonationResponse(BaseModel):
    id: int
    tenant_id: int
    inventory_id: int
    quantity: float
    recipient_name: str | None
    donation_status: str
    note: str | None
    donated_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True