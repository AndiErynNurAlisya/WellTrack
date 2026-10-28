import uuid
from datetime import date, time
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint, Date, ForeignKey, Index, Numeric, String, Text, Time, text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User


class WaterLog(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "water_logs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    log_date: Mapped[date] = mapped_column(Date)
    log_time: Mapped[time] = mapped_column(Time)
    amount: Mapped[Decimal] = mapped_column(Numeric(6, 2))
    unit: Mapped[str] = mapped_column(
        String(10), default="ml", server_default=text("'ml'")
    )
    notes: Mapped[str | None] = mapped_column(Text)

    user: Mapped["User"] = relationship(back_populates="water_logs")

    __table_args__ = (
        CheckConstraint("amount > 0", name="amount_positive"),
        Index("idx_water_logs_user_date", "user_id", "log_date"),
    )