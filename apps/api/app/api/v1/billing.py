"""Billing, Payments, and Safepay Webhook API Endpoints (OWASP ASVS L2 / PCI DSS SAQ-A)."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.billing.catalog import get_all_catalog_items, get_catalog_item
from app.billing.ledger import get_user_credit_balance
from app.billing.providers import get_payment_provider
from app.billing.service import BillingService
from app.config import settings
from app.db.session import get_db
from app.db.models import User

from app.schemas.billing import (
    AdminRefundRequest,
    BillingStatusResponse,
    CatalogItemResponse,
    CatalogListResponse,
    CheckoutRequest,
    CheckoutResponse,
    InvoiceResponse,
    OrderResponse,
    SubscriptionResponse,
)

logger = logging.getLogger("openocr.billing.api")

router = APIRouter(prefix="/billing", tags=["Billing & Payments"])


@router.get("/status", response_model=BillingStatusResponse)
async def get_billing_status(
    user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns billing status, credit balance, and active subscription for the authenticated user."""
    if not settings.BILLING_ENABLED:
        return BillingStatusResponse(
            billing_enabled=False,
            provider="disabled",
            user_plan=user.plan if user else "free",
            credit_balance=0,
            subscription=None,
        )

    credit_balance = await get_user_credit_balance(db, user.id) if user else 0
    sub = await BillingService.get_user_subscription(db, user.id) if user else None
    sub_resp = None
    if sub:
        sub_resp = SubscriptionResponse(
            id=sub.id,
            user_id=sub.user_id,
            plan_code=sub.plan_code,
            status=sub.status,
            current_period_start=sub.current_period_start,
            current_period_end=sub.current_period_end,
            cancel_at_period_end=sub.cancel_at_period_end,
        )

    return BillingStatusResponse(
        billing_enabled=True,
        provider=settings.PAYMENT_PROVIDER,
        user_plan=user.plan if user else "free",
        credit_balance=credit_balance,
        subscription=sub_resp,
    )


@router.get("/catalog", response_model=CatalogListResponse)
async def list_catalog():
    """Lists available subscriptions and credit packs from the authoritative server-side catalog."""
    items = [
        CatalogItemResponse(
            code=item.code,
            name=item.name,
            type=item.type,
            price_minor=item.price_minor,
            currency=item.currency,
            credits=item.credits,
            interval=item.interval,
            description=item.description,
        )
        for item in get_all_catalog_items()
    ]
    return CatalogListResponse(items=items)


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    payload: CheckoutRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Initiates hosted checkout for a plan or credit pack.
    OWASP ASVS / PCI SAQ-A: Accepts ONLY plan_code and idempotency_key.
    Amount, currency, and credit quantities are strictly resolved server-side.
    """
    if not settings.BILLING_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "BILLING_DISABLED", "message": "Billing is disabled in this environment."},
        )

    # 1. Require verified email
    if not user.email_verified_at:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "EMAIL_UNVERIFIED",
                "message": "Please verify your email address before purchasing credits or subscriptions.",
            },
        )

    # 2. Validate plan_code
    catalog_item = get_catalog_item(payload.plan_code)
    if not catalog_item:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_PLAN", "message": f"Plan '{payload.plan_code}' is invalid or retired."},
        )

    # 3. Create order and get hosted checkout redirect URL
    try:
        order, checkout_url = await BillingService.create_checkout_order(
            db=db,
            user=user,
            plan_code=payload.plan_code,
            idempotency_key=payload.idempotency_key,
        )
        return CheckoutResponse(
            order_id=order.id,
            checkout_url=checkout_url,
            plan_code=order.plan_code,
            amount_minor=order.amount_minor,
            currency=order.currency,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "CHECKOUT_FAILED", "message": str(e)},
        )
    except Exception as e:
        logger.exception(f"Checkout initialization error for user {user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "CHECKOUT_ERROR", "message": "Failed to initialize payment gateway session."},
        )


@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order_status(
    order_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves status of an order.
    Enforces strict IDOR protection (user can only query their own orders).
    Polls Safepay API to self-heal if customer returns before webhook delivery.
    """
    try:
        order = await BillingService.poll_order_status(db=db, order_id=order_id, user_id=user.id)
        return OrderResponse(
            id=order.id,
            user_id=order.user_id,
            plan_code=order.plan_code,
            amount_minor=order.amount_minor,
            currency=order.currency,
            status=order.status,
            provider=order.provider,
            created_at=order.created_at,
            paid_at=order.paid_at,
        )
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ORDER_NOT_FOUND", "message": "Order not found."},
        )


