from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenants.id"),
        nullable=False,
        index=True,
    )

    inventory_id: Mapped[int] = mapped_column(
        ForeignKey("inventory.id"),
        nullable=False,
        index=True,
    )

    # Links a DONATION transaction to the exact donation record.
    # NULL for SALE, PURCHASE, WASTE, ADJUSTMENT, etc.
    donation_id: Mapped[int | None] = mapped_column(
        ForeignKey("donations.id"),
        nullable=True,
        index=True,
    )

    sale_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )

    transaction_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )

    quantity: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    note: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )

    # Relationships
    inventory = relationship(
        "Inventory",
        foreign_keys=[inventory_id],
    )

    donation = relationship(
        "Donation",
        foreign_keys=[donation_id],
    )

    tenant = relationship(
        "Tenant",
        foreign_keys=[tenant_id],
    )