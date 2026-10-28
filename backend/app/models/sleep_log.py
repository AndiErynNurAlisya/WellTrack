import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, String, Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User


class SleepLog(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "sleep_logs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    sleep_date: Mapped[date] = mapped_column(Date)
    sleep_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    sleep_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    duration_minutes: Mapped[int] = mapped_column(Integer)
    quality: Mapped[str | None] = mapped_column(String(20))
    notes: Mapped[str | None] = mapped_column(Text)

    user: Mapped["User"] = relationship(back_populates="sleep_logs")

    __table_args__ = (
        CheckConstraint("sleep_end > sleep_start", name="end_after_start"),
        CheckConstraint("duration_minutes > 0", name="duration_positive"),
        Index("idx_sleep_logs_user_date", "user_id", "sleep_date"),
    )