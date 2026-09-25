from datetime import date
from math import asin, cos, radians, sin, sqrt

from difflib import SequenceMatcher

from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.donation import Donation
from app.models.donation_match import DonationMatch
from app.models.ngo import NGO
from app.models.ngo_requirement import NGORequirement


# ============================================================
# DISTANCE CALCULATION
# ============================================================

def calculate_distance_km(
    latitude1: float,
    longitude1: float,
    latitude2: float,
    longitude2: float,
) -> float:
    """
    Calculate the distance between two latitude/longitude
    coordinates using the Haversine formula.

    Returns:
        Distance in kilometers.
    """

    earth_radius_km = 6371.0

    lat1 = radians(latitude1)
    lon1 = radians(longitude1)
    lat2 = radians(latitude2)
    lon2 = radians(longitude2)

    delta_lat = lat2 - lat1
    delta_lon = lon2 - lon1

    a = (
        sin(delta_lat / 2) ** 2
        + cos(lat1)
        * cos(lat2)
        * sin(delta_lon / 2) ** 2
    )

    c = 2 * asin(sqrt(a))

    return earth_radius_km * c


# ============================================================
# FOOD MATCHING
# ============================================================

def calculate_food_match_score(
    db: Session,
    donation: Donation,
    requirement: NGORequirement,
) -> float:
    """
    Flexible food matching.

    Score:
        100 -> exact food name
        95  -> one food name contains the other
        90  -> strong keyword overlap
        85  -> fuzzy spelling match
        80  -> exact category match
        70  -> partial category match
        0   -> unrelated food

    Examples:

        Avocado
        Avocados 4pk

        -> strong/partial match

        Avocardo
        Avocados 4pk

        -> fuzzy spelling match

        Milk
        Avocados 4pk

        -> no match
    """

    import re

    def normalize(value: str | None) -> str:
        """
        Normalize text for matching.
        """

        if not value:
            return ""

        value = value.lower().strip()

        # Replace punctuation/special characters with spaces
        value = re.sub(r"[^a-z0-9\s]", " ", value)

        # Remove multiple spaces
        value = re.sub(r"\s+", " ", value).strip()

        return value

    def words(value: str) -> set[str]:
        """
        Convert a string into normalized meaningful words.

        Also handles simple plural forms.
        """

        result: set[str] = set()

        for word in normalize(value).split():

            if len(word) <= 2:
                continue

            # Examples:
            # berries -> berry
            # cherries -> cherry
            if word.endswith("ies") and len(word) > 4:
                word = word[:-3] + "y"

            # Examples:
            # boxes -> box
            # tomatoes -> tomato
            elif word.endswith("es") and len(word) > 4:
                word = word[:-2]

            # Example:
            # apples -> apple
            # avocados -> avocado
            elif word.endswith("s") and len(word) > 3:
                word = word[:-1]

            result.add(word)

        return result

    # --------------------------------------------------------
    # Get donation food name
    # --------------------------------------------------------

    donation_name = normalize(
        donation.inventory.name
        if donation.inventory
        else ""
    )

    # --------------------------------------------------------
    # Get NGO requirement food name
    # --------------------------------------------------------

    requirement_name = normalize(
        requirement.food_name
    )

    donation_words = words(donation_name)
    requirement_words = words(requirement_name)

    # --------------------------------------------------------
    # 1. Exact normalized match
    # --------------------------------------------------------

    if donation_name and donation_name == requirement_name:
        return 100.0

    # --------------------------------------------------------
    # 2. One name contains the other
    #
    # Example:
    # "avocado"
    # "avocados 4pk"
    # --------------------------------------------------------

    if (
        donation_name
        and requirement_name
        and (
            donation_name in requirement_name
            or requirement_name in donation_name
        )
    ):
        return 95.0

    # --------------------------------------------------------
    # 3. Word overlap
    #
    # Example:
    #
    # Donation:
    #     Avocados 4pk
    #
    # Requirement:
    #     Avocado
    # --------------------------------------------------------

    if donation_words and requirement_words:

        common_words = (
            donation_words.intersection(
                requirement_words
            )
        )

        if common_words:
            return 90.0

    # --------------------------------------------------------
    # 4. Fuzzy spelling match
    #
    # Handles small spelling mistakes.
    #
    # Example:
    #
    # avocado
    # avocardo
    #
    # similarity is high enough to consider them related.
    # --------------------------------------------------------

    if donation_words and requirement_words:

        for donation_word in donation_words:

            for requirement_word in requirement_words:

                similarity = SequenceMatcher(
                    None,
                    donation_word,
                    requirement_word,
                ).ratio()

                if (
                    len(donation_word) >= 5
                    and len(requirement_word) >= 5
                    and similarity >= 0.75
                ):
                    return 85.0

    # --------------------------------------------------------
    # 5. Get donation category
    # --------------------------------------------------------

    donation_category = ""

    if (
        donation.inventory
        and donation.inventory.category_id
    ):

        category = (
            db.query(Category)
            .filter(
                Category.id
                == donation.inventory.category_id
            )
            .first()
        )

        if category:
            donation_category = normalize(
                category.name
            )

    # --------------------------------------------------------
    # 6. Get NGO requirement category
    # --------------------------------------------------------

    requirement_category = normalize(
        requirement.food_category
    )

    # --------------------------------------------------------
    # 7. Exact category match
    # --------------------------------------------------------

    if (
        donation_category
        and requirement_category
        and donation_category
        == requirement_category
    ):
        return 80.0

    # --------------------------------------------------------
    # 8. Partial category match
    # --------------------------------------------------------

    if (
        donation_category
        and requirement_category
    ):

        donation_category_words = words(
            donation_category
        )

        requirement_category_words = words(
            requirement_category
        )

        common_category_words = (
            donation_category_words.intersection(
                requirement_category_words
            )
        )

        if common_category_words:
            return 70.0

        if (
            donation_category in requirement_category
            or requirement_category in donation_category
        ):
            return 70.0

    # --------------------------------------------------------
    # No food/category match
    # --------------------------------------------------------

    return 0.0


