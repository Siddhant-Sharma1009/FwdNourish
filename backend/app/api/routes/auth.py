from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.models.ngo import NGO
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    NgoSignup,
    SignupResponse,
    TenantSignup,
    UserResponse,
)
from pydantic import BaseModel
from typing import Optional

class ProfileUpdateRequest(BaseModel):
    full_name: str
    phone: Optional[str] = None


class ProfileResponse(BaseModel):
    id: int
    email: str
    role: str
    status: str
    full_name: str
    phone: Optional[str] = None
    tenant_id: Optional[int] = None
    rejection_reason: Optional[str] = None

    organization_type: Optional[str] = None
    organization_name: Optional[str] = None
    business_type: Optional[str] = None
    registration_number: Optional[str] = None

    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

    latitude: Optional[float] = None
    longitude: Optional[float] = None
    google_maps_link: Optional[str] = None

    service_radius_km: Optional[float] = None

    website: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    linkedin: Optional[str] = None

    description: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


def _email_exists(db: Session, email: str) -> bool:
    return (
        db.query(User)
        .filter(User.email == email.lower())
        .first()
        is not None
    )



@router.get("/profile", response_model=ProfileResponse)
def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "status": current_user.status,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "tenant_id": current_user.tenant_id,
        "rejection_reason": current_user.rejection_reason,

        "organization_type": None,
        "organization_name": None,
        "business_type": None,
        "registration_number": None,

        "address": None,
        "city": None,
        "state": None,
        "pincode": None,

        "latitude": None,
        "longitude": None,
        "google_maps_link": None,

        "service_radius_km": None,

        "website": None,
        "instagram": None,
        "facebook": None,
        "linkedin": None,

        "description": None,
    }

    # ========================================================
    # BUSINESS / TENANT
    # ========================================================

    if current_user.role == "TENANT" and current_user.tenant_id:
        tenant = (
            db.query(Tenant)
            .filter(Tenant.id == current_user.tenant_id)
            .first()
        )

        if tenant:
            profile.update({
                "organization_type": "TENANT",
                "organization_name": tenant.name,
                "business_type": tenant.business_type,
                "registration_number": tenant.registration_number,

                "address": tenant.address,
                "city": tenant.city,
                "state": tenant.state,
                "pincode": tenant.pincode,

                "latitude": tenant.latitude,
                "longitude": tenant.longitude,
                "google_maps_link": tenant.google_maps_link,

                "website": tenant.website,
                "instagram": tenant.instagram,
                "facebook": tenant.facebook,
                "linkedin": tenant.linkedin,

                "description": tenant.description,
            })

    # ========================================================
    # NGO
    # ========================================================

    elif current_user.role == "NGO":
        ngo = (
            db.query(NGO)
            .filter(NGO.user_id == current_user.id)
            .first()
        )

        if ngo:
            profile.update({
                "organization_type": "NGO",
                "organization_name": ngo.organization_name,
                "registration_number": ngo.registration_number,

                "address": ngo.address,
                "city": ngo.city,
                "state": ngo.state,
                "pincode": ngo.pincode,

                "latitude": ngo.latitude,
                "longitude": ngo.longitude,
                "google_maps_link": ngo.google_maps_link,

                "service_radius_km": ngo.service_radius_km,

                "website": ngo.website,
                "instagram": ngo.instagram,
                "facebook": ngo.facebook,
                "linkedin": ngo.linkedin,

                "description": ngo.description,
            })

    return profile

@router.post("/register/tenant", response_model=SignupResponse, status_code=201)
def register_tenant(
    data: TenantSignup,
    db: Session = Depends(get_db),
):
    email = data.email.lower()

    if _email_exists(db, email):
        raise HTTPException(
            status_code=409,
            detail="Email is already registered.",
        )

    tenant = Tenant(
        name=data.business_name,
        business_type=data.business_type,
        registration_number=data.registration_number,

        address=data.address,
        city=data.city,
        state=data.state,
        pincode=data.pincode,

        latitude=data.latitude,
        longitude=data.longitude,

        website=data.website,
        instagram=data.instagram,
        facebook=data.facebook,
        linkedin=data.linkedin,
        google_maps_link=data.google_maps_link,
        description=data.description,
    )

    db.add(tenant)
    db.flush()

    user = User(
        email=email,
        password_hash=hash_password(data.password),
        role="TENANT",
        status="PENDING",
        full_name=data.full_name,
        phone=data.phone,
        tenant_id=tenant.id,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": (
            "Tenant registration submitted. "
            "Please wait for admin verification."
        ),
        "user": user,
    }


