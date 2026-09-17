from datetime import datetime, timezone
from sqlalchemy import (String,Float,DateTime,ForeignKey)
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

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

    sale_id: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        index=True
    )

    transaction_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    quantity: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    note: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )