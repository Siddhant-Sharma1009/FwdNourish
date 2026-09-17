from datetime import date, datetime
from pydantic import BaseModel, Field

class InventoryCreate(BaseModel):

    tenant_id: int
    sku: str
    name: str
    category_id: int
    quantity: float = Field(gt=0)
    unit: str
    batch_number: str | None = None
    purchase_date: date
    expiry_date: date
    expiry_threshold_days: int = Field(
        default=3,
        ge=0
    )

class InventoryResponse(BaseModel):

    id: int
    tenant_id: int
    sku: str
    name: str
    category_id: int
    quantity: float
    unit: str
    batch_number: str | None
    purchase_date: date
    expiry_date: date
    expiry_threshold_days: int
    created_at: datetime

    class Config:
        from_attributes = True

class InventoryUpdate(BaseModel):

    name: str | None = None
    category_id: int | None = None
    quantity: float | None = Field(
        default=None,
        gt=0
    )

    unit: str | None = None
    batch_number: str | None = None
    purchase_date: date | None = None
    expiry_date: date | None = None
    expiry_threshold_days: int | None = Field(
        default=None,
        ge=0
    )