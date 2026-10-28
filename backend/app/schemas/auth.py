from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.schemas.common import ShortText


def _check_password_bytes(v: str) -> str:
    if len(v.encode("utf-8")) > 72:
        raise ValueError("Kata sandi maksimal 72 byte.")
    return v


class RegisterRequest(BaseModel):
    name: ShortText
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    confirm_password: str

    @field_validator("email")
    @classmethod
    def lowercase_email(cls, v: str) -> str:
        return v.lower()

    @field_validator("password")
    @classmethod
    def password_bytes(cls, v: str) -> str:
        return _check_password_bytes(v)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Konfirmasi kata sandi tidak sama.")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)

    @field_validator("email")
    @classmethod
    def lowercase_email(cls, v: str) -> str:
        return v.lower()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


Token = TokenResponse


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(min_length=1, max_length=72)
    new_password: str = Field(min_length=8, max_length=72)
    confirm_new_password: str

    @field_validator("new_password")
    @classmethod
    def password_bytes(cls, v: str) -> str:
        return _check_password_bytes(v)

    @model_validator(mode="after")
    def validate_passwords(self):
        if self.new_password != self.confirm_new_password:
            raise ValueError("Konfirmasi kata sandi baru tidak sama.")
        if self.new_password == self.old_password:
            raise ValueError("Kata sandi baru tidak boleh sama dengan yang lama.")
        return self
