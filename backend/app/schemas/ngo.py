from datetime import date

from pydantic import BaseModel


class NGORequirementOption(BaseModel):
    id: int
    food_name: str
    food_category: str | None
    quantity_required: float
    unit: str
    required_by: date
    max_distance_km: float | None
    notes: str | None
    status: str

    class Config:
        from_attributes = True


class NGOOptionResponse(BaseModel):
    id: int
    user_id: int
    organization_name: str
    registration_number: str
    full_name: str
    phone: str
    address: str
    city: str
    state: str
    pincode: str
    latitude: float | None
    longitude: float | None
    service_radius_km: float
    description: str | None
    requirements: list[NGORequirementOption] = []

    class Config:
        from_attributes = True