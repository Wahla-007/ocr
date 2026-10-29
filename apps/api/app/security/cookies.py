"""Secure cookie management following OWASP session management guidelines."""

from app.config import settings
from fastapi import Request, Response

# Session cookie name: use __Host- prefix in production over HTTPS
COOKIE_NAME_DEV = "openocr_session"
COOKIE_NAME_PROD = "__Host-openocr_session"

CSRF_COOKIE_NAME = "openocr_csrf"


def get_session_cookie_name(is_secure: bool) -> str:
    """Returns __Host- prefixed name if running securely over HTTPS, else fallback."""
    return COOKIE_NAME_PROD if is_secure else COOKIE_NAME_DEV


def extract_session_token(request: Request) -> str | None:
    """Extracts session token from cookie or fallback Authorization Bearer."""
    # Check production cookie name first, then dev cookie name
    token = request.cookies.get(COOKIE_NAME_PROD) or request.cookies.get(COOKIE_NAME_DEV)
    if token:
        return token

    # Check Authorization header (for test clients or mobile/CLI)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        bearer_val = auth_header[7:].strip()
        # Ensure it's not an API key (which starts with ocr_live_)
        if not bearer_val.startswith("ocr_live_"):
            return bearer_val

    return None


def set_session_cookie(
    response: Response,
    session_token: str,
    max_age_seconds: int,
    is_secure: bool = False,
) -> None:
    """
    Sets a hardened session cookie:
    - HttpOnly = True (protects against XSS exfiltration)
    - SameSite = 'Lax' (protects against CSRF on navigation)
    - Secure = True if is_secure or production
    - Path = '/'
    - __Host- prefix when Secure=True (prevents subdomain fixation)
    """
    secure_flag = is_secure or settings.is_production
    cookie_name = get_session_cookie_name(secure_flag)

    response.set_cookie(
        key=cookie_name,
        value=session_token,
        max_age=max_age_seconds,
        expires=max_age_seconds,
        path="/",
        secure=secure_flag,
        httponly=True,
        samesite="lax",
    )


def clear_session_cookie(response: Response, is_secure: bool = False) -> None:
    """Clears both dev and prod session cookies."""
    for name in [COOKIE_NAME_PROD, COOKIE_NAME_DEV]:
        response.delete_cookie(
            key=name,
            path="/",
            httponly=True,
            samesite="lax",
            secure=is_secure or settings.is_production,
        )


def set_csrf_cookie(
    response: Response,
    csrf_token: str,
    is_secure: bool = False,
) -> None:
    """Sets a readable CSRF token cookie for double-submit cookie verification."""
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=csrf_token,
        path="/",
        secure=is_secure or settings.is_production,
        httponly=False,  # Client needs to read this to submit X-CSRF-Token header
        samesite="lax",
    )