@router.post("/register/ngo", response_model=SignupResponse, status_code=201)
def register_ngo(
    data: NgoSignup,
    db: Session = Depends(get_db),
):
    email = data.email.lower()

    if _email_exists(db, email):
        raise HTTPException(
            status_code=409,
            detail="Email is already registered.",
        )

    user = User(
        email=email,
        password_hash=hash_password(data.password),
        role="NGO",
        status="PENDING",
        full_name=data.full_name,
        phone=data.phone,
    )

    db.add(user)
    db.flush()

    ngo = NGO(
        user_id=user.id,

        organization_name=data.organization_name,
        registration_number=data.registration_number,

        address=data.address,
        city=data.city,
        state=data.state,
        pincode=data.pincode,

        latitude=data.latitude,
        longitude=data.longitude,

        service_radius_km=data.service_radius_km,

        website=data.website,
        instagram=data.instagram,
        facebook=data.facebook,
        linkedin=data.linkedin,
        google_maps_link=data.google_maps_link,
        description=data.description,
    )

    db.add(ngo)
    db.commit()
    db.refresh(user)

    return {
        "message": (
            "NGO registration submitted. "
            "Please wait for admin verification."
        ),
        "user": user,
    }


@router.post("/login", response_model=LoginResponse)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.email == data.email.lower())
        .first()
    )

    if not user or not verify_password(
        data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    if user.status == "PENDING":
        raise HTTPException(
            status_code=403,
            detail=(
                "ACCOUNT_PENDING: "
                "Your account is waiting for admin verification."
            ),
            headers={"X-Account-Status": "PENDING"},
        )

    if user.status == "REJECTED":
        raise HTTPException(
            status_code=403,
            detail=(
                "ACCOUNT_REJECTED: "
                f"{user.rejection_reason or 'Your registration was rejected by the administrator.'}"
            ),
            headers={"X-Account-Status": "REJECTED"},
        )

    if user.status == "SUSPENDED":
        raise HTTPException(
            status_code=403,
            detail=(
                "ACCOUNT_SUSPENDED: "
                "Your account is currently suspended."
            ),
            headers={"X-Account-Status": "SUSPENDED"},
        )

    return {
        "access_token": create_access_token(user),
        "token_type": "bearer",
        "user": user,
    }

class ProfileUpdateRequest(BaseModel):
    full_name: str
    phone: str | None = None

@router.get("/me", response_model=UserResponse)
def me(
    current_user: User = Depends(get_current_user),
):
    return current_user


@router.put("/profile", response_model=ProfileResponse)
def update_profile(
    data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    full_name = data.full_name.strip()

    if not full_name:
        raise HTTPException(
            status_code=400,
            detail="Full name cannot be empty.",
        )

    current_user.full_name = full_name

    if data.phone:
        current_user.phone = data.phone.strip()
    else:
        current_user.phone = None

    db.commit()
    db.refresh(current_user)

    # Return the complete profile
    profile = {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "status": current_user.status,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "tenant_id": current_user.tenant_id,
        "rejection_reason": current_user.rejection_reason,

        "organization_type": None,
        "organization_name": None,
        "business_type": None,
        "registration_number": None,

        "address": None,
        "city": None,
        "state": None,
        "pincode": None,

        "latitude": None,
        "longitude": None,
        "google_maps_link": None,

        "service_radius_km": None,

        "website": None,
        "instagram": None,
        "facebook": None,
        "linkedin": None,

        "description": None,
    }

    if current_user.role == "TENANT" and current_user.tenant_id:
        tenant = (
            db.query(Tenant)
            .filter(Tenant.id == current_user.tenant_id)
            .first()
        )

        if tenant:
            profile.update({
                "organization_type": "TENANT",
                "organization_name": tenant.name,
                "business_type": tenant.business_type,
                "registration_number": tenant.registration_number,
                "address": tenant.address,
                "city": tenant.city,
                "state": tenant.state,
                "pincode": tenant.pincode,
                "latitude": tenant.latitude,
                "longitude": tenant.longitude,
                "google_maps_link": tenant.google_maps_link,
                "website": tenant.website,
                "instagram": tenant.instagram,
                "facebook": tenant.facebook,
                "linkedin": tenant.linkedin,
                "description": tenant.description,
            })

    elif current_user.role == "NGO":
        ngo = (
            db.query(NGO)
            .filter(NGO.user_id == current_user.id)
            .first()
        )

        if ngo:
            profile.update({
                "organization_type": "NGO",
                "organization_name": ngo.organization_name,
                "registration_number": ngo.registration_number,
                "address": ngo.address,
                "city": ngo.city,
                "state": ngo.state,
                "pincode": ngo.pincode,
                "latitude": ngo.latitude,
                "longitude": ngo.longitude,
                "google_maps_link": ngo.google_maps_link,
                "service_radius_km": ngo.service_radius_km,
                "website": ngo.website,
                "instagram": ngo.instagram,
                "facebook": ngo.facebook,
                "linkedin": ngo.linkedin,
                "description": ngo.description,
            })

    return profile

@router.put("/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Verify current password
    if not verify_password(
        data.current_password,
        current_user.password_hash,
    ):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect.",
        )

    # Basic validation
    if not data.new_password.strip():
        raise HTTPException(
            status_code=400,
            detail="New password cannot be empty.",
        )

    if data.current_password == data.new_password:
        raise HTTPException(
            status_code=400,
            detail="New password must be different from your current password.",
        )

    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 8 characters long.",
        )

    # Update password
    current_user.password_hash = hash_password(data.new_password)

    db.commit()

    return {
        "message": "Password changed successfully.",
    }