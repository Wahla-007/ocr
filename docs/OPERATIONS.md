# OpenOCR Operations & Runbook: OmniRoute Vision Integration

This runbook documents operational procedures, environment configurations, network security rules, escalation policies, and rollback procedures for OpenOCR's vision-based extraction pipeline.

---

## 1. Environment Variables Reference

| Variable | Default Value | Description | Sensitivity |
| :--- | :--- | :--- | :--- |
| `PROVIDER` | `omniroute` | Primary vision provider (`omniroute` or `ollama`) | Public |
| `OMNIROUTE_BASE_URL` | `http://127.0.0.1:20128/v1` | OpenAI-compatible endpoint of the OmniRoute gateway | Internal |
| `OMNIROUTE_API_KEY` | *(Set in deployment)* | Dedicated worker API key for OmniRoute | Secret |
| `OMNIROUTE_MODEL_CHAIN` | `gemini/gemini-2.5-flash,gemini/gemini-2.5-pro,auto` | Comma-separated escalation sequence for vision extraction | Public |
| `VISION_MAX_PAGES_PER_CHUNK` | `6` | Maximum rendered pages sent in a single LLM vision request | Public |
| `EXTRACTION_MODE` | `two_step` | `two_step` (cheap classification + schema extraction) or `single` (discriminated union) | Public |
| `PROMPT_VERSION` | `v1` | Prompt version identifier (included in tenant cache dedup key) | Public |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434/v1` | Endpoint for air-gapped / local Ollama vision provider | Internal |
| `OLLAMA_MODEL` | `qwen2.5vl` | Local vision model tag for Ollama | Public |

---

## 2. OmniRoute Security & Firewall Configuration

OmniRoute acts as a high-performance, model-routing gateway bridging OpenOCR workers to upstream multimodal AI models.

### Binding to Localhost
OmniRoute must bind strictly to `127.0.0.1` (or a dedicated internal Docker network). In `~/.omniroute/.env`:
```bash
HOST=127.0.0.1
PORT=20128
OMNIROUTE_API_KEY=sk-omniroute-master-key-2026
```

### Host Firewall Enforcement (UFW / IPTables)
Port 20128 MUST NOT be exposed to the public Internet:
```bash
# Block external inbound traffic to OmniRoute
sudo ufw deny 20128/tcp

# Ensure only loopback can connect
sudo iptables -A INPUT -p tcp -s 127.0.0.1 --dport 20128 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 20128 -j DROP
```

### Reverse Proxy (Nginx) Isolation
Nginx configuration must **never** route external paths (e.g. `/v1/*`) to `http://127.0.0.1:20128`. All public traffic terminates at `apps/api` (FastAPI) on port 8000.

---

## 3. Dedicated Worker API Keys

The worker pipeline must not use operator or master keys. Create and rotate a dedicated worker key in OmniRoute:

1. **Generate worker key**:
   ```bash
   omniroute keys add openocr-worker <generated_key>
   ```
2. **Assign in worker environment**:
   ```bash
   OMNIROUTE_API_KEY=sk-openocr-worker-live-2026
   ```
3. **Key Rotation Procedure**:
   - Issue a secondary key in OmniRoute.
   - Update `OMNIROUTE_API_KEY` in worker `.env` or Kubernetes secret.
   - Restart worker service: `pm2 restart ocr-worker` or rolling update deployment.
   - Revoke the retired key in OmniRoute.

---

## 4. Multi-Page Chunking & Model Escalation Chain

### Chunking Policy
- Documents are rasterized into `RasterPage` items capped at 2000px on the longest dimension (JPEG ~85% or PNG for high contrast).
- Pages are partitioned into chunks of up to `VISION_MAX_PAGES_PER_CHUNK` (default 6).
- **Merge Policy**:
  - `page 1` provides document classification and header fields (invoice number, issue date, vendor).
  - Array fields (`line_items`, `transactions`, `work_history`) are concatenated across all chunks in page order.
  - Summary / total fields (`total_amount`, `tax_amount`, `closing_balance`) are resolved from the final chunk containing totals.
  - Scalar fields are accepted from the first chunk in which they are populated with non-null values.

### Escalation Chain
The escalation sequence is evaluated deterministically:
1. **Primary Model**: `gemini/gemini-2.5-flash` (fast, cost-effective, high OCR accuracy).
2. **Escalation Trigger**:
   - JSON parsing fails or schema validation fails.
   - A deterministic business validator returns `severity="error"` (e.g. MRZ checksum mismatch, line-item math imbalance exceeding tolerance).
3. **Secondary Model**: `gemini/gemini-2.5-pro` (escalated for complex typography, blurry scans, dense tables).
4. **Final Fallback**: `auto` (smart routing alias).
5. **Circuit Breaker**: Capped at 3 total attempts per chunk. If all fail, the job fails with a structured error code (`EXTRACTION_VALIDATION_FAILED` or `PROVIDER_ERROR`).

---

## 5. Air-Gapped & Self-Hosted Mode

In strictly air-gapped environments without outbound cloud access:
1. Configure worker environment:
   ```bash
   PROVIDER=ollama
   OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
   OLLAMA_MODEL=qwen2.5vl
   ```
2. Pull the vision model onto the local Ollama instance:
   ```bash
   ollama pull qwen2.5vl:latest
   ```
3. Set tenant setting `third_party_processing_allowed=false` on users requiring 100% on-premises processing.

---

## 6. Rollback Procedures

If issues arise with vision extraction or gateway connectivity:
1. **Model Fallback**:
   Update `OMNIROUTE_MODEL_CHAIN` in `.env` to specify a stable fallback model, then restart the worker:
   ```bash
   OMNIROUTE_MODEL_CHAIN=gemini/gemini-2.5-flash
   pm2 restart ocr-worker
   ```
2. **Local Engine Standby**:
   The legacy fallback engine remains available if needed; set `LLM_PROVIDER=gemini` and restart the worker.
3. **Database Migration Rollback**:
   To roll back the vision ledger and tenant settings migration:
   ```bash
   cd apps/api
   alembic downgrade -1
   ```
