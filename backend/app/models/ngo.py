from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class NGO(Base):
    __tablename__ = "ngos"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Organization information
    organization_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    registration_number: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    # Location
    address: Mapped[str] = mapped_column(
        String(300),
        nullable=False,
    )

    city: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    state: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    pincode: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        index=True,
    )

    latitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    longitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    # Matching radius
    service_radius_km: Mapped[float] = mapped_column(
        Float,
        default=25,
        nullable=False,
    )

    # Optional organization information
    website: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    instagram: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    facebook: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    linkedin: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    google_maps_link: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    description: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

