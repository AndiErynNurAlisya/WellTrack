import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.schemas.common import ShortText


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    profile_photo_url: str | None
    total_points: int
    current_streak: int
    longest_streak: int
    last_log_date: date | None
    created_at: datetime


class UserUpdate(BaseModel):
    name: ShortText | None = None
    profile_photo_url: str | None = None

    @field_validator("profile_photo_url")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if len(v) > 255:
            raise ValueError("URL foto maksimal 255 karakter.")
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL foto harus diawali http:// atau https://.")
        return v

    @model_validator(mode="after")
    def at_least_one_field(self):
        if not self.model_fields_set:
            raise ValueError("Tidak ada data yang diubah.")
        if "name" in self.model_fields_set and self.name is None:
            raise ValueError("Nama tidak boleh kosong.")
        return self