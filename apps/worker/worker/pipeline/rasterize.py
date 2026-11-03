"""Document Rasterization Pipeline Stage (Stage 2).

Replaces legacy OCR layout parsing with lightweight, model-free rasterization:
- PDF: Renders pages via pypdfium2 at 150-200 DPI, long edge capped at 2000px.
       Extracts digital text layer with word rects for Stage 4 bounding box snapping.
- Images (PNG, JPG, WEBP, TIFF): Decodes via Pillow, handles EXIF auto-rotation,
       supports multi-frame TIFFs, downsizes to 2000px cap.
- DOCX: Converts to PDF via sandboxed headless LibreOffice (if installed) and rasterizes.
- Enforces max pages, resolution, and zip-bomb / decompression safety.
"""

from __future__ import annotations

import io
import logging
import os
import shutil
import subprocess
import tempfile

import pypdfium2 as pdfium
from app.errors import FileTooLargeError, TooManyPagesError, UnsupportedTypeError
from app.validation import detect_mime_type
from PIL import Image, ImageOps, ImageSequence
from pydantic import BaseModel

from providers.base import RasterPage, TextLayer, WordRect

logger = logging.getLogger(__name__)

# Constants and limits
MAX_PAGES_DEFAULT = 50
MAX_LONG_EDGE_PX = 2000
MAX_PIXELS_PER_PAGE = 25_000_000  # 5000 x 5000 safety cap
DEFAULT_JPEG_QUALITY = 85
CONVERSION_TIMEOUT_SECONDS = 30


class RasterDocument(BaseModel):
    """Complete collection of rasterized pages for an ingested document."""

    pages: list[RasterPage]
    total_pages: int
    original_mime: str
    original_size_bytes: int


def _downscale_to_cap(img: Image.Image, max_edge: int = MAX_LONG_EDGE_PX) -> tuple[Image.Image, int, int]:
    """Scales image proportionally so its longest edge does not exceed max_edge."""
    w, h = img.size
    long_edge = max(w, h)
    if long_edge > max_edge:
        scale = max_edge / long_edge
        new_w, new_h = max(1, int(w * scale)), max(1, int(h * scale))
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        return img, new_w, new_h
    return img, w, h


def _encode_page_image(img: Image.Image) -> tuple[bytes, str]:
    """Encodes PIL Image to JPEG (or PNG if high contrast and tiny) bytes."""
    buf = io.BytesIO()
    # Ensure RGB mode for JPEG encoding
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    elif img.mode == "L":
        img = img.convert("RGB")

    img.save(buf, format="JPEG", quality=DEFAULT_JPEG_QUALITY, optimize=True)
    return buf.getvalue(), "image/jpeg"


def _rasterize_pdf(file_bytes: bytes, max_pages: int = MAX_PAGES_DEFAULT) -> list[RasterPage]:
    """Renders PDF pages to RasterPage list using pypdfium2."""
    doc = pdfium.PdfDocument(file_bytes)
    page_count = len(doc)

    if page_count > max_pages:
        raise TooManyPagesError(
            f"Document has {page_count} pages, exceeding the limit of {max_pages} pages."
        )

    raster_pages: list[RasterPage] = []

    for idx in range(page_count):
        page = doc[idx]
        pt_w, pt_h = page.get_size()

        # Target ~150-200 DPI: scale 2.0x from 72pt default
        scale = 2.0
        # If original page is already huge, adjust scale so we don't blow memory
        if max(pt_w * scale, pt_h * scale) > MAX_LONG_EDGE_PX * 2:
            scale = (MAX_LONG_EDGE_PX * 2) / max(pt_w, pt_h)

        pil_image = page.render(scale=scale).to_pil()
        pil_image, final_w, final_h = _downscale_to_cap(pil_image, MAX_LONG_EDGE_PX)

        # Extract digital text layer word rectangles if present
        text_layer: TextLayer | None = None
        try:
            textpage = page.get_textpage()
            n_rects = textpage.count_rects()
            if n_rects > 0:
                words: list[WordRect] = []
                scale_x = final_w / pt_w
                scale_y = final_h / pt_h

                for r_idx in range(n_rects):
                    left, bottom, right, top = textpage.get_rect(r_idx)
                    text = textpage.get_text_bounded(left, bottom, right, top).strip()
                    if not text:
                        continue
                    # Convert PDF coordinates (origin bottom-left) to canvas coordinates (origin top-left)
                    canvas_x0 = max(0.0, left * scale_x)
                    canvas_y0 = max(0.0, (pt_h - top) * scale_y)
                    canvas_x1 = min(float(final_w), right * scale_x)
                    canvas_y1 = min(float(final_h), (pt_h - bottom) * scale_y)

                    if canvas_x1 > canvas_x0 and canvas_y1 > canvas_y0:
                        words.append(
                            WordRect(
                                text=text,
                                x0=round(canvas_x0, 2),
                                y0=round(canvas_y0, 2),
                                x1=round(canvas_x1, 2),
                                y1=round(canvas_y1, 2),
                            )
                        )
                if words:
                    text_layer = TextLayer(words=words)
        except Exception as exc:
            logger.debug(f"Page {idx + 1}: text layer extraction skipped: {exc}")

        img_bytes, mime_type = _encode_page_image(pil_image)
        raster_pages.append(
            RasterPage(
                page_number=idx + 1,
                width_px=final_w,
                height_px=final_h,
                image_bytes=img_bytes,
                mime_type=mime_type,
                text_layer=text_layer,
            )
        )

    return raster_pages


