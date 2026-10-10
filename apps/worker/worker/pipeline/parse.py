"""Parse Pipeline Stage.

Rule 2 in Section 6:
PARSE: ParseEngine.parse(pages) -> {blocks, tables, markdown, page_sizes, confidence}.
On failure or confidence below the threshold, retry with the fallback engine.
"""

import logging

from app.config import settings

from providers.base import ParseEngine, ParseResult
from providers.engines.factory import get_parse_engine

logger = logging.getLogger("openocr.pipeline.parse")
CONFIDENCE_THRESHOLD = 0.60


async def parse_document(
    file_bytes: bytes,
    mime_type: str,
    primary_engine_name: str | None = None,
    fallback_engine_name: str | None = None,
) -> ParseResult:
    """Parses document using primary engine, with automatic fallback if failed or low confidence."""
    p_name = primary_engine_name or settings.PARSE_ENGINE_PRIMARY
    f_name = fallback_engine_name or settings.PARSE_ENGINE_FALLBACK

    primary_engine: ParseEngine = get_parse_engine(p_name)
    fallback_engine: ParseEngine = get_parse_engine(f_name)

    logger.info(f"Attempting document parse using primary engine '{primary_engine.name}'")
    try:
        result = await primary_engine.parse(file_bytes, mime_type)
        if result.confidence >= CONFIDENCE_THRESHOLD:
            logger.info(f"Primary engine '{primary_engine.name}' confidence: {result.confidence}")
            return result
        else:
            logger.warning(
                f"Primary engine confidence {result.confidence} < {CONFIDENCE_THRESHOLD}. "
                f"Retrying with fallback engine '{fallback_engine.name}'..."
            )
    except Exception as e:
        logger.warning(
            f"Primary engine '{primary_engine.name}' failed: {e}. "
            f"Retrying with fallback engine '{fallback_engine.name}'..."
        )

    # Fallback attempt
    fallback_result = await fallback_engine.parse(file_bytes, mime_type)
    logger.info(
        f"Fallback engine '{fallback_engine.name}' confidence: {fallback_result.confidence}"
    )
    return fallback_result
