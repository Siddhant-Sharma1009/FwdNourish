from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class NGORequirement(Base):
    __tablename__ = "ngo_requirements"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    # NGO that created the requirement
    ngo_id: Mapped[int] = mapped_column(
        ForeignKey("ngos.id"),
        nullable=False,
        index=True
    )

    # Food information
    food_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        index=True
    )

    food_category: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True
    )

    quantity_required: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    unit: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    # NGO wants the food before this date
    required_by: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True
    )

    # Maximum distance NGO is willing to travel
    max_distance_km: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=25
    )

    # Requirement lifecycle
    #
    # ACTIVE
    # FULFILLED
    # CANCELLED
    # EXPIRED
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="ACTIVE",
        index=True
    )

    notes: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )