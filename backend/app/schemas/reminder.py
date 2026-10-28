import uuid
from datetime import datetime, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, model_validator

ReminderType = Literal["aktivitas", "air", "tidur", "target"]
ReminderFrequency = Literal["harian", "mingguan"]


class ReminderCreate(BaseModel):
    reminder_type: ReminderType
    reminder_time: time
    frequency: ReminderFrequency = "harian"
    is_active: bool = True


class ReminderUpdate(BaseModel):
    reminder_type: ReminderType | None = None
    reminder_time: time | None = None
    frequency: ReminderFrequency | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def at_least_one_field(self):
        if not self.model_fields_set:
            raise ValueError("Tidak ada data yang diubah.")
        return self


class ReminderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    reminder_type: str
    reminder_time: time
    frequency: str
    is_active: bool
    created_at: datetime
    updated_at: datetime