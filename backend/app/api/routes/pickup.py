from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_ngo, require_tenant

from app.models.donation import Donation
from app.models.donation_match import DonationMatch
from app.models.ngo import NGO
from app.models.pickup import Pickup
from app.models.tenant import Tenant
from app.models.user import User

from app.schemas.pickup import PickupCreate, PickupResponse

from app.services.notification_service import create_notification


router = APIRouter(
    prefix="/api/v1/pickups",
    tags=["Pickups"],
)


# ============================================================
# DATETIME NORMALIZATION
# ============================================================

def normalize_datetime(value):
    """
    Convert timezone-aware datetimes to naive UTC datetimes.

    PostgreSQL DateTime fields in this project are stored as
    timezone-naive values, while the frontend sends ISO strings
    containing timezone information.
    """

    if value is None:
        return None

    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(
            tzinfo=None
        )

    return value


# ============================================================
# NOTIFICATION HELPERS
# ============================================================

def get_business_user(
    db: Session,
    tenant_id: int,
) -> User | None:
    """
    Find the active business/tenant user associated
    with the given tenant.
    """

    return (
        db.query(User)
        .filter(
            User.tenant_id == tenant_id,
            User.role == "TENANT",
        )
        .first()
    )


def get_ngo_user(
    db: Session,
    ngo_id: int,
) -> User | None:
    """
    Find the user associated with an NGO profile.
    """

    ngo = (
        db.query(NGO)
        .filter(
            NGO.id == ngo_id
        )
        .first()
    )

    if not ngo:
        return None

    return (
        db.query(User)
        .filter(
            User.id == ngo.user_id
        )
        .first()
    )


# ============================================================
# ENRICHED PICKUP RESPONSE
# ============================================================

def serialize_pickup(db: Session, pickup: Pickup) -> dict:
    """
    Return pickup data together with donation quantity and
    donor/NGO contact information required by both dashboards.
    """

    donation = (
        db.query(Donation)
        .filter(Donation.id == pickup.donation_id)
        .first()
    )

    donor_tenant = None
    donor_user = None
    ngo = None
    ngo_user = None

    if donation:
        donor_tenant = (
            db.query(Tenant)
            .filter(Tenant.id == donation.tenant_id)
            .first()
        )

        donor_user = (
            db.query(User)
            .filter(
                User.tenant_id == donation.tenant_id,
                User.role == "TENANT",
            )
            .first()
        )

    ngo = (
        db.query(NGO)
        .filter(NGO.id == pickup.ngo_id)
        .first()
    )

    if ngo:
        ngo_user = (
            db.query(User)
            .filter(User.id == ngo.user_id)
            .first()
        )

    return {
        "id": pickup.id,
        "donation_id": pickup.donation_id,
        "match_id": pickup.match_id,
        "ngo_id": pickup.ngo_id,
        "scheduled_start": pickup.scheduled_start,
        "scheduled_end": pickup.scheduled_end,
        "pickup_location": pickup.pickup_location,
        "status": pickup.status,
        "confirmation_status": pickup.confirmation_status,
        "ngo_confirmation": pickup.ngo_confirmation,
        "business_confirmation": pickup.business_confirmation,
        "notes": pickup.notes,
        "created_at": pickup.created_at,

        # Sustainability-impact fields.
        "donation_quantity": (
            donation.quantity if donation else None
        ),
        "committed_quantity": (
            donation.committed_quantity if donation else None
        ),
        "donation_unit": (
            getattr(donation, "unit", None) if donation else None
        ),
        "donation_status": (
            donation.donation_status if donation else None
        ),

        # Donor business details.
        "donor_organization_name": (
            donor_tenant.name if donor_tenant else None
        ),
        "donor_owner_name": (
            donor_user.full_name if donor_user else None
        ),
        "donor_owner_phone": (
            donor_user.phone if donor_user else None
        ),
        "donor_owner_email": (
            donor_user.email if donor_user else None
        ),

        # NGO details.
        "ngo_organization_name": (
            ngo.organization_name if ngo else None
        ),
        "ngo_contact_name": (
            ngo_user.full_name if ngo_user else None
        ),
        "ngo_contact_phone": (
            ngo_user.phone if ngo_user else None
        ),
        "ngo_contact_email": (
            ngo_user.email if ngo_user else None
        ),

        # Person collecting the donation.
        "pickup_person_name": (
            ngo_user.full_name if ngo_user else None
        ),
        "pickup_person_phone": (
            ngo_user.phone if ngo_user else None
        ),
        "pickup_person_email": (
            ngo_user.email if ngo_user else None
        ),
    }


