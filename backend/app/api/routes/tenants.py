from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.tenant import TenantResponse

router = APIRouter(prefix="/api/v1/tenants", tags=["Tenants"])


@router.get("/", response_model=list[TenantResponse])
def get_tenants(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return db.query(Tenant).all()


@router.get("/{tenant_id}", response_model=TenantResponse)
def get_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant
