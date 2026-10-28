"""Append-Only Usage Ledger Management and Credit Balance Math (Rule 9)."""

import logging
import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import UsageLedger, utc_now

logger = logging.getLogger("openocr.billing.ledger")


async def get_user_credit_balance(db: AsyncSession, user_id: str) -> int:
    """
    Computes real-time available credits from the append-only ledger.
    Accounting convention:
    - Grants & top-ups: negative integer (e.g. -10000 for a 10k pack)
    - Deductions & consumption: positive integer (e.g. +1 per page)
    - Available balance = -1 * SUM(credits)
    """
    stmt = select(UsageLedger.credits).where(UsageLedger.user_id == user_id)
    res = await db.execute(stmt)
    entries = res.scalars().all()
    if not entries:
        return 0

    net_credits = sum(entries)
    balance = -net_credits
    return balance


async def record_credit_grant(
    db: AsyncSession,
    user_id: str,
    order_id: str,
    credit_amount: int,
    reason: str,
    entry_type: str = "order_grant",
) -> UsageLedger:
    """
    Writes an immutable credit top-up to the usage ledger.
    Guaranteed idempotent by the unique constraint on (order_id, entry_type).
    """
    ledger_entry = UsageLedger(
        id=str(uuid.uuid4()),
        user_id=user_id,
        order_id=order_id,
        entry_type=entry_type,
        credits=-abs(credit_amount),  # Negative value represents credit addition
        reason=reason,
        created_at=utc_now(),
    )
    db.add(ledger_entry)
    await db.flush()  # Triggers IntegrityError if replayed order_id + entry_type
    logger.info(
        f"Credit grant recorded: user_id={user_id}, order_id={order_id}, credits=+{credit_amount}, type={entry_type}"
    )
    return ledger_entry


async def record_refund_reversal(
    db: AsyncSession,
    user_id: str,
    order_id: str,
    credit_amount: int,
    reason: str = "payment_refund_reversal",
) -> UsageLedger:
    """
    Writes a compensating positive ledger entry for a refund or chargeback.
    If user already consumed the credits, balance gracefully drops into negative,
    which safely pauses future jobs until settled.
    """
    ledger_entry = UsageLedger(
        id=str(uuid.uuid4()),
        user_id=user_id,
        order_id=order_id,
        entry_type="refund_deduction",
        credits=abs(credit_amount),  # Positive value represents credit deduction
        reason=reason,
        created_at=utc_now(),
    )
    db.add(ledger_entry)
    await db.flush()
    logger.warning(
        f"Compensating refund deduction written: user_id={user_id}, order_id={order_id}, credits=-{credit_amount}"
    )
    return ledger_entry
