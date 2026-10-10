"""Base provider interfaces for vendor isolation.

Rule 4: All OCR and LLM vendors sit behind interfaces (ParseEngine, LLMProvider)
inside /providers. No vendor SDK may be imported anywhere else.
"""

from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    x: float = Field(..., description="Top-left X coordinate in pixels")
    y: float = Field(..., description="Top-left Y coordinate in pixels")
    width: float = Field(..., description="Box width in pixels")
    height: float = Field(..., description="Box height in pixels")


class PageSize(BaseModel):
    page: int
    width: float
    height: float


class ParsedBlock(BaseModel):
    type: str = Field(..., description="Block type (paragraph, title, table, header, footer, etc.)")
    text: str
    page: int
    confidence: float
    bbox: BoundingBox | None = None


class ParsedTable(BaseModel):
    page: int
    rows: list[list[str]]
    markdown: str
    bbox: BoundingBox | None = None


class ParseResult(BaseModel):
    blocks: list[ParsedBlock]
    tables: list[ParsedTable]
    markdown: str
    page_sizes: list[PageSize]
    confidence: float
    engine_name: str
    engine_version: str


class ParseEngine(ABC):
    """Abstract interface for document layout and OCR parsing."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the engine (e.g., 'docling', 'paddleocr')."""
        pass

    @property
    @abstractmethod
    def version(self) -> str:
        """Engine version string."""
        pass

    @abstractmethod
    async def parse(self, file_path_or_bytes: Any, mime_type: str) -> ParseResult:
        """Parse document into structured blocks, tables, and markdown."""
        pass


class ClassificationResult(BaseModel):
    doc_type: str
    confidence: float
    reasoning: str | None = None


class ExtractedField(BaseModel):
    key: str
    label: str
    value: Any
    confidence: float
    page: int | None = None
    bbox: BoundingBox | None = None


class ExtractionResult(BaseModel):
    doc_type: str
    doc_type_confidence: float
    overall_confidence: float
    fields: list[ExtractedField]
    summary: str
    provider_name: str
    model_name: str
    prompt_version: str


class LLMProvider(ABC):
    """Abstract interface for LLM operations (classification and extraction)."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Provider name (e.g., 'gemini', 'anthropic', 'openai')."""
        pass

    @abstractmethod
    async def classify(
        self,
        compact_text: str,
        first_page_image_bytes: bytes | None = None,
        prompt_template: str | None = None,
    ) -> ClassificationResult:
        """Classify document type using parsed text with prompt injection defense."""
        pass

    @abstractmethod
    async def extract(
        self,
        doc_type: str,
        parsed_text: str,
        schema_definition: dict[str, Any],
        prompt_template: str,
    ) -> ExtractionResult:
        """Extract structured fields adhering to schema definition."""
        pass
