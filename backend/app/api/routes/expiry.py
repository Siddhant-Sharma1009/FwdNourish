from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.inventory import Inventory
from app.schemas.expiry import ExpiryStatusResponse
from app.services.expiry_service import get_expiry_status


router = APIRouter(
    prefix="/api/v1/expiry",
    tags=["Expiry Tracking"]
)


@router.get(
    "/",
    response_model=list[ExpiryStatusResponse]
)
def get_expiry_statuses(
    tenant_id: int,
    db: Session = Depends(get_db)
):
    inventory_items = db.query(Inventory).filter(
        Inventory.tenant_id == tenant_id
    ).all()

    return [
        get_expiry_status(item)
        for item in inventory_items
    ]

@router.get(
    "/alerts",
    response_model=list[ExpiryStatusResponse]
)
def get_expiry_alerts(
    tenant_id: int,
    db: Session = Depends(get_db)
):

    inventory_items = db.query(Inventory).filter(
        Inventory.tenant_id == tenant_id
    ).all()

    alerts = []

    for item in inventory_items:

        expiry_info = get_expiry_status(item)

        if expiry_info["alert"]:
            alerts.append(expiry_info)

    return alerts