from datetime import date

from pydantic import BaseModel


class ExpiryStatusResponse(BaseModel):

    inventory_id: int
    sku: str
    name: str
    quantity: float
    unit: str
    expiry_date: date
    days_remaining: int
    expiry_threshold_days: int
    status: str
    alert: bool