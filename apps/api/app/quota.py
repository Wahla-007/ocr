"""Rate limit and quota tracking utilities."""

import datetime

from app.config import PlanLimits
from fastapi import Response


def get_daily_reset_timestamp() -> int:
    """Calculates UTC timestamp of next midnight."""
    now = datetime.datetime.now(datetime.UTC)
    tomorrow = now.date() + datetime.timedelta(days=1)
    midnight = datetime.datetime.combine(tomorrow, datetime.time.min, tzinfo=datetime.UTC)
    return int(midnight.timestamp())


def inject_quota_headers(
    response: Response,
    plan: PlanLimits,
    credits_used_today: int = 0,
    requests_remaining_in_window: int = 60,
) -> None:
    """Injects standard rate limit and quota headers into the HTTP response."""
    quota_limit = plan.credits_per_day
    quota_remaining = max(0, quota_limit - credits_used_today)
    reset_ts = get_daily_reset_timestamp()

    response.headers["X-RateLimit-Limit"] = "60"
    response.headers["X-RateLimit-Remaining"] = str(max(0, requests_remaining_in_window))
    response.headers["X-Quota-Limit"] = str(quota_limit)
    response.headers["X-Quota-Remaining"] = str(quota_remaining)
    response.headers["X-Quota-Reset"] = str(reset_ts)
