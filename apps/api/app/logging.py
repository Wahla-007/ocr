"""Structured JSON logging configuration.

Rule 13: Never log document contents, only metadata (job_id, stage, latency, cost, error_code).
"""

import json
import logging
import sys
from datetime import UTC, datetime
from typing import Any

from app.config import settings


class JSONFormatter(logging.Formatter):
    """Formats log records as single-line JSON objects with metadata."""

    def format(self, record: logging.LogRecord) -> str:
        log_data: dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Safe metadata fields allowed by Rule 13
        safe_keys = [
            "job_id",
            "stage",
            "latency_ms",
            "cost",
            "error_code",
            "request_id",
            "user_id",
            "file_hash",
            "doc_type",
            "pages",
            "engine_version",
            "schema_version",
            "prompt_version",
        ]

        for key in safe_keys:
            if hasattr(record, key):
                log_data[key] = getattr(record, key)

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data)


def setup_logging() -> logging.Logger:
    """Configures structured JSON logging globally."""
    logger = logging.getLogger("openocr")
    logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
    logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    logger.addHandler(handler)
    logger.propagate = False

    # Also route standard uvicorn logs if in production
    logging.getLogger("uvicorn.access").handlers = [handler]
    logging.getLogger("uvicorn.error").handlers = [handler]

    return logger


logger = setup_logging()
