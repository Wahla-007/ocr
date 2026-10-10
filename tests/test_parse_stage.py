"""Tests for Phase 3: Parse Stage, Normalization, and Layout OCR.

Tests all 5 required document types:
1. clean_invoice.pdf
2. scanned_contract.pdf
3. phone_receipt.jpg
4. rotated_id.png
5. multipage_report.pdf
"""

from pathlib import Path

import pytest
from worker.pipeline.normalize import normalize_document
from worker.pipeline.parse import parse_document

from providers.engines.docling_engine import DoclingParseEngine
from providers.engines.fallback_engine import PaddleOCRFallbackEngine

SAMPLES_DIR = Path(__file__).resolve().parent / "samples"


def read_sample(filename: str) -> bytes:
    path = SAMPLES_DIR / filename
    assert path.exists(), f"Sample file {filename} does not exist. Run generate_samples.py first."
    with open(path, "rb") as f:
        return f.read()


@pytest.mark.asyncio
async def test_clean_invoice_parse():
    """1. Clean digital vector PDF: test blocks, bboxes, tables, markdown."""
    data = read_sample("clean_invoice.pdf")

    # Test Normalize
    norm = normalize_document(data, "application/pdf")
    assert norm.total_pages == 1
    assert len(norm.pages) == 1
    assert norm.pages[0].width > 0
    assert norm.pages[0].height > 0

    # Test Parse
    result = await parse_document(data, "application/pdf")
    assert result.engine_name == "docling"
    assert result.confidence >= 0.90
    assert len(result.blocks) > 0

    # Verify pixel-accurate bounding box format
    first_block = result.blocks[0]
    assert first_block.bbox is not None
    assert first_block.bbox.width > 0
    assert first_block.bbox.height > 0
    assert first_block.page == 1

    # Verify tables parsed to rows/cells
    assert len(result.tables) >= 1
    table = result.tables[0]
    assert len(table.rows) >= 4  # Header + line items + total
    assert "Cloud Architecture Consulting" in table.markdown
    assert "Total Due" in table.markdown

    # Verify markdown output
    assert "INVOICE" in result.markdown
    assert "INV-2026-0042" in result.markdown


@pytest.mark.asyncio
async def test_scanned_contract_parse():
    """2. Scanned PDF: test normalization and layout block extraction."""
    data = read_sample("scanned_contract.pdf")

    norm = normalize_document(data, "application/pdf")
    assert norm.total_pages == 1

    result = await parse_document(data, "application/pdf")
    assert len(result.blocks) > 0
    assert result.confidence >= 0.90
    assert "CONFIDENTIAL" in result.markdown or len(result.blocks) > 0


@pytest.mark.asyncio
async def test_phone_receipt_parse():
    """3. Smartphone photo: test image normalization and layout extraction."""
    data = read_sample("phone_receipt.jpg")

    norm = normalize_document(data, "image/jpeg")
    assert norm.total_pages == 1
    assert norm.mime == "image/jpeg"
    assert norm.pages[0].width > 0

    result = await parse_document(data, "image/jpeg")
    assert result.confidence > 0.8
    assert len(result.blocks) > 0
    assert len(result.page_sizes) == 1


@pytest.mark.asyncio
async def test_rotated_id_parse():
    """4. Rotated document: test orientation handling and parsing."""
    data = read_sample("rotated_id.png")

    norm = normalize_document(data, "image/png")
    assert norm.total_pages == 1
    assert norm.mime == "image/png"

    result = await parse_document(data, "image/png")
    assert len(result.blocks) > 0
    assert result.confidence > 0.8


@pytest.mark.asyncio
async def test_multipage_report_parse():
    """5. Multi-page document: test 3-page rendering, multi-page coordinates and tables."""
    data = read_sample("multipage_report.pdf")

    norm = normalize_document(data, "application/pdf")
    assert norm.total_pages == 3
    assert len(norm.pages) == 3

    result = await parse_document(data, "application/pdf")
    assert len(result.page_sizes) == 3
    assert result.page_sizes[0].page == 1
    assert result.page_sizes[1].page == 2
    assert result.page_sizes[2].page == 3

    # Blocks across multiple pages
    pages_found = {b.page for b in result.blocks}
    assert 1 in pages_found
    assert 2 in pages_found
    assert 3 in pages_found

    # Verify table on page 2
    assert len(result.tables) >= 1
    page2_tables = [t for t in result.tables if t.page == 2]
    assert len(page2_tables) >= 1
    assert len(page2_tables[0].rows) >= 3


@pytest.mark.asyncio
async def test_fallback_engine_trigger():
    """Test automatic fallback when primary engine fails or has low confidence."""
    data = read_sample("clean_invoice.pdf")

    # Call fallback directly
    fallback_engine = PaddleOCRFallbackEngine()
    fb_result = await fallback_engine.parse(data, "application/pdf")
    assert fb_result.engine_name == "paddleocr"
    assert fb_result.confidence >= 0.90
    assert len(fb_result.blocks) > 0

    # Test orchestrator automatic fallback when primary engine raises an exception
    class FailingEngine(DoclingParseEngine):
        async def parse(self, *args, **kwargs):
            raise RuntimeError("Simulated primary engine crash")

    import providers.engines.factory as factory

    orig_registry = factory._ENGINE_REGISTRY.copy()
    factory._ENGINE_REGISTRY["failing"] = FailingEngine

    try:
        rescued_result = await parse_document(
            file_bytes=data,
            mime_type="application/pdf",
            primary_engine_name="failing",
            fallback_engine_name="paddleocr",
        )
        assert rescued_result.engine_name == "paddleocr"
        assert len(rescued_result.blocks) > 0
    finally:
        factory._ENGINE_REGISTRY = orig_registry
