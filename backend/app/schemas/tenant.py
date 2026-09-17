from pydantic import BaseModel

class TenantCreate(BaseModel):
    name: str
    business_type: str

class TenantResponse(BaseModel):
    id: int
    name: str
    business_type: str

    class Config:
        from_attributes = True