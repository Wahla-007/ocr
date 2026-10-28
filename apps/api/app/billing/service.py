"""Billing and Payment Processing Service (OWASP ASVS L2 / PCI DSS SAQ-A Compliant)."""

from datetime import UTC, datetime, timedelta
import hashlib
import logging
from typing import Optional
import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.billing.catalog import get_catalog_item
from app.billing.ledger import record_credit_grant, record_refund_reversal
from app.billing.providers import get_payment_provider
from app.billing.providers.base import WebhookEventData
from app.config import settings
from app.db.models import (
    Invoice,
    Order,
    PaymentEvent,
    ProductCatalog,
    Subscription,
    User,
    utc_now,
)
from app.services.email import EmailService, mask_email

logger = logging.getLogger("openocr.billing.service")


class BillingService:
    @staticmethod
    def get_app_url() -> str:
        """Determines trusted client base URL for hosted checkout redirects."""
        if hasattr(settings, "NEXT_PUBLIC_APP_URL") and settings.NEXT_PUBLIC_APP_URL:
            return settings.NEXT_PUBLIC_APP_URL.rstrip("/")
        if settings.CORS_ORIGINS:
            return settings.CORS_ORIGINS[0].rstrip("/")
        return "http://localhost:3000"

    @classmethod
    async def create_checkout_order(
        cls,
        db: AsyncSession,
        user: User,
        plan_code: str,
        idempotency_key: str,
        currency: Optional[str] = None,
    ) -> tuple[Order, str]:
        """
        Initializes an order from the server-side catalog and acquires hosted checkout redirect.
        Client CANNOT specify amount or credit counts (anti-tamper).
        """
        # 1. Require verified email before purchasing
        if not user.email_verified_at:
            raise ValueError("Please verify your email address before purchasing credits or plans.")

        # 2. Server-side Catalog Lookup
        catalog_item = get_catalog_item(plan_code)
        if not catalog_item:
            raise ValueError(f"Plan or credit pack '{plan_code}' is invalid or inactive.")

        # 3. Idempotency Check: User double-click / multi-tab duplicate request
        clean_key = idempotency_key.strip()
        stmt = select(Order).where(Order.idempotency_key == clean_key, Order.user_id == user.id)
        res = await db.execute(stmt)
        existing_order = res.scalar_one_or_none()

        provider = get_payment_provider()
        app_url = cls.get_app_url()

        if existing_order:
            logger.info(f"Reusing existing order {existing_order.id} for idempotency key {clean_key}")
            # If already paid, return existing state
            if existing_order.status == "paid":
                return existing_order, f"{app_url}/billing/success?order_id={existing_order.id}"

            # If still pending, re-acquire checkout URL
            checkout_res = await provider.create_checkout_session(
                order_id=existing_order.id,
                amount_minor=existing_order.amount_minor,
                currency=existing_order.currency,
                success_url=f"{app_url}/billing/success?order_id={existing_order.id}",
                cancel_url=f"{app_url}/billing/cancel?order_id={existing_order.id}",
                customer_email=user.email,
            )
            return existing_order, checkout_res.checkout_url

        # 4. Create new pending order
        order_id = str(uuid.uuid4())
        success_url = f"{app_url}/billing/success?order_id={order_id}"
        cancel_url = f"{app_url}/billing/cancel?order_id={order_id}"

        # 5. Initialize gateway checkout session
        checkout_res = await provider.create_checkout_session(
            order_id=order_id,
            amount_minor=catalog_item.price_minor,
            currency=catalog_item.currency,
            success_url=success_url,
            cancel_url=cancel_url,
            customer_email=user.email,
        )

        new_order = Order(
            id=order_id,
            user_id=user.id,
            plan_code=catalog_item.code,
            amount_minor=catalog_item.price_minor,
            currency=catalog_item.currency,
            status="pending",
            provider="safepay",
            provider_ref=checkout_res.provider_ref,
            idempotency_key=clean_key,
            metadata_json={
                "plan_name": catalog_item.name,
                "credits": catalog_item.credits,
                "type": catalog_item.type,
            },
        )
        db.add(new_order)
        await db.commit()
        await db.refresh(new_order)

        logger.info(
            f"Created pending order {order_id} for user {user.id} ({mask_email(user.email)}): "
            f"{catalog_item.price_minor} {catalog_item.currency}"
        )
        return new_order, checkout_res.checkout_url

    @classmethod
    async def fulfill_paid_order(
        cls,
        db: AsyncSession,
        order_id: str,
        provider_ref: Optional[str] = None,
    ) -> bool:
        """
        Fulfills a paid order with strict concurrency protection (FOR UPDATE row lock).
        Grants credits to append-only usage_ledger, updates subscription, and generates invoice.
        """
        stmt = select(Order).where(Order.id == order_id).with_for_update()
        res = await db.execute(stmt)
        order = res.scalar_one_or_none()

        if not order:
            logger.error(f"Cannot fulfill non-existent order {order_id}")
            return False

        # Idempotent guard: if already fulfilled, do nothing
        if order.status == "paid":
            logger.info(f"Order {order_id} has already been fulfilled; skipping duplicate processing.")
            return True

        catalog_item = get_catalog_item(order.plan_code)
        if not catalog_item:
            logger.error(f"Order {order_id} references invalid plan code {order.plan_code}")
            return False

        now = utc_now()

        # 1. Update Order Status
        order.status = "paid"
        order.paid_at = now
        if provider_ref:
            order.provider_ref = provider_ref

        # 2. Idempotent Usage Ledger Credit Grant (Rule 9)
        entry_type = "subscription_grant" if catalog_item.type == "subscription" else "order_grant"
        try:
            await record_credit_grant(
                db=db,
                user_id=order.user_id,
                order_id=order.id,
                credit_amount=catalog_item.credits,
                reason=f"Purchase: {catalog_item.name}",
                entry_type=entry_type,
            )
        except IntegrityError:
            logger.warning(f"Ledger entry for order {order_id} already exists via unique constraint.")

        # 3. Handle Subscription Plan Activation
        if catalog_item.type == "subscription":
            # Update user.plan
            user_stmt = select(User).where(User.id == order.user_id)
            user_res = await db.execute(user_stmt)
            user = user_res.scalar_one()
            user.plan = "starter" if "starter" in catalog_item.code else "developer"

            # Create or update subscription record
            period_days = 365 if catalog_item.interval == "year" else 30
            sub_stmt = select(Subscription).where(
                Subscription.user_id == order.user_id,
                Subscription.status == "active",
            )
            sub_res = await db.execute(sub_stmt)
            active_sub = sub_res.scalar_one_or_none()

            if active_sub:
                active_sub.plan_code = catalog_item.code
                active_sub.current_period_end = now + timedelta(days=period_days)
                active_sub.cancel_at_period_end = False
                active_sub.updated_at = now
            else:
                new_sub = Subscription(
                    user_id=order.user_id,
                    plan_code=catalog_item.code,
                    status="active",
                    current_period_start=now,
                    current_period_end=now + timedelta(days=period_days),
                    cancel_at_period_end=False,
                    provider="safepay",
                    provider_sub_id=order.provider_ref,
                )
                db.add(new_sub)

        # 4. Generate Formal Invoice / Receipt
        invoice_number = f"INV-{now.strftime('%Y%m')}-{order.id[:8].upper()}"
        inv_stmt = select(Invoice).where(Invoice.order_id == order.id)
        existing_inv = (await db.execute(inv_stmt)).scalar_one_or_none()

        if not existing_inv:
            invoice = Invoice(
                invoice_number=invoice_number,
                order_id=order.id,
                user_id=order.user_id,
                amount_minor=order.amount_minor,
                tax_minor=0,
                currency=order.currency,
                status="paid",
                line_items_json=[
                    {
                        "description": catalog_item.name,
                        "credits": catalog_item.credits,
                        "amount_minor": order.amount_minor,
                        "currency": order.currency,
                    }
                ],
                issued_at=now,
            )
            db.add(invoice)

        await db.commit()

        # 5. Fail-Safe Transactional Notification
        user_stmt = select(User).where(User.id == order.user_id)
        user = (await db.execute(user_stmt)).scalar_one_or_none()
        if user:
            amount_display = f"{order.amount_minor / 100:.2f} {order.currency}"
            await EmailService.send_payment_receipt_email(
                email=user.email,
                invoice_number=invoice_number,
                amount_display=amount_display,
                plan_name=catalog_item.name,
                credits_granted=catalog_item.credits,
            )

        logger.info(f"Order {order_id} fulfilled successfully. Credits granted: {catalog_item.credits}")
        return True

    @classmethod
    async def process_webhook_event(
        cls,
        db: AsyncSession,
        event: WebhookEventData,
        raw_body: bytes,
    ) -> bool:
        """
        Processes inbound Safepay webhook event with deduplication and idempotency.
        """
        # Deduplication check
        stmt = select(PaymentEvent).where(PaymentEvent.provider_event_id == event.event_id)
        res = await db.execute(stmt)
        if res.scalar_one_or_none():
            logger.info(f"Webhook event {event.event_id} already registered. Skipping.")
            return True

        # Log event audit record
        payload_hash = hashlib.sha256(raw_body).hexdigest()
        audit_event = PaymentEvent(
            provider="safepay",
            provider_event_id=event.event_id,
            event_type=event.event_type,
            raw_payload_hash=payload_hash,
            status="pending",
            payload_json=event.raw_data,
        )
        db.add(audit_event)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            return True  # Simultaneous webhook delivery deduplicated by database

        # Process event by type
        success = False
        try:
            if event.event_type in {"payment.completed", "order.completed", "charge.succeeded"}:
                # Locate target order
                order = None
                if event.order_id:
                    order = (await db.execute(select(Order).where(Order.id == event.order_id))).scalar_one_or_none()
                if not order and event.provider_ref:
                    order = (await db.execute(select(Order).where(Order.provider_ref == event.provider_ref))).scalar_one_or_none()

                if order:
                    success = await cls.fulfill_paid_order(
                        db=db,
                        order_id=order.id,
                        provider_ref=event.provider_ref,
                    )
                else:
                    logger.error(f"Webhook received for unknown order: ref={event.provider_ref}, order_id={event.order_id}")

            elif event.event_type in {"payment.failed", "charge.failed"}:
                if event.order_id:
                    order = (await db.execute(select(Order).where(Order.id == event.order_id))).scalar_one_or_none()
                    if order and order.status == "pending":
                        order.status = "failed"
                        await db.commit()
                success = True

            elif event.event_type in {"refund.created", "refund.completed"}:
                if event.order_id or event.provider_ref:
                    order_stmt = select(Order).where(
                        (Order.id == event.order_id) | (Order.provider_ref == event.provider_ref)
                    )
                    order = (await db.execute(order_stmt)).scalar_one_or_none()
                    if order and order.status == "paid":
                        catalog_item = get_catalog_item(order.plan_code)
                        refund_credits = catalog_item.credits if catalog_item else 0
                        order.status = "refunded"
                        order.refunded_at = utc_now()
                        if refund_credits > 0:
                            await record_refund_reversal(
                                db=db,
                                user_id=order.user_id,
                                order_id=order.id,
                                credit_amount=refund_credits,
                                reason="Safepay Refund Settlement",
                            )
                        await db.commit()
                success = True

            # Mark audit record processed
            audit_event.status = "processed" if success else "failed"
            audit_event.processed_at = utc_now()
            await db.commit()
            return success

        except Exception as exc:
            logger.exception(f"Unhandled error processing webhook event {event.event_id}: {exc}")
            audit_event.status = "failed"
            audit_event.error = str(exc)
            await db.commit()
            return False

    @classmethod
    async def poll_order_status(
        cls,
        db: AsyncSession,
        order_id: str,
        user_id: str,
    ) -> Order:
        """
        Retrieves order status for user. If pending, queries Safepay API to self-heal
        if customer returns before webhook arrived.
        """
        stmt = select(Order).where(Order.id == order_id, Order.user_id == user_id)
        res = await db.execute(stmt)
        order = res.scalar_one_or_none()

        if not order:
            raise KeyError("Order not found or unauthorized.")

        # If already paid, return immediately
        if order.status == "paid":
            return order

        # If pending and provider_ref exists, check Safepay Reporter API
        if order.status == "pending" and order.provider_ref:
            provider = get_payment_provider()
            status_res = await provider.fetch_payment_status(order.provider_ref)
            if status_res.is_paid:
                await cls.fulfill_paid_order(
                    db=db,
                    order_id=order.id,
                    provider_ref=order.provider_ref,
                )
                await db.refresh(order)

        return order

    @classmethod
    async def get_user_subscription(
        cls,
        db: AsyncSession,
        user_id: str,
    ) -> Optional[Subscription]:
        """Returns current active or past-due subscription for user."""
        stmt = (
            select(Subscription)
            .where(Subscription.user_id == user_id)
            .order_by(Subscription.created_at.desc())
        )
        res = await db.execute(stmt)
        return res.scalars().first()

    @classmethod
    async def cancel_subscription(
        cls,
        db: AsyncSession,
        user: User,
    ) -> Subscription:
        """Schedules subscription cancellation at the end of the current billing cycle."""
        stmt = select(Subscription).where(
            Subscription.user_id == user.id,
            Subscription.status == "active",
        )
        res = await db.execute(stmt)
        sub = res.scalar_one_or_none()

        if not sub:
            raise KeyError("No active subscription found to cancel.")

        sub.cancel_at_period_end = True
        sub.updated_at = utc_now()
        await db.commit()
        await db.refresh(sub)

        # Send cancellation notification
        catalog_item = get_catalog_item(sub.plan_code)
        plan_name = catalog_item.name if catalog_item else sub.plan_code
        end_date_str = sub.current_period_end.strftime("%B %d, %Y")
        await EmailService.send_subscription_canceled_email(
            email=user.email,
            plan_name=plan_name,
            end_date=end_date_str,
        )

        return sub

    @classmethod
    async def resume_subscription(
        cls,
        db: AsyncSession,
        user: User,
    ) -> Subscription:
        """Resumes a subscription that was previously scheduled for cancellation."""
        stmt = select(Subscription).where(
            Subscription.user_id == user.id,
            Subscription.status == "active",
        )
        res = await db.execute(stmt)
        sub = res.scalar_one_or_none()

        if not sub:
            raise KeyError("No active subscription found to resume.")

        sub.cancel_at_period_end = False
        sub.updated_at = utc_now()
        await db.commit()
        await db.refresh(sub)
        return sub

    @classmethod
    async def get_user_invoices(
        cls,
        db: AsyncSession,
        user_id: str,
    ) -> list[Invoice]:
        """Returns all issued invoices for the authenticated user."""
        stmt = (
            select(Invoice)
            .where(Invoice.user_id == user_id)
            .order_by(Invoice.issued_at.desc())
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())

    @classmethod
    async def admin_refund_order(
        cls,
        db: AsyncSession,
        order_id: str,
        reason: str = "Administrative refund",
    ) -> bool:
        """Issues an administrative refund and records compensating ledger entry."""
        stmt = select(Order).where(Order.id == order_id).with_for_update()
        res = await db.execute(stmt)
        order = res.scalar_one_or_none()

        if not order or order.status != "paid":
            raise ValueError(f"Order {order_id} not eligible for refund (current status: {order.status if order else 'None'}).")

        catalog_item = get_catalog_item(order.plan_code)
        credits_to_revert = catalog_item.credits if catalog_item else 0

        # Attempt gateway refund if provider_ref is present
        if order.provider_ref:
            provider = get_payment_provider()
            try:
                await provider.refund_payment(order.provider_ref, order.amount_minor, reason)
            except Exception as exc:
                logger.warning(f"Gateway refund API returned error: {exc}. Marking refund locally.")

        order.status = "refunded"
        order.refunded_at = utc_now()

        if credits_to_revert > 0:
            await record_refund_reversal(
                db=db,
                user_id=order.user_id,
                order_id=order.id,
                credit_amount=credits_to_revert,
                reason=reason,
            )

        # Update invoice status if present
        inv_stmt = select(Invoice).where(Invoice.order_id == order.id)
        invoice = (await db.execute(inv_stmt)).scalar_one_or_none()
        if invoice:
            invoice.status = "refunded"

        await db.commit()
        return True

