"""Worker configuration and settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class WorkerSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENV: str = "development"
    LOG_LEVEL: str = "INFO"

    DATABASE_URL: str = "postgresql+asyncpg://openocr:openocr_secure_pass@localhost:5432/openocr"
    DATABASE_URL_SYNC: str = (
        "postgresql+psycopg2://openocr:openocr_secure_pass@localhost:5432/openocr"
    )

    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_URL: str = "redis://localhost:6379/0"

    STORAGE_ENDPOINT: str = "http://localhost:9000"
    STORAGE_ACCESS_KEY: str = "minioadmin"
    STORAGE_SECRET_KEY: str = "minioadmin"
    STORAGE_BUCKET: str = "documents"
    STORAGE_REGION: str = "us-east-1"
    STORAGE_USE_SSL: bool = False

    PARSE_ENGINE_PRIMARY: str = "docling"
    PARSE_ENGINE_FALLBACK: str = "paddleocr"

    LLM_PROVIDER: str = "gemini"
    GEMINI_API_KEY: str = ""


worker_settings = WorkerSettings()
