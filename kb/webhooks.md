---
title: "HMAC Webhook Verification"
slug: "webhooks"
category: "Reliability"
audience: "public"
last_reviewed: "2026-10-29"
owner: "security"
locale: "en"
related_links:
  - "/docs#webhooks"
---

# HMAC Webhook Verification

When running asynchronous extraction jobs (`wait=false`), OpenOCR delivers the completed extraction to your configured webhook URL.

## Header Format
Each request includes the `X-OpenOCR-Signature` header:
```text
X-OpenOCR-Signature: t=1729900000,v1=a1b2c3d4e5f6...
```

## Security Requirements
1. **Clock Skew Check:** Reject payloads where `|now - t| > 300 seconds` to prevent replay attacks.
2. **Constant-Time Verification:** Compare signatures with `hmac.compare_digest` (Python) or `crypto.timingSafeEqual` (Node.js) to prevent timing attacks.
