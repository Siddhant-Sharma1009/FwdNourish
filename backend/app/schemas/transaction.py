from datetime import date, datetime

from pydantic import BaseModel, Field


class InventoryTransactionInfo(BaseModel):
    id: int
    sku: str
    name: str
    category_id: int
    quantity: float
    unit: str
    batch_number: str | None = None
    purchase_date: date
    expiry_date: date
    is_deleted: bool

    class Config:
        from_attributes = True


class DonationTransactionInfo(BaseModel):
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

    class Config:
        from_attributes = True


class TransactionCreate(BaseModel):
    tenant_id: int
    inventory_id: int
    transaction_type: str
    quantity: float = Field(gt=0)
    note: str | None = None
    sale_id: str | None = None
    donation_id: int | None = None


class TransactionResponse(BaseModel):
    id: int
    tenant_id: int
    inventory_id: int
    donation_id: int | None = None
    transaction_type: str
    quantity: float
    note: str | None = None
    sale_id: str | None = None
    created_at: datetime

    inventory: InventoryTransactionInfo | None = None
    donation: DonationTransactionInfo | None = None

    class Config:
        from_attributes = True