# TASK: Design and build the OpenOCR frontend (apps/web)

## Role
Act as a senior product designer plus senior frontend and security engineer. You're building the frontend for a document-extraction platform whose customers are developers, finance/ops teams, and security-conscious enterprises. Trust, precision and calm are the brand. This is not a generic SaaS landing page.

Follow the project rules in `AGENTS.md`/`GEMINI.md` (Decision Protocol, security, testing, self-hosted compatibility). Where this brief conflicts with them, flag it and propose a resolution.

## Stack (verify before assuming)
Next.js (App Router) + React + Tailwind CSS in `apps/web`, talking to the FastAPI backend (`/v1/*`). **Check the installed versions and compatibility** (the architecture lists Next.js 16 with React 18; confirm what is actually required and fix any mismatch). Use TypeScript `strict`. Use unstyled accessible primitives (Radix UI or React Aria) for behavior, and style them yourself. Do not ship stock component-library looks.

## Process (do not skip phases; stop for my approval where stated)
**Phase 0, recon:** inspect `apps/web`, `package.json`, existing pages, Tailwind config, API client, auth flow, CSP/middleware, and the OpenAPI spec from the API. Report what exists.
**Phase 1, design brief (STOP for my approval):** deliver `docs/design/BRIEF.md` containing: design principles, the shared design system (tokens, type, color, spacing, motion, component inventory), the concept for every page (section 3), the list of pages implied by the architecture but not yet named (jobs/history, API keys, settings/sessions, usage, 404/500, maintenance), a sitemap, and a rough low-fidelity layout sketch per key page (ASCII or a static HTML prototype). Challenge any concept below that would hurt usability, accessibility or performance; say so and propose a better one.
**Phase 2, foundation:** tokens, fonts, primitives, typed API client, security middleware, layout shells, test harness.
**Phase 3, pages,** one at a time in this order: auth pages, playground, billing/usage/keys, marketing pages, error states. Each page ships with all its states and tests before the next begins.
**Phase 4, hardening and polish:** accessibility audit, performance budget, security review, visual QA, docs.

If you can run the app and view it in a browser, take screenshots at mobile, tablet and desktop widths in light and dark themes and review them critically before reporting a page done. Fix what looks off.

## 1. Design direction: "The Archivist's Light Table"
OpenOCR turns messy paper into trustworthy data. The visual metaphor is a precise, calm **archive and drafting studio**: documents laid on a light table, tracing-paper overlays, ruled lines, registration marks, stamps, and ledgers. Technical but warm. Quiet confidence, not hype.

Feeling to aim for: *careful, exact, private, human.* Think a well-made printed field manual or a Swiss technical publication translated to the web, not a neon AI product.

### Design system requirements
- **Color:** a warm paper-toned light theme and a deep ink-toned dark theme (both first-class, not an inverted afterthought). One restrained **signal color** used for extraction highlights, primary actions and focus, plus a separate semantic set (success, warning, error, info) that stays distinguishable for color-blind users. Define everything as CSS variables/tokens (surface, ink, muted, line, signal, semantic) with documented contrast ratios. Never convey meaning by color alone. Propose the exact palette in the brief with rationale.
- **Typography:** three self-hosted, open-license (OFL) families: a characterful serif for display and editorial headings, a clean humanist grotesque for UI, and a monospace for code, IDs and numbers. Do **not** use Inter, Roboto, Arial, system-default stacks or Space Grotesk as the identity. Use tabular numerals for all money, counts and credits. Define a fluid type scale. Include an Arabic-script font for Urdu/Arabic document content (e.g., a Nastaliq or Naskh face) with proper line-height, since customers will extract Urdu and Arabic documents.
- **Layout:** a strict spacing scale and an underlying grid, visible hairline rules and deliberate asymmetry instead of centered-everything card grids. Use logical CSS properties (`margin-inline`, etc.) so RTL works throughout.
- **Shape and depth:** crisp edges or small consistent radii, borders and rules over drop shadows; no glassmorphism, no blobs, no gradient-mesh backgrounds, no glow effects.
- **Texture:** subtle, performant (CSS or tiny SVG), such as faint paper grain, registration marks and measurement ticks. It must never harm legibility or performance.
- **Motion:** purposeful and short (150-300 ms, with easing tokens). Motion explains state (scan line while processing, stamp on completion, a row appearing in the ledger). Respect `prefers-reduced-motion` with a calm non-animated equivalent for everything. No parallax, no scroll-jacking, no auto-playing loops.
- **Voice:** plain, specific, honest copy. No buzzwords ("revolutionary", "supercharge", "seamless"), no fake testimonials, no invented customer logos, no made-up statistics. Use placeholder content that is obviously labeled as placeholder.
- **Iconography:** one consistent icon set (outline, 1.5px), used sparingly. No emoji as UI.
- **Components:** build a documented inventory (buttons, inputs, fields with help/error, select, dialog, drawer, tabs, toast, table, tooltip, badge, progress, empty state, skeleton, code block with copy, key-value display, bounding-box overlay, file dropzone, stepper, stat, ledger row). Every component documents all states: default, hover, focus-visible, active, disabled, loading, error. Provide a `/dev/styleguide` route (disabled in production builds) that shows them all in both themes and both text directions.

