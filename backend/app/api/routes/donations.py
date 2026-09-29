from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_tenant
from app.models.donation import Donation
from app.models.donation_match import DonationMatch
from app.models.ngo import NGO
from app.models.ngo_requirement import NGORequirement
from app.models.inventory import Inventory
from app.models.tenant import Tenant
from app.models.user import User
from app.models.pickup import Pickup
from app.services.donation_matching_service import generate_matches_for_donation
from app.services.notification_service import create_notification
from app.schemas.donation import (
    DonationCreate,
    DonationResponse,
)
from app.models.transaction import Transaction

router = APIRouter(
    prefix="/api/v1/donations",
    tags=["Donations"],
)


# Donation statuses which still reserve inventory.
ACTIVE_DONATION_STATUSES = (
    "PUBLISHED",
    "ACCEPTED",
    "PICKUP_SCHEDULED",
    "READY_FOR_PICKUP",
)


def normalize_datetime(value: datetime | None) -> datetime | None:
   
    if value is None:
        return None

    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)

    return value


@router.post(
    "/",
    response_model=DonationResponse,
    status_code=201,
)
def create_donation(
    data: DonationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
   

    if not user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Tenant profile is not configured.",
        )

    # ---------------------------------------------------------
    # 1. Make sure requested tenant belongs to authenticated user
    # ---------------------------------------------------------
    if data.tenant_id != user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="You cannot create a donation for another business.",
        )

    # ---------------------------------------------------------
    # 2. Get inventory item belonging to this business
    # ---------------------------------------------------------
    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.id == data.inventory_id,
            Inventory.tenant_id == user.tenant_id,
            Inventory.is_deleted.is_(False),
        )
        .with_for_update()
        .first()
    )

    if not inventory:
        raise HTTPException(
            status_code=404,
            detail="Inventory item not found.",
        )

    # ---------------------------------------------------------
    # 3. Normalize frontend datetime values
    # ---------------------------------------------------------
    available_from = normalize_datetime(data.available_from)
    available_until = normalize_datetime(data.available_until)

    if available_from is None or available_until is None:
        raise HTTPException(
            status_code=400,
            detail="Both available_from and available_until are required.",
        )

    # ---------------------------------------------------------
    # 4. Validate pickup window
    # ---------------------------------------------------------
    if available_until <= available_from:
        raise HTTPException(
            status_code=400,
            detail="available_until must be later than available_from.",
        )

    # ---------------------------------------------------------
    # 5. Validate pickup window against expiry
    # ---------------------------------------------------------
    expiry_datetime = datetime.combine(
        inventory.expiry_date,
        datetime.max.time(),
    )

    if available_from >= expiry_datetime:
        raise HTTPException(
            status_code=400,
            detail="Donation availability must start before the food expires.",
        )

    if available_until > expiry_datetime:
        raise HTTPException(
            status_code=400,
            detail="Donation availability cannot extend beyond the food expiry date.",
        )

    # ---------------------------------------------------------
    # 6. Calculate quantity already reserved by other
    #    active donation listings for this inventory item
    # ---------------------------------------------------------
    reserved_quantity = (
        db.query(
            func.coalesce(
                func.sum(Donation.quantity),
                0,
            )
        )
        .filter(
            Donation.inventory_id == inventory.id,
            Donation.tenant_id == user.tenant_id,
            Donation.donation_status.in_(
                ACTIVE_DONATION_STATUSES
            ),
        )
        .scalar()
    )

    reserved_quantity = float(reserved_quantity or 0)

    available_quantity = (
        float(inventory.quantity) - reserved_quantity
    )

    # ---------------------------------------------------------
    # 7. Prevent over-listing inventory
    # ---------------------------------------------------------
    if data.quantity > available_quantity:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Only {available_quantity:g} {inventory.unit} "
                f"is available for donation listing."
            ),
        )

    # ---------------------------------------------------------
    # 8. Use tenant location as fallback
    # ---------------------------------------------------------
    tenant = (
        db.query(Tenant)
        .filter(Tenant.id == user.tenant_id)
        .first()
    )

    if not tenant:
        raise HTTPException(
            status_code=404,
            detail="Business profile not found.",
        )

    pickup_location = (
        data.pickup_location
        or tenant.address
    )

    pickup_latitude = (
        data.pickup_latitude
        if data.pickup_latitude is not None
        else tenant.latitude
    )

    pickup_longitude = (
        data.pickup_longitude
        if data.pickup_longitude is not None
        else tenant.longitude
    )

    # ---------------------------------------------------------
    # 9. Create surplus listing
    # ---------------------------------------------------------
    donation = Donation(
        tenant_id=user.tenant_id,
        inventory_id=data.inventory_id,
        quantity=data.quantity,
        committed_quantity=0,
        remaining_quantity=data.quantity,
        recipient_name=None,
        pickup_location=pickup_location,
        pickup_latitude=pickup_latitude,
        pickup_longitude=pickup_longitude,
        available_from=available_from,
        available_until=available_until,
        donation_status="PUBLISHED",
        note=data.note,
        donated_at=None,
    )

    db.add(donation)
    db.flush()

    # ---------------------------------------------------------
    # 10. Manual NGO selection
    # ---------------------------------------------------------
    # If the business selected an NGO manually, generate the normal
    # compatible matches, keep only the selected NGO available, and
    # notify that NGO immediately.
    if data.ngo_id is not None:
        selected_ngo = (
            db.query(NGO)
            .join(User, NGO.user_id == User.id)
            .filter(
                NGO.id == data.ngo_id,
                User.role == "NGO",
                User.status == "ACTIVE",
            )
            .first()
        )

        if not selected_ngo:
            db.rollback()
            raise HTTPException(
                status_code=404,
                detail="Selected NGO is not available.",
            )

        # Generate compatible matches using the existing matching logic.
        generated_matches = generate_matches_for_donation(
            db=db,
            donation=donation,
        )

        selected_matches = [
            match
            for match in generated_matches
            if match.ngo_id == selected_ngo.id
        ]

        if not selected_matches:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail=(
                    "The selected NGO does not currently have a compatible "
                    "active requirement for this donation."
                ),
            )

        selected_match = selected_matches[0]

        # Only the explicitly selected NGO remains available to the NGO side.
        (
            db.query(DonationMatch)
            .filter(
                DonationMatch.donation_id == donation.id,
                DonationMatch.id != selected_match.id,
                DonationMatch.status == "SUGGESTED",
            )
            .update(
                {"status": "REJECTED"},
                synchronize_session=False,
            )
        )

        selected_match.status = "SUGGESTED"

        ngo_user = (
            db.query(User)
            .filter(User.id == selected_ngo.user_id)
            .first()
        )

        if ngo_user:
            create_notification(
                db=db,
                user_id=ngo_user.id,
                title="New Surplus Donation Available",
                message=(
                    f"A business has selected your NGO for surplus donation "
                    f"#{donation.id}. Review the donation and schedule pickup."
                ),
                notification_type="DONATION_AVAILABLE",
            )

    db.commit()
    db.refresh(donation)

    return donation


