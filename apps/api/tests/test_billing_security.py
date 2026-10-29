import asyncio
import hashlib
import hmac
import json
import uuid
from datetime import timedelta
from unittest.mock import patch

import pytest
from app.billing.ledger import get_user_credit_balance
from app.billing.providers.base import CheckoutSessionResult
from app.config import settings
from app.db.models import Session as DbSession
from app.db.models import UsageLedger, User, utc_now
from app.db.session import get_db
from app.main import app
from app.security.tokens import generate_secure_token, hash_token
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select


async def create_user_with_session(email: str, verified: bool = True) -> tuple[User, str]:
    db_factory = app.dependency_overrides[get_db]
    async for db in db_factory():
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            password_hash="argon2id_mock_hash",
            plan="free",
            email_verified_at=utc_now() if verified else None,
            is_active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        raw_token = generate_secure_token()
        token_hash = hash_token(raw_token)
        session = DbSession(
            id=str(uuid.uuid4()),
            user_id=user.id,
            session_hash=token_hash,
            expires_at=utc_now() + timedelta(days=14),
            last_seen_at=utc_now(),
        )
        db.add(session)
        await db.commit()
        return user, raw_token


@pytest.mark.asyncio
async def test_concurrent_webhooks_prevent_double_credit():
    """
    CRITICAL CONCURRENCY TEST:
    Simulates 10 concurrent identical webhook deliveries for the same order.
    Asserts that DB unique constraints and row locks ensure EXACTLY ONE credit grant.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        user, token = await create_user_with_session("concurrency_user@example.com")
        client.cookies.set("openocr_session", token)

        # 1. Create order for Starter Credit Pack (3,000 credits)
        with patch(
            "app.billing.providers.safepay.SafepayProvider.create_checkout_session"
        ) as mock_chk:
            mock_chk.return_value = CheckoutSessionResult(
                checkout_url="https://sandbox.api.getsafepay.com/checkout/pay?beacon=tkn_concurrency",
                provider_ref="trk_concurrency_ref",
                order_id="concurrency_order",
            )
            chk_resp = await client.post(
                "/v1/billing/checkout",
                json={
                    "plan_code": "pack_starter_usd",
                    "idempotency_key": "idemp_concurrency_key_999",
                },
                headers={"X-Requested-With": "OpenOCR-Web"},
            )
            assert chk_resp.status_code == 200
            order_id = chk_resp.json()["order_id"]

        # 2. Build signed webhook payload
        payload = {
            "event": "payment.completed",
            "data": {
                "tracker": "trk_concurrency_ref",
                "token": "token_concurrency",
                "amount": 10.00,
                "currency": "USD",
                "metadata": {"order_id": order_id},
            },
        }
        raw_body = json.dumps(payload).encode("utf-8")
        webhook_secret = settings.SAFEPAY_WEBHOOK_SECRET or "sandbox_test_webhook_secret_key"
        settings.SAFEPAY_WEBHOOK_SECRET = webhook_secret
        sig = hmac.new(webhook_secret.encode("utf-8"), raw_body, hashlib.sha512).hexdigest()

        # 3. Fire 10 parallel webhook requests simultaneously
        async def send_wh():
            return await client.post(
                "/v1/billing/webhooks/safepay",
                content=raw_body,
                headers={"Content-Type": "application/json", "X-SFPY-SIGNATURE": sig},
            )

        responses = await asyncio.gather(*(send_wh() for _ in range(10)))
        for r in responses:
            assert r.status_code == 200

        # 4. Verify that strictly ONE ledger entry exists
        db_factory = app.dependency_overrides[get_db]
        async for db in db_factory():
            stmt = select(func.count(UsageLedger.id)).where(UsageLedger.order_id == order_id)
            count = (await db.execute(stmt)).scalar()
            assert count == 1, f"Expected 1 ledger entry, but found {count}!"

            balance = await get_user_credit_balance(db, user.id)
            assert balance == 3000, f"Expected exactly 3000 credits, but got {balance}!"


@pytest.mark.asyncio
async def test_unsigned_or_tampered_webhook_rejected():
    """Verifies that unauthenticated or forged webhooks are rejected with 400 Bad Request."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        raw_body = b'{"event":"payment.completed","data":{"tracker":"trk_fake"}}'

        # Missing signature
        resp_missing = await client.post(
            "/v1/billing/webhooks/safepay",
            content=raw_body,
            headers={"Content-Type": "application/json"},
        )
        assert resp_missing.status_code == 400

        # Forged signature
        resp_forged = await client.post(
            "/v1/billing/webhooks/safepay",
            content=raw_body,
            headers={"Content-Type": "application/json", "X-SFPY-SIGNATURE": "bad_sig_12345"},
        )
        assert resp_forged.status_code == 400


