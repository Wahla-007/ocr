# OpenOCR Quality Baseline Report (Phase 0)

**Date of Measurement:** 2026-10-29  
**Environment:** Windows 10/11, Python 3.11.17 (CPython via `uv`), Node.js v24.19.0, Next.js 16.3.8, PostgreSQL/SQLite, Redis.  
**Objective:** Objective, unpadded, reproducible measurements of the entire OpenOCR codebase prior to changes.

---

## 1. Test Suite Baseline (pytest)

### Test Session Summary
* **Total Collected:** 72 test cases
* **Passed:** 69 (95.8%)
* **Failed:** 3 (4.2%)
* **Warnings:** 5
* **Execution Duration:** 166.29s (2 minutes, 46 seconds)

### Failure Breakdown
All 3 failures originate from `tests/test_api_metering.py`:
1. `FAILED tests/test_api_metering.py::test_free_tier_rejects_more_than_two_pages`
   - **Assertion:** Expected HTTP `402 Payment Required`, got HTTP `403 Forbidden`.
   - **Error Payload:** `{"code":"API_KEY_NOT_ALLOWED_ON_FREE_PLAN","message":"API keys are not permitted on the Free Plan. Programmatic API access requires a Developer or Enterprise paid plan."}`
2. `FAILED tests/test_api_metering.py::test_free_tier_accepts_one_or_two_pages`
   - **Assertion:** Expected HTTP `200 OK`, got HTTP `403 Forbidden` (`API_KEY_NOT_ALLOWED_ON_FREE_PLAN`).
3. `FAILED tests/test_api_metering.py::test_free_tier_lifetime_five_items_limit`
   - **Assertion:** Item 1 expected HTTP `200 OK`, got HTTP `403 Forbidden` (`API_KEY_NOT_ALLOWED_ON_FREE_PLAN`).

**Root Cause:**
The test suite attempts to use arbitrary synthesized keys (e.g. `ocr_free_test_*`) without active paid entitlements. Current security middleware strictly enforces that programmatic API access is reserved for Developer Pro and Enterprise plans. The test expectations reflect an older schema where free users were granted synthetic programmatic keys.

---

## 2. Test Coverage per Package (`pytest-cov`)

* **Total Tracked Statements:** 2,412
* **Missed Statements:** 764
* **Aggregate Line Coverage:** **68%**

### Package Breakdown

#### `apps/api` (FastAPI Core & Security)
| Module Path | Statements | Missed | Line Coverage | Assessment |
| :--- | :---: | :---: | :---: | :--- |
| `app/security/tokens.py` | 10 | 0 | **100%** | Critical invariant met |
| `app/security/password.py` | 81 | 6 | **93%** | Meets ≥90% security target |
| `app/security/cookies.py` | 28 | 3 | **89%** | Close to 90% target |
| `app/middleware/security.py` | 50 | 3 | **94%** | Meets ≥90% security target |
| `app/billing/catalog.py` | 25 | 2 | **92%** | Meets ≥90% billing target |
| `app/billing/providers/base.py` | 47 | 5 | **89%** | Solid provider coverage |
| `app/quota.py` | 17 | 0 | **100%** | Full coverage |
| `app/config.py` | 60 | 0 | **100%** | Full coverage |
| `app/errors.py` | 38 | 5 | **87%** | High coverage |
| `app/main.py` | 48 | 4 | **92%** | High coverage |
| `app/billing/ledger.py` | 28 | 8 | **71%** | Target is ≥90% (needs tests) |
| `app/api/v1/health.py` | 49 | 7 | **86%** | High coverage |
| `app/api/v1/chat.py` | 61 | 15 | **75%** | Moderate coverage |
| `app/services/email.py` | 88 | 35 | **60%** | Moderate coverage |
| `app/storage.py` | 52 | 21 | **60%** | S3 direct storage needs mocks |
| `app/api/v1/billing.py` | 105 | 49 | **53%** | Needs checkout & webhook tests |
| `app/api/v1/jobs.py` | 152 | 73 | **52%** | Unpolled states need tests |
| `app/api/v1/auth.py` | 267 | 173 | **35%** | **Under-tested** (target ≥90%) |
| `app/billing/service.py` | 243 | 183 | **25%** | **Under-tested** (target ≥90%) |

#### `apps/worker` (OCR & LLM Pipeline)
| Module Path | Statements | Missed | Line Coverage | Assessment |
| :--- | :---: | :---: | :---: | :--- |
| `worker/config.py` | 21 | 0 | **100%** | Full coverage |
| `worker/pipeline/understand.py` | 61 | 8 | **87%** | Strong LLM coverage |
| `worker/pipeline/parse.py` | 23 | 6 | **74%** | Good Docling/Paddle coverage |
| `worker/tasks.py` | 70 | 18 | **74%** | Celery/ARQ task flow |
| `worker/pipeline/normalize.py` | 76 | 31 | **59%** | Edge-case skew/DPI needs tests |
| `worker/main.py` | 17 | 17 | **0%** | Worker startup loop unexercised |

---

## 3. Static Analysis & Type Checking

### Python (`ruff` & `mypy`)
* **`ruff check .`**: Found **557 errors** across the repository.
  * 109 automatically fixable (`ruff check --fix`).
  * Primary categories: `E501` (lines exceeding 100 chars), `I001` (un-sorted import blocks), `F401` (unused imports), `E402` (module-level imports following `sys.path`).
