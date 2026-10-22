
import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url


# Resolve the backend directory:
# FwdNourish/backend/app/core/config.py
# parents[0] = backend/app/core
# parents[1] = backend/app
# parents[2] = backend
BASE_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    DATABASE_URL: str

    SECRET_KEY: str = "CHANGE_THIS_SECRET_KEY_IN_ENV"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8

    FRONTEND_URL: str = "http://localhost:5173"

    CORS_ORIGINS: str = "http://localhost:5173"
    ENABLE_SCHEDULER: bool = True

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        extra="ignore",
    )

    @property
    def database_url(self) -> str:
        url = self.DATABASE_URL

        if url.startswith("postgresql://"):
            url = url.replace(
                "postgresql://",
                "postgresql+psycopg2://",
                1,
            )

        return url

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]


settings = Settings()

try:
    db_url = make_url(settings.DATABASE_URL)

except Exception as e:
    print("DATABASE CONFIG CHECK FAILED:", repr(e))
