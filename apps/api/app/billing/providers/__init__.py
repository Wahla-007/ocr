"""Payment Provider Factory and Registry."""

from app.billing.providers.base import PaymentProvider
from app.billing.providers.payfast import PayFastProvider
from app.billing.providers.safepay import SafepayProvider
from app.config import settings


def get_payment_provider() -> PaymentProvider:
    """Instantiates the configured payment gateway provider."""
    provider_name = getattr(settings, "PAYMENT_PROVIDER", "safepay").lower()
    if provider_name == "payfast":
        return PayFastProvider()
    return SafepayProvider()


__all__ = ["PaymentProvider", "SafepayProvider", "PayFastProvider", "get_payment_provider"]
