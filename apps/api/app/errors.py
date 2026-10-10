"""API Error handling and exception definitions.

Section 5 Contract:
Consistent error format: { "error": { "code": "...", "message": "...", "request_id": "..." } }
Error codes: FILE_TOO_LARGE, UNSUPPORTED_TYPE, TOO_MANY_PAGES, QUOTA_EXCEEDED,
RATE_LIMITED, ENGINE_FAILED, LOW_CONFIDENCE, JOB_NOT_FOUND, UNAUTHORIZED, BAD_REQUEST.
"""

from typing import Any

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse


class APIError(HTTPException):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        headers: dict[str, str] | None = None,
    ):
        super().__init__(status_code=status_code, detail=message, headers=headers)
        self.code = code
        self.message = message


class FileTooLargeError(APIError):
    def __init__(self, message: str = "File size exceeds the allowed limit for your plan."):
        super().__init__(
            code="FILE_TOO_LARGE",
            message=message,
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
        )


class UnsupportedTypeError(APIError):
    def __init__(
        self,
        message: str = "Unsupported document MIME type. Allowed: PDF, PNG, JPG, WEBP.",
    ):
        super().__init__(
            code="UNSUPPORTED_TYPE",
            message=message,
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        )


class TooManyPagesError(APIError):
    def __init__(self, message: str = "Document page count exceeds your plan limit."):
        super().__init__(
            code="TOO_MANY_PAGES",
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class QuotaExceededError(APIError):
    def __init__(self, message: str = "Daily credit quota exceeded."):
        super().__init__(
            code="QUOTA_EXCEEDED",
            message=message,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        )


class RateLimitedError(APIError):
    def __init__(self, message: str = "Too many requests. Please slow down."):
        super().__init__(
            code="RATE_LIMITED",
            message=message,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        )


class JobNotFoundError(APIError):
    def __init__(self, job_id: str):
        super().__init__(
            code="JOB_NOT_FOUND",
            message=f"Job '{job_id}' was not found.",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class UnauthorizedError(APIError):
    def __init__(self, message: str = "Invalid or missing API key."):
        super().__init__(
            code="UNAUTHORIZED",
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class BadRequestError(APIError):
    def __init__(self, message: str = "Bad request payload."):
        super().__init__(
            code="BAD_REQUEST",
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
        )


async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    content: dict[str, Any] = {
        "error": {
            "code": exc.code,
            "message": exc.message,
            "request_id": request_id,
        }
    }
    headers = exc.headers or {}
    headers["X-Request-ID"] = request_id
    return JSONResponse(status_code=exc.status_code, content=content, headers=headers)
