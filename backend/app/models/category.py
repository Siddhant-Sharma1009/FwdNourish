from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Category(Base):

    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False
    )

    perishability_risk: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    storage_requirement: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )