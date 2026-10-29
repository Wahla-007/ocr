# OpenOCR Quality Findings & Remediation Plan (Phase 1)

**Status:** STOPPED FOR APPROVAL — Review prior to executing Phase 2.  
**Basis:** Measured data collected from Phase 0 (`docs/quality/BASELINE.md`).  
**Author:** Staff Security & Performance Lead  

---

## 1. Prioritized Findings Matrix

| Finding ID | Severity | Area | Evidence | Impact | Proposed Fix | Effort | Risk |
| :--- | :---: | :---: | :--- | :--- | :--- | :---: | :---: |
| **SEC-01** | **Critical** | Frontend Security | `npm audit` shows `next 16.0.0-16.4.0` (GHSA-2464-fhr4-w9xw, GHSA-p3m5-59mp-jv5r) | Remote code execution / DoS risk in image optimization & server actions | Upgrade Next.js to patched release (`16.4.1+` or latest stable patch) | Low | Low |
| **SEC-02** | **Critical** | Worker Security | `pip-audit` identifies 39 CVEs in `pillow 12.3.0` | Memory corruption / buffer overflow on malformed raster files | Upgrade `pillow >= 13.0.0` in `pyproject.toml` | Low | Low |
| **TEST-01** | **High** | Test Suite | 3 failures in `tests/test_api_metering.py` | CI pipeline blocked; test assertions out of sync with 403 API key policy | Update test fixtures to use active Developer plan keys conforming to current auth rules | Low | Very Low |
| **TYPE-01** | **High** | Billing Types | `mypy` flags `PaymentProvider` missing `refund_payment` and signature mismatches in `billing.py` | Potential runtime 500 crash during refund processing or webhook verification | Add `refund_payment` abstract method to `PaymentProvider` and fix type signatures | Medium | Low |
| **COV-01** | **High** | Test Coverage | `auth.py` at **35%**, `billing/service.py` at **25%** (target: ≥90%) | High regression risk in sensitive authorization, ledger, and subscription flows | Add comprehensive unit tests for password resets, lockout counters, checkout callbacks, and ledger credits | High | Very Low |
| **SAST-01** | **Medium** | Static Security | Bandit flags `B324: hashlib.sha1` in `password.py:103` | False positive / compliance flag for weak hash algorithm | Pass `usedforsecurity=False` in `hashlib.sha1(...)` since it strictly queries HIBP k-anonymity | Low | Zero |
| **TYPE-02** | **Medium** | Chat Assistant | `mypy` flags `chat.py:129` `Sequence[str]` passed to `str` field in `ChatMessageResponse` | Potential Pydantic serialization warning or validation error | Ensure `reply` is passed as a string scalar | Low | Zero |
| **LINT-01** | **Medium** | Code Quality | 557 `ruff` errors (unused imports, formatting, line lengths) | Code rot, inconsistent formatting, merge conflicts | Apply `ruff check --fix` and `ruff format .` | Medium | Low |
| **LINT-02** | **Medium** | Frontend Lint | `next lint` fails with "Invalid project directory" due to missing config | Frontend linting completely disabled in CI | Add `.eslintrc.json` with Next.js core web vitals standard rules | Low | Zero |
| **DOC-01** | **Low** | Governance | Missing `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md` | Incomplete open-source governance and security disclosure path | Create standard Markdown specifications matching project constitution | Low | Zero |

---

## 2. Decision Protocol Analysis on Major Proposals

### Proposal A: Upgrade `pillow` to `>=13.0.0`
1. **Problem:** 39 known CVEs (buffer overflows, EXIF heap corruption) exist in `pillow 12.3.0`. Untrusted user uploads are the primary attack surface of OpenOCR.
2. **Alternatives:**
   - *Do nothing:* High risk of remote exploit via malicious PDF/TIFF images.
   - *Pin and upgrade to 13.0.0:* Standard security patching.
3. **Scoring:** Security: 5/5, Correctness: 5/5, Performance: 5/5, Complexity: 1/5, Reversibility: 5/5.
4. **Verdict: DO IT.**

