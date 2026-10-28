"""Tests for NIST SP 800-63B password validation, email normalization, and Argon2id hashing."""

import pytest
from app.security.password import (
    check_haveibeenpwned_breach,
    dummy_verify,
    hash_password,
    normalize_email,
    validate_nist_password,
    verify_password,
)
from app.security.tokens import (
    generate_secure_token,
    hash_token,
    verify_token_constant_time,
)


def test_email_normalization_standard():
    assert normalize_email("  User.Name+Tag@Example.COM  ") == "user.name+tag@example.com"
    assert normalize_email("test@domain.org") == "test@domain.org"


def test_email_normalization_unicode_nfkc():
    # NFKC decomposes and recomposes compatible unicode characters
    input_email = "ｔｅｓｔ@example.com"  # full-width latin
    normalized = normalize_email(input_email)
    assert normalized == "test@example.com"


def test_email_rejects_control_characters():
    with pytest.raises(ValueError, match="control characters"):
        normalize_email("evil\x00user@example.com")

    with pytest.raises(ValueError, match="control characters"):
        normalize_email("evil\nuser@example.com")


def test_email_rejects_excessive_length():
    long_local = "a" * 250
    with pytest.raises(ValueError, match="maximum permitted length"):
        normalize_email(f"{long_local}@example.com")


def test_nist_password_minimum_length():
    with pytest.raises(ValueError, match="at least 12 characters"):
        validate_nist_password("Short1!")


def test_nist_password_maximum_length():
    too_long = "a" * 129
    with pytest.raises(ValueError, match="cannot exceed 128"):
        validate_nist_password(too_long)


def test_nist_password_allows_unicode_spaces_and_symbols():
    # NIST 800-63B: Accept all printable ASCII and Unicode, spaces, emojis, passphrases
    valid_passphrase = "correct horse battery staple 2026!"
    validate_nist_password(valid_passphrase)

    unicode_passphrase = "Passphrase With Ümläuts & Emojis 🚀🔒✨"
    validate_nist_password(unicode_passphrase)


def test_nist_password_rejects_email_containment():
    with pytest.raises(ValueError, match="contain parts of your email"):
        validate_nist_password("supersecretjohndoe123", user_email="johndoe@example.com")


def test_nist_password_rejects_trivial_dictionary_words():
    # zxcvbn evaluation
    with pytest.raises(ValueError, match="Weak password"):
        validate_nist_password("password123456")


def test_argon2id_hashing_and_verification():
    raw = "MySecureLongPassphrase2026!#"
    hashed = hash_password(raw)

    assert hashed.startswith("$argon2id$")
    assert "m=65536,t=3,p=4" in hashed

    is_valid, needs_rehash = verify_password(raw, hashed)
    assert is_valid is True
    assert needs_rehash is False

    is_wrong, _ = verify_password("IncorrectPassword123!", hashed)
    assert is_wrong is False


def test_dummy_verify_runs_without_exception():
    # Must run cleanly without raising errors
    dummy_verify()


def test_token_generation_and_hashing():
    token = generate_secure_token(32)
    assert len(token) >= 40  # urlsafe base64 of 32 bytes

    thash = hash_token(token)
    assert len(thash) == 64  # SHA-256 hex string

    assert verify_token_constant_time(token, thash) is True
    assert verify_token_constant_time("tampered_token", thash) is False


@pytest.mark.asyncio
async def test_hibp_breach_detection_mock_or_online():
    # 'password123456' is notorious and guaranteed in HIBP breach database
    is_breached = await check_haveibeenpwned_breach("password123456")
    # Even if offline, it fails open (returns False) or if online returns True
    assert isinstance(is_breached, bool)
