"""Integration tests for complete billing flow: checkout, webhooks, ledger, and invoices."""

from datetime import timedelta
import hashlib
import hmac
import json
from unittest.mock import AsyncMock, patch
import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.billing.ledger import get_user_credit_balance
from app.billing.providers.base import CheckoutSessionResult, PaymentStatusResult
from app.config import settings
from app.db.models import Invoice, Order, Subscription, UsageLedger, User, utc_now
from app.db.session import get_db
from app.main import app
from app.security.tokens import generate_secure_token, hash_token
from app.db.models import Session as DbSession


async def create_verified_user_session(client: AsyncClient, email: str = "billing_user@example.com") -> tuple[User, str]:
    """Helper to seed an active, verified user with an authenticated session."""
    db_factory = app.dependency_overrides[get_db]
    async for db in db_factory():
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            password_hash="argon2id_mock_hash",
            plan="free",
            email_verified_at=utc_now(),
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
async def test_full_subscription_checkout_and_webhook_flow():
    """Validates end-to-end checkout creation, webhook delivery, ledger grant, and invoice generation."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Seed verified user
        user, raw_token = await create_verified_user_session(client, "alice_billing@example.com")
        client.cookies.set("openocr_session", raw_token)


        # 2. Get Catalog
        cat_resp = await client.get("/v1/billing/catalog")
        assert cat_resp.status_code == 200
        items = cat_resp.json()["items"]
        assert len(items) >= 4
        assert any(i["code"] == "sub_developer_monthly_usd" for i in items)

        # 3. Create Checkout (mocking external Safepay API network call)
        with patch("app.billing.providers.safepay.SafepayProvider.create_checkout_session") as mock_checkout:
            mock_checkout.return_value = CheckoutSessionResult(
                checkout_url="https://sandbox.api.getsafepay.com/checkout/pay?beacon=tkn_123",
                provider_ref="trk_test_ref_001",
                order_id="will_be_replaced",
            )

            checkout_resp = await client.post(
                "/v1/billing/checkout",
                json={
                    "plan_code": "sub_developer_monthly_usd",
                    "idempotency_key": "idemp_test_user_unique_123",
                },
                headers={"X-Requested-With": "OpenOCR-Web"},
            )
            assert checkout_resp.status_code == 200
            order_data = checkout_resp.json()
            order_id = order_data["order_id"]
            assert order_data["amount_minor"] == 2900
            assert order_data["currency"] == "USD"
            assert "beacon=tkn_123" in order_data["checkout_url"]

            # 4. Idempotency Check: Re-submitting same key yields existing order
            repeat_resp = await client.post(
                "/v1/billing/checkout",
                json={
                    "plan_code": "sub_developer_monthly_usd",
                    "idempotency_key": "idemp_test_user_unique_123",
                },
                headers={"X-Requested-With": "OpenOCR-Web"},
            )
            assert repeat_resp.status_code == 200
            assert repeat_resp.json()["order_id"] == order_id


        # 5. Inbound Webhook Delivery (Simulating Safepay gateway)
        webhook_payload = {
            "event": "payment.completed",
            "data": {
                "tracker": "trk_test_ref_001",
                "token": "token_abc_xyz",
                "amount": 29.00,
                "currency": "USD",
                "metadata": {
                    "order_id": order_id,
                },
            },
        }
        raw_body = json.dumps(webhook_payload).encode("utf-8")
        webhook_secret = settings.SAFEPAY_WEBHOOK_SECRET or "sandbox_test_webhook_secret_key"
        settings.SAFEPAY_WEBHOOK_SECRET = webhook_secret

        sig = hmac.new(webhook_secret.encode("utf-8"), raw_body, hashlib.sha512).hexdigest()

        wh_resp = await client.post(
            "/v1/billing/webhooks/safepay",
            content=raw_body,
            headers={
                "Content-Type": "application/json",
                "X-SFPY-SIGNATURE": sig,
            },
        )
        assert wh_resp.status_code == 200
        assert wh_resp.json()["status"] == "received"

        # 6. Verify Database & Ledger State
        db_factory = app.dependency_overrides[get_db]
        async for db in db_factory():
            # Check Order
            order = (await db.execute(select(Order).where(Order.id == order_id))).scalar_one()
            assert order.status == "paid"
            assert order.paid_at is not None

            # Check Ledger Balance (Rule 9)
            balance = await get_user_credit_balance(db, user.id)
            assert balance == 10000

            # Check Active Subscription
            sub = (await db.execute(select(Subscription).where(Subscription.user_id == user.id))).scalar_one()
            assert sub.status == "active"
            assert sub.cancel_at_period_end is False

            # Check Invoice
            inv = (await db.execute(select(Invoice).where(Invoice.order_id == order_id))).scalar_one()
            assert inv.status == "paid"
            assert inv.amount_minor == 2900

        # 7. Check Invoices endpoint
        inv_resp = await client.get("/v1/billing/invoices")
        assert inv_resp.status_code == 200
        invoices = inv_resp.json()
        assert len(invoices) == 1
        assert invoices[0]["order_id"] == order_id

        # 8. Cancel Subscription at Period End
        cancel_resp = await client.post(
            "/v1/billing/subscription/cancel",
            headers={"X-Requested-With": "OpenOCR-Web"},
        )
        assert cancel_resp.status_code == 200
        assert cancel_resp.json()["cancel_at_period_end"] is True

        # 9. Resume Subscription
        resume_resp = await client.post(
            "/v1/billing/subscription/resume",
            headers={"X-Requested-With": "OpenOCR-Web"},
        )
        assert resume_resp.status_code == 200
        assert resume_resp.json()["cancel_at_period_end"] is False

