from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Pickup(Base):
    __tablename__ = "pickups"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    donation_id: Mapped[int] = mapped_column(
        ForeignKey("donations.id"),
        nullable=False,
        index=True,
    )

    match_id: Mapped[int] = mapped_column(
        ForeignKey("donation_matches.id"),
        nullable=False,
        unique=True,
        index=True,
    )

    ngo_id: Mapped[int] = mapped_column(
        ForeignKey("ngos.id"),
        nullable=False,
        index=True,
    )

    scheduled_start: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
    )

    scheduled_end: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
    )

    pickup_location: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="SCHEDULED",
        index=True,
    )

    ngo_confirmation: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="PENDING",
    )

    business_confirmation: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="PENDING",
    )

    confirmation_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="PENDING",
        index=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )