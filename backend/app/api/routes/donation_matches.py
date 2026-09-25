from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.models.category import Category
from app.models.donation import Donation
from app.models.inventory import Inventory
from app.models.donation_match import DonationMatch
from app.models.ngo import NGO
from app.models.ngo_requirement import NGORequirement
from app.models.user import User
from app.models.tenant import Tenant
from app.core.security import require_ngo, require_tenant
from app.services.notification_service import create_notification
from app.services.donation_matching_service import (
    calculate_distance_km,
    calculate_distance_match_score,
    calculate_expiry_match_score,
    calculate_final_match_score,
    calculate_food_match_score,
    calculate_quantity_match_score,
    generate_matches_for_donation,
)


router = APIRouter(
    prefix="/api/v1/donation-matches",
    tags=["Donation Matches"],
)


# ============================================================
# HELPERS
# ============================================================

def get_donation_for_tenant(
    db: Session,
    donation_id: int,
    user: User,
) -> Donation:
    """
    Get a donation belonging to the currently logged-in tenant.
    """

    if user.tenant_id is None:
        raise HTTPException(
            status_code=403,
            detail="Tenant account is not linked to a business.",
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
            detail="Donation not found.",
        )

    return donation


def get_donation_category_name(
    db: Session,
    donation: Donation,
) -> str | None:
    """
    Get the category name of the donation's inventory item.
    """

    if (
        not donation.inventory
        or donation.inventory.category_id is None
    ):
        return None

    category = (
        db.query(Category)
        .filter(
            Category.id == donation.inventory.category_id
        )
        .first()
    )

    if not category:
        return None

    return category.name



# ============================================================
# PREVIEW AI MATCHES
# ============================================================

class DonationMatchPreviewRequest(BaseModel):
    inventory_id: int
    quantity: float = Field(gt=0)
    pickup_latitude: float | None = None
    pickup_longitude: float | None = None
    available_until: datetime | None = None


@router.post("/preview")
def preview_donation_matches(
    data: DonationMatchPreviewRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    """
    Preview AI NGO recommendations before a surplus listing is published.

    This endpoint does not create a Donation or DonationMatch row. It uses
    the same matching score functions as the persisted matching workflow so
    the business can review and explicitly select an NGO before publishing.
    """

    if user.tenant_id is None:
        raise HTTPException(
            status_code=403,
            detail="Tenant account is not linked to a business.",
        )

    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.id == data.inventory_id,
            Inventory.tenant_id == user.tenant_id,
        )
        .first()
    )

    if not inventory:
        raise HTTPException(
            status_code=404,
            detail="Inventory item not found.",
        )

    if inventory.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="No inventory quantity is available for matching.",
        )

    if data.quantity > inventory.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Only {inventory.quantity:g} {inventory.unit} is available.",
        )

    if not inventory.expiry_date:
        raise HTTPException(
            status_code=400,
            detail="The inventory item has no expiry date.",
        )

    if inventory.expiry_date < date.today():
        raise HTTPException(
            status_code=400,
            detail="Expired food cannot be matched.",
        )

    # Use a non-persisted Donation object so the existing score functions
    # can operate on the exact same donation-shaped data as the real flow.
    preview_donation = Donation(
        tenant_id=user.tenant_id,
        inventory_id=inventory.id,
        quantity=data.quantity,
        remaining_quantity=data.quantity,
        pickup_latitude=data.pickup_latitude,
        pickup_longitude=data.pickup_longitude,
        donation_status="PUBLISHED",
    )
    preview_donation.inventory = inventory

    requirements = (
        db.query(NGORequirement)
        .filter(
            NGORequirement.status == "ACTIVE",
            NGORequirement.required_by >= date.today(),
        )
        .all()
    )

    matches = []

    for requirement in requirements:
        ngo = (
            db.query(NGO)
            .filter(NGO.id == requirement.ngo_id)
            .first()
        )

        if not ngo:
            continue

        food_score = calculate_food_match_score(
            db=db,
            donation=preview_donation,
            requirement=requirement,
        )
        if food_score == 0:
            continue

        quantity_score = calculate_quantity_match_score(
            available_quantity=data.quantity,
            required_quantity=requirement.quantity_required,
        )
        if quantity_score == 0:
            continue

        distance_km = None
        if (
            data.pickup_latitude is not None
            and data.pickup_longitude is not None
            and ngo.latitude is not None
            and ngo.longitude is not None
        ):
            distance_km = calculate_distance_km(
                data.pickup_latitude,
                data.pickup_longitude,
                ngo.latitude,
                ngo.longitude,
            )

        if requirement.max_distance_km is not None:
            max_distance_km = requirement.max_distance_km
        elif ngo.service_radius_km is not None:
            max_distance_km = ngo.service_radius_km
        else:
            max_distance_km = 25.0

        distance_score = calculate_distance_match_score(
            distance_km=distance_km,
            max_distance_km=max_distance_km,
        )

        if (
            distance_km is not None
            and distance_km > max_distance_km
        ):
            continue

        expiry_score = calculate_expiry_match_score(
            expiry_date=inventory.expiry_date,
            required_by=requirement.required_by,
        )
        if expiry_score == 0:
            continue

        final_score = calculate_final_match_score(
            food_match_score=food_score,
            quantity_match_score=quantity_score,
            distance_match_score=distance_score,
            expiry_match_score=expiry_score,
        )

        matches.append(
            {
                "match_id": None,
                "donation_id": None,
                "requirement_id": requirement.id,
                "ngo_id": ngo.id,
                "food_match_score": food_score,
                "quantity_match_score": quantity_score,
                "distance_km": distance_km,
                "distance_match_score": distance_score,
                "expiry_match_score": expiry_score,
                "match_score": final_score,
                "status": "PREVIEW",
            }
        )

    matches.sort(
        key=lambda item: item["match_score"],
        reverse=True,
    )

    return {
        "total_matches": len(matches),
        "matches": matches,
    }

