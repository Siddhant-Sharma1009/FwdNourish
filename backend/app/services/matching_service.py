from math import atan2, cos, radians, sin, sqrt
from difflib import SequenceMatcher

from sqlalchemy.orm import Session

from app.models.redistribution import (
    SurplusListing,
    NGORequirement,
)


def haversine_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """
    Calculate distance between two geographic coordinates
    using the Haversine formula.

    Returns:
        Distance in kilometers.
    """

    earth_radius = 6371.0

    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)

    a = (
        sin(d_lat / 2) ** 2
        + cos(radians(lat1))
        * cos(radians(lat2))
        * sin(d_lon / 2) ** 2
    )

    c = 2 * atan2(
        sqrt(a),
        sqrt(1 - a),
    )

    return earth_radius * c


def food_similarity(
    food1: str,
    food2: str,
) -> float:
    """
    Calculate similarity between two food types.

    Examples:
        Cooked Food vs Cooked Food -> 1.0
        Rice vs Rice -> 1.0
        Cooked Rice vs Rice -> high similarity
    """

    a = food1.lower().strip()
    b = food2.lower().strip()

    if not a or not b:
        return 0.0

    if a == b:
        return 1.0

    sequence_score = SequenceMatcher(
        None,
        a,
        b,
    ).ratio()

    tokens_a = set(a.split())
    tokens_b = set(b.split())

    if tokens_a and tokens_b:

        union = tokens_a | tokens_b
        intersection = tokens_a & tokens_b

        token_score = (
            len(intersection) / len(union)
            if union
            else 0.0
        )

    else:
        token_score = 0.0

    return max(
        sequence_score,
        token_score,
    )


def quantity_score(
    available_quantity: float,
    required_quantity: float,
) -> float:
    """
    Calculate compatibility between available
    and required quantity.

    Returns a value between 0 and 1.
    """

    if (
        available_quantity <= 0
        or required_quantity <= 0
    ):
        return 0.0

    if available_quantity >= required_quantity:
        return 1.0

    return available_quantity / required_quantity


def location_score(
    distance_km: float,
    maximum_distance_km: float = 50.0,
) -> float:
    """
    Convert geographic distance into a score between 0 and 1.

    0 km       -> 1.0
    25 km      -> 0.5
    50+ km     -> 0.0
    """

    if distance_km >= maximum_distance_km:
        return 0.0

    return max(
        0.0,
        1.0 - (
            distance_km
            / maximum_distance_km
        ),
    )


def calculate_match_score(
    listing: SurplusListing,
    requirement: NGORequirement,
) -> tuple[float, float]:
    """
    Calculate the overall NGO matching score.

    Weighting:

        Food type  = 50%
        Quantity   = 30%
        Location   = 20%

    Returns:
        (match_score, distance_km)
    """

    distance = haversine_distance(
        listing.latitude,
        listing.longitude,
        requirement.latitude,
        requirement.longitude,
    )

    food_score = food_similarity(
        listing.food_type,
        requirement.food_type,
    )

    qty_score = quantity_score(
        listing.quantity,
        requirement.required_quantity,
    )

    distance_score = location_score(
        distance,
        maximum_distance_km=50.0,
    )

    final_score = (
        food_score * 0.50
        + qty_score * 0.30
        + distance_score * 0.20
    )

    return (
        round(final_score * 100, 2),
        round(distance, 2),
    )


def find_matches(
    db: Session,
    listing: SurplusListing,
    limit: int = 10,
):
    """
    Find the best NGO requirements for a surplus listing.

    Only active NGO requirements are considered.
    """

    requirements = (
        db.query(NGORequirement)
        .filter(
            NGORequirement.active.is_(True)
        )
        .all()
    )

    results = []

    for requirement in requirements:

        score, distance = calculate_match_score(
            listing,
            requirement,
        )

        # Ignore very weak matches.
        if score < 35:
            continue

        quantity_matched = min(
            listing.quantity,
            requirement.required_quantity,
        )

        results.append(
            {
                "requirement": requirement,
                "score": score,
                "distance": distance,
                "quantity_matched": quantity_matched,
            }
        )

    results.sort(
        key=lambda item: item["score"],
        reverse=True,
    )

    return results[:limit]