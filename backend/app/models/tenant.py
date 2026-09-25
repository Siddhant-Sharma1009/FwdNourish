from datetime import datetime

from sqlalchemy import DateTime, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    business_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    # Mandatory business registration information
    registration_number: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    # Business location
    address: Mapped[str] = mapped_column(
        String(300),
        nullable=False,
    )

    city: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    state: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    pincode: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )

    # Coordinates captured by the frontend location selector
    latitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    longitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    # Optional profile information
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