"""CSPRNG token generation, SHA-256 hashing, and constant-time verification."""

import hashlib
import hmac
import secrets


def generate_secure_token(nbytes: int = 32) -> str:
    """
    Generates a cryptographically secure random token (>= 256 bits).
    32 bytes = 256 bits of CSPRNG entropy, base64url safe string.
    """
    return secrets.token_urlsafe(nbytes)


def hash_token(token: str) -> str:
    """Computes SHA-256 hash of a token for secure storage at rest."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_token_constant_time(raw_token: str, expected_hash: str) -> bool:
    """
    Validates token by hashing raw_token and comparing with expected_hash
    using constant-time hmac.compare_digest to prevent timing attacks.
    """
    computed = hash_token(raw_token)
    return hmac.compare_digest(computed, expected_hash)