# ============================================================
# SCHEDULE PICKUP
# NGO schedules pickup against a match
# ============================================================

@router.post(
    "/",
    response_model=PickupResponse,
    status_code=201,
)
def schedule_pickup(
    data: PickupCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_ngo),
):
    """
    NGO schedules a pickup for an existing donation match.
    """

    # --------------------------------------------------------
    # Find NGO profile
    # --------------------------------------------------------

    ngo = (
        db.query(NGO)
        .filter(
            NGO.user_id == user.id
        )
        .first()
    )

    if not ngo:
        raise HTTPException(
            status_code=404,
            detail="NGO profile not found.",
        )

    # --------------------------------------------------------
    # Find match
    # --------------------------------------------------------

    match = (
        db.query(DonationMatch)
        .filter(
            DonationMatch.id == data.match_id,
            DonationMatch.ngo_id == ngo.id,
        )
        .first()
    )

    if not match:
        raise HTTPException(
            status_code=404,
            detail="Donation match not found.",
        )

    # --------------------------------------------------------
    # Validate match status
    # --------------------------------------------------------

    if match.status != "SUGGESTED":
        raise HTTPException(
            status_code=400,
            detail=(
                "This donation match is no longer available "
                "for pickup scheduling."
            ),
        )

    # --------------------------------------------------------
    # Find donation
    # --------------------------------------------------------

    donation = (
        db.query(Donation)
        .filter(
            Donation.id == match.donation_id
        )
        .first()
    )

    if not donation:
        raise HTTPException(
            status_code=404,
            detail="Donation not found.",
        )

    # --------------------------------------------------------
    # Validate donation status
    # --------------------------------------------------------

    if donation.donation_status not in {
        "PUBLISHED",
        "ACCEPTED",
    }:
        raise HTTPException(
            status_code=400,
            detail=(
                "This donation is not currently available "
                "for pickup scheduling."
            ),
        )

    # --------------------------------------------------------
    # Validate remaining quantity
    # --------------------------------------------------------

    if donation.remaining_quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="No remaining quantity is available.",
        )

    # --------------------------------------------------------
    # Normalize incoming datetimes
    # --------------------------------------------------------

    scheduled_start = normalize_datetime(
        data.scheduled_start
    )

    scheduled_end = normalize_datetime(
        data.scheduled_end
    )

    available_from = normalize_datetime(
        donation.available_from
    )

    available_until = normalize_datetime(
        donation.available_until
    )

    # --------------------------------------------------------
    # Validate pickup time
    # --------------------------------------------------------

    if not scheduled_start or not scheduled_end:
        raise HTTPException(
            status_code=400,
            detail="Pickup start and end times are required.",
        )

    if scheduled_end <= scheduled_start:
        raise HTTPException(
            status_code=400,
            detail=(
                "Pickup end time must be after "
                "pickup start time."
            ),
        )

    # --------------------------------------------------------
    # Validate against donation availability window
    # --------------------------------------------------------

    if available_from is not None:
        if scheduled_start < available_from:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Pickup cannot start before the "
                    "donation availability window."
                ),
            )

    if available_until is not None:
        if scheduled_end > available_until:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Pickup cannot end after the "
                    "donation availability window."
                ),
            )

    # --------------------------------------------------------
    # Prevent duplicate pickup
    # --------------------------------------------------------

    existing_pickup = (
        db.query(Pickup)
        .filter(
            Pickup.match_id == match.id,
            Pickup.status.in_(
                [
                    "SCHEDULED",
                    "READY_FOR_PICKUP",
                ]
            ),
        )
        .first()
    )

    if existing_pickup:
        raise HTTPException(
            status_code=400,
            detail=(
                "A pickup has already been scheduled "
                "for this match."
            ),
        )

    # --------------------------------------------------------
    # Create pickup
    # --------------------------------------------------------

    pickup = Pickup(
        donation_id=donation.id,
        match_id=match.id,
        ngo_id=ngo.id,
        scheduled_start=scheduled_start,
        scheduled_end=scheduled_end,
        pickup_location=donation.pickup_location,
        status="SCHEDULED",
        confirmation_status="PENDING",
        ngo_confirmation="CONFIRMED",
        business_confirmation="PENDING",
        notes=data.notes,
    )

    db.add(pickup)

    # --------------------------------------------------------
    # Update match and donation
    # --------------------------------------------------------

    match.status = "ACCEPTED"

    donation.donation_status = "PICKUP_SCHEDULED"

    # --------------------------------------------------------
    # Notify business
    # --------------------------------------------------------

    business_user = get_business_user(
        db,
        donation.tenant_id,
    )

    if business_user:
        create_notification(
            db=db,
            user_id=business_user.id,
            title="Pickup Scheduled",
            message=(
                f"An NGO has scheduled pickup "
                f"for donation #{donation.id}."
            ),
            notification_type="PICKUP_SCHEDULED",
        )

    # --------------------------------------------------------
    # Commit
    # --------------------------------------------------------

    db.commit()
    db.refresh(pickup)

    return pickup


