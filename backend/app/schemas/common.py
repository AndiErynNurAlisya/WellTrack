from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, PlainSerializer, StringConstraints

# Decimal dikirim sebagai angka JSON (bukan string "250.00")
DecimalNum = Annotated[
    Decimal, PlainSerializer(float, return_type=float, when_used="json")
]

ShortText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
]
Notes = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]


class MessageResponse(BaseModel):
    detail: str