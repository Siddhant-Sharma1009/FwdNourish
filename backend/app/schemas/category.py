from pydantic import BaseModel

class CategoryCreate(BaseModel):
    name: str
    perishability_risk: str
    storage_requirement: str

class CategoryResponse(BaseModel):
    id: int
    name: str
    perishability_risk: str
    storage_requirement: str

    class Config:
        from_attributes = True