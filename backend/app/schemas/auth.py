from pydantic import BaseModel, EmailStr, Field


class TenantSignup(BaseModel):
    # Account
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2, max_length=150)
    phone: str | None = None

    # Business
    business_name: str = Field(min_length=2, max_length=150)
    business_type: str = Field(min_length=2, max_length=100)
    registration_number: str = Field(min_length=2, max_length=100)

    # Location
    address: str = Field(min_length=3, max_length=300)
    city: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=100)
    pincode: str = Field(min_length=4, max_length=10)

    latitude: float | None = None
    longitude: float | None = None

    # Optional organization information
    website: str | None = None
    instagram: str | None = None
    facebook: str | None = None
    linkedin: str | None = None
    google_maps_link: str | None = None
    description: str | None = Field(default=None, max_length=1000)

    # Pickup availability
    pickup_start_time: str = Field(default="09:00")
    pickup_end_time: str = Field(default="17:00")


class NgoSignup(BaseModel):
    # Account
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2, max_length=150)
    phone: str | None = None

    # NGO
    organization_name: str = Field(min_length=2, max_length=200)
    registration_number: str = Field(min_length=2, max_length=100)

    # Location
    address: str = Field(min_length=3, max_length=300)
    city: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=100)
    pincode: str = Field(min_length=4, max_length=10)

    latitude: float | None = None
    longitude: float | None = None

    # Matching radius
    service_radius_km: float = Field(
        default=25,
        gt=0,
        le=500,
    )

    # Optional organization information
    website: str | None = None
    instagram: str | None = None
    facebook: str | None = None
    linkedin: str | None = None
    google_maps_link: str | None = None
    description: str | None = Field(default=None, max_length=1000)

    # Pickup availability
    pickup_start_time: str = Field(default="09:00")
    pickup_end_time: str = Field(default="17:00")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    role: str
    status: str
    full_name: str
    phone: str | None = None
    tenant_id: int | None = None
    rejection_reason: str | None = None

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class SignupResponse(BaseModel):
    message: str
    user: UserResponse

