"""File and MIME validation adhering to Section 6 pipeline spec.

Rule 1 in Section 6: Validate real MIME type using magic bytes, not file extension.
"""

import io
import zipfile

from app.errors import FileTooLargeError, UnsupportedTypeError

ALLOWED_MIME_TYPES: set[str] = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/tiff",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

MAX_ZIP_ENTRIES = 1000
MAX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024  # 100 MB

# Magic byte signatures
MAGIC_SIGNATURES = [
    (b"%PDF", "application/pdf"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"II*\x00", "image/tiff"),
    (b"MM\x00*", "image/tiff"),
]


def detect_mime_type(header_bytes: bytes, file_bytes: bytes | None = None) -> str | None:
    """Detect actual MIME type strictly from byte headers (magic bytes) and payload."""
    if len(header_bytes) < 4:
        return None

    for signature, mime in MAGIC_SIGNATURES:
        if header_bytes.startswith(signature):
            return mime

    # Check WEBP: RIFF + 4 bytes + WEBP
    if len(header_bytes) >= 12 and header_bytes[:4] == b"RIFF" and header_bytes[8:12] == b"WEBP":
        return "image/webp"

    # Check DOCX (ZIP package containing [Content_Types].xml)
    if header_bytes.startswith(b"PK\x03\x04") or header_bytes.startswith(b"PK"):
        if file_bytes is not None:
            try:
                with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
                    infolist = zf.infolist()
                    if len(infolist) > MAX_ZIP_ENTRIES:
                        raise FileTooLargeError(
                            "Decompression bomb detected: excessive zip entries."
                        )
                    total_uncompressed = sum(info.file_size for info in infolist)
                    if total_uncompressed > MAX_UNCOMPRESSED_BYTES:
                        raise FileTooLargeError(
                            "Decompression bomb detected: uncompressed size exceeds limit."
                        )
                    names = set(zf.namelist())
                    if "[Content_Types].xml" in names:
                        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            except zipfile.BadZipFile:
                return None

    return None


def validate_file(
    content_bytes: bytes,
    declared_mime: str | None = None,
    max_size_mb: int = 10,
) -> str:
    """Validates file size and magic bytes against allowed document formats.

    Returns the detected verified MIME type.
    """
    size_bytes = len(content_bytes)
    max_bytes = max_size_mb * 1024 * 1024

    if size_bytes > max_bytes:
        raise FileTooLargeError(
            f"File size ({round(size_bytes / (1024 * 1024), 2)}MB) exceeds "
            f"the maximum allowed limit of {max_size_mb}MB for your plan."
        )

    detected_mime = detect_mime_type(content_bytes[:32], file_bytes=content_bytes)

    if not detected_mime or detected_mime not in ALLOWED_MIME_TYPES:
        raise UnsupportedTypeError(
            f"Detected MIME type '{detected_mime or 'unknown'}' is not supported. "
            f"Allowed types: PDF, PNG, JPG, WEBP, TIFF, DOCX."
        )

    return detected_mime
