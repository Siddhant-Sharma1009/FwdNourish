from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.inventory import Inventory
from app.models.tenant import Tenant
from app.models.category import Category
from app.schemas.inventory import (
    InventoryCreate,
    InventoryResponse,
    InventoryUpdate
)


router = APIRouter(
    prefix="/api/v1/inventory",
    tags=["Inventory"]
)


@router.post(
    "/",
    response_model=InventoryResponse,
    status_code=201
)
def create_inventory(
    inventory_data: InventoryCreate,
    db: Session = Depends(get_db)
):
    tenant = db.query(Tenant).filter(
        Tenant.id == inventory_data.tenant_id
    ).first()

    if not tenant:
        raise HTTPException(
            status_code=404,
            detail="Tenant not found"
        )
    
    category = db.query(Category).filter(
        Category.id == inventory_data.category_id
    ).first()

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )
    
    if inventory_data.expiry_date < inventory_data.purchase_date:
        raise HTTPException(
            status_code=400,
            detail="Expiry date cannot be before purchase date"
        )

    inventory = Inventory(
        tenant_id=inventory_data.tenant_id,
        sku=inventory_data.sku,
        name=inventory_data.name,
        category_id=inventory_data.category_id,
        quantity=inventory_data.quantity,
        unit=inventory_data.unit,
        batch_number=inventory_data.batch_number,
        purchase_date=inventory_data.purchase_date,
        expiry_date=inventory_data.expiry_date,
        expiry_threshold_days=inventory_data.expiry_threshold_days
    )

    db.add(inventory)
    db.commit()
    db.refresh(inventory)
    return inventory


@router.get(
    "/",
    response_model=list[InventoryResponse]
)
def get_inventory(
    tenant_id: int,
    db: Session = Depends(get_db)
):

    inventory = db.query(Inventory).filter(
        Inventory.tenant_id == tenant_id
    ).all()

    return inventory


@router.get(
    "/{inventory_id}",
    response_model=InventoryResponse
)
def get_inventory_item(
    inventory_id: int,
    tenant_id: int,
    db: Session = Depends(get_db)
):

    inventory = db.query(Inventory).filter(
        Inventory.id == inventory_id,
        Inventory.tenant_id == tenant_id
    ).first()

    if not inventory:
        raise HTTPException(
            status_code=404,
            detail="Inventory item not found"
        )

    return inventory

@router.get(
    "/sku/{sku}",
    response_model=InventoryResponse
)
def get_inventory_by_sku(
    sku: str,
    tenant_id: int,
    db: Session = Depends(get_db)
):

    inventory = db.query(Inventory).filter(
        Inventory.tenant_id == tenant_id,
        Inventory.sku == sku
    ).first()

    if not inventory:
        raise HTTPException(
            status_code=404,
            detail="Inventory item not found"
        )

    return inventory

@router.delete(
    "/{inventory_id}"
)
def delete_inventory(
    inventory_id: int,
    tenant_id: int,
    db: Session = Depends(get_db)
):

    inventory = db.query(Inventory).filter(
        Inventory.id == inventory_id,
        Inventory.tenant_id == tenant_id
    ).first()

    if not inventory:
        raise HTTPException(
            status_code=404,
            detail="Inventory item not found"
        )

    db.delete(inventory)
    db.commit()

    return {
        "message": "Inventory item deleted successfully"
    }

@router.put(
    "/{inventory_id}",
    response_model=InventoryResponse
)
def update_inventory(
    inventory_id: int,
    inventory_data: InventoryUpdate,
    tenant_id: int,
    db: Session = Depends(get_db)
):

    inventory = db.query(Inventory).filter(
        Inventory.id == inventory_id,
        Inventory.tenant_id == tenant_id
    ).first()

    if not inventory:
        raise HTTPException(
            status_code=404,
            detail="Inventory item not found"
        )

    update_data = inventory_data.model_dump(
        exclude_unset=True
    )

    purchase_date = update_data.get(
        "purchase_date",
        inventory.purchase_date
    )

    expiry_date = update_data.get(
        "expiry_date",
        inventory.expiry_date
    )

    if expiry_date < purchase_date:
        raise HTTPException(
            status_code=400,
            detail="Expiry date cannot be before purchase date"
        )

    for field, value in update_data.items():
        setattr(
            inventory,
            field,
            value
        )

    db.commit()
    db.refresh(inventory)

    return inventory

