# OpenOCR: Universal Zero-Selection Document Extraction Platform

OpenOCR is a developer-first OCR and document intelligence platform. Drop **any** document or image (PDF, PNG, JPG, WEBP) and get structured key details, layout blocks with pixel-accurate bounding boxes, parsed tables, and clean markdown—**with zero document type selection**.

---

## Architecture Overview

1. **Pipeline Isolation:** Normalize &rarr; Parse &rarr; Classify &rarr; Extract &rarr; Validate.
2. **Two-Stage Intelligence:** Deterministic layout parsing (`ParseEngine`) followed by semantic understanding (`LLMProvider`).
3. **Vendor Agnostic:** All OCR engines (Docling, Surya, PaddleOCR) and LLMs (Gemini, Claude, GPT) are abstracted behind strict interfaces in `/providers`.
4. **Append-Only Ledger:** Usage and credits are strictly computed from the immutable `usage_ledger`.
5. **Prompt-Injection Defense:** Document text is treated as untrusted data with delimiters and format enforcement.

---

## Directory Structure

```text
openocr/
├── apps/
│   ├── api/          # FastAPI backend (endpoints, auth, db, models, migrations)
│   ├── worker/       # Async pipeline queue worker (arq / Redis)
│   └── web/          # Next.js 14 App Router (landing, playground, console)
├── providers/        # ParseEngine & LLMProvider interfaces and drivers
├── prompts/          # Versioned prompt templates (*.vN.md)
├── schemas/          # JSON Schema definitions for known document types
├── tests/
│   └── eval/         # Document accuracy and extraction evaluation harness
├── docs/             # Architecture, API specifications, and guides
├── docker-compose.yml# Local development orchestration
└── pyproject.toml    # Root Python workspace configuration
```

---

## Quick Start (Local Development)

### 1. Prerequisites
- Docker & Docker Compose
- Python 3.11+
- Node.js 20+

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Start Infrastructure & Services
```bash
docker-compose up -d
```
This boots:
- PostgreSQL (`5432`)
- Redis (`6379`)
- MinIO Object Storage (`9000`, console at `9001`)
- API (`8000`)
- Queue Worker
- Next.js Web (`3000`)

### 4. Health Check
```bash
curl http://localhost:8000/health
```

### 5. Running Migrations Manually
```bash
cd apps/api
alembic upgrade head
```

### 6. Running Tests
```bash
# Python tests
pytest

# Web tests & type-checking
cd apps/web && npm run type-check
```
