from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from app.core.database import Base


class ExpiryAlert(Base):
    __tablename__ = "expiry_alerts"

    id = Column(Integer, primary_key=True, index=True)

    tenant_id = Column(
        Integer,
        nullable=False,
        index=True
    )

    inventory_id = Column(
        Integer,
        ForeignKey("inventory.id"),
        nullable=False,
        index=True
    )

    status = Column(
        String,
        nullable=False
    )

    days_remaining = Column(
        Integer,
        nullable=False
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    resolved_at = Column(
        DateTime,
        nullable=True
    )