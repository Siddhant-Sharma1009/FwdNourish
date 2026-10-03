from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_tenant

from app.models.inventory import Inventory
from app.models.transaction import Transaction
from app.models.donation import Donation
from app.models.pickup import Pickup
from app.models.ngo import NGO
from app.models.user import User

from app.schemas.transaction import (
    TransactionCreate,
    TransactionResponse,
)


router = APIRouter(
    prefix="/api/v1/transactions",
    tags=["Transactions"],
)


# ============================================================
# TENANT
# ============================================================

def _tenant_id(user: User) -> int:
    if not user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Tenant profile is not configured.",
        )

    return user.tenant_id


# ============================================================
# BUILD DONATION RESPONSE
# ============================================================

def _build_donation_response(
    donation: Donation,
    db: Session,
):
    """
    Build donation transaction information including:

    - NGO organization
    - NGO contact person
    - NGO phone
    - NGO email
    - Pickup notes
    - Pickup scheduled start/end
    """

    # --------------------------------------------------------
    # Find the latest valid pickup for this donation
    # --------------------------------------------------------

    pickup = (
        db.query(Pickup)
        .filter(
            Pickup.donation_id == donation.id,
            Pickup.status != "CANCELLED",
        )
        .order_by(
            Pickup.id.desc()
        )
        .first()
    )

    # --------------------------------------------------------
    # Default NGO values
    # --------------------------------------------------------

    ngo_id = None
    ngo_name = None
    ngo_contact_name = None
    ngo_contact_phone = None
    ngo_contact_email = None

    pickup_notes = None
    pickup_scheduled_start = None
    pickup_scheduled_end = None

    # --------------------------------------------------------
    # Get NGO through pickup
    #
    # Donation
    #    ↓
    # Pickup
    #    ↓
    # NGO
    #    ↓
    # User
    # --------------------------------------------------------

    if pickup:

        ngo_id = pickup.ngo_id

        ngo = (
            db.query(NGO)
            .filter(
                NGO.id == pickup.ngo_id,
            )
            .first()
        )

        if ngo:

            ngo_name = ngo.organization_name

            ngo_user = (
                db.query(User)
                .filter(
                    User.id == ngo.user_id,
                )
                .first()
            )

            if ngo_user:
                ngo_contact_name = ngo_user.full_name
                ngo_contact_phone = ngo_user.phone
                ngo_contact_email = ngo_user.email

        # Pickup information

        pickup_notes = pickup.notes
        pickup_scheduled_start = pickup.scheduled_start
        pickup_scheduled_end = pickup.scheduled_end

    # --------------------------------------------------------
    # Build response
    # --------------------------------------------------------

    return {
        "id": donation.id,
        "tenant_id": donation.tenant_id,
        "inventory_id": donation.inventory_id,

        "quantity": donation.quantity,
        "committed_quantity": donation.committed_quantity,
        "remaining_quantity": donation.remaining_quantity,

        "recipient_name": donation.recipient_name,

        "pickup_location": donation.pickup_location,
        "pickup_latitude": donation.pickup_latitude,
        "pickup_longitude": donation.pickup_longitude,

        "available_from": donation.available_from,
        "available_until": donation.available_until,

        "donation_status": donation.donation_status,
        "note": donation.note,

        "donated_at": donation.donated_at,
        "created_at": donation.created_at,

        # NGO details
        "ngo_id": ngo_id,
        "ngo_name": ngo_name,
        "ngo_contact_name": ngo_contact_name,
        "ngo_contact_phone": ngo_contact_phone,
        "ngo_contact_email": ngo_contact_email,

        # Pickup details
        "pickup_notes": pickup_notes,
        "pickup_scheduled_start": pickup_scheduled_start,
        "pickup_scheduled_end": pickup_scheduled_end,
    }


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

    donation_response = None

    if transaction.donation_id is not None:

        donation = (
            db.query(Donation)
            .filter(
                Donation.id == transaction.donation_id,
                Donation.tenant_id == transaction.tenant_id,
            )
            .first()
        )

        if donation:
            donation_response = _build_donation_response(
                donation,
                db,
            )

    # --------------------------------------------------------
    # Final transaction response
    # --------------------------------------------------------

    return TransactionResponse(
        id=transaction.id,
        tenant_id=transaction.tenant_id,
        inventory_id=transaction.inventory_id,

        # IMPORTANT:
        # Return the exact donation linked to this transaction.
        donation_id=transaction.donation_id,

        transaction_type=transaction.transaction_type,
        quantity=transaction.quantity,
        note=transaction.note,
        sale_id=transaction.sale_id,
        created_at=transaction.created_at,

        inventory=inventory,
        donation=donation_response,
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
        _build_transaction_response(
            transaction,
            db,
        )
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
        _build_transaction_response(
            transaction,
            db,
        )
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
    # Validate donation
    # --------------------------------------------------------

    donation = None

    if transaction_type == "DONATION":

        if transaction_data.donation_id is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "donation_id is required for "
                    "DONATION transactions."
                ),
            )

        donation = (
            db.query(Donation)
            .filter(
                Donation.id == transaction_data.donation_id,
                Donation.tenant_id == tenant_id,
            )
            .first()
        )

        if not donation:
            raise HTTPException(
                status_code=404,
                detail="Donation not found.",
            )

        # Make sure this donation belongs to the
        # inventory item being transacted.

        if donation.inventory_id != inventory.id:
            raise HTTPException(
                status_code=400,
                detail=(
                    "The donation does not belong to "
                    "the selected inventory item."
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

        # IMPORTANT:
        # Preserve the exact donation ID.
        donation_id=(
            transaction_data.donation_id
            if transaction_type == "DONATION"
            else None
        ),

        transaction_type=transaction_type,
        quantity=transaction_data.quantity,
        note=transaction_data.note,
        sale_id=transaction_data.sale_id,
    )

    db.add(transaction)

    db.commit()
    db.refresh(transaction)

    # --------------------------------------------------------
    # Return complete response
    # --------------------------------------------------------

    return _build_transaction_response(
        transaction,
        db,
    )