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

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


def _email_exists(db: Session, email: str) -> bool:
    return (
        db.query(User)
        .filter(User.email == email.lower())
        .first()
        is not None
    )


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


@router.get("/me", response_model=UserResponse)
def me(
    current_user: User = Depends(get_current_user),
):
    return current_user

