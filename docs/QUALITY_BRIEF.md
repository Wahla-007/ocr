# TASK: Quality, scalability, efficiency, security and documentation pass on OpenOCR

## Role
Act as a principal engineer, performance engineer, security engineer and QA lead. Follow `AGENTS.md` (Decision Protocol, security, self-hosted rules, testing). Be objective: find real problems with evidence, fix what matters, and say "leave it alone" when something is fine. Don't add complexity without a measured reason.

## Rules
1. **Measure before changing.** Every performance, scalability or efficiency claim needs a before/after number from a reproducible benchmark or profile. No "this should be faster."
2. **Tests protect behavior.** Before refactoring, add characterization tests for current behavior. Never weaken, skip or delete a test to make it pass; if a test is wrong, explain why and fix it.
3. **Small, reviewable steps.** One concern per commit/PR. No drive-by rewrites. Keep public API response shapes stable (additive changes only, versioned under `/v1`).
4. **No fabrication.** If you can't verify a library behavior, version, or benchmark, say so. Don't invent coverage numbers, latency numbers or tool outputs; run the tools and show the output.
5. **Both deployment modes.** Everything must work in managed cloud and self-hosted/air-gapped mode. Add a test that fails on any unexpected outbound network call in self-hosted mode.
6. **Stop for approval** after Phase 1 (findings) and before any migration, data change or breaking change.

## Phase 0: Baseline (no code changes)
Produce `docs/quality/BASELINE.md` with real output from:
- Test suites (unit, integration, e2e): pass/fail counts, runtime, **coverage per package** (api, worker, web) including branch coverage, flaky test list (run the suite 3x and report differences).
- Static analysis: `ruff`, `mypy --strict` (or configured level), ESLint, TypeScript `strict` errors, dead code detection (`vulture`, `knip`/`ts-prune`), complexity (cyclomatic complexity hot spots, e.g., `radon`), duplication (`jscpd`), circular dependencies (`madge`/import-linter).
- Security scans: dependency audit (`pip-audit`, `npm audit`), secret scan (gitleaks), SAST (`bandit`, `semgrep` with relevant rulesets), container image scan, license check.
- Performance baseline: API latency per endpoint (p50/p95/p99) under light load, DB query counts per request, slow query log, worker throughput (pages/min per engine), memory/CPU per job, queue behavior, frontend bundle sizes per route, Lighthouse scores.
- Documentation inventory: what exists, what's stale, what's missing.

## Phase 1: Findings and plan (STOP for approval)
`docs/quality/FINDINGS.md`: prioritized (Critical / High / Medium / Low) with evidence, impact, fix, effort, and risk of the fix. Run the Decision Protocol on every proposed change; list what you recommend NOT doing and why. Include a proposed order of work and expected measurable gains.

## 1. Test strategy (build the safety net)
Target outcomes (propose adjusted targets if these are unrealistic, with reasons): ≥ 90% line and ≥ 80% branch coverage on auth, billing, credits/ledger, upload handling, and security modules; ≥ 80% elsewhere; 100% of documented edge cases covered by at least one test. Coverage is a floor, not the goal: add **mutation testing** (`mutmut`/`cosmic-ray`, Stryker for TS) on critical modules and report the mutation score so tests are proven to catch bugs.

**Layers**
- **Unit:** pure logic (validation, hashing wrappers, token handling, pricing/credit math in integer minor units, state machines, redaction, retry/backoff, priority logic). Fast, deterministic, no network. Use property-based tests (`hypothesis`, `fast-check`) for parsers, normalizers, money math, and anything with large input spaces.
- **Integration:** real PostgreSQL and Redis (testcontainers or compose), not mocks, for DB, queue, ledger, session, and rate-limit logic. Test migrations up and down, constraint enforcement, transaction behavior, and concurrency (N parallel identical requests must yield exactly one effect for credits, signups, webhooks and idempotency keys).
- **Contract/API:** generate tests from the OpenAPI spec (schemathesis or similar) to fuzz every endpoint for 5xx errors, schema violations and auth bypass. Verify the OpenAPI spec matches real behavior. Add contract tests for provider interfaces (OCR engines, LLMs, payment gateway, email, storage) using recorded fixtures plus a fake provider implementation.
- **Worker/pipeline:** golden-document tests (known inputs → expected text/tables/fields with tolerances), engine fallback tests, timeout/kill tests, corrupt/hostile file tests, retry and dead-letter behavior, idempotent reprocessing, crash-recovery (kill the worker mid-job; the job must be reclaimed exactly once).
- **End-to-end (Playwright, Chromium/WebKit/Firefox, desktop+mobile):** signup → verify → login → upload → results → API key → logout; reset flow; checkout (sandbox) → credits; error and offline states; multi-tab; session expiry.
- **Security tests:** see section 5.
- **Accessibility:** axe on every route and state, plus keyboard-only flows.
- **Visual regression** for key pages (light/dark, LTR/RTL).
- **Resilience/chaos:** Redis down, DB slow/failover, LLM provider timeouts/5xx/garbage output, object store errors, email failures, disk full, clock skew. Verify graceful degradation, no data loss, no double-charging, and clear errors with request IDs.
- **Self-hosted mode tests:** boots with network blocked, local models only, billing disabled, no telemetry.

