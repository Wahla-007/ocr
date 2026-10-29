---
title: "API Quickstart and Authentication"
slug: "api-quickstart"
category: "API & SDK"
audience: "public"
last_reviewed: "2026-10-29"
owner: "engineering"
locale: "en"
related_links:
  - "/docs#auth"
  - "/docs#extract"
  - "/pricing"
---

# API Quickstart & Authentication

All programmatic API requests require a Bearer token in the `Authorization` header:

```bash
Authorization: Bearer ocr_live_your_developer_key
```

## Quick Example (cURL)
```bash
curl -X POST "https://api.openocr.io/v1/extract" \
  -H "Authorization: Bearer ocr_live_your_developer_key" \
  -F "file=@invoice.pdf" \
  -F "wait=true" \
  -F "format=json"
```

## Key Prefixes
- `ocr_live_*`: Production keys that debit account credits.
- `ocr_test_*`: Testing/sandbox keys with synthetic mock responses.
