from datetime import datetime

from pydantic import BaseModel


class AdminStats(BaseModel):
    total_users: int
    pending_tenants: int
    pending_ngos: int
    active_tenants: int
    active_ngos: int
    suspended_users: int


class AdminUserResponse(BaseModel):
    id: int
    email: str
    role: str
    status: str
    full_name: str
    phone: str | None
    tenant_id: int | None
    rejection_reason: str | None
    created_at: datetime
    organization_name: str | None
    business_type: str | None


class AdminUserDetailsResponse(AdminUserResponse):
    registration_number: str | None = None

    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None

    latitude: float | None = None
    longitude: float | None = None

    website: str | None = None
    instagram: str | None = None
    facebook: str | None = None
    linkedin: str | None = None
    google_maps_link: str | None = None

    description: str | None = None

    service_radius_km: float | None = None

    verified_at: datetime | None = None
    verified_by: int | None = None


class VerificationAction(BaseModel):
    reason: str | None = None