# ============================================================
# GENERATE AI MATCHES
# ============================================================

@router.post("/{donation_id}/generate")
def generate_donation_matches(
    donation_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    """
    Generate AI-powered NGO matches for a surplus donation.

    Matching considers:

    - Food type
    - Quantity
    - NGO location
    - NGO service radius
    - Expiry date
    - NGO required-by date
    """

    # --------------------------------------------------------
    # Get donation
    # --------------------------------------------------------

    donation = get_donation_for_tenant(
        db=db,
        donation_id=donation_id,
        user=user,
    )

    # --------------------------------------------------------
    # Validate donation status
    # --------------------------------------------------------

    if donation.donation_status not in {
        "PUBLISHED",
        "ACCEPTED",
        "PICKUP_SCHEDULED",
        "READY_FOR_PICKUP",
    }:
        raise HTTPException(
            status_code=400,
            detail=(
                "AI matching is available only for "
                "active surplus listings."
            ),
        )

    # --------------------------------------------------------
    # Determine remaining quantity
    # --------------------------------------------------------

    remaining_quantity = (
        donation.remaining_quantity
        if donation.remaining_quantity is not None
        else donation.quantity
    )

    if remaining_quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="No remaining quantity is available for matching.",
        )

    # --------------------------------------------------------
    # Inventory validation
    # --------------------------------------------------------

    if not donation.inventory:
        raise HTTPException(
            status_code=400,
            detail="The donation is not linked to an inventory item.",
        )

    # --------------------------------------------------------
    # Generate actual matches
    # --------------------------------------------------------

    try:
        matches = generate_matches_for_donation(
            db=db,
            donation=donation,
        )

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate AI matches: {str(exc)}",
        )

    # ========================================================
    # DIAGNOSTICS
    # ========================================================

    diagnostic_results = []

    requirements = (
        db.query(NGORequirement)
        .filter(
            NGORequirement.status == "ACTIVE",
            NGORequirement.required_by >= date.today(),
        )
        .all()
    )

    donation_category_name = (
        get_donation_category_name(
            db=db,
            donation=donation,
        )
    )

    for requirement in requirements:

        # ----------------------------------------------------
        # Find NGO
        # ----------------------------------------------------

        ngo = (
            db.query(NGO)
            .filter(
                NGO.id == requirement.ngo_id
            )
            .first()
        )

        if not ngo:
            diagnostic_results.append(
                {
                    "requirement_id": requirement.id,
                    "reason": "NGO profile not found",
                }
            )

            continue

        # ----------------------------------------------------
        # FOOD MATCH
        # ----------------------------------------------------

        food_score = calculate_food_match_score(
            db=db,
            donation=donation,
            requirement=requirement,
        )

        if food_score == 0:

            diagnostic_results.append(
                {
                    "requirement_id": requirement.id,
                    "reason": "Food type does not match",

                    "DONATION_FOOD": (
                        donation.inventory.name
                        if donation.inventory
                        else None
                    ),

                    "REQUIREMENT_FOOD": (
                        requirement.food_name
                    ),

                    "DONATION_CATEGORY": (
                        donation_category_name
                    ),

                    "REQUIREMENT_CATEGORY": (
                        requirement.food_category
                    ),

                    "FOOD_SCORE": food_score,
                }
            )

            continue

        # ----------------------------------------------------
        # QUANTITY MATCH
        # ----------------------------------------------------

        quantity_score = (
            calculate_quantity_match_score(
                available_quantity=remaining_quantity,
                required_quantity=(
                    requirement.quantity_required
                ),
            )
        )

        if quantity_score == 0:

            diagnostic_results.append(
                {
                    "requirement_id": requirement.id,
                    "reason": "Quantity does not match",

                    "DONATION_FOOD": (
                        donation.inventory.name
                        if donation.inventory
                        else None
                    ),

                    "REQUIREMENT_FOOD": (
                        requirement.food_name
                    ),

                    "AVAILABLE_QUANTITY": (
                        remaining_quantity
                    ),

                    "REQUIRED_QUANTITY": (
                        requirement.quantity_required
                    ),

                    "QUANTITY_SCORE": quantity_score,
                }
            )

            continue

        # ----------------------------------------------------
        # DISTANCE
        #
        # IMPORTANT:
        # Do not calculate distance when coordinates are NULL.
        # ----------------------------------------------------

        distance_km = None

        donation_has_coordinates = (
            donation.pickup_latitude is not None
            and donation.pickup_longitude is not None
        )

        ngo_has_coordinates = (
            ngo.latitude is not None
            and ngo.longitude is not None
        )

        if (
            donation_has_coordinates
            and ngo_has_coordinates
        ):
            distance_km = calculate_distance_km(
                donation.pickup_latitude,
                donation.pickup_longitude,
                ngo.latitude,
                ngo.longitude,
            )

        # ----------------------------------------------------
        # Maximum allowed distance
        # ----------------------------------------------------

        if requirement.max_distance_km is not None:
            max_distance_km = (
                requirement.max_distance_km
            )

        elif ngo.service_radius_km is not None:
            max_distance_km = (
                ngo.service_radius_km
            )

        else:
            max_distance_km = 25.0

        # ----------------------------------------------------
        # Distance score
        # ----------------------------------------------------

        distance_score = (
            calculate_distance_match_score(
                distance_km=distance_km,
                max_distance_km=max_distance_km,
            )
        )

        # ----------------------------------------------------
        # Reject only when actual coordinates exist and
        # the NGO is outside the allowed radius.
        # ----------------------------------------------------

        if (
            distance_km is not None
            and distance_km > max_distance_km
        ):

            diagnostic_results.append(
                {
                    "requirement_id": requirement.id,
                    "reason": "NGO is outside service radius",

                    "DISTANCE_KM": round(
                        distance_km,
                        2,
                    ),

                    "MAX_DISTANCE_KM": (
                        max_distance_km
                    ),

                    "DISTANCE_SCORE": (
                        distance_score
                    ),
                }
            )

            continue

        # ----------------------------------------------------
        # EXPIRY MATCH
        # ----------------------------------------------------

        expiry_score = (
            calculate_expiry_match_score(
                expiry_date=(
                    donation.inventory.expiry_date
                ),
                required_by=(
                    requirement.required_by
                ),
            )
        )

        if expiry_score == 0:

            diagnostic_results.append(
                {
                    "requirement_id": requirement.id,
                    "reason": "Food is expired",

                    "EXPIRY_DATE": (
                        str(
                            donation.inventory.expiry_date
                        )
                        if donation.inventory.expiry_date
                        else None
                    ),

                    "REQUIRED_BY": (
                        str(
                            requirement.required_by
                        )
                        if requirement.required_by
                        else None
                    ),

                    "EXPIRY_SCORE": expiry_score,
                }
            )

            continue

        # ----------------------------------------------------
        # FINAL MATCH SCORE
        # ----------------------------------------------------

        final_score = calculate_final_match_score(
            food_match_score=food_score,
            quantity_match_score=quantity_score,
            distance_match_score=distance_score,
            expiry_match_score=expiry_score,
        )

        # ----------------------------------------------------
        # MATCH PASSED
        # ----------------------------------------------------

        diagnostic_results.append(
            {
                "requirement_id": requirement.id,
                "reason": "MATCHED",

                "DONATION_FOOD": (
                    donation.inventory.name
                    if donation.inventory
                    else None
                ),

                "REQUIREMENT_FOOD": (
                    requirement.food_name
                ),

                "FOOD_SCORE": food_score,

                "QUANTITY_SCORE": quantity_score,

                "DISTANCE_KM": (
                    round(distance_km, 2)
                    if distance_km is not None
                    else None
                ),

                "DISTANCE_SCORE": distance_score,

                "EXPIRY_SCORE": expiry_score,

                "FINAL_SCORE": final_score,
            }
        )

    # ========================================================
    # BUILD MATCH RESPONSE
    # ========================================================

    match_results = []

    for match in matches:

        match_results.append(
            {
                "match_id": match.id,
                "donation_id": match.donation_id,
                "requirement_id": match.requirement_id,
                "ngo_id": match.ngo_id,

                "food_match_score": (
                    match.food_match_score
                ),

                "quantity_match_score": (
                    match.quantity_match_score
                ),

                "distance_km": (
                    match.distance_km
                ),

                "distance_match_score": (
                    match.distance_match_score
                ),

                "expiry_match_score": (
                    match.expiry_match_score
                ),

                "match_score": (
                    match.match_score
                ),

                "donor_organization_name": (
                    donor_tenant.name
                    if donor_tenant
                    else None
                ),

                "donor_owner_name": (
                    donor_user.full_name
                    if donor_user
                    else None
                ),

                "donor_owner_phone": (
                    donor_user.phone
                    if donor_user
                    else None
                ),

                "donor_owner_email": (
                    donor_user.email
                    if donor_user
                    else None
                ),

                "status": match.status,
            }
        )

    # ========================================================
    # RETURN
    # ========================================================

    return {
        "donation_id": donation.id,

        "total_matches": len(
            match_results
        ),

        "diagnostics": {
            "total_active_requirements": len(
                requirements
            ),

            "diagnostic_results": (
                diagnostic_results
            ),
        },

        "matches": match_results,
    }



