# Architecture Migration Plan: Replacing Local OCR Engines with OmniRoute Vision Models

**Document Version:** 1.0.0  
**Target Branch:** `AI-assisted`  
**Author:** Senior Staff Engineer / Security Engineer  
**Status:** Approved for Implementation  

---

## 1. Executive Summary & Problem Statement

OpenOCR currently relies on local ML layout and OCR libraries:
- **IBM Docling**, **PaddleOCR**, and **RapidOCR-ONNXRuntime**
- Heavy dependencies: `torch`, `paddlepaddle`, ONNX runtimes, and local model checkpoints (>2.5 GB image footprints, cold-start latency >15s).
- Fragile multi-step heuristic post-processing trying to align layout blocks to text strings.

### Target Vision Architecture
Replace local ML OCR with an agile **Rasterize -> Vision LLM Gateway (OmniRoute)** architecture:
1. **Stage 1 (Ingest & Sandbox):** Ingestion validation (magic bytes, decompression bomb limits, active PDF script stripping, new DOCX and TIFF validation).
2. **Stage 2 (Rasterization):** Lightweight, model-free page rendering via `pypdfium2` (150-200 DPI, long edge <= 2000px, JPEG/PNG) + `Pillow` for image normalization + `pypdfium2.textpage` word bounding-box extraction for digital PDFs.
3. **Stage 3 (Vision Extraction):** Async calls through local **OmniRoute Gateway** (`http://127.0.0.1:20128/v1`) using `AsyncOpenAI`. Structured JSON output matching canonical schemas (`schemas/*.json`) with `json_schema` (strict) mode and `json_object` fallback.
4. **Stage 4 (Validation & BBox Snapping):** Deterministic domain validators (MRZ checksums, invoice math, date sanity), model-to-canvas coordinate mapping, and snapping to digital PDF word rectangles.
5. **Persistence, SSE & Billing:** Token recording in `usage_ledger`, SSE live progress emission, customer per-page charging, and prompt-versioned SHA-256 caching.

---

## 2. Reconnaissance & Gap Analysis

| Component | Current State | Target State | Risks & Mitigations |
| :--- | :--- | :--- | :--- |
| **PDF Rendering** | `pymupdf` (fitz) pixmaps in `normalize.py` | `pypdfium2` rendering with word rectangles extraction in `rasterize.py` | Low risk. `pypdfium2` is already installed in `.venv` and produces clean pixel buffers and word bounding boxes. |
| **DOCX Handling** | Unsupported (rejected by magic bytes) | Supported via `soffice --headless` conversion in sandboxed temp directory | LibreOffice may not be installed in all dev environments. Fallback: return descriptive `UnsupportedTypeError` if `soffice` is not present. |
| **OCR Engines** | `docling_engine.py` + `fallback_engine.py` | Completely removed; uninstalled from `pyproject.toml` and Dockerfiles | Ensure all test fixtures and CLI scripts referencing `parse_document` are migrated to `rasterize_document` + `VisionProvider`. |
| **LLM Provider** | `GeminiLLMProvider` sending text in `understand.py` | `OmniRouteVisionProvider` sending base64 `image_url` parts with schema | Model routes might reject strict JSON schemas; mitigation: automatic fallback to `json_object` + Pydantic validation. |
| **BBox Mapping** | Fuzzy text search matching extracted string to OCR block bboxes | Model outputs normalized `box_2d [ymin, xmin, ymax, xmax]` 0-1000 + snap to `TextLayer` word rects | Model boxes may occasionally have minor displacement; snapped to exact digital font rects when available. |
| **Database Schema** | `usage_ledger` stores only credits & reason | `usage_ledger` gains `prompt_tokens`, `completion_tokens`, `model`, `attempts`, `pages` | Created in new Alembic migration `004_vision_models_and_settings.py` without touching old migrations. |
| **Tenant Settings** | No third-party processing restriction | `users.third_party_processing_allowed` boolean setting | Defaults to `true`. When `false`, worker routes strictly to local Ollama provider. |
| **SSE Progress** | Generic status changes | Finer grained SSE events: `rasterizing`, `classifying`, `extracting`, `validating`, `escalating`, `completed`, `failed` | Backward-compatible: existing clients ignoring unknown SSE events continue to work. |

---

## 3. Detailed Phase Breakdown & Execution Plan

### Phase 1: Recon & Plan (Current)
- Complete codebase audit.
- Write `docs/MIGRATION_PLAN.md` and report findings.

### Phase 2: Configuration & Secrets Hygiene
- Define clean environment variables in `apps/worker/worker/config.py` and `apps/api/app/config.py`:
  - `OMNIROUTE_BASE_URL` (default: `http://127.0.0.1:20128/v1`)
  - `OMNIROUTE_API_KEY` (dedicated worker API key, e.g. `sk-openocr-worker-live-2026`)
  - `OMNIROUTE_MODEL_CHAIN` (default: `gemini/gemini-2.5-flash,gemini/gemini-2.5-pro,auto`)
  - `VISION_MAX_PAGES_PER_CHUNK` (default: `6`)
  - `EXTRACTION_MODE` (default: `two_step`)
  - `PROMPT_VERSION` (default: `v1`)
- Update `.env.example` with clear placeholders (no real secrets committed).
- Verify OmniRoute local binding to `127.0.0.1` and document firewall rule in `docs/OPERATIONS.md`.

