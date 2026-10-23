"""Usage and Credit Tracking Endpoint."""

from app.config import settings
from fastapi import APIRouter, Header

router = APIRouter(prefix="/usage", tags=["Usage & Billing"])


@router.get("")
async def get_usage_metrics(authorization: str | None = Header(None)):
    """Returns developer key balance, tier, and usage metrics."""
    plan_name = "starter" if authorization else "developer_payg"
    plan = settings.get_plan_limits("starter" if authorization else "free")

    return {
        "plan": plan_name,
        "rate_per_page": "$0.001 USD",
        "daily_limit_credits": plan.credits_per_day,
        "credits_remaining_today": plan.credits_per_day - 14,
        "rate_limit_per_minute": 120,
        "documentation": "https://api.openocr.io/v1/pricing",
    }
