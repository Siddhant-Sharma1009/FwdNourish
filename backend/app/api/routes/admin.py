from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin
from app.models.audit_log import AuditLog
from app.models.ngo import NGO
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.admin import (
    AdminStats,
    AdminUserResponse,
    AdminUserDetailsResponse,
    VerificationAction,
)

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


def _serialize_user(user: User, db: Session) -> dict:
    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first() if user.tenant_id else None
    ngo = db.query(NGO).filter(NGO.user_id == user.id).first()
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "status": user.status,
        "full_name": user.full_name,
        "phone": user.phone,
        "tenant_id": user.tenant_id,
        "rejection_reason": user.rejection_reason,
        "created_at": user.created_at.isoformat(),
        "organization_name": ngo.organization_name if ngo else (tenant.name if tenant else None),
        "business_type": tenant.business_type if tenant else None,
    }


@router.get("/stats", response_model=AdminStats)
def stats(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return {
        "total_users": db.query(User).count(),
        "pending_tenants": db.query(User).filter(User.role == "TENANT", User.status == "PENDING").count(),
        "pending_ngos": db.query(User).filter(User.role == "NGO", User.status == "PENDING").count(),
        "active_tenants": db.query(User).filter(User.role == "TENANT", User.status == "ACTIVE").count(),
        "active_ngos": db.query(User).filter(User.role == "NGO", User.status == "ACTIVE").count(),
        "suspended_users": db.query(User).filter(User.status == "SUSPENDED").count(),
    }


@router.get("/users", response_model=list[AdminUserResponse])
def users(
    role: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(User).filter(User.role.in_(["TENANT", "NGO"]))
    if role:
        role = role.upper()
        query = query.filter(User.role == role)
    if status:
        status = status.upper()
        query = query.filter(User.status == status)
    return [_serialize_user(u, db) for u in query.order_by(User.created_at.desc()).all()]


@router.get(
    "/users/{user_id}",
    response_model=AdminUserDetailsResponse,
)
def get_user_details(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = (
        db.query(User)
        .filter(
            User.id == user_id,
            User.role.in_(["TENANT", "NGO"]),
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Tenant/NGO user not found.",
        )

    tenant = None
    ngo = None

    if user.role == "TENANT" and user.tenant_id:
        tenant = (
            db.query(Tenant)
            .filter(Tenant.id == user.tenant_id)
            .first()
        )

    if user.role == "NGO":
        ngo = (
            db.query(NGO)
            .filter(NGO.user_id == user.id)
            .first()
        )

    organization_name = (
        tenant.name
        if tenant
        else ngo.organization_name
        if ngo
        else None
    )

    business_type = (
        tenant.business_type
        if tenant
        else None
    )

    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "status": user.status,
        "full_name": user.full_name,
        "phone": user.phone,
        "tenant_id": user.tenant_id,
        "rejection_reason": user.rejection_reason,

        "created_at": user.created_at,

        "organization_name": organization_name,
        "business_type": business_type,

        # Common profile/location fields
        "registration_number": (
            tenant.registration_number
            if tenant
            else ngo.registration_number
            if ngo
            else None
        ),

        "address": (
            tenant.address
            if tenant
            else ngo.address
            if ngo
            else None
        ),

        "city": (
            tenant.city
            if tenant
            else ngo.city
            if ngo
            else None
        ),

        "state": (
            tenant.state
            if tenant
            else ngo.state
            if ngo
            else None
        ),

        "pincode": (
            tenant.pincode
            if tenant
            else ngo.pincode
            if ngo
            else None
        ),

        "latitude": (
            tenant.latitude
            if tenant
            else getattr(ngo, "latitude", None)
            if ngo
            else None
        ),

        "longitude": (
            tenant.longitude
            if tenant
            else getattr(ngo, "longitude", None)
            if ngo
            else None
        ),

        # Tenant profile
        "website": (
            tenant.website
            if tenant
            else getattr(ngo, "website", None)
            if ngo
            else None
        ),

        "instagram": (
            tenant.instagram
            if tenant
            else getattr(ngo, "instagram", None)
            if ngo
            else None
        ),

        "facebook": (
            tenant.facebook
            if tenant
            else getattr(ngo, "facebook", None)
            if ngo
            else None
        ),

        "linkedin": (
            tenant.linkedin
            if tenant
            else getattr(ngo, "linkedin", None)
            if ngo
            else None
        ),

        "google_maps_link": (
            tenant.google_maps_link
            if tenant
            else getattr(ngo, "google_maps_link", None)
            if ngo
            else None
        ),

        "description": (
            tenant.description
            if tenant
            else getattr(ngo, "description", None)
            if ngo
            else None
        ),

        "service_radius_km": (
            getattr(ngo, "service_radius_km", None)
            if ngo
            else None
        ),

        "verified_at": user.verified_at,
        "verified_by": user.verified_by,
    }
    
    
    

@router.get("/pending", response_model=list[AdminUserResponse])
def pending(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    query = (
        db.query(User)
        .filter(User.role.in_(["TENANT", "NGO"]), User.status == "PENDING")
        .order_by(User.created_at.asc())
    )
    return [_serialize_user(u, db) for u in query.all()]


@router.patch("/users/{user_id}/approve", response_model=AdminUserResponse)
def approve(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id, User.role.in_(["TENANT", "NGO"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="Tenant/NGO user not found.")
    if user.status == "ACTIVE":
        return _serialize_user(user, db)

    user.status = "ACTIVE"
    user.verified_at = datetime.utcnow()
    user.verified_by = admin.id
    user.rejection_reason = None

    db.add(AuditLog(
        actor_user_id=admin.id,
        target_user_id=user.id,
        action="ACCOUNT_APPROVED",
        details=f"{user.role} account approved",
    ))
    db.commit()
    db.refresh(user)
    return _serialize_user(user, db)


@router.patch("/users/{user_id}/reject", response_model=AdminUserResponse)
def reject(
    user_id: int,
    data: VerificationAction,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id, User.role.in_(["TENANT", "NGO"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="Tenant/NGO user not found.")

    user.status = "REJECTED"
    user.rejection_reason = data.reason or "Registration was not approved."
    user.verified_at = None
    user.verified_by = admin.id

    db.add(AuditLog(
        actor_user_id=admin.id,
        target_user_id=user.id,
        action="ACCOUNT_REJECTED",
        details=user.rejection_reason,
    ))
    db.commit()
    db.refresh(user)
    return _serialize_user(user, db)


@router.patch("/users/{user_id}/suspend", response_model=AdminUserResponse)
def suspend(
    user_id: int,
    data: VerificationAction,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id, User.role.in_(["TENANT", "NGO"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.status = "SUSPENDED"
    user.rejection_reason = data.reason or "Account suspended by administrator."

    db.add(AuditLog(
        actor_user_id=admin.id,
        target_user_id=user.id,
        action="ACCOUNT_SUSPENDED",
        details=user.rejection_reason,
    ))
    db.commit()
    db.refresh(user)
    return _serialize_user(user, db)


@router.patch("/users/{user_id}/reactivate", response_model=AdminUserResponse)
def reactivate(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id, User.role.in_(["TENANT", "NGO"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.status = "ACTIVE"
    user.rejection_reason = None
    user.verified_at = user.verified_at or datetime.utcnow()
    user.verified_by = admin.id

    db.add(AuditLog(
        actor_user_id=admin.id,
        target_user_id=user.id,
        action="ACCOUNT_REACTIVATED",
        details="Account reactivated",
    ))
    db.commit()
    db.refresh(user)
    return _serialize_user(user, db)


@router.delete("/users/{user_id}")
def remove_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Permanently remove an unapproved account with no operational data.

    Active accounts should be suspended instead so historical inventory,
    transaction and donation records remain intact.
    """
    user = db.query(User).filter(
        User.id == user_id,
        User.role.in_(["TENANT", "NGO"]),
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.status == "ACTIVE":
        raise HTTPException(
            status_code=400,
            detail="Active accounts cannot be permanently removed. Suspend the account instead.",
        )

    if user.role == "TENANT" and user.tenant_id:
        # Existing tenant records may have inventory/transactions/donations.
        from app.models.inventory import Inventory
        from app.models.transaction import Transaction
        from app.models.donation import Donation

        tenant_id = user.tenant_id
        has_data = (
            db.query(Inventory.id).filter(Inventory.tenant_id == tenant_id).first()
            or db.query(Transaction.id).filter(Transaction.tenant_id == tenant_id).first()
            or db.query(Donation.id).filter(Donation.tenant_id == tenant_id).first()
        )
        if has_data:
            raise HTTPException(
                status_code=400,
                detail="This tenant has operational records. Suspend the account instead of deleting it.",
            )
        db.query(Tenant).filter(Tenant.id == tenant_id).delete(synchronize_session=False)

    if user.role == "NGO":
        db.query(NGO).filter(NGO.user_id == user.id).delete(synchronize_session=False)

    db.add(AuditLog(
        actor_user_id=admin.id,
        target_user_id=None,
        action="ACCOUNT_REMOVED",
        details=f"Removed {user.role} account {user.email}",
    ))
    db.delete(user)
    db.commit()
    return {"message": "Account removed successfully."}


@router.get("/audit-logs")
def audit_logs(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    rows = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(200).all()
    return [
        {
            "id": row.id,
            "actor_user_id": row.actor_user_id,
            "target_user_id": row.target_user_id,
            "action": row.action,
            "details": row.details,
            "created_at": row.created_at.isoformat(),
        }
        for row in rows
    ]
