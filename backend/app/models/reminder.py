import uuid
from datetime import time
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, String, Time, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User


class Reminder(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "reminders"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    reminder_type: Mapped[str] = mapped_column(String(20))
    reminder_time: Mapped[time] = mapped_column(Time)
    frequency: Mapped[str] = mapped_column(String(20))
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=text("true")
    )

    user: Mapped["User"] = relationship(back_populates="reminders")

    __table_args__ = (
        CheckConstraint(
            "reminder_type IN ('aktivitas', 'air', 'tidur', 'target')",
            name="reminder_type_valid",
        ),
        Index("idx_reminders_user_active", "user_id", "is_active"),
    )