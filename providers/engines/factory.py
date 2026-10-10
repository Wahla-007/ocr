"""Parse engine factory for vendor isolation.

Rule 4: Switching vendors must be an env/config change.
"""

from providers.base import ParseEngine
from providers.engines.docling_engine import DoclingParseEngine
from providers.engines.fallback_engine import PaddleOCRFallbackEngine

_ENGINE_REGISTRY: dict[str, type[ParseEngine]] = {
    "docling": DoclingParseEngine,
    "paddleocr": PaddleOCRFallbackEngine,
    "fallback": PaddleOCRFallbackEngine,
}


def get_parse_engine(engine_name: str = "docling") -> ParseEngine:
    """Instantiates a ParseEngine implementation by name."""
    normalized = engine_name.lower().strip()
    engine_cls = _ENGINE_REGISTRY.get(normalized)
    if not engine_cls:
        # Default to docling if unknown name
        engine_cls = DoclingParseEngine
    return engine_cls()
