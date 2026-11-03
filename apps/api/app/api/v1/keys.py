"""
API Keys management router for OpenOCR.
Provides CRUD operations for programmatic API credentials with plan enforcement.
"""

import secrets
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.config import PLAN_CONFIGS, settings
from app.db.models import ApiKey, User, utc_now
from app.db.session import get_db
from app.security.tokens import hash_token

router = APIRouter(prefix="/keys", tags=["API Keys"])


class CreateKeyRequest(BaseModel):
    name: str = Field(default="Developer Key", min_length=1, max_length=100)


class ApiKeyItem(BaseModel):
    id: str
    name: str
    key_prefix: str
    last_four: str
    created_at: str
    last_used_at: Optional[str] = None
    rate_limit: int = 120


class CreateKeyResponse(BaseModel):
    id: str
    name: str
    key: str
    key_prefix: str
    last_four: str
    created_at: str
    message: str


@router.get("", response_model=List[ApiKeyItem])
async def list_api_keys(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all active API keys for the current authenticated user."""
    stmt = (
        select(ApiKey)
        .where(ApiKey.user_id == user.id, ApiKey.revoked_at.is_(None))
        .order_by(ApiKey.created_at.desc())
    )
    res = await db.execute(stmt)
    keys = res.scalars().all()

    plan_cfg = PLAN_CONFIGS.get(user.plan, PLAN_CONFIGS.get("free"))
    rate_limit = 300 if user.plan in ("pro", "business", "admin") else 120

    items = []
    for k in keys:
        items.append(
            ApiKeyItem(
                id=k.id,
                name=k.name,
                key_prefix=k.key_prefix,
                last_four="••••",
                created_at=k.created_at.isoformat() if k.created_at else "",
                last_used_at=k.last_used_at.isoformat() if k.last_used_at else None,
                rate_limit=rate_limit,
            )
        )
    return items


@router.post("", response_model=CreateKeyResponse)
async def create_api_key(
    payload: CreateKeyRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a new programmatic API key.
    Enforces pricing tier alignment: Free plan cannot generate API keys.
    """
    user_plan = getattr(user, "plan", "free") or "free"

    # Plan check: Free tier does not permit programmatic API keys
    if user_plan == "free" and not getattr(user, "is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "PLAN_RESTRICTED",
                "message": (
                    "Programmatic API keys are not permitted on the Free Plan. "
                    "Programmatic API access requires an active Developer or Enterprise subscription. "
                    "Visit /pricing to upgrade."
                ),
                "upgrade_url": "/pricing",
            },
        )

    # Check max keys limit for this plan
    plan_cfg = PLAN_CONFIGS.get(user_plan, PLAN_CONFIGS.get("free"))
    max_allowed = plan_cfg.max_api_keys if plan_cfg else 1
    if getattr(user, "is_admin", False):
        max_allowed = 50

    count_stmt = select(ApiKey).where(ApiKey.user_id == user.id, ApiKey.revoked_at.is_(None))
    count_res = await db.execute(count_stmt)
    active_keys = count_res.scalars().all()

    if len(active_keys) >= max_allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "KEY_LIMIT_REACHED",
                "message": f"You have reached your limit of {max_allowed} active API key(s) on the {user_plan.capitalize()} plan. Revoke an existing key or upgrade your plan.",
            },
        )

    # Generate cryptographically secure token
    random_hex = secrets.token_hex(16)
    secret_key = f"ocr_live_{random_hex}"
    prefix = "ocr_live"
    last_four = random_hex[-4:]
    key_hash = hash_token(secret_key)

    new_key = ApiKey(
        user_id=user.id,
        name=payload.name.strip(),
        key_prefix=prefix,
        key_hash=key_hash,
        created_at=utc_now(),
    )
    db.add(new_key)
    await db.commit()
    await db.refresh(new_key)

    return CreateKeyResponse(
        id=new_key.id,
        name=new_key.name,
        key=secret_key,
        key_prefix=prefix,
        last_four=last_four,
        created_at=new_key.created_at.isoformat(),
        message="API key created successfully. Store this secret key securely; it cannot be shown again.",
    )


@router.delete("/{key_id}")
async def revoke_api_key(
    key_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke an active API key immediately."""
    stmt = select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == user.id)
    res = await db.execute(stmt)
    key = res.scalars().first()

    if not key or key.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "KEY_NOT_FOUND", "message": "API key not found or already revoked."},
        )

    key.revoked_at = utc_now()
    await db.commit()

    return {"message": "API key revoked successfully.", "id": key_id}