### Phase 3: Rasterizer Pipeline & Legacy OCR Dependency Removal
- Create `apps/worker/worker/pipeline/rasterize.py`:
  - `RasterPage`: `page_number`, `width_px`, `height_px`, `image_bytes`, `mime_type`, `text_layer: TextLayer | None`.
  - PDF: render pages via `pypdfium2` at 150-200 DPI, long edge capped at 2000px, JPEG/PNG.
  - Extract word rects from `textpage` for digital PDFs (`WordRect(text, x, y, width, height)`).
  - Images: Pillow EXIF orientation, multi-frame TIFF to pages, resize.
  - DOCX: headless LibreOffice sandbox conversion to PDF, then rasterize.
- Remove `docling`, `paddleocr`, `rapidocr-onnxruntime`, `paddlepaddle`, `torch` from `apps/worker/pyproject.toml`, `providers/pyproject.toml`, Dockerfiles, and CI workflows.
- Clean up legacy engine references in `providers/engines/`.

### Phase 4: OmniRoute Vision Provider & Prompt Defense
- Create `providers/llm/prompts.py`:
  - Versioned prompt `PROMPT_VERSION = "v1"`.
  - Role: high-precision document extraction engine.
  - Prompt injection defense: document image contents strictly treated as unverified data.
  - Field and `box_2d` extraction instructions.
- Create `providers/llm/schema_generator.py`:
  - Generates strict OpenAI JSON Schema parameters from `schemas/*.json` with `box_2d` coordinates.
- Create `providers/llm/omniroute.py`:
  - Implements `VisionProvider` protocol via `AsyncOpenAI`.
  - `extract()` sending base64 `image_url` parts.
  - Two-step classification & extraction logic.
  - Multi-page chunking (up to 6 pages per call) and deterministic result merging.
  - Escalation handling (`apps/worker/worker/pipeline/escalation.py`).

### Phase 5: Deterministic Validators & Quality Score
- Create `apps/worker/worker/validators/`:
  - `passport_mrz.py`: ICAO Doc 9303 Mod-10 (7-3-1 weights) check digits and VIZ cross-check.
  - `invoice_math.py`: line items sum, tax/discount arithmetic, date order sanity.
  - `receipt_math.py`: total == subtotal + tax check.
  - `bank_statement_math.py`: opening + credits - debits == closing balance check.
  - `driving_licence.py`: expiry > issue date, age sanity.
  - `generic.py`: ISO 8601 date, ISO 4217 currency, ISO 3166 country code validators.
- Replace arbitrary OCR confidence with algorithmic `quality_score` (0.0 to 1.0) derived from schema completeness and validator pass rates.

### Phase 6: Bounding Box Mapping & Text-Layer Snapping
- Create `apps/worker/worker/pipeline/bbox.py`:
  - Converts model `box_2d` (`[ymin, xmin, ymax, xmax]` 0-1000) to frontend canvas coordinates (`[x, y, width, height]`).
  - Text-layer snapping: for digital PDFs, find word rectangles matching extracted values near model box; set `box_source="text_layer"` or `box_source="model"`.
  - Non-fatal graceful degradation (missing boxes never fail the job).

### Phase 7: Database Migration, Usage Ledger & Deduplication
- Generate Alembic migration `004_vision_models_and_settings.py`:
  - `usage_ledger`: add `prompt_tokens`, `completion_tokens`, `model`, `attempts`, `pages`.
  - `users`: add `third_party_processing_allowed` (default: `true`).
- Update `UsageLedger` and `User` models in `apps/api/app/db/models.py`.
- Update Redis cache key to: `sha256(file_bytes + schema_type + PROMPT_VERSION + extraction_mode)`.

### Phase 8: API, SSE Streams & Frontend Enhancements
- Add `GET /v1/jobs/{job_id}/stream` SSE endpoint to `apps/api/app/api/v1/jobs.py`.
- Emit live stages: `rasterizing`, `classifying`, `extracting`, `validating`, `escalating`, `completed`, `failed`.
- Update `JobResponse` in `apps/api/app/schemas/jobs.py` with `model_used`, `quality_score`, `validation_issues`, and `box_source`.
- Add tenant setting endpoints `GET/PATCH /v1/auth/settings`.
- Update `apps/web`:
  - Playground: show active stage, model badge, dashed model box vs solid snapped box, validation warnings.
  - Settings: toggle for `third_party_processing_allowed`.
  - Privacy copy updates on `/pricing`, `/self-hosted`, and `/support`.

### Phase 9: Air-Gapped / Self-Hosted Mode & Ollama Provider
- Create `providers/llm/ollama.py`:
  - Local OpenAI-compatible vision provider for `qwen2.5vl` / `llama3.2-vision`.
  - JSON mode + Pydantic validation + one repair retry.
- Update `docker-compose.selfhosted.yml` and `Dockerfile.selfhosted` to remove RapidOCR/Docling and configure local Ollama vision.

### Phase 10: Testing, Documentation & Final Verification
- Comprehensive test suite covering:
  - Rasterizer formats (PDF, TIFF, rotated JPG, DOCX, bomb rejection).
  - OmniRoute vision provider with mocked responses (`respx`).
  - Validators (specimen MRZ, invoice math, etc.).
  - Bbox conversion and text-layer snapping.
  - Prompt injection resistance.
  - Token recording, deduplication cache, and tenant isolation.
  - Zero-knowledge logging assertions (no PII or raw text in logs).
- Create `docs/OPERATIONS.md`.
- Update `docs/ARCHITECTURE.md` and `README.md`.
