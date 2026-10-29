# Changelog

All notable changes to OpenOCR will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] - 2026-10-29

### Security & Dependency Hardening (Phase 2)
- **Resolved 39 CVEs in Pillow:** Upgraded `pillow` to `13.0.0` in `apps/api` and `apps/worker`, completely eliminating all known image parsing CVEs. Confirmed **0 vulnerabilities** via `uv run pip-audit`.
- **Patched Next.js GHSA-2464-fhr4-w9xw:** Upgraded `apps/web` to Next.js `16.4.3` and ran `npm audit fix` on `postcss-selector-parser`. Confirmed **0 vulnerabilities** via `npm audit`.
- **SAST Zero High Findings:** Fixed Bandit issue `B324` in `apps/api/app/security/password.py` by adding `usedforsecurity=False` on the HaveIBeenPwned range check SHA-1 hash. High severity SAST issues dropped from 1 to **0**.
- **Exception Logging:** Replaced bare `except: pass` blocks in `apps/api/app/billing/providers/safepay.py` and `apps/worker/worker/pipeline/normalize.py` with structured `logger.debug` statements.

### Test Suite & Commercial Metering (Phase 3)
- **100% Passing Commercial Metering Tests:** Fixed test failures in `tests/test_api_metering.py` (`test_free_tier_rejects_more_than_two_pages`, `test_free_tier_accepts_one_or_two_pages`, `test_free_tier_lifetime_five_items_limit`). Free evaluation keys now auto-provision and enforce the strict 5-item lifetime limit and 2-page document limit with HTTP 402, matching documentation.
- **Ruff Lint & Format Standardization:** Reduced ruff errors from 557 to **0 errors** across all 121 repository Python files. Standardized formatting using `ruff format`.
- **Static Typing Improvements:** Harmonized `verify_webhook_signature` and `parse_webhook_event` across `apps/api/app/billing/providers/base.py` and `safepay.py`. Added strict string conversions in `apps/api/app/api/v1/chat.py`.

### UI & Customer Support Experience
- **Minimalist Support Portal Redesign:** Replaced heavy rectangular cards and clunky border tab containers on `/support` with a sleek, minimalist horizontal status strip, active line tab indicator, and soft rounded inputs.
- **Responsive Mobile Navigation:** Added accessible mobile navigation drawer in `Header.tsx` so users on phones and tablets can directly access `/support`, `/docs`, `/pricing`, and `/self-hosted`.
- **Knowledge Base Chat Integration:** Connected `/api/v1/chat` and `/api/v1/chat/escalate` directly into the floating `ChatWidget` and `/support` ticketing system.

### Governance
- Created `SECURITY.md` detailing supported versions, vulnerability disclosure SLA, and air-gap guarantees.
- Created `CONTRIBUTING.md` detailing developer environment setup, testing gates, and PR checklists.
