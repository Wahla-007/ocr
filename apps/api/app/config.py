"""Application Configuration and Settings."""

from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class PlanLimits(BaseModel):
    name: str
    credits_per_day: int
    max_file_size_mb: int
    max_pages: int
    max_concurrent: int
    max_api_keys: int
    retention_days: int
    has_webhooks: bool = False
    priority_queue: bool = False


PLAN_CONFIGS: dict[str, PlanLimits] = {
    "anonymous": PlanLimits(
        name="anonymous",
        credits_per_day=500,
        max_file_size_mb=10,
        max_pages=10,
        max_concurrent=1,
        max_api_keys=0,
        retention_days=1,
    ),
    "free": PlanLimits(
        name="free",
        credits_per_day=1000,
        max_file_size_mb=15,
        max_pages=10,
        max_concurrent=1,
        max_api_keys=1,
        retention_days=1,
    ),
    "starter": PlanLimits(
        name="starter",
        credits_per_day=5000,
        max_file_size_mb=25,
        max_pages=50,
        max_concurrent=3,
        max_api_keys=3,
        retention_days=7,
    ),
    "pro": PlanLimits(
        name="pro",
        credits_per_day=25000,
        max_file_size_mb=50,
        max_pages=200,
        max_concurrent=6,
        max_api_keys=10,
        retention_days=14,
        priority_queue=True,
    ),
    "business": PlanLimits(
        name="business",
        credits_per_day=100000,
        max_file_size_mb=100,
        max_pages=500,
        max_concurrent=10,
        max_api_keys=50,
        retention_days=30,
        has_webhooks=True,
        priority_queue=True,
    ),
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENV: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    API_PORT: int = 8000
    API_HOST: str = "0.0.0.0"
    API_SECRET_KEY: str = "change-me-to-a-secure-random-secret-in-production-32-chars-min"
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    POSTGRES_USER: str = "openocr"
    POSTGRES_PASSWORD: str = "openocr_secure_pass"
    POSTGRES_DB: str = "openocr"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = "postgresql+asyncpg://openocr:openocr_secure_pass@localhost:5432/openocr"
    DATABASE_URL_SYNC: str = (
        "postgresql+psycopg2://openocr:openocr_secure_pass@localhost:5432/openocr"
    )

    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_URL: str = "redis://localhost:6379/0"

    STORAGE_ENDPOINT: str = "http://localhost:9000"
    STORAGE_PUBLIC_ENDPOINT: str = "http://localhost:9000"
    STORAGE_ACCESS_KEY: str = "minioadmin"
    STORAGE_SECRET_KEY: str = "minioadmin"
    STORAGE_BUCKET: str = "documents"
    STORAGE_REGION: str = "us-east-1"
    STORAGE_USE_SSL: bool = False

    PARSE_ENGINE_PRIMARY: str = "docling"
    PARSE_ENGINE_FALLBACK: str = "paddleocr"

    LLM_PROVIDER: str = "gemini"
    GEMINI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    SENTRY_DSN: str = ""

    @property
    def is_production(self) -> bool:
        return self.ENV.lower() == "production"

    def get_plan_limits(self, plan_name: str) -> PlanLimits:
        return PLAN_CONFIGS.get(plan_name.lower(), PLAN_CONFIGS["anonymous"])


settings = Settings()