@router.get("/subscription", response_model=Optional[SubscriptionResponse])
async def get_subscription(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns active subscription details for the authenticated user."""
    sub = await BillingService.get_user_subscription(db, user.id)
    if not sub:
        return None
    return SubscriptionResponse(
        id=sub.id,
        user_id=sub.user_id,
        plan_code=sub.plan_code,
        status=sub.status,
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
        cancel_at_period_end=sub.cancel_at_period_end,
    )


@router.post("/subscription/cancel", response_model=SubscriptionResponse)
async def cancel_subscription(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Schedules subscription cancellation at the end of the current billing cycle."""
    try:
        sub = await BillingService.cancel_subscription(db, user)
        return SubscriptionResponse(
            id=sub.id,
            user_id=sub.user_id,
            plan_code=sub.plan_code,
            status=sub.status,
            current_period_start=sub.current_period_start,
            current_period_end=sub.current_period_end,
            cancel_at_period_end=sub.cancel_at_period_end,
        )
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NO_ACTIVE_SUBSCRIPTION", "message": "No active subscription found to cancel."},
        )


@router.post("/subscription/resume", response_model=SubscriptionResponse)
async def resume_subscription(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Resumes an active subscription scheduled for cancellation."""
    try:
        sub = await BillingService.resume_subscription(db, user)
        return SubscriptionResponse(
            id=sub.id,
            user_id=sub.user_id,
            plan_code=sub.plan_code,
            status=sub.status,
            current_period_start=sub.current_period_start,
            current_period_end=sub.current_period_end,
            cancel_at_period_end=sub.cancel_at_period_end,
        )
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NO_ACTIVE_SUBSCRIPTION", "message": "No active subscription found to resume."},
        )


@router.get("/invoices", response_model=list[InvoiceResponse])
async def list_invoices(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns all issued invoices for the authenticated user (IDOR safe)."""
    invoices = await BillingService.get_user_invoices(db, user.id)
    return [
        InvoiceResponse(
            id=inv.id,
            invoice_number=inv.invoice_number,
            order_id=inv.order_id,
            amount_minor=inv.amount_minor,
            tax_minor=inv.tax_minor,
            currency=inv.currency,
            status=inv.status,
            issued_at=inv.issued_at,
            line_items_json=inv.line_items_json,
        )
        for inv in invoices
    ]


@router.post("/webhooks/safepay")
async def safepay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_sfpy_signature: Optional[str] = Header(None, alias="X-SFPY-SIGNATURE"),
):
    """
    Authoritative inbound Safepay webhook endpoint.
    - Constant-time HMAC-SHA512 verification over raw request body before parsing.
    - Fast 200 response with idempotent fulfillment.
    - Exempt from CSRF and session auth; strictly protected by cryptographic signature.
    """
    raw_body = await request.body()

    # Reject bodies that exceed 256KB to guard against memory exhaustion
    if len(raw_body) > 262144:
        logger.warning(f"Rejected oversized webhook payload: {len(raw_body)} bytes")
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={"code": "PAYLOAD_TOO_LARGE", "message": "Payload exceeds allowed size."},
        )

    provider = get_payment_provider()

    # 1. Constant-time signature verification
    if not x_sfpy_signature or not provider.verify_webhook_signature(raw_body, x_sfpy_signature):
        logger.warning("Safepay webhook signature verification failed.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_SIGNATURE", "message": "Webhook signature verification failed."},
        )

    # 2. Parse event payload
    try:
        event = provider.parse_webhook_event(raw_body, x_sfpy_signature)
    except Exception as e:
        logger.warning(f"Failed to parse Safepay webhook payload: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "MALFORMED_PAYLOAD", "message": "Unable to parse webhook payload."},
        )

    # 3. Process event with deduplication and DB row lock
    success = await BillingService.process_webhook_event(db=db, event=event, raw_body=raw_body)

    if not success:
        logger.error(f"Failed to process Safepay webhook event {event.event_id}")

    return {"status": "received", "event_id": event.event_id}


@router.post("/admin/refund/{order_id}")
async def admin_refund(
    order_id: str,
    payload: AdminRefundRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Administrative refund endpoint for ops runbook. Restricted to admin users."""
    # Ensure user has admin privileges
    if getattr(user, "plan", "") != "enterprise" and not getattr(user, "is_superuser", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Administrative privileges required."},
        )

    try:
        await BillingService.admin_refund_order(db=db, order_id=order_id, reason=payload.reason)
        return {"status": "success", "message": f"Order {order_id} refunded successfully."}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "REFUND_ERROR", "message": str(e)},
        )
