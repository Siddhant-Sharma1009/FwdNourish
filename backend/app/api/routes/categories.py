from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.category import Category
from app.schemas.category import (
    CategoryCreate,
    CategoryResponse
)


router = APIRouter(
    prefix="/api/v1/categories",
    tags=["Categories"]
)


VALID_RISKS = {
    "LOW",
    "MEDIUM",
    "HIGH"
}


VALID_STORAGE_TYPES = {
    "DRY_STORAGE",
    "REFRIGERATED",
    "FROZEN",
    "ROOM_TEMPERATURE"
}


@router.post(
    "/",
    response_model=CategoryResponse,
    status_code=201
)
def create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db)
):
    risk = category_data.perishability_risk.upper()
    storage = category_data.storage_requirement.upper()

    if risk not in VALID_RISKS:
        raise HTTPException(
            status_code=400,
            detail="Invalid perishability risk"
        )

    if storage not in VALID_STORAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid storage requirement"
        )

    existing = db.query(Category).filter(
        Category.name == category_data.name
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Category already exists"
        )

    category = Category(
        name=category_data.name,
        perishability_risk=risk,
        storage_requirement=storage
    )

    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.get(
    "/",
    response_model=list[CategoryResponse]
)
def get_categories(
    db: Session = Depends(get_db)
):

    return db.query(Category).order_by(
        Category.name
    ).all()


@router.get(
    "/{category_id}",
    response_model=CategoryResponse
)
def get_category(
    category_id: int,
    db: Session = Depends(get_db)
):

    category = db.query(Category).filter(
        Category.id == category_id
    ).first()

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    return category