**Test quality rules**
- Deterministic: freeze time, seed randomness, no sleeps (use polling with timeouts), isolated data per test, parallel-safe. Quarantine and fix flaky tests; don't retry-until-green.
- Clear names (behavior-focused), arrange/act/assert, one reason to fail, shared fixtures/factories instead of copy-paste.
- Test pyramid balance: many fast unit tests, fewer integration tests, few critical e2e flows. Report total runtime and keep CI under a stated budget (propose one, e.g., 10 minutes with parallelism and caching).
- Bug fixes start with a failing regression test.

## 2. Code quality
- **Python:** type hints everywhere, `mypy --strict` on new/changed modules with a ratchet (no new errors; reduce old ones over time), `ruff` (lint+format) with a documented ruleset, async correctness (no blocking calls in the event loop; CPU-bound OCR stays in workers), no global mutable state in workers, explicit timeouts on every external call, structured exceptions.
- **TypeScript:** `strict` mode, no `any` without an explanatory comment, ESLint with security and a11y plugins, no raw `fetch` outside the API client, server components by default.
- **Architecture hygiene:** routes thin, logic in services, DB access in repositories (tenant/user filter enforced at that layer), providers behind interfaces, one typed settings object validated at startup. Enforce layering with import-linter/ESLint boundaries. Remove dead code, unused dependencies, commented-out blocks and stale TODOs (each remaining TODO links to a backlog item).
- **Complexity budgets:** flag functions with high cyclomatic complexity or length; refactor only where tests exist and the benefit is clear (readability, bug risk), otherwise log in backlog.
- **Consistency:** error response shape `{code, message, request_id}`, naming conventions, logging format, config conventions, migration conventions. Pre-commit hooks (format, lint, type check, secret scan) mirrored exactly in CI.
- **Dependencies:** justify each; remove duplicates and abandoned packages; pin versions; lockfiles committed; a documented upgrade routine (Dependabot/Renovate with tests gating merges).
- **API design review:** idempotency keys on retryable operations, pagination on all lists (keyset for large tables), consistent filtering, correct status codes, versioning, backward compatibility, clear rate-limit headers (`Retry-After`).

## 3. Efficiency (CPU, memory, I/O, cost)
Profile first (py-spy/pyinstrument, `EXPLAIN (ANALYZE, BUFFERS)`, Redis `SLOWLOG`, Chrome performance traces, memory profiling), then fix the top bottlenecks only.
- **Database:** find N+1 queries (add a test helper that fails when a request exceeds a query-count budget), add missing indexes for every FK and frequent filter/sort (create concurrently), remove unused indexes, avoid loading large JSONB in list queries, keyset pagination, connection pooling sized to load (document PgBouncer need), statement timeouts, safe migrations on large tables (no long locks), vacuum/bloat awareness for the append-only ledger and results tables, and a partitioning/retention plan for the ledger and jobs tables if growth projections need it.
- **API:** async I/O end to end, streaming uploads/downloads (flat memory regardless of file size; prove with a memory test), response compression, caching headers for static data, ETags where useful, avoid redundant auth/DB lookups per request (cache session lookups briefly with safe invalidation), request body limits.
- **Worker/pipeline:** load models once per process, bounded parallelism per page/document, backpressure, GPU/CPU utilization checks, avoid re-running OCR when the dedupe hash matches (per-tenant), skip the LLM step when not needed, batch LLM calls where possible, cap tokens, truncate/chunk deliberately, temp-file cleanup, bounded memory per job, graceful shutdown (finish or requeue in-flight jobs).
- **Redis/queue:** consumer groups with explicit ACK, claim of stuck messages, retry with backoff and jitter, dead-letter stream, max-length trimming, TTLs on every ephemeral key, no unbounded keyspace growth (test with a long-running soak).
- **Frontend:** per-route JS budgets, code-splitting and lazy-loading heavy viewers, virtualization for long lists/pages, image and font optimization, avoid unnecessary client components and re-renders, SSE instead of tight polling, measure Core Web Vitals (LCP < 2.0 s, INP < 200 ms, CLS < 0.05) in CI.
- **Cost efficiency:** per-page cost metrics (compute, LLM tokens, storage, egress), reduce redundant LLM calls, model/provider fallbacks by cost, caching of repeated work. Report cost per 1,000 pages before and after.

