"""Document Normalization Pipeline Stage.

Rule 1 in Section 6:
NORMALIZE: validate the real MIME type (magic bytes, not the extension),
convert PDF pages to images, auto-rotate/deskew, cap resolution,
reject files over plan limits.
"""

import io

import pymupdf  # Fast native PDF engine
from app.errors import FileTooLargeError, TooManyPagesError, UnsupportedTypeError
from app.validation import detect_mime_type
from PIL import Image, ImageOps
from pydantic import BaseModel

MAX_DIMENSION = 3000  # Cap resolution to 3000px on the longest side


class NormalizedPage(BaseModel):
    page_number: int
    image_bytes: bytes
    width: int
    height: int
    rotation_applied: int = 0


class NormalizedDocument(BaseModel):
    pages: list[NormalizedPage]
    mime: str
    total_pages: int
    original_size_bytes: int


def _cap_image_resolution(img: Image.Image) -> tuple[Image.Image, int, int]:
    """Proportionally scales down image if longest side exceeds MAX_DIMENSION."""
    w, h = img.size
    max_side = max(w, h)
    if max_side > MAX_DIMENSION:
        scale = MAX_DIMENSION / max_side
        new_w, new_h = int(w * scale), int(h * scale)
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        return img, new_w, new_h
    return img, w, h


def _normalize_image_orientation(img: Image.Image) -> tuple[Image.Image, int]:
    """Auto-orients image using EXIF orientation metadata, and falls back to visual OCR tilt detection."""
    rotation_applied = 0
    try:
        # ImageOps.exif_transpose applies orientation tag and returns upright image
        transposed = ImageOps.exif_transpose(img)
        if transposed:
            img = transposed
    except Exception:
        pass

    try:
        from providers.engines.docling_engine import detect_and_correct_orientation, get_ocr_engine

        ocr = get_ocr_engine()
        if ocr is not None:
            img, rot = detect_and_correct_orientation(img, ocr)
            if rot != 0:
                rotation_applied = rot
    except Exception:
        pass

    return img, rotation_applied


def normalize_document(
    file_bytes: bytes,
    declared_mime: str | None = None,
    max_size_mb: int = 15,
    max_pages: int = 10,
) -> NormalizedDocument:
    """Normalizes document bytes: validates magic bytes, splits pages into images,

    auto-rotates, and caps max resolution.
    """
    size_bytes = len(file_bytes)
    max_bytes = max_size_mb * 1024 * 1024

    if size_bytes > max_bytes:
        size_mb = round(size_bytes / (1024 * 1024), 2)
        raise FileTooLargeError(f"File size ({size_mb}MB) exceeds limit of {max_size_mb}MB.")

    # 1. Validate real MIME type via magic bytes
    detected_mime = detect_mime_type(file_bytes[:32])
    if not detected_mime or detected_mime not in [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/webp",
    ]:
        raise UnsupportedTypeError(
            f"Unsupported MIME type: '{detected_mime or 'unknown'}'. Allowed: PDF, PNG, JPG, WEBP."
        )

    normalized_pages: list[NormalizedPage] = []

    # 2. PDF Processing
    if detected_mime == "application/pdf":
        doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        page_count = len(doc)

        if page_count > max_pages:
            raise TooManyPagesError(
                f"Document has {page_count} pages, exceeding your plan limit of {max_pages} pages."
            )

        # Render each page to an RGB image
        # Matrix(2, 2) renders at ~144-150 DPI which is optimal for OCR/layout
        zoom_matrix = pymupdf.Matrix(2.0, 2.0)
        for idx in range(page_count):
            page = doc.load_page(idx)
            pix = page.get_pixmap(matrix=zoom_matrix)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

            # Cap resolution
            img, w, h = _cap_image_resolution(img)

            out_buf = io.BytesIO()
            img.save(out_buf, format="PNG")
            normalized_pages.append(
                NormalizedPage(
                    page_number=idx + 1,
                    image_bytes=out_buf.getvalue(),
                    width=w,
                    height=h,
                    rotation_applied=0,
                )
            )

    # 3. Image Processing (PNG, JPG, WEBP)
    else:
        img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        img, rot = _normalize_image_orientation(img)
        img, w, h = _cap_image_resolution(img)

        out_buf = io.BytesIO()
        img.save(out_buf, format="PNG")
        normalized_pages.append(
            NormalizedPage(
                page_number=1,
                image_bytes=out_buf.getvalue(),
                width=w,
                height=h,
                rotation_applied=rot,
            )
        )

    return NormalizedDocument(
        pages=normalized_pages,
        mime=detected_mime,
        total_pages=len(normalized_pages),
        original_size_bytes=size_bytes,
    )