# ============================================================
# QUANTITY MATCHING
# ============================================================

def calculate_quantity_match_score(
    available_quantity: float,
    required_quantity: float,
) -> float:
    """
    Calculate quantity compatibility.

    Score:
        100 -> enough quantity available
        0-99 -> partial quantity available
    """

    if required_quantity <= 0:
        return 0.0

    if available_quantity <= 0:
        return 0.0

    if available_quantity >= required_quantity:
        return 100.0

    score = (
        available_quantity
        / required_quantity
    ) * 100

    return round(
        min(score, 100.0),
        2,
    )


# ============================================================
# DISTANCE MATCHING
# ============================================================

def calculate_distance_match_score(
    distance_km: float | None,
    max_distance_km: float,
) -> float:
    """
    Calculate location compatibility.

    Score:
        100 -> same location
        0   -> maximum allowed distance

    If coordinates are unavailable, return a neutral score
    instead of automatically rejecting the match.
    """

    if distance_km is None:
        return 50.0

    if max_distance_km <= 0:
        return 0.0

    if distance_km > max_distance_km:
        return 0.0

    score = (
        1
        - (distance_km / max_distance_km)
    ) * 100

    return round(
        max(0.0, min(score, 100.0)),
        2,
    )


# ============================================================
# EXPIRY MATCHING
# ============================================================

def calculate_expiry_match_score(
    expiry_date,
    required_by,
) -> float:
    """
    Calculate expiry compatibility.

    Score:
        100 -> food remains valid through required date
        70  -> expires before required date
        0   -> already expired
    """

    if expiry_date is None:
        return 50.0

    today = date.today()

    if expiry_date < today:
        return 0.0

    if required_by is None:
        return 100.0

    if expiry_date < required_by:
        return 70.0

    return 100.0


# ============================================================
# FINAL MATCH SCORE
# ============================================================

def calculate_final_match_score(
    food_match_score: float,
    quantity_match_score: float,
    distance_match_score: float,
    expiry_match_score: float,
) -> float:
    """
    Calculate final weighted AI matching score.

    Weights:

        Food      -> 40%
        Quantity  -> 25%
        Distance  -> 20%
        Expiry    -> 15%
    """

    final_score = (
        food_match_score * 0.40
        + quantity_match_score * 0.25
        + distance_match_score * 0.20
        + expiry_match_score * 0.15
    )

    return round(
        final_score,
        2,
    )


# ============================================================
# GENERATE MATCHES FOR DONATION
# ============================================================

