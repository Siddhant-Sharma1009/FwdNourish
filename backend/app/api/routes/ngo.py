from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_tenant

from app.models.ngo import NGO
from app.models.ngo_requirement import NGORequirement
from app.models.user import User

from app.schemas.ngo import NGOOptionResponse


router = APIRouter(
    prefix="/api/v1/ngos",
    tags=["NGOs"],
)


@router.get(
    "/available",
    response_model=list[NGOOptionResponse],
)
def get_available_ngos(
    db: Session = Depends(get_db),
    user: User = Depends(require_tenant),
):
    """
    Return all active registered NGOs with their active
    food requirements.

    Used by businesses when manually selecting an NGO.
    """

    ngos = (
        db.query(NGO)
        .join(
            User,
            NGO.user_id == User.id,
        )
        .filter(
            User.role == "NGO",
            User.status == "ACTIVE",
        )
        .order_by(
            NGO.organization_name.asc()
        )
        .all()
    )

    result = []

    for ngo in ngos:

        requirements = (
            db.query(NGORequirement)
            .filter(
                NGORequirement.ngo_id == ngo.id,
                NGORequirement.status == "ACTIVE",
                NGORequirement.required_by >= date.today(),
            )
            .order_by(
                NGORequirement.required_by.asc()
            )
            .all()
        )

        result.append(
            {
                "id": ngo.id,
                "user_id": ngo.user_id,

                "organization_name": ngo.organization_name,
                "registration_number": ngo.registration_number,

                "full_name": (
                    ngo.user.full_name
                    if getattr(ngo, "user", None)
                    else ""
                ),

                "phone": (
                    ngo.user.phone
                    if getattr(ngo, "user", None)
                    else ""
                ),

                "address": ngo.address,
                "city": ngo.city,
                "state": ngo.state,
                "pincode": ngo.pincode,

                "latitude": ngo.latitude,
                "longitude": ngo.longitude,

                "service_radius_km": ngo.service_radius_km,

                "description": ngo.description,

                "requirements": requirements,
            }
        )

    return result