# ============================================================
# GET NGO PICKUPS
# ============================================================

@router.get(
    "/ngo",
    response_model=list[dict],
)
def get_ngo_pickups(
    db: Session = Depends(get_db),
    user: User = Depends(require_ngo),
):
    """
    Return pickups belonging to the logged-in NGO.
    """

    ngo = (
        db.query(NGO)
        .filter(
            NGO.user_id == user.id
        )
        .first()
    )

    if not ngo:
        raise HTTPException(
            status_code=404,
            detail="NGO profile not found.",
        )

    pickups = (
        db.query(Pickup)
        .filter(
            Pickup.ngo_id == ngo.id
        )
        .order_by(
            Pickup.created_at.desc()
        )
        .all()
    )

    # Return the enriched pickup payload so the NGO dashboard receives
    # donation_quantity, committed_quantity and donation_status.
    return [
        serialize_pickup(db, pickup)
        for pickup in pickups
    ]


# ============================================================
# GET BUSINESS PICKUPS
# ============================================================

@router.get(
    "/business",
    response_model=list[dict],
)
def get_business_pickups(
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    """
    Return pickups for donations belonging to
    the logged-in business.
    """

    if not user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Tenant profile is not configured.",
        )

    pickups = (
        db.query(Pickup)
        .join(
            Donation,
            Pickup.donation_id == Donation.id,
        )
        .filter(
            Donation.tenant_id == user.tenant_id
        )
        .order_by(
            Pickup.created_at.desc()
        )
        .all()
    )

    return [
        serialize_pickup(db, pickup)
        for pickup in pickups
    ]


# ============================================================
# NGO CONFIRM PICKUP
# ============================================================

@router.patch(
    "/{pickup_id}/ngo-confirm",
    response_model=PickupResponse,
)
def ngo_confirm_pickup(
    pickup_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_ngo),
):
    """
    NGO confirms an existing pickup.
    """

    ngo = (
        db.query(NGO)
        .filter(
            NGO.user_id == user.id
        )
        .first()
    )

    if not ngo:
        raise HTTPException(
            status_code=404,
            detail="NGO profile not found.",
        )

    pickup = (
        db.query(Pickup)
        .filter(
            Pickup.id == pickup_id,
            Pickup.ngo_id == ngo.id,
        )
        .first()
    )

    if not pickup:
        raise HTTPException(
            status_code=404,
            detail="Pickup not found.",
        )

    if pickup.status == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="Cancelled pickup cannot be confirmed.",
        )

    if pickup.status == "COMPLETED":
        raise HTTPException(
            status_code=400,
            detail="Completed pickup cannot be confirmed.",
        )

    donation = (
        db.query(Donation)
        .filter(
            Donation.id == pickup.donation_id
        )
        .first()
    )

    if not donation:
        raise HTTPException(
            status_code=404,
            detail="Donation not found.",
        )

    # --------------------------------------------------------
    # Confirm NGO
    # --------------------------------------------------------

    pickup.ngo_confirmation = "CONFIRMED"

    # --------------------------------------------------------
    # If both sides confirmed
    # --------------------------------------------------------

    if (
        pickup.ngo_confirmation == "CONFIRMED"
        and pickup.business_confirmation == "CONFIRMED"
    ):
        pickup.confirmation_status = "CONFIRMED"
        pickup.status = "READY_FOR_PICKUP"

        donation.donation_status = "READY_FOR_PICKUP"

    # --------------------------------------------------------
    # Notify business
    # --------------------------------------------------------

    business_user = get_business_user(
        db,
        donation.tenant_id,
    )

    if business_user:
        create_notification(
            db=db,
            user_id=business_user.id,
            title="Pickup Confirmed by NGO",
            message=(
                f"NGO has confirmed pickup "
                f"#{pickup.id} for donation "
                f"#{donation.id}."
            ),
            notification_type="PICKUP_CONFIRMED",
        )

    db.commit()
    db.refresh(pickup)

    return pickup


