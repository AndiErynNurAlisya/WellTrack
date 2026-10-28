import uuid
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint, Date, ForeignKey, Index, Numeric, String, Text, text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.target_template import TargetTemplate
    from app.models.user import User


class Target(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "targets"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("target_templates.id", ondelete="SET NULL")
    )
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(20))
    target_value: Mapped[Decimal] = mapped_column(Numeric(8, 2))
    unit: Mapped[str] = mapped_column(String(20))
    frequency: Mapped[str] = mapped_column(String(20))
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(
        String(20), default="draft", server_default=text("'draft'")
    )

    user: Mapped["User"] = relationship(back_populates="targets")
    template: Mapped["TargetTemplate | None"] = relationship(
        back_populates="targets"
    )

    __table_args__ = (
        CheckConstraint(
            "category IN ('aktivitas', 'air', 'tidur')", name="category_valid"
        ),
        CheckConstraint("target_value > 0", name="target_value_positive"),
        CheckConstraint(
            "frequency IN ('harian', 'mingguan')", name="frequency_valid"
        ),
        CheckConstraint(
            "status IN ('draft', 'aktif', 'selesai', 'dibatalkan', 'terlewat')",
            name="status_valid",
        ),
        CheckConstraint("end_date >= start_date", name="end_after_start"),
        Index("idx_targets_user_status", "user_id", "status"),
    )