* **`mypy` Type Checker**:
  * `apps/api`: **20 errors** in 9 files.
    * `app/billing/service.py:503`: Attribute error — `PaymentProvider` missing `refund_payment` definition.
    * `app/api/v1/billing.py:302`: Type mismatch on webhook signature arguments.
    * `app/api/v1/chat.py:129`: Argument `reply` type mismatch (`Sequence[str]` vs `str`).
    * `app/security/password.py:69, 79`: Operand error — `str + None` in user dictionary parsing.
    * Missing type stubs: `boto3`, `botocore`, `zxcvbn`.
  * `apps/worker`: **14 errors** in 5 files.
    * Cross-package import resolution (`app.config`, `app.db.models` inside worker).
    * `worker/main.py`: `run_worker` argument type incompatible with `WorkerSettingsBase`.

### Frontend (`apps/web` TypeScript & ESLint)
* **`tsc --noEmit`**: **0 errors** (strict mode enabled).
* **`npm run lint`**: Missing `.eslintrc` configuration file in `apps/web`.

---

## 4. Security Audit & SAST Scans

### Dependency Audit
* **Frontend (`npm audit` in `apps/web`):**
  * **1 Critical Severity Vulnerability:** `next 16.0.0 - 16.4.0` (GHSA-2464-fhr4-w9xw, GHSA-p3m5-59mp-jv5r, GHSA-673q-mjm6-r5xr).
  * **1 Moderate Severity Vulnerability:** `postcss-selector-parser <6.1.5` (GHSA-rj75-hqrm-r3gf).
* **Backend (`pip-audit`):**
  * **39 Vulnerabilities identified in 1 package:** `pillow 12.3.0` (buffer overflows, EXIF/PSD parsing vulnerabilities).
  * Recommended remediation: Upgrade `pillow` to `13.0.0` or latest security patch.

### SAST Scan (`bandit`)
* **Scanned Lines of Code:** 4,651 lines
* **High Severity:** 1 finding
  * `apps/api/app/security/password.py:103`: `[B324:hashlib]` Use of weak SHA1 hash.
  * *Context:* Used for HaveIBeenPwned (HIBP) k-anonymity protocol prefix lookups. Fix requires adding `usedforsecurity=False` in `hashlib.sha1(...)`.
* **Medium Severity:** 1 finding
  * `apps/api/app/config.py:83`: `[B104]` Binding to `0.0.0.0` default.
* **Low Severity:** 10 findings
  * `B110` (`try/except: pass`) in Safepay webhook fallback and orientation normalization.
  * `B105/B106` False positive password token strings (`"email_verify"`, `"password_reset"`).

### Secret Hygiene
* **Live API Key Scan (`ocr_live_*`):** 0 live secrets found in application code.
* **Gitignore Coverage:** `.env`, `.env.local`, `.venv/`, and `node_modules/` are strictly excluded from version control.

---

## 5. Performance & Latency Baseline

### Route Response Latencies (20 samples per endpoint, measured from dev server)
| Route / Endpoint | Status | p50 Latency | p95 Latency | p99 Latency |
| :--- | :---: | :---: | :---: | :---: |
| `/` (Playground) | 200 OK | **100.7 ms** | **296.9 ms** | **296.9 ms** |
| `/docs` (Documentation) | 200 OK | **122.9 ms** | **148.4 ms** | **148.4 ms** |
| `/support` (Customer Support) | 200 OK | **81.7 ms** | **98.9 ms** | **98.9 ms** |
| `/pricing` (Rate Card) | 200 OK | **81.0 ms** | **119.5 ms** | **119.5 ms** |

### Frontend Bundle Size
* **Total Static JavaScript Chunks (`.next/static/chunks`):** 35 files, **1.24 MB** uncompressed.
* **Top 3 Largest Chunks:**
  1. `1rj7ns8rte9vc.js`: 229.1 KB (React / Lucide / UI primitives)
  2. `0p6f26edf3v8b.js`: 156.2 KB (Next.js framework core)
  3. `0cz1d0mv5g_q7.js`: 112.5 KB (DocumentViewer & Light Table parser)

---

## 6. Documentation Inventory

### Present & Verified
* `AGENTS.md` (Constitution & Operating Rules)
* `README.md` (Project overview)
* `docs/QUALITY_BRIEF.md` (Quality pass directive)
* `docs/SUPPORT_PORTAL_BRIEF.md` (Support platform brief)
* `docs/CHAT_WIDGET_BRIEF.md` (Assistant brief)
* `docs/SEO_BRIEF.md` (GEO / AEO spec)
* `docs/FRONTEND_BRIEF.md` (Design system spec)
* `docs/DECISIONS.md` (Architecture decision records)
* `docs/ARCHITECTURE.md` (Topology overview)
* `docs/SELF_HOSTED.md` (Air-gap deployment guide)
* `docs/billing.md`, `docs/auth.md`, `docs/frontend.md`

### Missing Governance Artifacts
* `CONTRIBUTING.md` (Developer setup, test guide, definition of done)
* `SECURITY.md` (Vulnerability disclosure policy, security contacts)
* `CHANGELOG.md` (Semantic release history)
* `docs/quality/FINDINGS.md` (Prioritized action plan — Phase 1)
* `docs/quality/CAPACITY.md` (Capacity benchmarks & bottleneck documentation)
