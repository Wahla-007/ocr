"""Abstract Payment Gateway Provider Interface (PCI DSS SAQ-A Compliant)."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class CheckoutSessionResult:
    checkout_url: str
    provider_ref: str  # Safepay tracker token or equivalent
    order_id: str | None = None


@dataclass
class PaymentStatusResult:
    is_paid: bool
    status: str  # 'paid', 'failed', 'pending', 'canceled'
    amount_minor: int
    currency: str
    provider_ref: str
    raw_response: dict[str, Any]


@dataclass
class RefundResult:
    success: bool
    refund_id: str
    amount_minor: int
    error: str | None = None


@dataclass
class WebhookEventData:
    event_id: str
    event_type: str  # 'payment.completed', 'payment.failed', 'refund.created', etc.
    provider_ref: str  # tracker token
    order_id: str | None
    amount_minor: int
    currency: str
    raw_data: dict[str, Any]


class PaymentProvider(ABC):
    """Abstract Interface for Payment Gateway Providers."""

    @abstractmethod
    async def create_checkout_session(
        self,
        order_id: str,
        amount_minor: int,
        currency: str,
        success_url: str,
        cancel_url: str,
        customer_email: str | None = None,
    ) -> CheckoutSessionResult:
        """Initializes a hosted payment order and returns the customer redirection URL."""
        pass

    @abstractmethod
    async def fetch_payment_status(self, provider_ref: str) -> PaymentStatusResult:
        """Fetches the authoritative status of a transaction from the payment gateway."""
        pass

    @abstractmethod
    def verify_webhook_signature(self, arg1: Any, arg2: Any = None) -> bool:
        """Verifies the authenticity and integrity of an incoming webhook payload using constant-time HMAC."""
        pass

    @abstractmethod
    def parse_webhook_event(
        self, raw_body: bytes, signature: str | None = None
    ) -> WebhookEventData:
        """Parses the raw webhook body into a normalized WebhookEventData structure."""
        pass

    @abstractmethod
    async def create_refund(
        self,
        provider_ref: str,
        amount_minor: int,
        reason: str = "",
    ) -> RefundResult:
        """Submits a refund request for a previously settled payment transaction."""
        pass
