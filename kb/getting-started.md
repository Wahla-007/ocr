---
title: "Getting Started with OpenOCR"
slug: "getting-started"
category: "Onboarding"
audience: "public"
last_reviewed: "2026-10-29"
owner: "engineering"
locale: "en"
related_links:
  - "/"
  - "/docs"
  - "/pricing"
---

# Getting Started with OpenOCR

You can use OpenOCR interactively through the Light Table playground or programmatically via the REST API.

## Interactive Playground (Light Table)
1. Navigate to the [Light Table Playground](/) on the homepage.
2. Drag and drop any document (PDF, PNG, JPG, WEBP, TIFF) onto the dropzone, or choose one of our verified specimen archives.
3. Choose your preferred output: Structured JSON, Semantic Markdown, or Plain Text.
4. Review extracted fields, bounding box alignments, and mathematical reconciliation in real time.

## Programmatic API Access
1. Sign up for an account at `/signup` or log in at `/login`.
2. Generate an API Key under `/pricing` (Developer or Enterprise tier).
3. Call `POST https://api.openocr.io/v1/extract` with your bearer token.