### Anti-slop checklist (reject your own work if it fails any)
Purple/blue AI gradients, centered hero with two buttons and a floating dashboard mockup, three identical icon-cards "features" grid, glass cards on gradient, generic stock illustrations, lorem ipsum in shipped pages, every section a rounded card, default Tailwind/shadcn look, emoji bullets, "trusted by" fake logo rows, and any page that could belong to any other product by swapping the logo.

## 2. Frontend security requirements (non-negotiable)
Treat the browser as hostile and the extraction output as untrusted.

**Content and XSS**
- OCR/LLM output (text, markdown, table cells, field names, filenames) is **untrusted**. Render as text by default. Where markdown is needed, use a sanitizing pipeline (no raw HTML, allowlisted elements, links limited to `https:`/`mailto:` with `rel="noopener noreferrer"`, no remote images or external resource loads). Never use `dangerouslySetInnerHTML` with unsanitized data; add an ESLint rule that bans it outside one reviewed wrapper.
- Strict **CSP with per-request nonces** set in middleware (no `unsafe-inline`/`unsafe-eval` for scripts), `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, tight `connect-src` (own API and, only in managed mode, the payment provider's checkout domain), Trusted Types where feasible. Coordinate headers with the API's SecurityHeadersMiddleware so they don't conflict.
- **No third-party scripts, analytics, trackers, CDNs or Google Fonts.** Fonts and assets are self-hosted. This is also required for air-gapped self-hosted mode.

**Auth, sessions and CSRF**
- The browser never handles session tokens: the session lives in the `__Host-openocr_session` HttpOnly cookie. **Never store tokens, API keys, or document content in localStorage/sessionStorage/IndexedDB.**
- Prefer **same-origin** calls (Next rewrites or the reverse proxy) so the `__Host-` cookie and SameSite policy work without loosening CORS; propose this in the brief via the Decision Protocol.
- One typed API client module: `credentials` handling, the `X-Requested-With: OpenOCR-Web` header (and the CSRF token if the backend requires one), request IDs, consistent error shape `{code, message, request_id}`, timeouts, abort support, `429` handling with `Retry-After`, `401` handling that routes to login preserving only a **validated internal** `next` path. No raw `fetch` scattered in components (lint rule).
- Authenticated routes: `Cache-Control: no-store`, and no cached protected content after logout (back button). Sync logout across tabs (BroadcastChannel). Idle-timeout warning before the session expires. A "your session expired" flow that never loses a user's non-sensitive form input.
- **Open-redirect proof:** `next` accepts only same-origin relative paths from an allowlist pattern.
- `/verify-email`: email scanners and link prefetchers can consume GET tokens, so the link opens a page with a confirm button that submits the token via **POST**. Handle used/expired/invalid tokens with distinct, non-leaky messages.
- `/reset-password`: strip the token from the URL immediately (`history.replaceState`), serve with `Referrer-Policy: no-referrer`, never log it, and never put it in analytics or error reports.
- Anti-enumeration in the UI: signup, login and reset show identical messages whether the account exists or not. Don't reveal lockout state beyond what the API deliberately returns.
- Password fields: correct `autocomplete`, paste allowed, show/hide toggle, strength meter that never blocks valid passphrases, no password echo in any error or log. Disable submit while in flight and make it idempotent.
- **API keys:** shown exactly once on creation with a copy button, then masked (prefix + last 4). Clear from component state/DOM on dismiss or navigation. Confirm before revoke. Show scopes, last used, created date.

**Uploads and documents**
- Client-side validation (type by extension + magic-byte sniff, size, page count where cheap) is **UX only**; the server is authoritative. Use presigned upload URLs with progress, cancel and retry. Render filenames as plain text only.
- Document previews use object URLs that are revoked on unmount. Don't keep document contents in global state longer than needed; clear on logout. Offer an optional "privacy blur when tab is hidden" setting.
- PDF/image viewing must not execute embedded content. Render pages as images/canvas via a bundled, pinned viewer library loaded lazily with no remote workers or CMaps.

**Supply chain and config**
- Minimal dependencies, exact versions, lockfile committed, `npm audit` and a secret scanner in CI, license check. Justify every new dependency via the Decision Protocol.
- Only non-secret values use `NEXT_PUBLIC_*`. Feature visibility (billing, signup open/closed, self-hosted mode) comes from a **runtime public config endpoint** (not build-time flags) so one self-hosted image works for every customer.
- Error boundaries on every route segment; never display stack traces; always show a request ID the user can quote to support.

## 3. Pages: a unique concept for each, one shared system
Each page has its own layout idea and signature interaction, but all share the tokens and components above so the product reads as one family.

**`/` Playground: "The Light Table"**
The core experience. A large document sits on a light-table surface. Drop a file and it slides under a scanning line; extraction appears as **tracing-paper overlays**: bounding boxes by type (text, table, field) toggleable as layers. Split view: source document left, structured output right (tabs: Markdown, Tables, Fields, JSON). Hovering a box highlights the matching output and vice versa (bidirectional linking). Confidence shown as honest visual treatment (e.g., hatching for low confidence) plus numbers, not color alone. Schema/fields input panel for structured extraction. Progress via SSE with a plain-language stage list (Received, Reading pages, Extracting fields, Done) and a polling fallback. Accessible alternative to the canvas: a navigable list of detected regions with keyboard focus syncing the overlay. Handle huge documents (virtualized pages), multi-page navigation, zoom/pan, copy/download, and RTL text. Show quota/credit status inline and a clear path to sign up for anonymous users, with limits stated honestly.

**`/api-platform`: "The Field Manual"**
Documentation designed like a printed engineering manual: a sticky margin index, numbered sections, marginal notes. Code on one side, **real live example responses** on the other (served from the actual API or clearly labeled static samples). Signature element: a "patch bay" SDK/code generator where choosing language, auth style and options rewrites the snippet live (cURL, Python, JavaScript/TypeScript at minimum). Interactive request tester using the user's own key held only in memory. Sections: auth, extract, jobs and polling, webhooks (including how to **verify the HMAC signature**, with code samples), errors and the standard error shape, rate limits, idempotency, pagination. Copy buttons, deep-linkable headings, search that works offline.

**`/pricing`: "The Rate Card"**
Pricing that looks like a printed rate card, with no gimmicks. Signature element: a **live cost calculator**: drag a pages-per-month slider and see credits, plan recommendation and total price update with tabular numerals and a visible formula. Tiers (Free, Developer, Enterprise, Self-Hosted) shown as a ruled comparison table that collapses gracefully on mobile, with plain-language limits and what happens at the limit. Self-Hosted and Enterprise route to "Contact sales", not checkout. Honest FAQ (refunds, data retention, overages, currency). Clearly show the currency and any taxes policy; no fake discounts or countdown timers. Hide checkout buttons when billing is disabled in config.

**`/self-hosted`: "The Blueprint"**
A technical blueprint aesthetic: ruled grid, dimension lines. Signature element: an **interactive architecture diagram** with a bold boundary line labeled "nothing crosses this line", showing the components inside the customer's network (API, workers, database, queue, storage, local models) and the absence of outbound arrows. Spec sheet (hardware requirements, GPU guidance, supported OS/orchestrators), deployment steps overview, security and data-residency statements, an honest note about local-model accuracy tradeoffs, and a "Contact sales" form (validated, rate limited, honeypot, no secrets). Diagram must be keyboard-navigable with text alternatives.

**`/signup` and `/login`: "The Front Desk"**
Calm, minimal, no marketing noise. A stamped registration-card feel: one focused form with clear labels, a plain ruled layout, and a short statement of what happens to their data. Password strength meter and breach-check feedback worded helpfully. Identical generic failure messages, clear loading state, lockout and rate-limit messaging that doesn't enable enumeration, resend-verification flow, and a safe `next` redirect. Handle password managers well. Social login only if it's actually implemented.

**`/verify-email`: "The Postmark"**
A postmark/stamp that resolves into a state: pending, confirming, verified, already verified, expired, invalid. Confirm-button-then-POST flow as above. Clear next action in every state.

**`/reset-password`: "The Key Exchange"**
Request step and set-new-password step with a visual that changes from "request" to "new key issued". Token stripped from the URL, strength feedback, success state that explains that other sessions were signed out.

**`/billing` (plus usage): "The Ledger"**
An accountant's ledger. The credit balance and history mirror the **append-only usage_ledger**: rows are added, never edited, with a running balance in tabular numerals; corrections appear as new compensating rows. Sections: current plan, credit balance, ledger (filter by date/type, keyset pagination, CSV export), invoices/receipts, cancel/resume with clear consequences, payment status banners (pending, failed, past_due). The success page shows the order status polled from **our API** with an honest "still processing" state, never trusting URL params. Whole section hidden when billing is disabled.

**API keys, jobs history, settings and sessions: "The Registry"**
A registry/index-card aesthetic: dense but legible tables with sticky headers, row actions, status badges, job detail pages that reopen the Light Table view with saved results. API key creation flow per the one-time-reveal rules. Active-sessions list with "sign out everywhere". Data controls: delete a document/result, view retention policy, delete account.

**404/500/maintenance: "The Missing File"**
A small, well-written filing-cabinet moment with request ID, plain explanation and a way forward. Maintenance and offline states are honest and calm.

## 4. States, resilience and UX quality
Every page and component must have designed states for: first-use empty, loading (skeletons that match layout), partial data, error (with retry and request ID), offline, rate-limited (`429` with countdown), session expired, permission denied, and very large inputs (long filenames, huge tables, 500-page documents, extremely long strings, emoji, mixed RTL/LTR text). No layout shift. Forms preserve input on error and prevent double submits. Destructive actions confirm with consequences stated. Toasts never carry the only copy of important information.

## 5. Accessibility and internationalization (WCAG 2.2 AA minimum)
Full keyboard operation and visible focus on everything (including the bounding-box canvas via the list alternative), logical heading order, landmarks, labelled controls, `aria-live` for job progress and errors, focus management on dialogs/route changes, 4.5:1 text contrast (3:1 for large text/UI), touch targets ≥ 44px, zoom to 200% without loss, `prefers-reduced-motion`, `prefers-color-scheme` plus a manual theme toggle with no flash on load. Externalize all UI strings (i18n-ready), use logical properties, test with RTL and with Urdu/Arabic sample content. Screen-reader test the Playground and forms.

## 6. Performance budget (measure, then enforce in CI)
LCP < 2.0 s, INP < 200 ms, CLS < 0.05 on a mid-range mobile profile. Marketing routes ≤ ~120 KB gzipped initial JS; app shell ≤ ~170 KB; heavy features (PDF viewer, canvas overlay, syntax highlighter, diagram) lazy-loaded and code-split. Server Components by default; client components only where interactivity requires it. Use `next/font` with local files, optimized images, virtualization for long lists/pages, SSE rather than tight polling, and no layout-blocking third-party code. Report bundle sizes per route and fail CI on regression.

## 7. Testing (every page, before moving on)
- **Unit/component** (Vitest/RTL): all component states, form validation, API client behavior (401/429/5xx/timeouts).
- **E2E** (Playwright, Chromium + WebKit + Firefox, desktop + mobile viewports): signup → verify → login → upload → view results → create/revoke key → logout; reset flow; expired session; double submit; multi-tab logout; back button after logout shows no protected content.
- **Accessibility:** automated axe checks on every route and state plus a manual keyboard/screen-reader checklist.
- **Security tests:** XSS payloads in filenames, OCR text, markdown, table cells and error messages must render inert; CSP violations fail the build; no tokens in storage; `next` open-redirect payloads rejected; reset token absent from URL/history/logs after load; API key not recoverable after dismissal.
- **Visual regression** for key pages in light/dark, LTR/RTL, mobile/desktop.
- **Self-hosted mode test:** the app loads and works with the network blocked; no requests to any external origin (fail the test if any occur); billing UI absent when disabled.
- Lighthouse CI against the budgets above. Show real outputs. Never weaken a test to make it pass.

## 8. Deliverables
1. `docs/design/BRIEF.md` (Phase 1, approved before building) and a changelog of design decisions via `docs/DECISIONS.md`.
2. Working frontend per page with all states, plus the styleguide route (dev only).
3. Typed API client, security middleware/CSP, runtime config handling.
4. Tests and CI configuration with budgets and audits.
5. `docs/frontend.md`: architecture, token reference, component guide, security model, how to add a page, how to theme/rebrand, a11y and perf checklists.
6. Per-page completion report: what changed, screenshots reviewed, tests run with results, risks, deferred items.

## Definition of done (per page)
All designed states implemented; passes axe and the keyboard checklist; meets the perf budget; security tests pass; works in both themes and both text directions; works with zero external network requests; no item in the anti-slop checklist is present; and you have reviewed it as a hostile reviewer and listed remaining weaknesses honestly.

Begin with Phase 0 (recon) and Phase 1 (the design brief). Do not write production UI code until I approve the brief.