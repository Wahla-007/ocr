"""FastAPI Main Application entry point for OpenOCR API."""

import time
import uuid

from app.api.v1 import api_v1_router
from app.api.v1.health import router as health_router
from app.config import settings
from app.errors import APIError, api_error_handler
from app.logging import logger
from app.middleware.security import CSRFProtectionMiddleware, SecurityHeadersMiddleware
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(
    title="OpenOCR API",
    description="Universal Zero-Selection Document Extraction Platform",
    version="1.0.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

app.add_exception_handler(APIError, api_error_handler)


@app.exception_handler(HTTPException)
async def generic_http_exception_handler(request: Request, exc: HTTPException):
    request_id = getattr(request.state, "request_id", "unknown")
    code = "HTTP_ERROR"
    message = str(exc.detail)
    if isinstance(exc.detail, dict):
        code = exc.detail.get("code", "HTTP_ERROR")
        message = exc.detail.get("message", str(exc.detail))
    headers = exc.headers or {}
    headers["X-Request-ID"] = request_id
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": code, "message": message, "request_id": request_id}},
        headers=headers,
    )

# 1. Security Headers (CSP, HSTS, X-Content-Type-Options, Frame-Options)
app.add_middleware(SecurityHeadersMiddleware)

# 2. CSRF Defense Middleware
app.add_middleware(CSRFProtectionMiddleware)

# 3. CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-Quota-Limit",
        "X-Quota-Remaining",
        "X-Quota-Reset",
        "X-Request-ID",
    ],
)


@app.middleware("http")
async def request_context_and_logging_middleware(request: Request, call_next):
    """Enforces request tracking, timing, and structured metadata logging."""
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    start_time = time.time()

    # Pass request_id via state
    request.state.request_id = request_id

    try:
        response = await call_next(request)
        latency_ms = round((time.time() - start_time) * 1000, 2)
        response.headers["X-Request-ID"] = request_id

        # Log request metadata without body content
        extra = {
            "request_id": request_id,
            "latency_ms": latency_ms,
            "status_code": response.status_code,
            "method": request.method,
            "path": request.url.path,
        }
        logger.info(
            f"{request.method} {request.url.path} -> {response.status_code} ({latency_ms}ms)",
            extra=extra,
        )
        return response
    except Exception:
        latency_ms = round((time.time() - start_time) * 1000, 2)
        logger.exception(
            f"Unhandled exception processing {request.method} {request.url.path}",
            extra={
                "request_id": request_id,
                "latency_ms": latency_ms,
                "error_code": "INTERNAL_SERVER_ERROR",
            },
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred processing your request.",
                    "request_id": request_id,
                }
            },
            headers={"X-Request-ID": request_id},
        )


# Direct /health endpoint at root for orchestrators (docker/k8s)
app.include_router(health_router, tags=["Health"])

# Mounted /v1 router
app.include_router(api_v1_router, prefix="/v1")


@app.get("/")
async def root():
    return {
        "name": "OpenOCR API",
        "status": "online",
        "version": "1.0.0",
        "docs": "/docs" if not settings.is_production else None,
    }
