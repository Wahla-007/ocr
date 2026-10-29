---
title: "Supported File Formats and Size Limits"
slug: "supported-formats"
category: "API & Ingestion"
audience: "public"
last_reviewed: "2026-10-29"
owner: "engineering"
locale: "en"
related_links:
  - "/docs#extract"
  - "/docs#uploads"
---

# Supported File Formats and Limits

OpenOCR supports standard document and image file formats:

## Allowed Formats (Validated via Magic Bytes)
- **PDF** (`application/pdf`) — Multi-page documents, forms, reports, contracts.
- **PNG** (`image/png`) — High-resolution scans and screenshots.
- **JPEG / JPG** (`image/jpeg`) — Phone captures and photos of receipts.
- **WEBP** (`image/webp`) — Optimized web scans.
- **TIFF** (`image/tiff`) — Archival microfilm and high-depth scans.

## Size & Page Limits
- **Free Tier:** Up to 10MB per file, maximum 5 pages per document.
- **Developer Tier:** Up to 35MB per file, maximum 50 pages per document.
- **Enterprise / Self-Hosted:** Up to 100MB per file via Direct Storage Uploads (`POST /v1/uploads/sign`), unlimited pages.