@pytest.mark.asyncio
async def test_idor_protection_on_orders_and_invoices():
    """Verifies that User B cannot query or access User A's orders or invoices."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client_a:
        user_a, token_a = await create_user_with_session("victim_a@example.com")
        user_b, token_b = await create_user_with_session("attacker_b@example.com")

        # User A creates order
        client_a.cookies.set("openocr_session", token_a)
        with patch(
            "app.billing.providers.safepay.SafepayProvider.create_checkout_session"
        ) as mock_chk:
            mock_chk.return_value = CheckoutSessionResult(
                checkout_url="https://sandbox.api.getsafepay.com/checkout/pay?beacon=tkn_a",
                provider_ref="trk_order_a",
                order_id="ord_a",
            )
            order_resp = await client_a.post(
                "/v1/billing/checkout",
                json={"plan_code": "pack_starter_usd", "idempotency_key": "idemp_user_a_key"},
                headers={"X-Requested-With": "OpenOCR-Web"},
            )
            assert order_resp.status_code == 200
            order_a_id = order_resp.json()["order_id"]

    # Attacker B attempts to query User A's order
    async with AsyncClient(transport=transport, base_url="http://test") as client_b:
        client_b.cookies.set("openocr_session", token_b)

        # Query User A's order
        idor_resp = await client_b.get(f"/v1/billing/orders/{order_a_id}")
        assert idor_resp.status_code == 404  # Zero information leakage (not 403)

        # Attacker B queries invoices (must be empty)
        inv_resp = await client_b.get("/v1/billing/invoices")
        assert inv_resp.status_code == 200
        assert len(inv_resp.json()) == 0


@pytest.mark.asyncio
async def test_unverified_email_cannot_initiate_checkout():
    """Enforces policy requiring email verification before purchasing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        user, token = await create_user_with_session("unverified@example.com", verified=False)
        client.cookies.set("openocr_session", token)

        resp = await client.post(
            "/v1/billing/checkout",
            json={"plan_code": "pack_starter_usd", "idempotency_key": "idemp_unverified_999"},
            headers={"X-Requested-With": "OpenOCR-Web"},
        )
        assert resp.status_code == 403
        assert "verify your email" in resp.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_billing_disabled_environment_toggle():
    """Verifies that self-hosted / air-gapped instances cleanly disable billing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        user, token = await create_user_with_session("airgapped@example.com")
        client.cookies.set("openocr_session", token)

        # Toggle billing disabled
        original_val = settings.BILLING_ENABLED
        try:
            settings.BILLING_ENABLED = False

            # Status endpoint shows disabled
            status_resp = await client.get("/v1/billing/status")
            assert status_resp.status_code == 200
            assert status_resp.json()["billing_enabled"] is False

            # Checkout returns 503 Service Unavailable with zero network calls
            chk_resp = await client.post(
                "/v1/billing/checkout",
                json={"plan_code": "pack_starter_usd", "idempotency_key": "idemp_airgap"},
                headers={"X-Requested-With": "OpenOCR-Web"},
            )
            assert chk_resp.status_code == 503
            assert "disabled" in chk_resp.json()["error"]["message"].lower()

        finally:
            settings.BILLING_ENABLED = original_val