# ============================================================
# BUSINESS CONFIRM PICKUP
# ============================================================

@router.patch(
    "/{pickup_id}/business-confirm",
    response_model=PickupResponse,
)
def business_confirm_pickup(
    pickup_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    """
    Business confirms an existing pickup.
    """

    if not user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Tenant profile is not configured.",
        )

    pickup = (
        db.query(Pickup)
        .join(
            Donation,
            Pickup.donation_id == Donation.id,
        )
        .filter(
            Pickup.id == pickup_id,
            Donation.tenant_id == user.tenant_id,
        )
        .first()
    )

    if not pickup:
        raise HTTPException(
            status_code=404,
            detail="Pickup not found.",
        )

    if pickup.status == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="Cancelled pickup cannot be confirmed.",
        )

    if pickup.status == "COMPLETED":
        raise HTTPException(
            status_code=400,
            detail="Completed pickup cannot be confirmed.",
        )

    donation = (
        db.query(Donation)
        .filter(
            Donation.id == pickup.donation_id
        )
        .first()
    )

    if not donation:
        raise HTTPException(
            status_code=404,
            detail="Donation not found.",
        )

    # --------------------------------------------------------
    # Confirm business
    # --------------------------------------------------------

    pickup.business_confirmation = "CONFIRMED"

    # --------------------------------------------------------
    # If both sides confirmed
    # --------------------------------------------------------

    if (
        pickup.ngo_confirmation == "CONFIRMED"
        and pickup.business_confirmation == "CONFIRMED"
    ):
        pickup.confirmation_status = "CONFIRMED"
        pickup.status = "READY_FOR_PICKUP"

        donation.donation_status = "READY_FOR_PICKUP"

    # --------------------------------------------------------
    # Notify NGO
    # --------------------------------------------------------

    ngo_user = get_ngo_user(
        db,
        pickup.ngo_id,
    )

    if ngo_user:
        create_notification(
            db=db,
            user_id=ngo_user.id,
            title="Pickup Confirmed by Business",
            message=(
                f"Business has confirmed pickup "
                f"#{pickup.id} for donation "
                f"#{donation.id}."
            ),
            notification_type="PICKUP_CONFIRMED",
        )

    db.commit()
    db.refresh(pickup)

    return pickup


# ============================================================
# NGO CANCEL PICKUP
# ============================================================

@router.patch(
    "/{pickup_id}/ngo-cancel",
    response_model=PickupResponse,
)
def ngo_cancel_pickup(
    pickup_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_ngo),
):
    """
    NGO cancels a scheduled pickup.
    """

    ngo = (
        db.query(NGO)
        .filter(
            NGO.user_id == user.id
        )
        .first()
    )

    if not ngo:
        raise HTTPException(
            status_code=404,
            detail="NGO profile not found.",
        )

    pickup = (
        db.query(Pickup)
        .filter(
            Pickup.id == pickup_id,
            Pickup.ngo_id == ngo.id,
        )
        .first()
    )

    if not pickup:
        raise HTTPException(
            status_code=404,
            detail="Pickup not found.",
        )

    if pickup.status == "COMPLETED":
        raise HTTPException(
            status_code=400,
            detail="Completed pickup cannot be cancelled.",
        )

    donation = (
        db.query(Donation)
        .filter(
            Donation.id == pickup.donation_id
        )
        .first()
    )

    if not donation:
        raise HTTPException(
            status_code=404,
            detail="Donation not found.",
        )

    match = (
        db.query(DonationMatch)
        .filter(
            DonationMatch.id == pickup.match_id
        )
        .first()
    )

    # --------------------------------------------------------
    # Cancel pickup
    # --------------------------------------------------------

    pickup.status = "CANCELLED"
    pickup.confirmation_status = "PENDING"

    pickup.ngo_confirmation = "PENDING"
    pickup.business_confirmation = "PENDING"

    # --------------------------------------------------------
    # Reset donation and match
    # --------------------------------------------------------

    donation.donation_status = "PUBLISHED"

    if match:
        match.status = "SUGGESTED"

    # --------------------------------------------------------
    # Notify business
    # --------------------------------------------------------

    business_user = get_business_user(
        db,
        donation.tenant_id,
    )

    if business_user:
        create_notification(
            db=db,
            user_id=business_user.id,
            title="Pickup Cancelled",
            message=(
                f"NGO has cancelled pickup "
                f"#{pickup.id} for donation "
                f"#{donation.id}."
            ),
            notification_type="PICKUP_CANCELLED",
        )

    db.commit()
    db.refresh(pickup)

    return pickup