## 4. Scalability
Design for the next 10x, not 1000x. Prove limits with tests, then document them.
- **Load and capacity testing** (k6 or Locust; reproducible scripts committed under `tests/load/`): scenarios for steady load, spikes (burst uploads), sustained soak (hours), many concurrent small jobs vs. a few huge documents, auth-heavy traffic, API-key traffic with rate limits, and webhook storms. Report throughput, latency percentiles, error rates, saturation points, and which resource saturates first (CPU, memory, DB connections, Redis, worker concurrency, LLM rate limits, disk, network). Produce `docs/quality/CAPACITY.md` with a plain-language "how many users/pages per hour can we handle now, and what's the next bottleneck."
- **Statelessness:** the API must be horizontally scalable (no in-memory sessions or local-disk state); workers scale independently by queue depth; document autoscaling signals (queue depth/age, CPU) and safe scale-down.
- **Multi-tenant fairness:** prevent one customer from starving others (per-tenant concurrency limits, fair queueing, per-key rate limits, max in-flight jobs per user), tested with a noisy-neighbor scenario.
- **Data growth:** project storage and table growth (jobs, results JSONB, ledger, sessions, events); implement retention/cleanup jobs, archival strategy, and index maintenance; test the app with a large seeded dataset (e.g., 10M ledger rows, 1M jobs) and fix slow queries.
- **Dependencies at scale:** LLM provider rate limits and retries with jitter, circuit breakers, request queuing and spend caps; object store limits; email throughput; Safepay webhook bursts.
- **Resilience:** health checks that test real dependencies, readiness vs. liveness, graceful degradation modes, timeouts everywhere, retry budgets (no retry storms), idempotent operations, zero-data-loss on worker crash, safe deploys (rolling, backward-compatible migrations: expand then contract).
- **Deployment:** document sizing guides for managed and self-hosted (CPU/RAM/GPU per N pages/hour, DB and Redis sizing), container resource limits, and Helm/Compose defaults that are safe. Self-hosted: single-node baseline numbers on stated hardware.
- Use the Decision Protocol before adding any scaling machinery (microservices, Kafka, sharding, caches). Recommend the simplest option that meets the measured need, and write down the trigger metrics for when to revisit.

## 5. Security testing (continuous, automated, in CI)
- **SAST/dependency/secret/container scanning** on every PR (fail on High/Critical). Generate an SBOM. Pin GitHub Actions/CI images by digest.
- **Authz matrix tests:** a table-driven test that exercises every endpoint as anonymous, user A, user B, API key (scoped and unscoped), admin, and suspended user, asserting allow/deny. IDOR tests for every resource (jobs, results, uploads, keys, orders, invoices, tickets, chats, sessions).
- **Auth/session tests:** enumeration parity (response, status, timing within tolerance), lockout, session rotation and fixation, revocation propagation, cookie flags, CSRF, open redirect, token reuse and expiry, password policy, HIBP fail-open behavior.
- **Input tests:** fuzz API inputs (schemathesis, Hypothesis), oversized/malformed/unicode/null-byte inputs, injection payloads (SQL, NoSQL, command, template, header/CRLF, log injection), path traversal in filenames, SSRF vectors on webhook URLs (private IPs, redirects, DNS rebinding), XSS corpus through every rendered field (including OCR output, filenames, error messages).
- **File security corpus:** zip/decompression bombs, giant dimensions, malformed and polyglot PDFs, embedded JS/files, truncated files, wrong extensions/magic bytes, EXIF payloads. Assert limits, sandbox containment (no network, resource caps, non-root, read-only FS) and that one bad file cannot affect other jobs.
- **LLM security corpus:** prompt-injection documents (instructions embedded in scanned text, hidden/low-contrast text, markdown/HTML/link injection, attempts to exfiltrate secrets or override schema), asserting schema-validated output, no tool/secret access, and sanitized rendering.
- **Webhook security:** forged/unsigned/tampered/replayed/out-of-order events; outbound webhook signing and replay protection.
- **Rate-limit/abuse tests:** per-IP/account/key limits, fail-safe when Redis is down, spend-cap enforcement, credit-farming scenarios.
- **Headers/TLS/config:** CSP (nonces), HSTS, cookie attributes, CORS allowlist, no debug endpoints, no stack traces; a test that fails if a new route lacks an auth declaration or a CSRF/rate-limit decision.
- **Secrets hygiene:** no secrets in repo, images, logs, error reports or client bundles; test that logs never contain tokens, passwords, API keys or document text.
- **Dynamic scan:** run OWASP ZAP baseline against staging in CI (scheduled) and triage results.
- Track a **security regression suite**: every fixed vulnerability gets a permanent test.

