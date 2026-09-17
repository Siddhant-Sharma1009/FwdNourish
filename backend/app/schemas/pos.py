from pydantic import BaseModel, Field

class POSSaleRequest(BaseModel):
    tenant_id: int
    sku: str
    quantity: float = Field(gt=0)
    reference_id: str | None = None

class POSPurchaseRequest(BaseModel):
    tenant_id: int
    sku: str
    quantity: float = Field(gt=0)
    reference_id: str | None = None

class POSResponse(BaseModel):
    message: str
    sku: str
    quantity_changed: float
    remaining_quantity: float
    transaction_id: int
    reference_id: str | None = None