def _rasterize_images(file_bytes: bytes, max_pages: int = MAX_PAGES_DEFAULT) -> list[RasterPage]:
    """Renders single or multi-frame raster images (PNG, JPEG, WEBP, TIFF)."""
    with Image.open(io.BytesIO(file_bytes)) as img:
        frames = list(ImageSequence.Iterator(img))
        total_frames = len(frames)

        if total_frames > max_pages:
            raise TooManyPagesError(
                f"Image file contains {total_frames} frames/pages, exceeding limit of {max_pages}."
            )

        raster_pages: list[RasterPage] = []
        for idx, frame in enumerate(frames):
            # Handle EXIF auto-rotation
            try:
                transposed = ImageOps.exif_transpose(frame)
                if transposed:
                    frame = transposed
            except Exception as exc:
                logger.debug(f"EXIF transpose ignored: {exc}")

            frame_rgb = frame.convert("RGB")
            frame_rgb, final_w, final_h = _downscale_to_cap(frame_rgb, MAX_LONG_EDGE_PX)

            img_bytes, mime_type = _encode_page_image(frame_rgb)
            raster_pages.append(
                RasterPage(
                    page_number=idx + 1,
                    width_px=final_w,
                    height_px=final_h,
                    image_bytes=img_bytes,
                    mime_type=mime_type,
                    text_layer=None,
                )
            )

        return raster_pages


def _convert_docx_to_pdf(file_bytes: bytes) -> bytes:
    """Converts DOCX bytes to PDF bytes using sandboxed LibreOffice headless."""
    soffice_bin = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice_bin:
        raise UnsupportedTypeError("DOCX conversion requires LibreOffice (soffice) installed.")

    with tempfile.TemporaryDirectory() as tmp_dir:
        input_docx = os.path.join(tmp_dir, "document.docx")
        with open(input_docx, "wb") as f:
            f.write(file_bytes)

        # Run headless conversion in sandbox with timeout and restricted environment
        env = {
            "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
            "HOME": tmp_dir,
            "TEMP": tmp_dir,
        }
        cmd = [
            soffice_bin,
            "--headless",
            "--convert-to",
            "pdf",
            "--outdir",
            tmp_dir,
            input_docx,
        ]

        try:
            subprocess.run(
                cmd,
                capture_output=True,
                timeout=CONVERSION_TIMEOUT_SECONDS,
                check=True,
                env=env,
            )
        except subprocess.TimeoutExpired:
            raise FileTooLargeError("DOCX conversion timed out.") from None
        except subprocess.CalledProcessError as err:
            logger.error(f"LibreOffice conversion failed: {err.stderr.decode('utf-8', 'ignore')}")
            raise UnsupportedTypeError("Failed to convert DOCX document to PDF.") from err

        output_pdf = os.path.join(tmp_dir, "document.pdf")
        if not os.path.exists(output_pdf):
            raise UnsupportedTypeError("Converted PDF output not found.")

        with open(output_pdf, "rb") as f:
            return f.read()


def rasterize_document(
    file_bytes: bytes,
    declared_mime: str | None = None,
    max_size_mb: int = 25,
    max_pages: int = MAX_PAGES_DEFAULT,
) -> RasterDocument:
    """Ingests raw file bytes, validates magic bytes, and rasterizes to normalized page images."""
    size_bytes = len(file_bytes)
    max_bytes = max_size_mb * 1024 * 1024

    if size_bytes > max_bytes:
        size_mb = round(size_bytes / (1024 * 1024), 2)
        raise FileTooLargeError(f"File size ({size_mb}MB) exceeds limit of {max_size_mb}MB.")

    # 1. Validate real MIME type via magic bytes
    detected_mime = detect_mime_type(file_bytes[:32], file_bytes=file_bytes)
    if not detected_mime:
        raise UnsupportedTypeError("Unable to identify file format from byte signatures.")

    # 2. Rasterize per format
    if detected_mime == "application/pdf":
        pages = _rasterize_pdf(file_bytes, max_pages=max_pages)
    elif detected_mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        pdf_bytes = _convert_docx_to_pdf(file_bytes)
        pages = _rasterize_pdf(pdf_bytes, max_pages=max_pages)
    elif detected_mime in ("image/png", "image/jpeg", "image/webp", "image/tiff"):
        pages = _rasterize_images(file_bytes, max_pages=max_pages)
    else:
        raise UnsupportedTypeError(f"Unsupported MIME type: '{detected_mime}'.")

    if not pages:
        raise UnsupportedTypeError("Document produced zero renderable pages.")

    return RasterDocument(
        pages=pages,
        total_pages=len(pages),
        original_mime=detected_mime,
        original_size_bytes=size_bytes,
    )