## 6. Documentation (accurate, tested, maintained)
Docs are code: they live in the repo, are reviewed in PRs, and are verified in CI where possible.
- **README** (what it is, quickstart in ≤ 10 minutes, architecture overview, repo map), `CONTRIBUTING.md` (setup, branching, commit style, how to run each test layer, definition of done), `SECURITY.md` (disclosure policy), `CHANGELOG.md` (Keep a Changelog; semantic versioning).
- **Architecture docs:** `docs/architecture.md` with diagrams (kept as text/Mermaid so they diff), data model/ERD, sequence diagrams for upload→extract→result, auth/session, payments/webhooks, support/escalation; plus `docs/DECISIONS.md` (ADRs) and `docs/BACKLOG.md`.
- **API docs:** OpenAPI spec generated from code and validated in CI; examples that are executed in tests so they can't rot; error catalogue; auth, pagination, idempotency, rate limits, webhook signature verification with code samples.
- **Operations docs:** runbooks (deploy, rollback, migrate, backup/restore drill, rotate secrets, scale workers, handle queue backlog, LLM provider outage, payment webhook failures, stuck jobs, abuse response, data deletion requests), on-call/incident playbook, monitoring dashboard guide, capacity guide (`CAPACITY.md`), environment variable reference generated from the typed settings object.
- **Self-hosted docs:** install, requirements, sizing, upgrade/migration, backup/restore, offline model setup, troubleshooting, diagnostic bundle (secrets and document contents stripped).
- **Code docs:** docstrings for public functions and non-obvious logic explaining *why*; module-level READMEs for complex areas (pipeline, ledger, auth). No comment that just restates the code.
- **Docs CI:** link checker, spell/style lint, run documented commands in a smoke test where feasible, fail if the OpenAPI spec or env reference is out of date.

## 7. CI/CD quality gates (required checks to merge)
Lint + format + type check; unit, integration, contract and e2e tests (parallelized, cached); coverage thresholds and no coverage drop on changed files; mutation test on critical modules (scheduled nightly if too slow per PR); SAST, dependency, secret and image scans; migration up/down test; OpenAPI diff check (flag breaking changes); bundle-size and Lighthouse budgets; accessibility checks; self-hosted offline test; docs checks. Nightly: soak/load smoke, ZAP baseline, flaky-test report. Keep the pipeline fast (report total time and slowest steps; fix the slowest).

## 8. Observability for quality
Structured JSON logs with request IDs and tenant-safe context; metrics (latency histograms, error rates, queue depth/age, job duration by engine, LLM latency/tokens/cost, DB pool usage, cache hit rates, rate-limit hits, auth failures); traces for upload→result (OpenTelemetry, self-hostable backend); SLO definitions with error budgets (propose values, don't invent promises to customers); dashboards and alerts with runbook links. Verify alerts fire in a test.

## Deliverables
1. `docs/quality/BASELINE.md`, `FINDINGS.md`, `CAPACITY.md`, `TESTING.md` (strategy, how to run, how to add tests), and a final `QUALITY_REPORT.md` with before/after numbers.
2. All new tests, load scripts, fuzz/security suites, fixtures and the CI configuration, with real output shown.
3. Code fixes for prioritized findings, each in a small commit with tests and a measured before/after.
4. Documentation set above, with CI checks.
5. A prioritized list of deferred items, each with a trigger metric, plus a list of things you recommend leaving alone and why.

## Definition of done
Baseline and final numbers are published and reproducible; no Critical/High findings remain open; coverage and mutation targets are met on critical modules (or exceptions are justified in writing); load tests show the stated capacity with the next bottleneck identified; memory stays flat on large uploads; no N+1 queries or unbounded growth; the security regression suite passes in CI; docs match reality and are CI-checked; both deployment modes pass their tests; and you've reviewed your own diff as a hostile reviewer and listed remaining risks honestly.

Begin with Phase 0 (baseline) and Phase 1 (findings). Don't change code until I approve the plan.
