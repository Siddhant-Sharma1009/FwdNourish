from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DonationMatch(Base):
    __tablename__ = "donation_matches"

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

    requirement_id: Mapped[int] = mapped_column(
        ForeignKey("ngo_requirements.id"),
        nullable=False,
        index=True,
    )

    ngo_id: Mapped[int] = mapped_column(
        ForeignKey("ngos.id"),
        nullable=False,
        index=True,
    )

    food_match_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0,
    )

    quantity_match_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0,
    )

    distance_km: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    distance_match_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0,
    )

    expiry_match_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0,
    )

    match_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="SUGGESTED",
        index=True,
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