from datetime import date
from app.models.inventory import Inventory


def calculate_days_remaining(expiry_date: date) -> int:

    today = date.today()
    return (expiry_date - today).days


def get_expiry_status(
    inventory: Inventory
) -> dict:

    days_remaining = calculate_days_remaining(
        inventory.expiry_date
    )

    if days_remaining < 0:

        status = "EXPIRED"
        alert = True

    elif days_remaining <= inventory.expiry_threshold_days:

        status = "CRITICAL"
        alert = True

    else:

        status = "SAFE"
        alert = False

    return {
        "inventory_id": inventory.id,
        "sku": inventory.sku,
        "name": inventory.name,
        "quantity": inventory.quantity,
        "unit": inventory.unit,
        "expiry_date": inventory.expiry_date,
        "days_remaining": days_remaining,
        "expiry_threshold_days": inventory.expiry_threshold_days,
        "status": status,
        "alert": alert
    }