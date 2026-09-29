from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_ngo

from app.models.ngo import NGO
from app.models.ngo_requirement import NGORequirement
from app.models.user import User

from app.schemas.ngo_requirement import (
    NGORequirementCreate,
    NGORequirementResponse,
)


router = APIRouter(
    prefix="/api/v1/ngo/requirements",
    tags=["NGO Requirements"],
)


@router.post(
    "/",
    response_model=NGORequirementResponse,
    status_code=201,
)
def create_requirement(
    data: NGORequirementCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_ngo),
):
    

    ngo = (
        db.query(NGO)
        .filter(NGO.user_id == user.id)
        .first()
    )

    if not ngo:
        raise HTTPException(
            status_code=404,
            detail="NGO profile not found.",
        )

    if data.required_by < date.today():
        raise HTTPException(
            status_code=400,
            detail="required_by cannot be in the past.",
        )

    requirement = NGORequirement(
        ngo_id=ngo.id,
        food_name=data.food_name.strip(),
        food_category=(
            data.food_category.strip()
            if data.food_category
            else None
        ),
        quantity_required=data.quantity_required,
        unit=data.unit.strip(),
        required_by=data.required_by,
        max_distance_km=data.max_distance_km,
        status="ACTIVE",
        notes=data.notes,
    )

    db.add(requirement)
    db.commit()
    db.refresh(requirement)

    return requirement


@router.get(
    "/",
    response_model=list[NGORequirementResponse],
)
def get_my_requirements(
    db: Session = Depends(get_db),
    user: User = Depends(require_ngo),
):
    

    ngo = (
        db.query(NGO)
        .filter(NGO.user_id == user.id)
        .first()
    )

    if not ngo:
        raise HTTPException(
            status_code=404,
            detail="NGO profile not found.",
        )

    return (
        db.query(NGORequirement)
        .filter(
            NGORequirement.ngo_id == ngo.id
        )
        .order_by(
            NGORequirement.created_at.desc()
        )
        .all()
    )


@router.get(
    "/{requirement_id}",
    response_model=NGORequirementResponse,
)
def get_requirement(
    requirement_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_ngo),
):
    

    ngo = (
        db.query(NGO)
        .filter(NGO.user_id == user.id)
        .first()
    )

    if not ngo:
        raise HTTPException(
            status_code=404,
            detail="NGO profile not found.",
        )

    requirement = (
        db.query(NGORequirement)
        .filter(
            NGORequirement.id == requirement_id,
            NGORequirement.ngo_id == ngo.id,
        )
        .first()
    )

    if not requirement:
        raise HTTPException(
            status_code=404,
            detail="Requirement not found.",
        )

    return requirement


@router.patch(
    "/{requirement_id}/cancel",
    response_model=NGORequirementResponse,
)
def cancel_requirement(
    requirement_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_ngo),
):
    

    ngo = (
        db.query(NGO)
        .filter(NGO.user_id == user.id)
        .first()
    )

    if not ngo:
        raise HTTPException(
            status_code=404,
            detail="NGO profile not found.",
        )

    requirement = (
        db.query(NGORequirement)
        .filter(
            NGORequirement.id == requirement_id,
            NGORequirement.ngo_id == ngo.id,
        )
        .first()
    )

    if not requirement:
        raise HTTPException(
            status_code=404,
            detail="Requirement not found.",
        )

    if requirement.status != "ACTIVE":
        raise HTTPException(
            status_code=400,
            detail="Only active requirements can be cancelled.",
        )

    requirement.status = "CANCELLED"

    db.commit()
    db.refresh(requirement)

    return requirement