from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.target import Target


class TargetTemplate(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "target_templates"

    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(20))
    target_value: Mapped[Decimal] = mapped_column(Numeric(8, 2))
    unit: Mapped[str] = mapped_column(String(20))
    frequency: Mapped[str] = mapped_column(String(20))
    difficulty: Mapped[str] = mapped_column(String(20))

    targets: Mapped[list["Target"]] = relationship(
        back_populates="template", passive_deletes=True
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
            "difficulty IN ('mudah', 'sedang', 'sulit')", name="difficulty_valid"
        ),
    )