@router.get(
    "/",
    response_model=list[DonationResponse],
)
def get_donations(
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    """
    Get surplus listings created by the logged-in business.
    """

    if not user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Tenant profile is not configured.",
        )

    return (
        db.query(Donation)
        .filter(
            Donation.tenant_id == user.tenant_id
        )
        .order_by(
            Donation.created_at.desc()
        )
        .all()
    )


@router.get(
    "/{donation_id}",
    response_model=DonationResponse,
)
def get_donation(
    donation_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    """
    Get one donation listing belonging to the logged-in business.
    """

    if not user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Tenant profile is not configured.",
        )

    donation = (
        db.query(Donation)
        .filter(
            Donation.id == donation_id,
            Donation.tenant_id == user.tenant_id,
        )
        .first()
    )

    if not donation:
        raise HTTPException(
            status_code=404,
            detail="Donation listing not found.",
        )

    return donation


@router.patch(
    "/{donation_id}/cancel",
    response_model=DonationResponse,
)
def cancel_donation(
    donation_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    

    if not user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Tenant profile is not configured.",
        )

    donation = (
        db.query(Donation)
        .filter(
            Donation.id == donation_id,
            Donation.tenant_id == user.tenant_id,
        )
        .first()
    )

    if not donation:
        raise HTTPException(
            status_code=404,
            detail="Donation listing not found.",
        )

    if donation.donation_status != "PUBLISHED":
        raise HTTPException(
            status_code=400,
            detail=(
                "Only published donation listings "
                "can be cancelled."
            ),
        )

    donation.donation_status = "CANCELLED"

    db.commit()
    db.refresh(donation)

    return donation

