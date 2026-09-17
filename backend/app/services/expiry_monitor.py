from datetime import datetime

from sqlalchemy.orm import Session

from app.models.inventory import Inventory
from app.models.expiry_alert import ExpiryAlert
from app.services.expiry_service import get_expiry_status


def check_expiry_for_all_inventory(db: Session):
    """
    Check expiry status for all inventory items
    and create/update expiry alerts.
    """

    inventory_items = db.query(Inventory).all()

    for item in inventory_items:
        if item.expiry_date is None:
            continue

        expiry_info = get_expiry_status(item)


        existing_alert = (
            db.query(ExpiryAlert)
            .filter(
                ExpiryAlert.inventory_id == item.id,
                ExpiryAlert.is_active == True
            )
            .first()
        )

        if not expiry_info["alert"]:
            if existing_alert:
                existing_alert.is_active = False
                existing_alert.resolved_at = datetime.utcnow()

            continue

        if existing_alert:
            existing_alert.status = expiry_info["status"]
            existing_alert.days_remaining = expiry_info["days_remaining"]

        else:
            new_alert = ExpiryAlert(
                tenant_id=item.tenant_id,
                inventory_id=item.id,
                status=expiry_info["status"],
                days_remaining=expiry_info["days_remaining"],
                is_active=True
            )

            db.add(new_alert)

    db.commit()