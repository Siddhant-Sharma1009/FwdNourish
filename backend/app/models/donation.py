from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Donation(Base):
    __tablename__ = "donations"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    # Business / donor
    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenants.id"),
        nullable=False,
        index=True
    )

    # Source inventory item
    inventory_id: Mapped[int] = mapped_column(
        ForeignKey("inventory.id"),
        nullable=False,
        index=True
    )

    # Total quantity originally published for donation
    quantity: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    # Quantity already committed to an NGO
    committed_quantity: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0
    )

    # Quantity still available for another NGO request
    remaining_quantity: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    # Kept for compatibility with your existing donation system
    recipient_name: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    # Pickup information
    pickup_location: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )

    pickup_latitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    pickup_longitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    # Donation availability window
    available_from: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    available_until: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )


    donation_status: Mapped[str] = mapped_column(
        String(30),
        default="PUBLISHED",
        nullable=False,
        index=True
    )

    note: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    donated_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    
    inventory = relationship("Inventory")