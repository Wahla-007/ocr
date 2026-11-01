# OpenOCR: Universal Zero-Selection Document Extraction Platform

OpenOCR is a developer-first OCR and document intelligence platform. Drop **any** document or image (PDF, PNG, JPG, WEBP, TIFF, DOCX) and get structured key details, layout blocks with pixel-accurate bounding boxes, parsed tables, and clean markdown—**with zero document type selection**, powered by **OmniRoute vision models** and lightweight `pypdfium2` rendering.

---

## Architecture Overview

1. **Multimodal Vision Pipeline:** Ingestion & Sandbox &rarr; Page Rasterization (pypdfium2 / Pillow) &rarr; Vision Model Extraction (OmniRoute / Ollama) &rarr; Deterministic Validation & Bbox Snapping.
2. **Model-Free Worker:** Zero local OCR/layout model dependencies (PaddleOCR, RapidOCR, Docling removed). Worker boots in <500ms with negligible RAM footprint.
3. **Reasoning Escalation:** Automatic multi-model escalation (`gemini-2.5-flash` &rarr; `gemini-2.5-pro` &rarr; `auto`) when business validation checks fail.
4. **Air-Gapped Privacy Mode:** 100% offline self-hosted operation via local Ollama vision models (`qwen2.5vl` / `llama3.2-vision`) with zero external egress.
5. **Append-Only Ledger:** Token accounting and credit consumption strictly ledger-recorded.
6. **Prompt-Injection Defense:** All document content wrapped as untrusted data with strict schema enforcement.

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
