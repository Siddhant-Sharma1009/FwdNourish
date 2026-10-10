from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_tenant
from app.models.inventory import Inventory
from app.models.user import User
from app.schemas.expiry import ExpiryStatusResponse
from app.services.expiry_service import get_expiry_status

router = APIRouter(
    prefix="/api/v1/expiry",
    tags=["Expiry Tracking"],
)


def get_active_inventory(db: Session, tenant_id: int):
    """Fetch only non-deleted inventory for the current tenant."""
    return (
        db.query(Inventory)
        .filter(
            Inventory.tenant_id == tenant_id,
            Inventory.is_deleted.is_(False),
        )
        .all()
    )


@router.get("/", response_model=list[ExpiryStatusResponse])
def get_expiry_statuses(
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    if not user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Tenant profile is not configured.",
        )

    items = get_active_inventory(db, user.tenant_id)

    return [get_expiry_status(item) for item in items]


@router.get(
    "/alerts",
    response_model=list[ExpiryStatusResponse],
)
def get_expiry_alerts(
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    if not user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Tenant profile is not configured.",
        )

    items = get_active_inventory(db, user.tenant_id)
    alerts = []

    for item in items:
        info = get_expiry_status(item)

        if info["alert"]:
            alerts.append(info)

    return alerts
