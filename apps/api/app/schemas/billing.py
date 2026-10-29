"""Pydantic schemas for billing, checkout, catalog, subscriptions, and invoices."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class CheckoutRequest(BaseModel):
    """
    Checkout initiation request.
    Strictly accepts ONLY plan_code and idempotency_key to prevent client-side amount tampering.
    """

    plan_code: str = Field(
        ..., min_length=2, max_length=64, description="Server-side catalog item code"
    )
    idempotency_key: str = Field(
        ..., min_length=8, max_length=128, description="Client idempotency key"
    )


class CheckoutResponse(BaseModel):
    order_id: str
    checkout_url: str
    plan_code: str
    amount_minor: int
    currency: str


class CatalogItemResponse(BaseModel):
    code: str
    name: str
    type: str
    price_minor: int
    currency: str
    credits: int
    interval: str | None = None
    description: str


class CatalogListResponse(BaseModel):
    items: list[CatalogItemResponse]


class OrderResponse(BaseModel):
    id: str
    user_id: str
    plan_code: str
    amount_minor: int
    currency: str
    status: str
    provider: str
    created_at: datetime
    paid_at: datetime | None = None


class SubscriptionResponse(BaseModel):
    id: str
    user_id: str
    plan_code: str
    status: str
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool


class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    order_id: str
    amount_minor: int
    tax_minor: int
    currency: str
    status: str
    issued_at: datetime
    line_items_json: list[dict[str, Any]] | None = None


class BillingStatusResponse(BaseModel):
    billing_enabled: bool
    provider: str
    user_plan: str
    credit_balance: int
    subscription: SubscriptionResponse | None = None


class AdminRefundRequest(BaseModel):
    reason: str = Field("Administrative refund", max_length=256)
