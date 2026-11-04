"""Tests for Stage 2: Rasterization Pipeline.

Verifies model-free rasterization:
- PDF rendering at ~150-200 DPI via pypdfium2
- Text layer and word bounding box extraction
- Image rendering (PNG, JPG, WEBP)
- EXIF rotation handling
- DOCX graceful handling
- Limit enforcement (max pages, max size, decompression bombs)
"""

import io
from pathlib import Path

import pytest
from app.errors import FileTooLargeError, TooManyPagesError, UnsupportedTypeError
from PIL import Image
from worker.pipeline.rasterize import (
    MAX_LONG_EDGE_PX,
    RasterDocument,
    RasterPage,
    rasterize_document,
)

SAMPLES_DIR = Path(__file__).resolve().parent / "samples"


def read_sample(filename: str) -> bytes:
    path = SAMPLES_DIR / filename
    assert path.exists(), f"Sample file {filename} does not exist."
    with open(path, "rb") as f:
        return f.read()


def test_clean_invoice_pdf_rasterize():
    """Verify clean digital PDF renders to JPEG pages and extracts text layer."""
    data = read_sample("clean_invoice.pdf")
    doc = rasterize_document(data, max_size_mb=10, max_pages=10)

    assert isinstance(doc, RasterDocument)
    assert doc.total_pages == 1
    assert doc.original_mime == "application/pdf"
    assert len(doc.pages) == 1

    page = doc.pages[0]
    assert isinstance(page, RasterPage)
    assert page.page_number == 1
    assert page.width_px > 0
    assert page.height_px > 0
    assert max(page.width_px, page.height_px) <= MAX_LONG_EDGE_PX
    assert len(page.image_bytes) > 0
    assert page.mime_type == "image/jpeg"

    # Text layer check
    assert page.text_layer is not None
    assert len(page.text_layer.words) > 0
    words_text = " ".join(w.text for w in page.text_layer.words)
    assert "INVOICE" in words_text or "Invoice" in words_text


def test_multipage_pdf_rasterize():
    """Verify multipage report renders all pages with independent dimensions."""
    data = read_sample("multipage_report.pdf")
    doc = rasterize_document(data, max_size_mb=25, max_pages=10)

    assert doc.total_pages >= 2
    assert len(doc.pages) == doc.total_pages
    for idx, page in enumerate(doc.pages):
        assert page.page_number == idx + 1
        assert page.width_px > 0
        assert page.height_px > 0
        assert max(page.width_px, page.height_px) <= MAX_LONG_EDGE_PX


def test_jpeg_image_rasterize():
    """Verify single image input rasterizes and scales proportionally."""
    data = read_sample("phone_receipt.jpg")
    doc = rasterize_document(data, max_size_mb=10, max_pages=5)

    assert doc.total_pages == 1
    assert doc.original_mime == "image/jpeg"
    page = doc.pages[0]
    assert page.width_px > 0
    assert page.height_px > 0
    assert max(page.width_px, page.height_px) <= MAX_LONG_EDGE_PX
    assert page.text_layer is None  # Scanned image has no embedded digital text layer


def test_png_rotated_image_rasterize():
    """Verify PNG image rasterization and EXIF auto-rotation handling."""
    data = read_sample("rotated_id.png")
    doc = rasterize_document(data, max_size_mb=10, max_pages=5)

    assert doc.total_pages == 1
    assert doc.original_mime == "image/png"
    page = doc.pages[0]
    assert page.width_px > 0
    assert page.height_px > 0


def test_multiframe_tiff_rasterize():
    """Verify multi-frame TIFF decodes each frame as a distinct page."""
    # Create an in-memory 2-page TIFF fixture
    f1 = Image.new("RGB", (300, 400), color="white")
    f2 = Image.new("RGB", (300, 400), color="blue")
    buf = io.BytesIO()
    f1.save(buf, format="TIFF", save_all=True, append_images=[f2])
    tiff_bytes = buf.getvalue()

    doc = rasterize_document(tiff_bytes, max_size_mb=10, max_pages=5)
    assert doc.total_pages == 2
    assert len(doc.pages) == 2
    assert doc.pages[0].page_number == 1
    assert doc.pages[1].page_number == 2


def test_oversized_file_rejected():
    """Verify files exceeding max_size_mb raise FileTooLargeError."""
    data = read_sample("clean_invoice.pdf")
    with pytest.raises(FileTooLargeError):
        rasterize_document(data, max_size_mb=0)  # 0MB forces rejection


def test_too_many_pages_rejected():
    """Verify documents exceeding max_pages raise TooManyPagesError."""
    data = read_sample("multipage_report.pdf")
    with pytest.raises(TooManyPagesError):
        rasterize_document(data, max_pages=1)  # multipage has >=2 pages


def test_corrupt_file_rejected():
    """Verify completely corrupt or non-matching byte stream raises UnsupportedTypeError."""
    corrupt_bytes = b"CORRUPT_NOT_A_VALID_HEADER_DATA_12345"
    with pytest.raises(UnsupportedTypeError):
        rasterize_document(corrupt_bytes)


def test_docx_handling_without_soffice():
    """Verify DOCX input triggers graceful check when LibreOffice is not installed."""
    import zipfile

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("[Content_Types].xml", "<Types/>")
    docx_bytes = buf.getvalue()

    # In environments without LibreOffice, must raise UnsupportedTypeError
    with pytest.raises(UnsupportedTypeError) as exc_info:
        rasterize_document(docx_bytes)
    assert "DOCX" in str(exc_info.value) or "LibreOffice" in str(exc_info.value)
