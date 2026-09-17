from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.tenant import Tenant
from app.schemas.tenant import TenantCreate, TenantResponse


router = APIRouter(
    prefix="/api/v1/tenants",
    tags=["Tenants"]
)


@router.post(
    "/",
    response_model=TenantResponse,
    status_code=201
)
def create_tenant(
    tenant_data: TenantCreate,
    db: Session = Depends(get_db)
):
    tenant = Tenant(
        name=tenant_data.name,
        business_type=tenant_data.business_type
    )

    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    return tenant


@router.get(
    "/",
    response_model=list[TenantResponse]
)
def get_tenants(
    db: Session = Depends(get_db)
):
    return db.query(Tenant).all()


@router.get(
    "/{tenant_id}",
    response_model=TenantResponse
)
def get_tenant(
    tenant_id: int,
    db: Session = Depends(get_db)
):
    tenant = db.query(Tenant).filter(
        Tenant.id == tenant_id
    ).first()

    if not tenant:
        raise HTTPException(
            status_code=404,
            detail="Tenant not found"
        )

    return tenant