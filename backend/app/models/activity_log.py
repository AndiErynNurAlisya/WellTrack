import uuid
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Date, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User


class ActivityLog(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "activity_logs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    activity_type: Mapped[str] = mapped_column(String(100))
    activity_date: Mapped[date] = mapped_column(Date)
    duration_minutes: Mapped[int] = mapped_column(Integer)
    intensity: Mapped[str] = mapped_column(String(20))
    notes: Mapped[str | None] = mapped_column(Text)

    user: Mapped["User"] = relationship(back_populates="activity_logs")

    __table_args__ = (
        CheckConstraint("duration_minutes > 0", name="duration_positive"),
        CheckConstraint(
            "intensity IN ('rendah', 'sedang', 'tinggi')", name="intensity_valid"
        ),
        Index("idx_activity_logs_user_date", "user_id", "activity_date"),
    )