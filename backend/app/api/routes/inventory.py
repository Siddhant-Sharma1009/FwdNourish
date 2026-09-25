from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_tenant
from app.models.inventory import Inventory
from app.models.tenant import Tenant
from app.models.category import Category
from app.models.user import User
from app.schemas.inventory import InventoryCreate, InventoryResponse, InventoryUpdate

router = APIRouter(prefix="/api/v1/inventory", tags=["Inventory"])


def _tenant_id(user: User) -> int:
    if not user.tenant_id:
        raise HTTPException(status_code=403, detail="Tenant profile is not configured.")
    return user.tenant_id


@router.post("/", response_model=InventoryResponse, status_code=201)
def create_inventory(
    inventory_data: InventoryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    tenant_id = _tenant_id(user)
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")

    category = db.query(Category).filter(Category.id == inventory_data.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found.")

    if inventory_data.expiry_date < inventory_data.purchase_date:
        raise HTTPException(status_code=400, detail="Expiry date cannot be before purchase date.")

    inventory = Inventory(
        tenant_id=tenant_id,
        sku=inventory_data.sku,
        name=inventory_data.name,
        category_id=inventory_data.category_id,
        quantity=inventory_data.quantity,
        unit=inventory_data.unit,
        batch_number=inventory_data.batch_number,
        purchase_date=inventory_data.purchase_date,
        expiry_date=inventory_data.expiry_date,
        expiry_threshold_days=inventory_data.expiry_threshold_days,
        is_deleted=False,
    )
    db.add(inventory)
    db.commit()
    db.refresh(inventory)
    return inventory


@router.get("/", response_model=list[InventoryResponse])
def get_inventory(
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    return db.query(Inventory).filter(
        Inventory.tenant_id == _tenant_id(user),
        Inventory.is_deleted == False,
    ).all()


@router.get("/{inventory_id}", response_model=InventoryResponse)
def get_inventory_item(
    inventory_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    inventory = db.query(Inventory).filter(
        Inventory.id == inventory_id,
        Inventory.tenant_id == _tenant_id(user),
        Inventory.is_deleted == False,
    ).first()
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory item not found.")
    return inventory


@router.get("/sku/{sku}", response_model=InventoryResponse)
def get_inventory_by_sku(
    sku: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    inventory = db.query(Inventory).filter(
        Inventory.tenant_id == _tenant_id(user),
        Inventory.sku == sku,
        Inventory.is_deleted == False,
    ).first()
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory item not found.")
    return inventory


@router.delete("/{inventory_id}")
def delete_inventory(
    inventory_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    tenant_id = _tenant_id(user)

    inventory = db.query(Inventory).filter(
        Inventory.id == inventory_id,
        Inventory.tenant_id == tenant_id,
        Inventory.is_deleted == False,
    ).first()

    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory item not found.")

    # Mark item as soft-deleted
    inventory.is_deleted = True
    db.commit()

    return {"message": "Inventory item deleted successfully"}


@router.put("/{inventory_id}", response_model=InventoryResponse)
def update_inventory(
    inventory_id: int,
    inventory_data: InventoryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    inventory = db.query(Inventory).filter(
        Inventory.id == inventory_id,
        Inventory.tenant_id == _tenant_id(user),
        Inventory.is_deleted == False,
    ).first()
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory item not found.")

    update_data = inventory_data.model_dump(exclude_unset=True)
    purchase_date = update_data.get("purchase_date", inventory.purchase_date)
    expiry_date = update_data.get("expiry_date", inventory.expiry_date)

    if expiry_date < purchase_date:
        raise HTTPException(status_code=400, detail="Expiry date cannot be before purchase date.")

    if "category_id" in update_data:
        if not db.query(Category).filter(Category.id == update_data["category_id"]).first():
            raise HTTPException(status_code=404, detail="Category not found.")

    for field, value in update_data.items():
        setattr(inventory, field, value)

    db.commit()
    db.refresh(inventory)
    return inventory