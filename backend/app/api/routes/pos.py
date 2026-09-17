from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.pos import (
    POSSaleRequest,
    POSPurchaseRequest,
    POSResponse
)
from app.services.pos_service import (
    process_sale,
    process_purchase
)


router = APIRouter(
    prefix="/api/v1/pos",
    tags=["POS Integration"]
)


@router.post(
    "/sale",
    response_model=POSResponse
)
def pos_sale(
    data: POSSaleRequest,
    db: Session = Depends(get_db)
):
    inventory, transaction = process_sale(
        tenant_id=data.tenant_id,
        sku=data.sku,
        quantity=data.quantity,
        reference_id=data.reference_id,
        db=db
    )

    return POSResponse(
        message="POS sale processed successfully",
        sku=inventory.sku,
        quantity_changed=data.quantity,
        remaining_quantity=inventory.quantity,
        transaction_id=transaction.id,
        reference_id=data.reference_id
    )


@router.post(
    "/purchase",
    response_model=POSResponse
)
def pos_purchase(
    data: POSPurchaseRequest,
    db: Session = Depends(get_db)
):
    inventory, transaction = process_purchase(
        tenant_id=data.tenant_id,
        sku=data.sku,
        quantity=data.quantity,
        reference_id=data.reference_id,
        db=db
    )

    return POSResponse(
        message="POS purchase processed successfully",
        sku=inventory.sku,
        quantity_changed=data.quantity,
        remaining_quantity=inventory.quantity,
        transaction_id=transaction.id,
        reference_id=data.reference_id
    )