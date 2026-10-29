---
title: "What is OpenOCR?"
slug: "what-is-openocr"
category: "General"
audience: "public"
last_reviewed: "2026-10-29"
owner: "engineering"
locale: "en"
related_links:
  - "/docs"
  - "/pricing"
  - "/self-hosted"
---

# What is OpenOCR?

OpenOCR is a research-grade, zero-selection document intelligence platform designed for developers, finance/operations teams, and privacy-conscious enterprises.

## Core Capabilities
- **Zero Schema Selection:** Upload any PDF, image, or receipt. OpenOCR automatically classifies the document (commercial invoice, receipt, driver's license, contract), extracts bounding boxes, identifies tables, and outputs structured JSON without manual template creation.
- **Two-Stage Architecture:** 
  1. *Parse Phase:* Deterministic layout engines (IBM Docling with PaddleOCR/RapidOCR fallbacks) extract reading order, tables, and bounding boxes.
  2. *Understand Phase:* Isolated LLM structuring layers validate data types, reconcile mathematical arithmetic (e.g. `subtotal + tax == total`), and normalize fields.
- **Pure CPU & Air-Gap Capable:** The extraction pipeline runs in <20MB RAM per worker thread on standard x86 CPU hardware and can be deployed completely offline in air-gapped VPCs.
