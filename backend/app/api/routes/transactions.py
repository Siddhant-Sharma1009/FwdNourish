from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_tenant

from app.models.inventory import Inventory
from app.models.transaction import Transaction
from app.models.donation import Donation
from app.models.user import User

from app.schemas.transaction import (
    TransactionCreate,
    TransactionResponse,
)


router = APIRouter(
    prefix="/api/v1/transactions",
    tags=["Transactions"],
)


def _tenant_id(user: User) -> int:
    if not user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Tenant profile is not configured.",
        )

    return user.tenant_id


# ============================================================
# RESPONSE BUILDER
# ============================================================

def _build_transaction_response(
    transaction: Transaction,
    db: Session,
) -> TransactionResponse:

    # --------------------------------------------------------
    # Inventory
    # --------------------------------------------------------

    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.id == transaction.inventory_id,
            Inventory.tenant_id == transaction.tenant_id,
        )
        .first()
    )

    # --------------------------------------------------------
    # Donation
    # --------------------------------------------------------

    donation = None

    if transaction.transaction_type.upper() == "DONATION":

        donation = (
            db.query(Donation)
            .filter(
                Donation.inventory_id == transaction.inventory_id,
                Donation.tenant_id == transaction.tenant_id,
            )
            .order_by(Donation.created_at.desc())
            .first()
        )

    return TransactionResponse(
        id=transaction.id,
        tenant_id=transaction.tenant_id,
        inventory_id=transaction.inventory_id,
        transaction_type=transaction.transaction_type,
        quantity=transaction.quantity,
        note=transaction.note,
        sale_id=transaction.sale_id,
        created_at=transaction.created_at,
        inventory=inventory,
        donation=donation,
    )


# ============================================================
# GET ALL TRANSACTIONS
# ============================================================

@router.get(
    "/",
    response_model=list[TransactionResponse],
)
def get_transactions(
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):

    tenant_id = _tenant_id(user)

    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.tenant_id == tenant_id
        )
        .order_by(
            Transaction.created_at.desc()
        )
        .all()
    )

    return [
        _build_transaction_response(transaction, db)
        for transaction in transactions
    ]


# ============================================================
# GET TRANSACTIONS FOR INVENTORY ITEM
# ============================================================

@router.get(
    "/inventory/{inventory_id}",
    response_model=list[TransactionResponse],
)
def get_inventory_transactions(
    inventory_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):

    tenant_id = _tenant_id(user)

    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.id == inventory_id,
            Inventory.tenant_id == tenant_id,
        )
        .first()
    )

    if not inventory:
        raise HTTPException(
            status_code=404,
            detail="Inventory item not found.",
        )

    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.inventory_id == inventory_id,
            Transaction.tenant_id == tenant_id,
        )
        .order_by(
            Transaction.created_at.desc()
        )
        .all()
    )

    return [
        _build_transaction_response(transaction, db)
        for transaction in transactions
    ]


# ============================================================
# CREATE TRANSACTION
# ============================================================

@router.post(
    "/",
    response_model=TransactionResponse,
    status_code=201,
)
def create_transaction(
    transaction_data: TransactionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):

    tenant_id = _tenant_id(user)

    # --------------------------------------------------------
    # Verify inventory belongs to tenant
    # --------------------------------------------------------

    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.id == transaction_data.inventory_id,
            Inventory.tenant_id == tenant_id,
        )
        .first()
    )

    if not inventory:
        raise HTTPException(
            status_code=404,
            detail="Inventory item not found.",
        )

    # --------------------------------------------------------
    # Transaction type
    # --------------------------------------------------------

    transaction_type = (
        transaction_data.transaction_type.upper()
    )

    valid_types = {
        "SALE",
        "PURCHASE",
        "ADJUSTMENT",
        "WASTE",
        "DONATION",
    }

    if transaction_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid transaction type. "
                f"Allowed types: {', '.join(sorted(valid_types))}"
            ),
        )

    # --------------------------------------------------------
    # Update inventory quantity
    # --------------------------------------------------------

    if transaction_type == "PURCHASE":

        inventory.quantity += transaction_data.quantity

    elif transaction_type in {
        "SALE",
        "WASTE",
        "DONATION",
    }:

        if inventory.quantity < transaction_data.quantity:
            raise HTTPException(
                status_code=400,
                detail="Insufficient inventory quantity.",
            )

        inventory.quantity -= transaction_data.quantity

    elif transaction_type == "ADJUSTMENT":

        inventory.quantity = transaction_data.quantity

    # --------------------------------------------------------
    # Create transaction
    # --------------------------------------------------------

    transaction = Transaction(
        tenant_id=tenant_id,
        inventory_id=inventory.id,
        transaction_type=transaction_type,
        quantity=transaction_data.quantity,
        note=transaction_data.note,
        sale_id=transaction_data.sale_id,
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return _build_transaction_response(
        transaction,
        db,
    )