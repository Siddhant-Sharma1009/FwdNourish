from datetime import datetime
from pydantic import BaseModel, Field

class TransactionCreate(BaseModel):
    tenant_id: int
    inventory_id: int
    transaction_type: str
    quantity: float = Field(gt=0)
    note: str | None = None
    sale_id: str | None = None

class TransactionResponse(BaseModel):

    id: int
    tenant_id: int
    inventory_id: int
    transaction_type: str
    quantity: float
    note: str | None
    sale_id: str | None
    created_at: datetime

    class Config:
        from_attributes = True