@router.patch(
    "/{donation_id}/complete",
    response_model=DonationResponse,
)
def complete_donation(
    donation_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    """
    Complete a donation together with its pickup and match.

    This endpoint is kept synchronized with the pickup completion
    workflow so that all related records reach the same final state.
    """

    # ---------------------------------------------------------
    # 1. Validate business account
    # ---------------------------------------------------------

    if not user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Tenant profile is not configured.",
        )

    # ---------------------------------------------------------
    # 2. Find donation belonging to logged-in business
    # ---------------------------------------------------------

    donation = (
        db.query(Donation)
        .filter(
            Donation.id == donation_id,
            Donation.tenant_id == user.tenant_id,
        )
        .first()
    )

    if not donation:
        raise HTTPException(
            status_code=404,
            detail="Donation listing not found.",
        )

    # ---------------------------------------------------------
    # 3. Find associated pickup
    # ---------------------------------------------------------

    pickup = (
        db.query(Pickup)
        .filter(
            Pickup.donation_id == donation.id,
        )
        .order_by(Pickup.id.desc())
        .first()
    )

    if not pickup:
        raise HTTPException(
            status_code=400,
            detail="This donation does not have a pickup scheduled.",
        )

    # ---------------------------------------------------------
    # 4. Validate pickup state
    # ---------------------------------------------------------

    if pickup.status == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="Cancelled pickup cannot be completed.",
        )

    if pickup.status == "COMPLETED":
        raise HTTPException(
            status_code=400,
            detail="Pickup is already completed.",
        )

    if pickup.status not in {
        "SCHEDULED",
        "READY_FOR_PICKUP",
    }:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Pickup cannot be completed from its current status: "
                f"{pickup.status}"
            ),
        )

    # ---------------------------------------------------------
    # 5. NGO must have confirmed the pickup
    # ---------------------------------------------------------

    if pickup.ngo_confirmation != "CONFIRMED":
        raise HTTPException(
            status_code=400,
            detail=(
                "The NGO must confirm the pickup before "
                "the donation can be completed."
            ),
        )

    # ---------------------------------------------------------
    # 6. Business completion also confirms the business side
    # ---------------------------------------------------------

    pickup.business_confirmation = "CONFIRMED"
    pickup.confirmation_status = "CONFIRMED"

    # ---------------------------------------------------------
    # 6. Find inventory item
    # ---------------------------------------------------------

    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.id == donation.inventory_id,
            Inventory.tenant_id == user.tenant_id,
            Inventory.is_deleted.is_(False),
        )
        .with_for_update()
        .first()
    )

    if not inventory:
        raise HTTPException(
            status_code=404,
            detail="Inventory item associated with this donation was not found.",
        )

    # ---------------------------------------------------------
    # 7. Validate inventory quantity
    # ---------------------------------------------------------

    if inventory.quantity < donation.quantity:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Insufficient inventory quantity to complete donation. "
                f"Available: {inventory.quantity}, "
                f"Donation quantity: {donation.quantity}."
            ),
        )

    # ---------------------------------------------------------
    # 8. Deduct inventory
    # ---------------------------------------------------------

    inventory.quantity -= donation.quantity

    # ---------------------------------------------------------
    # 9. Complete pickup
    # ---------------------------------------------------------

    pickup.status = "COMPLETED"
    pickup.confirmation_status = "CONFIRMED"
    pickup.business_confirmation = "CONFIRMED"
    pickup.ngo_confirmation = "CONFIRMED"

    # ---------------------------------------------------------
    # 10. Complete donation
    # ---------------------------------------------------------

    donation.donation_status = "COMPLETED"
    donation.committed_quantity = donation.quantity
    donation.remaining_quantity = 0
    donation.donated_at = datetime.utcnow()

    # ---------------------------------------------------------
    # 11. Complete donation match
    # ---------------------------------------------------------

    donation_match = (
        db.query(DonationMatch)
        .filter(
            DonationMatch.id == pickup.match_id,
        )
        .first()
    )

    if donation_match:
        donation_match.status = "COMPLETED"

    # ---------------------------------------------------------
    # 12. Notify NGO
    # ---------------------------------------------------------

    ngo = (
        db.query(NGO)
        .filter(
            NGO.id == pickup.ngo_id,
        )
        .first()
    )

    if ngo:
        ngo_user = (
            db.query(User)
            .filter(
                User.id == ngo.user_id,
            )
            .first()
        )

        if ngo_user:
            create_notification(
                db=db,
                user_id=ngo_user.id,
                title="Pickup Completed",
                message=(
                    f"Pickup #{pickup.id} for donation "
                    f"#{donation.id} has been completed."
                ),
                notification_type="PICKUP_COMPLETED",
            )

    # ---------------------------------------------------------
    # 13. Commit everything together
    # ---------------------------------------------------------

    db.commit()
    db.refresh(donation)

    return donation