# ============================================================
# BUSINESS SELECTS ONE AI/MANUAL MATCH
# ============================================================

@router.post("/{match_id}/select")
def select_donation_match(
    match_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    """
    Business explicitly selects one NGO match for a donation.

    The selected match remains SUGGESTED so the existing NGO
    pickup scheduling workflow can continue to use it.

    All other currently suggested matches for the same donation
    are marked REJECTED, ensuring that only one NGO is selected.
    """

    if user.tenant_id is None:
        raise HTTPException(
            status_code=403,
            detail="Tenant account is not linked to a business.",
        )

    match = (
        db.query(DonationMatch)
        .join(
            Donation,
            Donation.id == DonationMatch.donation_id,
        )
        .filter(
            DonationMatch.id == match_id,
            Donation.tenant_id == user.tenant_id,
        )
        .first()
    )

    if not match:
        raise HTTPException(
            status_code=404,
            detail="Donation match not found.",
        )

    donation = (
        db.query(Donation)
        .filter(
            Donation.id == match.donation_id,
            Donation.tenant_id == user.tenant_id,
        )
        .first()
    )

    if not donation:
        raise HTTPException(
            status_code=404,
            detail="Donation not found.",
        )

    if donation.donation_status not in {
        "PUBLISHED",
        "ACCEPTED",
    }:
        raise HTTPException(
            status_code=400,
            detail=(
                "An NGO can only be selected while the surplus "
                "donation is available."
            ),
        )

    if (
        donation.remaining_quantity is not None
        and donation.remaining_quantity <= 0
    ):
        raise HTTPException(
            status_code=400,
            detail="No remaining quantity is available.",
        )

    if match.status not in {
        "SUGGESTED",
        "SELECTED",
    }:
        raise HTTPException(
            status_code=400,
            detail="This NGO match is no longer available for selection.",
        )

    # Keep only the selected match available to the NGO.
    (
        db.query(DonationMatch)
        .filter(
            DonationMatch.donation_id == donation.id,
            DonationMatch.id != match.id,
            DonationMatch.status == "SUGGESTED",
        )
        .update(
            {"status": "REJECTED"},
            synchronize_session=False,
        )
    )

    # IMPORTANT:
    # Keep this as SUGGESTED because the existing pickup route
    # requires SUGGESTED before an NGO can schedule pickup.
    match.status = "SUGGESTED"

    # --------------------------------------------------------
    # Notify the explicitly selected NGO
    # --------------------------------------------------------
    ngo = (
        db.query(NGO)
        .filter(NGO.id == match.ngo_id)
        .first()
    )

    if ngo:
        ngo_user = (
            db.query(User)
            .filter(User.id == ngo.user_id)
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
    db.refresh(match)

    return {
        "message": "NGO selected successfully.",
        "match_id": match.id,
        "donation_id": match.donation_id,
        "ngo_id": match.ngo_id,
        "status": match.status,
    }



# ============================================================
# GET NGO MATCHES
# ============================================================

# ============================================================
# GET NGO MATCHES
# ============================================================

@router.get("/ngo/matches")
def get_ngo_matches(
    db: Session = Depends(get_db),
    user: User = Depends(require_ngo),
):
    """
    Return all AI-generated matches for the logged-in NGO,
    including complete donor/business information.
    """

    # --------------------------------------------------------
    # Get logged-in NGO
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
    # Get matches for this NGO
    # --------------------------------------------------------

    matches = (
        db.query(DonationMatch)
        .filter(
            DonationMatch.ngo_id == ngo.id
        )
        .order_by(
            DonationMatch.match_score.desc()
        )
        .all()
    )

    result = []

    # --------------------------------------------------------
    # Build response
    # --------------------------------------------------------

    for match in matches:

        # ----------------------------------------------------
        # Donation
        # ----------------------------------------------------

        donation = (
            db.query(Donation)
            .filter(
                Donation.id == match.donation_id
            )
            .first()
        )

        # ----------------------------------------------------
        # NGO Requirement
        # ----------------------------------------------------

        requirement = (
            db.query(NGORequirement)
            .filter(
                NGORequirement.id == match.requirement_id
            )
            .first()
        )

        if not donation or not requirement:
            continue

        # ----------------------------------------------------
        # Inventory
        # ----------------------------------------------------

        inventory = donation.inventory

        # ----------------------------------------------------
        # DONOR BUSINESS / TENANT
        # ----------------------------------------------------

        donor_tenant = (
            db.query(Tenant)
            .filter(
                Tenant.id == donation.tenant_id
            )
            .first()
        )

        # ----------------------------------------------------
        # DONOR USER
        #
        # Do NOT restrict this query to role == "TENANT".
        # We only need the business user's account belonging
        # to this tenant.
        # ----------------------------------------------------

        donor_user = (
            db.query(User)
            .filter(
                User.tenant_id == donation.tenant_id,
            )
            .order_by(
                User.id.asc()
            )
            .first()
        )

        # ----------------------------------------------------
        # PICKUP LOCATION
        #
        # Donation location has priority.
        # Tenant location is used as fallback.
        # ----------------------------------------------------

        pickup_location = (
            donation.pickup_location
            or (
                donor_tenant.address
                if donor_tenant
                else None
            )
        )

        pickup_latitude = (
            donation.pickup_latitude
            if donation.pickup_latitude is not None
            else (
                donor_tenant.latitude
                if donor_tenant
                else None
            )
        )

        pickup_longitude = (
            donation.pickup_longitude
            if donation.pickup_longitude is not None
            else (
                donor_tenant.longitude
                if donor_tenant
                else None
            )
        )

        # ----------------------------------------------------
        # RESULT
        # ----------------------------------------------------

        result.append(
            {
                # ============================================
                # MATCH INFORMATION
                # ============================================

                "match_id": match.id,

                "donation_id": (
                    match.donation_id
                ),

                "requirement_id": (
                    match.requirement_id
                ),

                "ngo_id": (
                    match.ngo_id
                ),

                # ============================================
                # FOOD INFORMATION
                # ============================================

                "food_name": (
                    inventory.name
                    if inventory
                    else requirement.food_name
                ),

                "required_quantity": (
                    requirement.quantity_required
                ),

                "required_unit": (
                    requirement.unit
                ),

                "available_quantity": (
                    donation.remaining_quantity
                    if donation.remaining_quantity is not None
                    else donation.quantity
                ),

                # ============================================
                # DONOR ORGANIZATION
                # ============================================

                "donor_organization_name": (
                    donor_tenant.name
                    if donor_tenant
                    else None
                ),

                # ============================================
                # DONOR CONTACT
                # ============================================

                "donor_owner_name": (
                    donor_user.full_name
                    if donor_user
                    else None
                ),

                "donor_owner_phone": (
                    donor_user.phone
                    if donor_user
                    else None
                ),

                "donor_owner_email": (
                    donor_user.email
                    if donor_user
                    else None
                ),

                # ============================================
                # DONOR ADDRESS
                # ============================================

                "donor_address": (
                    donor_tenant.address
                    if donor_tenant
                    else None
                ),

                # ============================================
                # PICKUP LOCATION
                # ============================================

                "pickup_location": pickup_location,

                "pickup_latitude": pickup_latitude,

                "pickup_longitude": pickup_longitude,

                # ============================================
                # DONOR NOTE
                # ============================================

                "note": (
                    donation.note
                ),

                # ============================================
                # AVAILABILITY
                # ============================================

                "available_from": (
                    donation.available_from
                ),

                "available_until": (
                    donation.available_until
                ),

                # ============================================
                # MATCHING INFORMATION
                # ============================================

                "distance_km": (
                    match.distance_km
                ),

                "food_match_score": (
                    match.food_match_score
                ),

                "quantity_match_score": (
                    match.quantity_match_score
                ),

                "distance_match_score": (
                    match.distance_match_score
                ),

                "expiry_match_score": (
                    match.expiry_match_score
                ),

                "match_score": (
                    match.match_score
                ),

                # ============================================
                # STATUS
                # ============================================

                "status": match.status,
            }
        )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "ngo_id": ngo.id,
        "total_matches": len(result),
        "matches": result,
    }


# ============================================================
# GET MATCHES FOR ONE DONATION
# ============================================================

@router.get("/{donation_id}")
def get_donation_matches(
    donation_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    """
    Get all generated NGO matches for a specific donation.
    """

    donation = get_donation_for_tenant(
        db=db,
        donation_id=donation_id,
        user=user,
    )

    matches = (
        db.query(DonationMatch)
        .filter(
            DonationMatch.donation_id
            == donation.id
        )
        .order_by(
            DonationMatch.match_score.desc()
        )
        .all()
    )

    return [
        {
            "match_id": match.id,
            "donation_id": match.donation_id,
            "requirement_id": match.requirement_id,
            "ngo_id": match.ngo_id,
            "food_match_score": match.food_match_score,
            "quantity_match_score": match.quantity_match_score,
            "distance_km": match.distance_km,
            "distance_match_score": match.distance_match_score,
            "expiry_match_score": match.expiry_match_score,
            "match_score": match.match_score,
            "status": match.status,
        }
        for match in matches
    ]