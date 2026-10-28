"""Security middleware for hardening headers, CSRF defense, and open-redirect validation."""

import re
from typing import Optional
from urllib.parse import urlparse

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.config import settings

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Applies defense-in-depth OWASP recommended security response headers:
    - Content-Security-Policy (CSP)
    - Strict-Transport-Security (HSTS)
    - X-Content-Type-Options (nosniff)
    - X-Frame-Options (DENY) / frame-ancestors 'none'
    - Referrer-Policy
    - Permissions-Policy
    """

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # 1. MIME Sniffing Prevention
        response.headers["X-Content-Type-Options"] = "nosniff"

        # 2. Frame Protection (Clickjacking prevention)
        response.headers["X-Frame-Options"] = "DENY"

        # 3. Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # 4. Permissions Policy (Disables sensitive APIs)
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"

        # 5. Content Security Policy (Level 2/3)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https: blob:; "
            "font-src 'self' data:; "
            "connect-src 'self' https://sandbox.api.getsafepay.com https://api.getsafepay.com http://localhost:* http://127.0.0.1:* https:; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self' https://sandbox.api.getsafepay.com https://getsafepay.com https://api.getsafepay.com;"
        )

        # 6. HSTS (Strict-Transport-Security)
        if settings.is_production or request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"

        return response


class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """
    CSRF Defense:
    Verifies that state-changing requests (POST, PUT, DELETE, PATCH) coming with session cookies
    originate from a valid trusted context.
    Exempts external server-to-server webhooks (e.g. /v1/billing/webhooks/*) which are verified via HMAC.
    """

    async def dispatch(self, request: Request, call_next):
        if request.method in SAFE_METHODS:
            return await call_next(request)

        # Webhooks from payment gateways are server-to-server and verified via HMAC signatures
        if request.url.path.startswith("/v1/billing/webhooks"):
            return await call_next(request)

        # Check if request has a session cookie
        has_session_cookie = (
            "openocr_session" in request.cookies
            or "__Host-openocr_session" in request.cookies
        )

        # Only apply CSRF check if state-changing request uses session cookies
        if has_session_cookie or request.url.path.startswith("/v1/auth"):
            # Check custom header (Standard CORS preflight protection)
            client_header = request.headers.get("X-Requested-With") or request.headers.get("x-requested-with")
            csrf_token_header = request.headers.get("X-CSRF-Token") or request.headers.get("x-csrf-token")
            csrf_cookie = request.cookies.get("openocr_csrf")

            # Check origin/referer against allowed origins if present
            origin = request.headers.get("origin")
            if origin and origin not in settings.CORS_ORIGINS:
                return JSONResponse(
                    status_code=403,
                    content={"error": {"code": "CSRF_ORIGIN_INVALID", "message": "Cross-site request rejected."}},
                )

            # Accept if standard client header present or matching double-submit cookie
            header_valid = bool(client_header in {"XMLHttpRequest", "OpenOCR-Web", "OpenOCR-Client"})
            token_valid = bool(csrf_token_header and csrf_cookie and csrf_token_header == csrf_cookie)

            # If it's a public signup or login form, permit if origin header is trusted or client header matches
            if not header_valid and not token_valid and has_session_cookie:
                return JSONResponse(
                    status_code=403,
                    content={
                        "error": {
                            "code": "CSRF_TOKEN_MISSING",
                            "message": "Missing required CSRF header (X-Requested-With or X-CSRF-Token).",
                        }
                    },
                )

        return await call_next(request)


def validate_internal_redirect(redirect_url: Optional[str], default_path: str = "/") -> str:
    """
    Prevents Open Redirect vulnerabilities:
    - Only allows internal relative paths starting with single '/'
    - Rejects protocol-relative paths '//evil.com'
    - Rejects backslash bypasses '/\\evil.com'
    - Rejects explicit schemes (http://, https://, javascript:)
    """
    if not redirect_url:
        return default_path

    stripped = redirect_url.strip()

    # Must start with exactly one forward slash
    if not stripped.startswith("/") or stripped.startswith("//") or stripped.startswith("/\\"):
        return default_path

    # Parse and ensure no scheme or netloc
    parsed = urlparse(stripped)
    if parsed.scheme or parsed.netloc:
        return default_path

    # Reject control chars or newline injection
    if any(ord(c) < 32 or ord(c) == 127 for c in stripped):
        return default_path

    return stripped
