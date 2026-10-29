"""Unit tests for Safepay gateway integration, URL formatting, and HMAC-SHA512 signatures."""

import hashlib
import hmac
import json

import pytest
from app.billing.providers.safepay import SafepayProvider


@pytest.fixture
def safepay():
    return SafepayProvider(
        env="sandbox",
        api_key="sec_sandbox_test_key_123",
        v1_secret="test_v1_secret_abc",
        webhook_secret="test_webhook_secret_xyz789",
    )


def test_safepay_checkout_url_generation(safepay):
    """Verifies official Safepay checkout URL structure with beacon token and callbacks."""
    url = safepay._build_checkout_url(
        beacon_token="tkn_99887766",
        order_id="ord_12345",
        success_url="http://localhost:3000/billing/success?order_id=ord_12345",
        cancel_url="http://localhost:3000/billing/cancel?order_id=ord_12345",
    )
    assert url.startswith("https://sandbox.api.getsafepay.com/checkout/pay?")
    assert "beacon=tkn_99887766" in url
    assert "order_id=ord_12345" in url
    assert "source=custom" in url
    assert "webhooks=true" in url
    assert "success_url=http" in url
    assert "cancel_url=http" in url


def test_safepay_signature_verification_success(safepay):
    """Verifies that authentic HMAC-SHA512 signatures pass verification."""
    raw_payload = b'{"event":"payment.completed","data":{"tracker":"track_123","token":"tkn_abc"}}'
    valid_sig = hmac.new(
        b"test_webhook_secret_xyz789",
        raw_payload,
        hashlib.sha512,
    ).hexdigest()

    assert safepay.verify_webhook_signature(raw_payload, valid_sig) is True


def test_safepay_signature_verification_tampered_payload(safepay):
    """Verifies that tampered payloads fail verification (anti-tamper)."""
    raw_payload = b'{"event":"payment.completed","data":{"tracker":"track_123","amount":100}}'
    valid_sig = hmac.new(
        b"test_webhook_secret_xyz789",
        raw_payload,
        hashlib.sha512,
    ).hexdigest()

    tampered_payload = (
        b'{"event":"payment.completed","data":{"tracker":"track_123","amount":999999}}'
    )
    assert safepay.verify_webhook_signature(tampered_payload, valid_sig) is False


def test_safepay_signature_verification_invalid_key(safepay):
    """Verifies that signatures generated with incorrect secret are rejected."""
    raw_payload = b'{"event":"payment.completed"}'
    bad_sig = hmac.new(
        b"wrong_secret_key",
        raw_payload,
        hashlib.sha512,
    ).hexdigest()

    assert safepay.verify_webhook_signature(raw_payload, bad_sig) is False


def test_safepay_parse_webhook_event(safepay):
    """Verifies parsing of official Safepay webhook payload."""
    payload_dict = {
        "event": "payment.completed",
        "data": {
            "tracker": "trk_abc123xyz",
            "token": "order_uuid_456",
            "amount": 29.00,
            "currency": "USD",
            "metadata": {
                "order_id": "ord_openocr_7788",
            },
        },
    }
    raw_bytes = json.dumps(payload_dict).encode("utf-8")
    sig = hmac.new(b"test_webhook_secret_xyz789", raw_bytes, hashlib.sha512).hexdigest()

    event = safepay.parse_webhook_event(raw_bytes, sig)
    assert event.event_type == "payment.completed"
    assert event.event_id == "trk_abc123xyz"
    assert event.provider_ref == "trk_abc123xyz"
    assert event.order_id == "ord_openocr_7788"
    assert event.amount_minor == 2900
    assert event.currency == "USD"
