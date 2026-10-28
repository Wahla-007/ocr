"""PayFast Payment Gateway Stub Provider (Ready for multi-gateway expansion)."""

import logging
from typing import Optional

from app.billing.providers.base import (
    CheckoutSessionResult,
    PaymentProvider,
    PaymentStatusResult,
    RefundResult,
    WebhookEventData,
)

logger = logging.getLogger("openocr.billing.payfast")


class PayFastProvider(PaymentProvider):
    """Stub implementation of PayFast for future Pakistani multi-gateway routing."""

    def __init__(self, merchant_id: Optional[str] = None, secured_key: Optional[str] = None):
        self.merchant_id = merchant_id or ""
        self.secured_key = secured_key or ""

    async def create_checkout_session(
        self,
        order_id: str,
        amount_minor: int,
        currency: str,
        success_url: str,
        cancel_url: str,
        customer_email: Optional[str] = None,
    ) -> CheckoutSessionResult:
        raise NotImplementedError("PayFast gateway integration is not yet active. Set PAYMENT_PROVIDER=safepay.")

    async def fetch_payment_status(self, provider_ref: str) -> PaymentStatusResult:
        raise NotImplementedError("PayFast gateway status check not yet active.")

    def verify_webhook_signature(self, headers: dict[str, str], raw_body: bytes) -> bool:
        return False

    def parse_webhook_event(self, raw_body: bytes) -> WebhookEventData:
        raise NotImplementedError("PayFast webhook parsing not yet active.")

    async def create_refund(
        self,
        provider_ref: str,
        amount_minor: int,
        reason: str = "",
    ) -> RefundResult:
        raise NotImplementedError("PayFast refunds not yet active.")
