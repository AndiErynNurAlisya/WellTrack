from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user_badge import UserBadge


class Badge(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "badges"

    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    criteria_type: Mapped[str] = mapped_column(String(30))
    criteria_value: Mapped[int] = mapped_column(Integer)
    icon_url: Mapped[str | None] = mapped_column(String(255))

    user_badges: Mapped[list["UserBadge"]] = relationship(
        back_populates="badge", cascade="all, delete-orphan", passive_deletes=True
    )

    __table_args__ = (
        CheckConstraint(
            "criteria_type IN ('streak', 'total_logs', 'target_completed')",
            name="criteria_type_valid",
        ),
        CheckConstraint("criteria_value > 0", name="criteria_value_positive"),
    )