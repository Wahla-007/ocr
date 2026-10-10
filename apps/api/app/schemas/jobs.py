"""Pydantic schemas for document upload, extraction, and job responses.

Conforms strictly to Section 5 stable API contract.
"""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# ------------------------------------------------------------------------------
# Signed Upload Schemas
# ------------------------------------------------------------------------------
class SignUploadRequest(BaseModel):
    filename: str = Field(..., description="Original name of the file")
    mime: str = Field(..., description="MIME type of document (PDF, PNG, JPG, WEBP)")
    size_bytes: int = Field(..., description="File size in bytes")


class SignUploadResponse(BaseModel):
    upload_url: str = Field(..., description="Direct pre-signed PUT URL to object storage")
    file_key: str = Field(..., description="Storage key to use with POST /v1/extract")
    expires_in: int = Field(..., description="URL validity duration in seconds")


# ------------------------------------------------------------------------------
# Extract Request Schemas
# ------------------------------------------------------------------------------
class ExtractUrlRequest(BaseModel):
    url: str | None = Field(None, description="Publicly accessible URL to document")
    file_key: str | None = Field(None, description="Key obtained from POST /v1/uploads/sign")
    hint: str | None = Field(
        None,
        description="Optional processing hint (never required, never shown as a selector in UI)",
    )


# ------------------------------------------------------------------------------
# Stable Response Shapes (Section 5)
# ------------------------------------------------------------------------------
class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class ExtractedField(BaseModel):
    key: str
    label: str
    value: Any
    confidence: float
    page: int | None = 1
    bbox: BoundingBox | None = None


class Block(BaseModel):
    type: str
    text: str
    page: int
    confidence: float
    bbox: BoundingBox | None = None


class Table(BaseModel):
    page: int
    rows: list[list[str]]
    markdown: str


class PageSize(BaseModel):
    page: int
    width: float
    height: float


class Versions(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    engine: str
    schema_version: str = Field(..., alias="schema")
    prompt: str


class JobCreatedResponse(BaseModel):
    id: str
    status: str = "queued"


class JobResponse(BaseModel):
    id: str
    status: str  # queued | processing | done | failed
    pages: int = 1
    doc_type: str | None = None
    doc_type_confidence: float | None = None
    confidence: float | None = None
    fields: list[ExtractedField] | None = None
    summary: str | None = None
    blocks: list[Block] | None = None
    tables: list[Table] | None = None
    markdown: str | None = None
    text: str | None = None
    page_sizes: list[PageSize] | None = None
    versions: Versions | None = None
    cached: bool = False
    credits_charged: int = 0
    error_code: str | None = None
    latency_ms: int | None = None
    created_at: str | None = None
    completed_at: str | None = None
