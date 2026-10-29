---
title: "Rate Limits and Quotas"
slug: "rate-limits-and-credits"
category: "Billing & Limits"
audience: "public"
last_reviewed: "2026-10-29"
owner: "engineering"
locale: "en"
related_links:
  - "/pricing"
  - "/docs#ratelimits"
---

# Rate Limits and Credit Quotas

OpenOCR uses Redis-backed sliding-window rate limiters. Every API response includes standardized headers:

## Response Headers
- `X-RateLimit-Limit`: Maximum requests per minute allowed (e.g. 120, 300, 600).
- `X-RateLimit-Remaining`: Requests remaining in the current 60-second window.
- `X-Quota-Limit`: Total daily page credits for your plan.
- `X-Quota-Remaining`: Unused credits remaining today.
- `X-Quota-Reset`: Unix timestamp when daily credits reset (Midnight UTC).

## Handling HTTP 429
If your client receives `429 Too Many Requests`, check the `Retry-After` header and wait with exponential backoff before retrying.
