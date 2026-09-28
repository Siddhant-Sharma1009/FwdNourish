from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    DATABASE_URL: str

    SECRET_KEY: str = "CHANGE_THIS_SECRET_KEY_IN_ENV"

    JWT_ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8

    CORS_ORIGINS: str = "http://localhost:5173"

    ENABLE_SCHEDULER: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    @property
    def database_url(self) -> str:
        url = self.DATABASE_URL

        # Render PostgreSQL URL → SQLAlchemy psycopg2 driver
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