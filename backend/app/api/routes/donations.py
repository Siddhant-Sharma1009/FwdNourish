from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.transaction import Transaction
from app.core.database import get_db
from app.models.donation import Donation
from app.models.inventory import Inventory
from app.schemas.donation import (
    DonationCreate,
    DonationResponse
)


router = APIRouter(
    prefix="/api/v1/donations",
    tags=["Donations"]
)


@router.post(
    "/",
    response_model=DonationResponse,
    status_code=201
)
def create_donation(
    data: DonationCreate,
    db: Session = Depends(get_db)
):

    inventory = db.query(Inventory).filter(
        Inventory.id == data.inventory_id,
        Inventory.tenant_id == data.tenant_id
    ).first()

    if not inventory:
        raise HTTPException(
            status_code=404,
            detail="Inventory item not found"
        )

    if inventory.quantity < data.quantity:
        raise HTTPException(
            status_code=400,
            detail="Insufficient inventory for donation"
        )

    inventory.quantity -= data.quantity

    donation = Donation(
        tenant_id=data.tenant_id,
        inventory_id=data.inventory_id,
        quantity=data.quantity,
        recipient_name=data.recipient_name,
        donation_status="COMPLETED",
        note=data.note,
        donated_at=datetime.utcnow()
    )

    db.add(donation)

    transaction = Transaction(
    tenant_id=data.tenant_id,
    inventory_id=data.inventory_id,
    transaction_type="DONATION",
    quantity=data.quantity,
    note=f"Donation to {data.recipient_name}"
    if data.recipient_name
    else "Food donation"
)

    db.add(transaction)
    
    db.commit()
    db.refresh(donation)

    return donation


@router.get(
    "/",
    response_model=list[DonationResponse]
)
def get_donations(
    tenant_id: int,
    db: Session = Depends(get_db)
):

    return db.query(Donation).filter(
        Donation.tenant_id == tenant_id
    ).order_by(
        Donation.created_at.desc()
    ).all()