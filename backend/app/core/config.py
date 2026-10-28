import sys
from pathlib import Path
from dotenv import load_dotenv

_backend_dir = Path(__file__).resolve().parent.parent.parent
_venv_lib = _backend_dir / ".venv" / "Lib" / "site-packages"
if _venv_lib.exists() and str(_venv_lib) not in sys.path:
    sys.path.insert(0, str(_venv_lib))

_env_file = _backend_dir / ".env"
if _env_file.exists():
    load_dotenv(dotenv_path=_env_file, override=True)
else:
    load_dotenv(".env", override=True)

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_env_file) if _env_file.exists() else ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "WellTrack API"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False

    DATABASE_URL: str
    SECRET_KEY: str = Field(min_length=32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    APP_TIMEZONE: str = "Asia/Jakarta"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    @field_validator("DATABASE_URL")
    @classmethod
    def use_psycopg_driver(cls, v: str) -> str:
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql://", 1)
        if v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+psycopg://", 1)
        return v


settings = Settings()
