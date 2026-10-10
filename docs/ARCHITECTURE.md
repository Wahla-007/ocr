# System Architecture & Non-Negotiable Rules

The Universal Document Extraction Platform is built around these non-negotiable architectural principles:

1. **Pipeline stages are separate modules:** `normalize`, `parse`, `classify`, `extract`, `validate`. Each has clear input/output models and independent test coverage.
2. **Two-stage intelligence:**
   - **PARSE (layout + OCR):** Produces blocks, bboxes, tables, markdown via deterministic layout engines (`ParseEngine`).
   - **UNDERSTAND (LLM on parsed text):** Derives document type and extracted key fields (`LLMProvider`).
3. **Auto-detect flow:** Document classification occurs first. Known types invoke specialized extractors; unknown types invoke discovery extractors. Adding document types requires only a schema JSON and prompt markdown.
4. **Vendor isolation:** All OCR and LLM vendors are strictly behind abstract interfaces in `/providers`. No vendor SDK is imported into core application logic.
5. **Async by default:** Heavy workloads execute in queue workers. Synchronous endpoints return in <500ms or poll/stream progress via SSE.
6. **Direct uploads:** Direct-to-storage signed URLs prevent file bytes from transiting through API servers.
7. **Comprehensive versioning:** Every extraction stores `engine_version`, `schema_version`, and `prompt_version`.
8. **Idempotency & caching:** SHA-256 content hashing guarantees cached results return immediately at zero credit cost.
9. **Append-only ledger:** `usage_ledger` records every credit transaction; balances are calculated, never directly mutated.
10. **Versioned prompts:** Prompts reside in `/prompts` as versioned files (`*.vN.md`).
11. **Prompt-injection defense:** Document contents are treated as untrusted data wrapped in strict boundary delimiters with explicit anti-injection instructions.
12. **Stable API contracts:** Responses conform to versioned contracts (`/v1`).
13. **Data privacy & retention:** Automatic lifecycle purging according to account tier. No raw document content logging.
14. **Secret hygiene:** All credentials supplied via environment variables (`.env`).
15. **Server-side quota enforcement:** File size, page counts, concurrency, and daily credit quotas enforced at API and worker boundaries.