# ============================================================
# BUSINESS CANCEL PICKUP
# ============================================================

@router.patch(
    "/{pickup_id}/business-cancel",
    response_model=PickupResponse,
)
def business_cancel_pickup(
    pickup_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    """
    Business cancels a scheduled pickup.
    """

    if not user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Tenant profile is not configured.",
        )

    pickup = (
        db.query(Pickup)
        .join(
            Donation,
            Pickup.donation_id == Donation.id,
        )
        .filter(
            Pickup.id == pickup_id,
            Donation.tenant_id == user.tenant_id,
        )
        .first()
    )

    if not pickup:
        raise HTTPException(
            status_code=404,
            detail="Pickup not found.",
        )

    if pickup.status == "COMPLETED":
        raise HTTPException(
            status_code=400,
            detail="Completed pickup cannot be cancelled.",
        )

    donation = (
        db.query(Donation)
        .filter(
            Donation.id == pickup.donation_id
        )
        .first()
    )

    if not donation:
        raise HTTPException(
            status_code=404,
            detail="Donation not found.",
        )

    match = (
        db.query(DonationMatch)
        .filter(
            DonationMatch.id == pickup.match_id
        )
        .first()
    )

    # --------------------------------------------------------
    # Cancel pickup
    # --------------------------------------------------------

    pickup.status = "CANCELLED"
    pickup.confirmation_status = "PENDING"

    pickup.ngo_confirmation = "PENDING"
    pickup.business_confirmation = "PENDING"

    # --------------------------------------------------------
    # Reset donation and match
    # --------------------------------------------------------

    donation.donation_status = "PUBLISHED"

    if match:
        match.status = "SUGGESTED"

    # --------------------------------------------------------
    # Notify NGO
    # --------------------------------------------------------

    ngo_user = get_ngo_user(
        db,
        pickup.ngo_id,
    )

    if ngo_user:
        create_notification(
            db=db,
            user_id=ngo_user.id,
            title="Pickup Cancelled",
            message=(
                f"Business has cancelled pickup "
                f"#{pickup.id} for donation "
                f"#{donation.id}."
            ),
            notification_type="PICKUP_CANCELLED",
        )

    db.commit()
    db.refresh(pickup)

    return pickup


# ============================================================
# COMPLETE PICKUP
# Business completes the actual donation handover
# ============================================================

@router.patch(
    "/{pickup_id}/complete",
    response_model=PickupResponse,
)
def complete_pickup(
    pickup_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    """
    Business marks the pickup/donation as completed.
    """

    if not user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Tenant profile is not configured.",
        )

    pickup = (
        db.query(Pickup)
        .join(
            Donation,
            Pickup.donation_id == Donation.id,
        )
        .filter(
            Pickup.id == pickup_id,
            Donation.tenant_id == user.tenant_id,
        )
        .first()
    )

    if not pickup:
        raise HTTPException(
            status_code=404,
            detail="Pickup not found.",
        )

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

    donation = (
        db.query(Donation)
        .filter(
            Donation.id == pickup.donation_id
        )
        .first()
    )

    if not donation:
        raise HTTPException(
            status_code=404,
            detail="Donation not found.",
        )

    match = (
        db.query(DonationMatch)
        .filter(
            DonationMatch.id == pickup.match_id
        )
        .first()
    )

    # --------------------------------------------------------
    # Complete pickup
    # --------------------------------------------------------

    pickup.status = "COMPLETED"
    pickup.confirmation_status = "CONFIRMED"

    # --------------------------------------------------------
    # Complete donation
    # --------------------------------------------------------

    donation.donation_status = "COMPLETED"
    donation.donated_at = datetime.utcnow()

    donation.committed_quantity = donation.quantity
    donation.remaining_quantity = 0

    # --------------------------------------------------------
    # Complete match
    # --------------------------------------------------------

    if match:
        match.status = "COMPLETED"

    # --------------------------------------------------------
    # Notify NGO
    # --------------------------------------------------------

    ngo_user = get_ngo_user(
        db,
        pickup.ngo_id,
    )

    if ngo_user:
        create_notification(
            db=db,
            user_id=ngo_user.id,
            title="Pickup Completed",
            message=(
                f"Pickup {pickup.id} for donation "
                f"{donation.id} has been completed."
            ),
            notification_type="PICKUP_COMPLETED",
        )

    # --------------------------------------------------------
    # Commit
    # --------------------------------------------------------

    db.commit()
    db.refresh(pickup)

    return pickup