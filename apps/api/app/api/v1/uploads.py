"""Direct signed-URL upload router.

Rule 6: Files go to object storage through signed URLs.
File bytes never pass through the API server in direct mode.
"""

import uuid

from app.config import settings
from app.errors import FileTooLargeError, UnsupportedTypeError
from app.schemas.jobs import SignUploadRequest, SignUploadResponse
from app.storage import storage
from app.validation import ALLOWED_MIME_TYPES
from fastapi import APIRouter, Header, status

router = APIRouter(prefix="/uploads", tags=["Uploads"])


@router.post(
    "/sign",
    response_model=SignUploadResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate pre-signed upload URL",
)
async def sign_upload(
    payload: SignUploadRequest,
    authorization: str | None = Header(None),
) -> SignUploadResponse:
    # 1. Determine plan limits (anonymous by default if no auth header)
    plan_name = "free" if authorization else "anonymous"
    plan = settings.get_plan_limits(plan_name)

    # 2. Validate MIME type
    if payload.mime not in ALLOWED_MIME_TYPES:
        raise UnsupportedTypeError(
            f"MIME type '{payload.mime}' is not supported. Allowed types: PDF, PNG, JPG, WEBP."
        )

    # 3. Validate size against plan limits
    max_bytes = plan.max_file_size_mb * 1024 * 1024
    if payload.size_bytes > max_bytes:
        raise FileTooLargeError(
            f"Requested file size ({round(payload.size_bytes / (1024 * 1024), 2)}MB) exceeds "
            f"limit of {plan.max_file_size_mb}MB for plan '{plan.name}'."
        )

    # 4. Generate unique storage key and pre-signed PUT URL
    unique_id = str(uuid.uuid4())
    safe_filename = "".join(c for c in payload.filename if c.isalnum() or c in "._- ")
    file_key = f"uploads/{unique_id}/{safe_filename}"

    result = storage.generate_presigned_upload_url(
        file_key=file_key,
        mime=payload.mime,
        expires_in=900,
    )

    return SignUploadResponse(
        upload_url=result["upload_url"],
        file_key=result["file_key"],
        expires_in=result["expires_in"],
    )
