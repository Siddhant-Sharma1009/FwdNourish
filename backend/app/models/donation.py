from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Donation(Base):

    __tablename__ = "donations"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenants.id"),
        nullable=False,
        index=True
    )

    inventory_id: Mapped[int] = mapped_column(
        ForeignKey("inventory.id"),
        nullable=False,
        index=True
    )

    quantity: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    recipient_name: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    donation_status: Mapped[str] = mapped_column(
        String(30),
        default="PENDING",
        nullable=False
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