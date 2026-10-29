---
title: "Self-Hosted and On-Premises Deployment"
slug: "self-hosted"
category: "Infrastructure"
audience: "public"
last_reviewed: "2026-10-29"
owner: "devops"
locale: "en"
related_links:
  - "/self-hosted"
  - "/docs#selfhosted"
---

# Self-Hosted and On-Premises Deployment

OpenOCR can be deployed completely within your private VPC or on-premises Kubernetes cluster:

## Prerequisites
- **CPU:** Modern x86_64 CPU with AVX2 instruction set (Intel Haswell / AMD Zen 2 or newer).
- **RAM:** Minimum 4GB RAM for full cluster (API + Worker + Redis + PostgreSQL + MinIO).
- **GPU:** Optional. IBM Docling and PaddleOCR run performantly on pure CPU (<500ms/page).

## Docker Compose Quickstart
```bash
git clone https://github.com/openocr/openocr.git
cd openocr
docker compose -f docker-compose.selfhosted.yml up -d
```
All static assets and OCR model weights are bundled locally. No external requests are made.
