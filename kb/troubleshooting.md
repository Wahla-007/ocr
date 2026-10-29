---
title: "Troubleshooting & Common Errors"
slug: "troubleshooting"
category: "Support"
audience: "public"
last_reviewed: "2026-10-29"
owner: "support"
locale: "en"
related_links:
  - "/docs#errors"
  - "/support"
---

# Troubleshooting & Common Errors

If you encounter issues while using OpenOCR, consult this troubleshooting matrix:

## Common Issues & Fixes
- **`FILE_TOO_LARGE` (HTTP 413):** Your file exceeds your plan's upload threshold. Use the Direct Signed Storage protocol (`POST /v1/uploads/sign`) or compress high-resolution image PDFs.
- **`UNSUPPORTED_TYPE` (HTTP 415):** The file format is not supported. Ensure your file is a PDF, PNG, JPG, WEBP, or TIFF.
- **`QUOTA_EXCEEDED` (HTTP 429):** Your account has depleted its daily page credits. Top up credits at `/pricing` or wait until midnight UTC for automatic reset.
- **`JOB_NOT_FOUND` (HTTP 404):** Job IDs expire 24 hours after completion. Ensure your poll loop queries the active job within that TTL.
- **Need Human Help?** Open a ticket at `/support` or use the OpenOCR Assistant chat widget to escalate directly to on-call engineers.
