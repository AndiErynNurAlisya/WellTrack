import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.common import DecimalNum, Notes, ShortText

Category = Literal["aktivitas", "air", "tidur"]
Frequency = Literal["harian", "mingguan"]
TargetStatus = Literal["draft", "aktif", "selesai", "dibatalkan", "terlewat"]
Difficulty = Literal["mudah", "sedang", "sulit"]

# Faktor ke satuan dasar: menit (aktivitas, tidur) dan ml (air)
UNIT_TO_BASE: dict[str, Decimal] = {
    "menit": Decimal("1"),
    "jam": Decimal("60"),
    "ml": Decimal("1"),
    "l": Decimal("1000"),
    "gelas": Decimal("250"),
}
ALLOWED_UNITS: dict[str, tuple[str, ...]] = {
    "aktivitas": ("menit", "jam"),
    "tidur": ("menit", "jam"),
    "air": ("ml", "l", "gelas"),
}


class TargetTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    category: str
    target_value: DecimalNum
    unit: str
    frequency: str
    difficulty: str


class TargetFromTemplateCreate(BaseModel):
    template_id: uuid.UUID
    start_date: date | None = None  # None = hari ini
    duration_days: int = Field(ge=1, le=365)
    frequency: Frequency | None = None  # None = ikut template


class TargetCreate(BaseModel):
    name: ShortText
    description: Notes | None = None
    category: Category
    target_value: Decimal = Field(gt=0, le=Decimal("999999.99"), decimal_places=2)
    unit: ShortText
    frequency: Frequency
    start_date: date | None = None
    duration_days: int = Field(ge=1, le=365)

    @model_validator(mode="after")
    def check_unit(self):
        unit = self.unit.strip().lower()
        allowed = ALLOWED_UNITS[self.category]
        if unit not in allowed:
            raise ValueError(
                f"Satuan untuk kategori '{self.category}' harus salah satu dari: {', '.join(allowed)}."
            )
        self.unit = unit
        return self


class TargetUpdate(BaseModel):
    name: ShortText | None = None
    description: Notes | None = None
    target_value: Decimal | None = Field(
        default=None, gt=0, le=Decimal("999999.99"), decimal_places=2
    )
    frequency: Frequency | None = None
    end_date: date | None = None

    @model_validator(mode="after")
    def at_least_one_field(self):
        if not self.model_fields_set:
            raise ValueError("Tidak ada data yang diubah.")
        return self


class TargetProgress(BaseModel):
    realized: DecimalNum  # periode berjalan, dalam satuan target
    target_value: DecimalNum
    percentage: float = Field(ge=0, le=100)
    completed: bool  # periode berjalan sudah mencapai target
    periods_met: int
    periods_total: int


class TargetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    template_id: uuid.UUID | None
    name: str
    description: str | None
    category: str
    target_value: DecimalNum
    unit: str
    frequency: str
    start_date: date
    end_date: date
    status: str
    created_at: datetime
    updated_at: datetime
    progress: TargetProgress | None = None