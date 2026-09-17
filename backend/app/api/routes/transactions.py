from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.inventory import Inventory
from app.models.transaction import Transaction
from app.schemas.transaction import (
    TransactionCreate,
    TransactionResponse
)


router = APIRouter(
    prefix="/api/v1/transactions",
    tags=["Transactions"]
)

@router.get(
    "/",
    response_model=list[TransactionResponse]
)
def get_transactions(
    tenant_id: int,
    db: Session = Depends(get_db)
):

    transactions = (
        db.query(Transaction)
        .filter(Transaction.tenant_id == tenant_id)
        .order_by(Transaction.created_at.desc())
        .all()
    )

    return transactions

@router.get(
    "/inventory/{inventory_id}",
    response_model=list[TransactionResponse]
)
def get_inventory_transactions(
    inventory_id: int,
    tenant_id: int,
    db: Session = Depends(get_db)
):

    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.id == inventory_id,
            Inventory.tenant_id == tenant_id
        )
        .first()
    )

    if not inventory:
        raise HTTPException(
            status_code=404,
            detail="Inventory item not found"
        )

    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.inventory_id == inventory_id,
            Transaction.tenant_id == tenant_id
        )
        .order_by(
            Transaction.created_at.desc()
        )
        .all()
    )

    return transactions


@router.post(
    "/",
    response_model=TransactionResponse,
    status_code=201
)
def create_transaction(
    transaction_data: TransactionCreate,
    db: Session = Depends(get_db)
):


    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.id == transaction_data.inventory_id,
            Inventory.tenant_id == transaction_data.tenant_id
        )
        .first()
    )

    if not inventory:
        raise HTTPException(
            status_code=404,
            detail="Inventory item not found"
        )

    transaction_type = (
        transaction_data.transaction_type.upper()
    )

    valid_types = {
        "SALE",
        "PURCHASE",
        "ADJUSTMENT",
        "WASTE",
        "DONATION"
    }

    if transaction_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid transaction type. "
                f"Allowed types: {', '.join(valid_types)}"
            )
        )

    if transaction_type == "PURCHASE":
        inventory.quantity += transaction_data.quantity
    elif transaction_type in {
        "SALE",
        "WASTE",
        "DONATION"
    }:

        if inventory.quantity < transaction_data.quantity:
            raise HTTPException(
                status_code=400,
                detail="Insufficient inventory quantity"
            )
        inventory.quantity -= transaction_data.quantity

    elif transaction_type == "ADJUSTMENT":
        inventory.quantity = transaction_data.quantity

    transaction = Transaction(
        tenant_id=transaction_data.tenant_id,
        inventory_id=transaction_data.inventory_id,
        transaction_type=transaction_type,
        quantity=transaction_data.quantity,
        note=transaction_data.note,
        sale_id=transaction_data.sale_id
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return transaction