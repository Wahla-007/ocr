"""OpenOCR Provider interfaces."""

from providers.base import (
    BoundingBox,
    ClassificationResult,
    ExtractedField,
    ExtractionResult,
    LLMProvider,
    PageSize,
    ParsedBlock,
    ParsedTable,
    ParseEngine,
    ParseResult,
)

__all__ = [
    "BoundingBox",
    "ClassificationResult",
    "ExtractedField",
    "ExtractionResult",
    "LLMProvider",
    "PageSize",
    "ParsedBlock",
    "ParsedTable",
    "ParseEngine",
    "ParseResult",
]
