from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.inventory import Inventory
from app.models.transaction import Transaction


def process_sale(
    tenant_id: int,
    sku: str,
    quantity: float,
    reference_id: str | None,
    db: Session
):
    inventory = db.query(Inventory).filter(
        Inventory.tenant_id == tenant_id,
        Inventory.sku == sku
    ).first()

    if not inventory:
        raise HTTPException(
            status_code=404,
            detail=f"Inventory item with SKU '{sku}' not found"
        )

    if inventory.quantity < quantity:
        raise HTTPException(
            status_code=400,
            detail="Insufficient inventory"
        )

    inventory.quantity -= quantity

    transaction = Transaction(
        tenant_id=tenant_id,
        inventory_id=inventory.id,
        transaction_type="SALE",
        quantity=quantity,
        note=f"POS Sale - {reference_id}"
        if reference_id
        else "POS Sale"
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return inventory, transaction


def process_purchase(
    tenant_id: int,
    sku: str,
    quantity: float,
    reference_id: str | None,
    db: Session
):
    inventory = db.query(Inventory).filter(
        Inventory.tenant_id == tenant_id,
        Inventory.sku == sku
    ).first()

    if not inventory:
        raise HTTPException(
            status_code=404,
            detail=f"Inventory item with SKU '{sku}' not found"
        )

    inventory.quantity += quantity

    transaction = Transaction(
        tenant_id=tenant_id,
        inventory_id=inventory.id,
        transaction_type="PURCHASE",
        quantity=quantity,
        note=f"POS Purchase - {reference_id}"
        if reference_id
        else "POS Purchase"
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return inventory, transaction