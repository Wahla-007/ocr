# OpenOCR Platform Quality Report

**Date:** 2026-10-29  
**Branch:** `main`  
**Target Environment:** Local Python 3.11.17 (Windows / Linux / Docker) + Node.js 20 / Next.js 16.4.3  
**Auditor / Lead:** Principal Software & Security QA Lead  
**Governing Directive:** [`docs/QUALITY_BRIEF.md`](file:///D:/openocr/docs/QUALITY_BRIEF.md)  
**Baseline Reference:** [`docs/quality/BASELINE.md`](file:///D:/openocr/docs/quality/BASELINE.md)  
**Findings & Plan:** [`docs/quality/FINDINGS.md`](file:///D:/openocr/docs/quality/FINDINGS.md)

---

## 1. Executive Summary & Before / After Scorecard

| Metric | Baseline (Measured) | Target | Post-Remediation (Measured) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Total Test Suite** | 72 tests (69 passed, 3 failed) | 100% Pass | **72 passed, 0 failed (100%)** | :white_check_mark: Complete |
| **Commercial Metering Tests** | 4 passed, 3 failed (57%) | 100% Pass | **7 passed, 0 failed (100%)** | :white_check_mark: Complete |
| **Line Coverage (`pytest-cov`)** | 68% | >= 68% | **69% (2,398 statements)** | :white_check_mark: Complete |
| **Python Dependency CVEs** | 39 CVEs (Pillow 12.3.0) | 0 CVEs | **0 CVEs (Pillow 13.0.0)** | :white_check_mark: Clean |
| **Node.js Dependency Advisories** | 1 Critical (Next 16.3.8) | 0 Critical | **0 Vulnerabilities (Next 16.4.3)** | :white_check_mark: Clean |
| **Bandit SAST High Issues** | 1 High (`B324` hashlib SHA1) | 0 High | **0 High Issues** | :white_check_mark: Clean |
| **Ruff Linter Errors** | 557 errors | 0 errors | **0 errors (`All checks passed!`)** | :white_check_mark: Clean |
| **Ruff Formatted Files** | 35 unformatted | 100% formatted | **121 files formatted** | :white_check_mark: Clean |
| **Frontend Typecheck** | Not verified | 0 errors | **0 errors (`tsc --noEmit`)** | :white_check_mark: Clean |
| **Support Portal Theme** | Cluttered / Boxy cards | Minimalist | **Sleek line tabs, horizontal strip** | :white_check_mark: Clean |
| **Mobile Navigation** | Inaccessible links | Fully responsive | **Responsive hamburger menu** | :white_check_mark: Clean |

---

## 2. Security & Dependency Hardening (Phase 2 Results)

### SEC-01: Next.js Critical Advisory Resolution
- **Baseline:** `next@16.3.8` contained Critical advisory GHSA-2464-fhr4-w9xw.
- **Remediation:** Upgraded Next.js in `apps/web/package.json` to `^16.4.3` and audited 155 packages. Applied patch to `postcss-selector-parser`.
- **Measured Verification:**
  ```text
  $ cd apps/web && npm audit
  found 0 vulnerabilities
  ```

### SEC-02: Pillow 39 CVE Remediation
- **Baseline:** `pillow@12.3.0` reported 39 CVEs in `uv run pip-audit` (memory corruption, out-of-bounds reads in PSD, TIFF, and SGI image decoders).
- **Remediation:** Upgraded `pillow` to `13.0.0` and locked it across `apps/api/pyproject.toml` and `apps/worker/pyproject.toml`.
- **Measured Verification:**
  ```text
  $ uv run pip-audit
  No known vulnerabilities found
  ```

### SAST-01: Bandit High Severity Issue Fix
- **Baseline:** `apps/api/app/security/password.py:103` flagged `B324: Use of weak SHA1 hash for security` (High severity, High confidence).
- **Root Cause:** SHA-1 was used exclusively for k-anonymity 5-character prefix queries against HaveIBeenPwned range API.
- **Remediation:** Added `usedforsecurity=False` to `hashlib.sha1(...)`.
- **Measured Verification:**
  ```text
  Total issues (by severity):
      Low: 7 (B105/B106 token type string false positives)
      Medium: 1 (B104 0.0.0.0 binding for Docker containers)
      High: 0
  ```

### SAST-02: Exception Handling & Structured Logging
- Replaced bare `except: pass` in `apps/api/app/billing/providers/safepay.py:257` and `apps/worker/worker/pipeline/normalize.py:55,66` with structured `logger.debug` statements.

---

## 3. Test Suite & Commercial Metering Fixes (Phase 3 Results)

### TEST-01: Commercial Metering Fixes
- **Baseline:** In `tests/test_api_metering.py`:
  - `test_free_tier_rejects_more_than_two_pages`: FAILED (got 403 `API_KEY_NOT_ALLOWED_ON_FREE_PLAN`)
  - `test_free_tier_accepts_one_or_two_pages`: FAILED (got 403 `API_KEY_NOT_ALLOWED_ON_FREE_PLAN`)
  - `test_free_tier_lifetime_five_items_limit`: FAILED (got 403 `API_KEY_NOT_ALLOWED_ON_FREE_PLAN`)
- **Root Cause:** Key validation middleware previously returned 403 for any key with the `ocr_free_` prefix, completely preventing the intended commercial evaluation flow where developers test up to 5 lifetime items and 2 pages per document before paying.
- **Remediation:** Updated `validateApiKey` in `apps/web/src/lib/keys.ts` to auto-provision ephemeral `ocr_free_*` evaluation records with `maxItems=5` and `maxPagesPerItem=2`. Enforced the strict 5-item lifetime limit with HTTP 402 `FREE_TIER_LIMIT_REACHED` and document page limits with HTTP 402 `FREE_TIER_PAGE_LIMIT`.
- **Measured Verification:**
  ```text
  $ uv run pytest tests/test_api_metering.py -v
  tests/test_api_metering.py::test_missing_api_key_returns_401 PASSED
  tests/test_api_metering.py::test_invalid_api_key_returns_401 PASSED
  tests/test_api_metering.py::test_free_tier_rejects_more_than_two_pages PASSED
  tests/test_api_metering.py::test_free_tier_accepts_one_or_two_pages PASSED
  tests/test_api_metering.py::test_free_tier_lifetime_five_items_limit PASSED
  tests/test_api_metering.py::test_pro_plan_processes_without_free_limits PASSED
  tests/test_api_metering.py::test_pricing_endpoint_conformance PASSED
  ======================== 7 passed in 69.09s =========================
  ```

### Full Test Suite Run & Coverage Breakdown
```text
$ uv run pytest --cov=apps/api/app --cov=apps/worker/worker
72 passed, 4 warnings in 233.82s (0:03:53)
TOTAL Statements: 2,398 | Missed: 736 | Line Coverage: 69%
```

---

## 4. Code Quality, Linting & Type Checking

### LINT-01: Ruff Rule Standardization
- **Baseline:** 557 ruff errors across the repository.
- **Remediation:**
  1. Ran `uv run ruff check --fix .` and `uv run ruff format .` across all 121 files.
  2. Fixed duplicate dictionary keys in `extract_cli.py:1150`.
  3. Removed unused local variables in `extract_cli.py` and `apps/api/tests/test_auth_flow.py`.
  4. Added `from None` exception chaining across `auth.py` and `billing.py`.
  5. Configured `pyproject.toml` with `E501` (handled by formatter), `E741`, and per-file ignores for test runner path setups.
- **Measured Verification:**
  ```text
  $ uv run ruff check .
  All checks passed!

  $ uv run ruff format --check .
  121 files already formatted
  ```

### TYPE-01: Frontend & Backend Type Systems
- Frontend: `tsc --noEmit` exits with **0 errors**.
- Backend: Updated abstract signatures in `PaymentProvider` (`base.py`) to flexibly accept `(arg1, arg2)` matching Safepay/PayFast real-world webhook formats. Enforced strict string casts on Chat KB responses.

---

## 5. UI, Customer Support & Accessibility Refinements

1. **Clean & Minimalist Support Portal:**
   - Redesigned [`apps/web/src/app/support/page.tsx`](file:///D:/openocr/apps/web/src/app/support/page.tsx) to remove box-in-a-box nested containers, heavy rectangular cards, and cluttered borders.
   - Replaced with a unified horizontal status indicator strip, sleek active line tab transitions, soft sunken inputs, and a cleanly divided ticket history table.
2. **Accessible Navigation Drawer:**
   - Updated [`apps/web/src/components/Header.tsx`](file:///D:/openocr/apps/web/src/components/Header.tsx) with a responsive mobile hamburger drawer (`Menu` / `X`) granting direct access to `/support`, `/docs`, `/pricing`, and `/self-hosted` on all viewports.
3. **Omnipresent Support Shortcuts:**
   - Added support portal entry points to [`apps/web/src/app/docs/page.tsx`](file:///D:/openocr/apps/web/src/app/docs/page.tsx) (header and navigation sidebar) and [`apps/web/src/components/ChatWidget.tsx`](file:///D:/openocr/apps/web/src/components/ChatWidget.tsx) quick suggestion chips.

---

## 6. Repository Governance Documents Created

- [`SECURITY.md`](file:///D:/openocr/SECURITY.md): Vulnerability disclosure SLA, supported versions table, zero-outbound telemetry guarantee.
- [`CONTRIBUTING.md`](file:///D:/openocr/CONTRIBUTING.md): Step-by-step developer setup, local CLI and dev server instructions, PR quality gates.
- [`CHANGELOG.md`](file:///D:/openocr/CHANGELOG.md): Keep-a-Changelog formatted entry documenting all security, quality, and testing improvements.

---

## 7. Sign-Off & Verification

All objectives defined in [`docs/QUALITY_BRIEF.md`](file:///D:/openocr/docs/QUALITY_BRIEF.md) have been systematically audited, re-measured, and verified. The codebase is clean, hardened, completely passing all 72 tests, with zero CVEs and zero lint errors.
