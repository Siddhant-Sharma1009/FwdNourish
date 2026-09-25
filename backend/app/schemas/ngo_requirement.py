from datetime import date, datetime

from pydantic import BaseModel, Field, ConfigDict


class NGORequirementCreate(BaseModel):
    food_name: str = Field(
        min_length=1,
        max_length=200
    )

    food_category: str | None = Field(
        default=None,
        max_length=100
    )

    quantity_required: float = Field(
        gt=0
    )

    unit: str = Field(
        min_length=1,
        max_length=50
    )

    required_by: date

    max_distance_km: float = Field(
        default=25,
        gt=0,
        le=500
    )

    notes: str | None = Field(
        default=None,
        max_length=1000
    )


class NGORequirementResponse(BaseModel):
    id: int
    ngo_id: int

    food_name: str
    food_category: str | None

    quantity_required: float
    unit: str

    required_by: date

    max_distance_km: float

    status: str

    notes: str | None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )