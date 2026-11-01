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

    # Vision & OmniRoute Provider Settings
    PROVIDER: str = "omniroute"  # 'omniroute' | 'ollama'
    OMNIROUTE_BASE_URL: str = "http://127.0.0.1:20128/v1"
    OMNIROUTE_API_KEY: str = "sk-openocr-worker-live-2026"
    OMNIROUTE_MODEL_CHAIN: str = "gemini/gemini-2.5-flash,gemini/gemini-2.5-pro,auto"
    VISION_MAX_PAGES_PER_CHUNK: int = 6
    EXTRACTION_MODE: str = "two_step"  # 'two_step' | 'single'
    PROMPT_VERSION: str = "v1"

    # Air-Gapped / Ollama Local Vision Settings
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434/v1"
    OLLAMA_MODEL: str = "qwen2.5vl"


worker_settings = WorkerSettings()
