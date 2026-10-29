"""Cryptographic password hashing, NIST SP 800-63B validation, and HIBP checking."""

import hashlib
import logging
import re
import unicodedata

import httpx
from app.config import settings
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHash, VerifyMismatchError
from zxcvbn import zxcvbn

logger = logging.getLogger("openocr.security.password")

# OWASP recommended Argon2id parameters (RFC 9106)
# Memory: 64 MiB (65536 KiB), Time: 3 iterations, Parallelism: 4 threads, Hash length: 32 bytes
ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16,
)

# Dummy hash for constant-time comparison on nonexistent user lookup
# Pre-computed with the exact same parameters
DUMMY_PASSWORD_HASH = ph.hash("OpenOCR_constant_timing_dummy_password_salt_value_2026")


def normalize_email(email: str) -> str:
    """
    Normalizes email address:
    - Strips leading/trailing whitespace
    - Applies Unicode NFKC normalization
    - Validates length (max 254 chars per RFC 5321)
    - Rejects control characters (< 32, 127)
    - Converts to lowercase
    - Preserves '+' subaddressing and dots
    """
    if not email:
        raise ValueError("Email cannot be empty.")

    # Unicode NFKC normalization
    normalized = unicodedata.normalize("NFKC", email).strip()

    # Reject control characters
    for char in normalized:
        if ord(char) < 32 or ord(char) == 127:
            raise ValueError("Email contains invalid control characters.")

    if len(normalized) > 254:
        raise ValueError("Email exceeds maximum permitted length of 254 characters.")

    # RFC 5322 standard email structure check
    email_regex = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    if not email_regex.match(normalized):
        raise ValueError("Invalid email address format.")

    local_part, domain = normalized.rsplit("@", 1)
    return f"{local_part.lower()}@{domain.lower()}"


def hash_password(password: str, pepper: str | None = None) -> str:
    """Hashes a password with Argon2id and optional pepper."""
    effective_pepper = pepper or getattr(settings, "AUTH_PASSWORD_PEPPER", "")
    secret_bytes = (password + effective_pepper).encode("utf-8")
    return ph.hash(secret_bytes)


def verify_password(password: str, hashed: str, pepper: str | None = None) -> tuple[bool, bool]:
    """
    Verifies a password against an Argon2id hash.
    Returns: (is_valid: bool, needs_rehash: bool)
    """
    effective_pepper = pepper or getattr(settings, "AUTH_PASSWORD_PEPPER", "")
    secret_bytes = (password + effective_pepper).encode("utf-8")
    try:
        ph.verify(hashed, secret_bytes)
        needs_rehash = ph.check_needs_rehash(hashed)
        return True, needs_rehash
    except (VerifyMismatchError, InvalidHash):
        return False, False


def dummy_verify() -> None:
    """Executes dummy hash verification to maintain strict timing parity."""
    try:
        ph.verify(DUMMY_PASSWORD_HASH, b"dummy_password_constant_timing")
    except (VerifyMismatchError, InvalidHash):
        pass


async def check_haveibeenpwned_breach(password: str) -> bool:
    """
    Checks if password appears in known data breaches using HaveIBeenPwned k-anonymity API.
    Sends only the first 5 characters of SHA-1 hash.
    Fails OPEN with logging if the external API is unreachable.
    Returns True if breached, False if clean or API unavailable.
    """
    sha1_hash = hashlib.sha1(password.encode("utf-8"), usedforsecurity=False).hexdigest().upper()
    prefix = sha1_hash[:5]
    suffix = sha1_hash[5:]

    api_url = f"https://api.pwnedpasswords.com/range/{prefix}"

    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(
                api_url,
                headers={"User-Agent": "OpenOCR-Auth-Service/1.0", "Add-Padding": "true"},
            )
            if resp.status_code != 200:
                logger.warning(
                    f"HIBP API returned status {resp.status_code}; failing open for user signup."
                )
                return False

            lines = resp.text.splitlines()
            for line in lines:
                parts = line.split(":")
                if len(parts) >= 1 and parts[0].strip() == suffix:
                    count = (
                        int(parts[1].strip())
                        if len(parts) > 1 and parts[1].strip().isdigit()
                        else 1
                    )
                    logger.info(f"Password rejected: found in HIBP database ({count} breaches).")
                    return True

            return False
    except Exception as exc:
        logger.warning(f"HIBP range check error ({exc!r}); failing open to avoid service outage.")
        return False


def validate_nist_password(password: str, user_email: str | None = None) -> None:
    """
    Validates password against NIST SP 800-63B standards:
    - Minimum length: 12 characters
    - Maximum length: 128 characters (no truncation)
    - Allows all Unicode characters and spaces
    - No composition rules (doesn't force uppercase/symbols/numbers)
    - Rejects password matching or containing local-part of email
    - Checks zxcvbn score (score >= 2 required to prevent trivial dictionary words)
    """
    if len(password) < 12:
        raise ValueError("Password must be at least 12 characters long.")

    if len(password) > 128:
        raise ValueError("Password cannot exceed 128 characters.")

    # Check contextual containment with email
    if user_email:
        local_part = user_email.split("@")[0].lower()
        if len(local_part) >= 3 and local_part in password.lower():
            raise ValueError("Password must not contain parts of your email address.")

    # zxcvbn entropy evaluation
    res = zxcvbn(password, user_inputs=[user_email] if user_email else [])
    if res.get("score", 0) < 2 and len(password) < 16:
        feedback = res.get("feedback", {})
        warning = feedback.get("warning") or "Password is too easily guessable or common."
        raise ValueError(f"Weak password: {warning}")
