---
title: "Privacy, Data Retention and Security"
slug: "privacy-and-retention"
category: "Security"
audience: "public"
last_reviewed: "2026-10-29"
owner: "security"
locale: "en"
related_links:
  - "/self-hosted"
  - "/docs#auth"
---

# Privacy, Data Retention & Security

We believe document intelligence must prioritize trust, privacy, and sovereignty:

## Key Guarantees
- **No Model Training:** Customer documents and extraction results are **never** used to train AI models.
- **Short-Lived Retention:** By default, uploaded document bytes are retained for 24 hours to allow job retrieval, after which raw files are permanently purged from object storage.
- **Argon2id Hashing:** API keys and passwords are encrypted with Argon2id using unique cryptographic salts.
- **Air-Gapped Capable:** In self-hosted mode, OpenOCR makes zero outbound network calls.