def generate_matches_for_donation(
    db: Session,
    donation: Donation,
) -> list[DonationMatch]:
    """
    Generate NGO matches for a surplus donation.

    Matching considers:

        1. Food type
        2. Quantity
        3. Location
        4. Expiry date
        5. NGO requirement status
        6. Required-by date
        7. NGO service radius
    """

    # --------------------------------------------------------
    # Basic donation validation
    # --------------------------------------------------------

    if not donation:
        return []

    if donation.donation_status not in {
        "PUBLISHED",
        "ACCEPTED",
        "PICKUP_SCHEDULED",
        "READY_FOR_PICKUP",
    }:
        return []

    remaining_quantity = (
        donation.remaining_quantity
        if donation.remaining_quantity is not None
        else donation.quantity
    )

    if remaining_quantity <= 0:
        return []

    if not donation.inventory:
        return []

    # --------------------------------------------------------
    # Get active NGO requirements
    # --------------------------------------------------------

    requirements = (
        db.query(NGORequirement)
        .filter(
            NGORequirement.status == "ACTIVE",
            NGORequirement.required_by >= date.today(),
        )
        .all()
    )

    matches: list[DonationMatch] = []

    # --------------------------------------------------------
    # Process every requirement
    # --------------------------------------------------------

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
            continue

        # ----------------------------------------------------
        # Food matching
        # ----------------------------------------------------

        food_score = calculate_food_match_score(
            db=db,
            donation=donation,
            requirement=requirement,
        )

        # Completely unrelated food
        if food_score == 0:
            continue

        # ----------------------------------------------------
        # Quantity matching
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
            continue

        # ----------------------------------------------------
        # Distance calculation
        # ----------------------------------------------------

        distance_km = None

        if (
            donation.pickup_latitude is not None
            and donation.pickup_longitude is not None
            and ngo.latitude is not None
            and ngo.longitude is not None
        ):

            distance_km = calculate_distance_km(
                donation.pickup_latitude,
                donation.pickup_longitude,
                ngo.latitude,
                ngo.longitude,
            )

        # ----------------------------------------------------
        # Determine maximum allowed distance
        # ----------------------------------------------------

        max_distance_km = (
            requirement.max_distance_km
            if requirement.max_distance_km is not None
            else (
                ngo.service_radius_km
                if ngo.service_radius_km is not None
                else 25.0
            )
        )

        # ----------------------------------------------------
        # Distance score
        # ----------------------------------------------------

        distance_score = (
            calculate_distance_match_score(
                distance_km=distance_km,
                max_distance_km=max_distance_km,
            )
        )

        # If actual coordinates exist and donation is outside
        # the NGO's maximum distance, reject the match.
        if (
            distance_km is not None
            and distance_km > max_distance_km
        ):
            continue

        # ----------------------------------------------------
        # Expiry matching
        # ----------------------------------------------------

        expiry_score = (
            calculate_expiry_match_score(
                expiry_date=donation.inventory.expiry_date,
                required_by=requirement.required_by,
            )
        )

        if expiry_score == 0:
            continue

        # ----------------------------------------------------
        # Final score
        # ----------------------------------------------------

        final_score = calculate_final_match_score(
            food_match_score=food_score,
            quantity_match_score=quantity_score,
            distance_match_score=distance_score,
            expiry_match_score=expiry_score,
        )

        # ----------------------------------------------------
        # Check whether match already exists
        # ----------------------------------------------------

        existing_match = (
            db.query(DonationMatch)
            .filter(
                DonationMatch.donation_id
                == donation.id,
                DonationMatch.requirement_id
                == requirement.id,
            )
            .first()
        )

        if existing_match:

            existing_match.ngo_id = ngo.id
            existing_match.food_match_score = food_score
            existing_match.quantity_match_score = (
                quantity_score
            )
            existing_match.distance_km = distance_km
            existing_match.distance_match_score = (
                distance_score
            )
            existing_match.expiry_match_score = (
                expiry_score
            )
            existing_match.match_score = final_score

            matches.append(existing_match)

            continue

        # ----------------------------------------------------
        # Create new match
        # ----------------------------------------------------

        match = DonationMatch(
            donation_id=donation.id,
            requirement_id=requirement.id,
            ngo_id=ngo.id,
            food_match_score=food_score,
            quantity_match_score=quantity_score,
            distance_km=distance_km,
            distance_match_score=distance_score,
            expiry_match_score=expiry_score,
            match_score=final_score,
            status="SUGGESTED",
        )

        db.add(match)

        matches.append(match)

    # --------------------------------------------------------
    # Save matches
    # --------------------------------------------------------

    db.commit()

    # Refresh newly created/updated objects
    for match in matches:
        db.refresh(match)

    # --------------------------------------------------------
    # Sort highest match first
    # --------------------------------------------------------

    matches.sort(
        key=lambda item: item.match_score or 0,
        reverse=True,
    )

    return matches