### Proposal B: Upgrade Next.js in `apps/web` to patched release
1. **Problem:** `next 16.3.8` has a critical CVE advisory on Image Optimization.
2. **Alternatives:**
   - *Disable image optimization:* Degrades UX and performance.
   - *Upgrade Next.js:* Eliminates CVE while preserving App Router features.
3. **Scoring:** Security: 5/5, Correctness: 5/5, Performance: 5/5, Reversibility: 5/5.
4. **Verdict: DO IT.**

### Proposal C: Align `test_api_metering.py` with 403 API Key Policy
1. **Problem:** Free users cannot generate programmatic live API keys (`ocr_live_*`). The 3 failing tests expect HTTP 402/200 when sending synthetic free keys, whereas security middleware correctly returns HTTP 403 `API_KEY_NOT_ALLOWED_ON_FREE_PLAN`.
2. **Alternatives:**
   - *Weaken security middleware to permit free API keys:* Violates the commercial plan invariant and increases abuse risk.
   - *Update the tests to create a valid Developer plan key:* Tests the actual business logic accurately without weakening security.
3. **Scoring:** Security: 5/5, Correctness: 5/5, User Value: 5/5.
4. **Verdict: DO IT.**

---

## 3. What We Recommend NOT Doing (and Why)

1. **DO NOT introduce a distributed message queue (Kafka, RabbitMQ, Celery Beat cluster):**
   - *Rationale:* ARQ with Redis Streams is currently executing jobs with low overhead and zero dropped tasks. Adding Kafka would destroy single-node self-hosted deployment viability and add immense operational complexity without measurable gain.
2. **DO NOT replace SQLite in unit tests with mandatory Docker PostgreSQL:**
   - *Rationale:* In-memory SQLite with `aiosqlite` runs 69 unit tests in under 1 minute. Requiring Docker PostgreSQL for pure unit tests would slow developer feedback loops significantly. Real PostgreSQL should remain dedicated to integration and contract test suites.
3. **DO NOT weaken or delete the 3 failing metering tests:**
   - *Rationale:* Tests must be corrected to test true system behavior with valid entitlements, never deleted to artificially inflate pass percentages.

---

## 4. Proposed Execution Order & Measurable Targets

### Phase 2: Security & Dependency Patching (Immediate)
* Upgrade `pillow >= 13.0.0`.
* Upgrade Next.js in `apps/web` to resolve GHSA-2464-fhr4-w9xw.
* Annotate `hashlib.sha1(..., usedforsecurity=False)` in `password.py`.
* **Measurable Target:** `pip-audit` issues drop from 39 to **0**; `npm audit` critical vulnerabilities drop to **0**.

### Phase 3: Test Suite Fixes & Baseline Green Run
* Fix `tests/test_api_metering.py` test key fixtures.
* Fix `chat.py` scalar reply type mismatch.
* Fix `PaymentProvider` missing `refund_payment` and webhook signature types.
* **Measurable Target:** `pytest` results: **72 passed, 0 failed (100% pass rate)**.

### Phase 4: Coverage Expansion on Sensitive Modules
* Add characterization tests for `app/api/v1/auth.py` (MFA, password resets, lockout counters).
* Add characterization tests for `app/billing/service.py` (refunds, quota renewals, webhook idempotency).
* **Measurable Target:** Auth coverage increases from **35% to ≥85%**; Billing coverage increases from **25% to ≥85%**.

### Phase 5: Code Cleanliness & Governance Docs
* Apply `ruff check --fix` and `ruff format .`.
* Add `CONTRIBUTING.md`, `SECURITY.md`, and `CHANGELOG.md`.
* Add `.eslintrc.json` to `apps/web` so `npm run lint` passes in CI.

---

## 5. Approval Gate
> [!IMPORTANT]
> In accordance with Rule 6 of `docs/QUALITY_BRIEF.md`, execution is paused here for user review and approval before making any code modifications or dependency upgrades.
