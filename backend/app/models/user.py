from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.activity_log import ActivityLog
    from app.models.reminder import Reminder
    from app.models.sleep_log import SleepLog
    from app.models.target import Target
    from app.models.user_badge import UserBadge
    from app.models.water_log import WaterLog


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(150), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    profile_photo_url: Mapped[str | None] = mapped_column(String(255))

    # Data gamifikasi (FR-33/34/37/38)
    total_points: Mapped[int] = mapped_column(
        Integer, default=0, server_default=text("0")
    )
    current_streak: Mapped[int] = mapped_column(
        Integer, default=0, server_default=text("0")
    )
    longest_streak: Mapped[int] = mapped_column(
        Integer, default=0, server_default=text("0")
    )
    last_log_date: Mapped[date | None] = mapped_column(Date)

    activity_logs: Mapped[list["ActivityLog"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    water_logs: Mapped[list["WaterLog"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    sleep_logs: Mapped[list["SleepLog"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    targets: Mapped[list["Target"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    reminders: Mapped[list["Reminder"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    user_badges: Mapped[list["UserBadge"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )