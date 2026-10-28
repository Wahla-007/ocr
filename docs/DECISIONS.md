# OpenOCR Architectural Decision Records (ADR)

This document records architectural, security, and design decisions for OpenOCR according to the **Decision Protocol** defined in `AGENTS.md`.

---

## ADR 001: Next.js API Proxying & Same-Origin Cookie Policy

### 1. Problem
The frontend (`apps/web`) communicates with the FastAPI backend (`apps/api`) at `http://localhost:8000`. Browsers enforce strict cross-origin cookie policies on `__Host-` prefixed cookies (`__Host-openocr_session`). If the web frontend makes direct cross-origin browser calls to `http://localhost:8000`, `SameSite=Lax` or `SameSite=Strict` behavior across different ports or origins requires CORS loosening (`Access-Control-Allow-Credentials: true` with explicit origin), exposing session cookies to misconfiguration and preflight overhead. Furthermore, some legacy client code previously called internal mock routes in `apps/web/src/app/api/v1/*` which spawned local Python scripts, bypassing the authoritative FastAPI backend.

### 2. Alternatives
- **Option A (Direct Cross-Origin):** The browser makes requests directly to `http://localhost:8000/v1/*`. Requires cross-origin CORS headers, credentials sharing across ports, and separate handling for development vs production reverse proxies.
- **Option B (Next.js Rewrites / Same-Origin Proxy):** Configure Next.js `rewrites()` in `next.config.mjs` to proxy `/api/v1/:path*` or `/v1/:path*` to the backend (`FASTAPI_INTERNAL_URL` or `http://127.0.0.1:8000/v1/:path*`). All browser client requests target the same origin (`/v1/*`).

### 3. Decision Protocol Scoring
| Metric | Option A (Direct Cross-Origin) | Option B (Next.js Rewrites / Same-Origin) |
| :--- | :--- | :--- |
| **Security** | 3/5 (Relies on CORS allowlist; risk of origin leakage) | 5/5 (`__Host-` cookie works seamlessly on same origin; no CORS preflights) |
| **Correctness** | 4/5 | 5/5 (Consistent single origin for cookies and API) |
| **User Value** | 4/5 | 5/5 (Zero preflight latency on state-changing requests) |
| **Performance** | 3/5 (OPTIONS preflight on every non-simple call) | 5/5 (Direct internal streaming/proxying, zero browser preflights) |
| **Complexity** | 3/5 (Needs sync between CORS configs in API and frontend) | 4/5 (Simple rewrite rule in Next.js config or reverse proxy) |
| **Self-Hosted Fit** | 3/5 (Requires user to configure multiple ports/domains) | 5/5 (Single ingress/port handles web and API cleanly) |

### 4. Verdict: DO IT (Option B)
Next.js will proxy `/v1/*` to the FastAPI backend service. The typed API client (`apps/web/src/lib/api-client.ts`) will issue same-origin calls with `credentials: "include"`, `X-Requested-With: "OpenOCR-Web"`, and request-ID propagation. The legacy shadow routes in `apps/web/src/app/api/v1/*` that spawned local Python CLI processes will be replaced.

---

## ADR 002: Email Verification POST Confirmation to Prevent Scanner Consumption

### 1. Problem
Modern email security filters, anti-spam gateways (e.g., Microsoft Defender, Proofpoint), and link prefetchers automatically perform HTTP GET requests on URLs found in incoming emails. When verification tokens are consumed on GET requests (e.g. `GET /verify-email?token=...` triggering an immediate API mutation on page load), the token is consumed by the scanner before the user even opens the email. When the user clicks the link seconds later, they receive an error stating the token has expired or already been used.

### 2. Alternatives
- **Option A (Auto-verify on load):** Execute verification mutation immediately in `useEffect` when `/verify-email?token=...` mounts.
- **Option B (Two-step POST confirmation):** The verification page renders the "Postmark" stamp in a pending state and displays a clear "Confirm Email Address" button. The token is only submitted via `POST /v1/auth/verify-email` when the user explicitly clicks the button.

### 3. Decision Protocol Scoring
| Metric | Option A (Auto-verify) | Option B (Two-Step POST) |
| :--- | :--- | :--- |
| **Security** | 2/5 (Vulnerable to token-burning by scanners) | 5/5 (State change strictly requires explicit user POST) |
| **Correctness** | 2/5 (High false-positive token expiration reports) | 5/5 (Complies with OWASP and RFC 7231 idempotent GET) |
| **User Value** | 3/5 (Fast when it works, broken when scanner runs) | 5/5 (100% reliable inbox delivery experience) |
| **Complexity** | 5/5 (Trivial) | 4/5 (Single interactive button and state machine) |

### 4. Verdict: DO IT (Option B)
`/verify-email` will display an archival stamp interface with a prominent "Confirm Email Address" action that issues `POST /v1/auth/verify-email`. Scanners executing GET will see the confirmation page without burning the token.

---

## ADR 003: Accessible Keyboard-Navigable Region List for Light Table Canvas

### 1. Problem
The core document playground uses a visual light-table canvas to render bounding boxes (bboxes) over extracted pages. HTML `<canvas>` elements and overlaid floating divs are inherently inaccessible to screen readers and keyboard-only users unless backed by a semantic DOM representation.

### 2. Alternatives
- **Option A (Visual Overlay Only):** Only render clickable bounding box overlays on the document preview image.
- **Option B (Synchronized Semantic Region Ledger):** Render an accessible, structured `<ol>` region list alongside the document viewer. Every detected region (header, field, table, paragraph) has a keyboard-focusable item (`role="listitem"`, `aria-label`, confidence score, page number, coordinates). Focusing or hovering any item in the list highlights the canvas bounding box, and clicking/focusing a canvas box scrolls and highlights the list item.

### 3. Decision Protocol Scoring
| Metric | Option A (Visual Only) | Option B (Synchronized Region Ledger) |
| :--- | :--- | :--- |
| **Accessibility** | 1/5 (Fails WCAG 2.2 AA SC 2.1.1 Keyboard) | 5/5 (Fully accessible, screen-reader announced, keyboard operable) |
| **User Value** | 3/5 (Difficult to inspect small dense bounding boxes) | 5/5 (Dense documents can be navigated systematically) |
| **Complexity** | 4/5 | 4/5 (Clean two-way state binding: `activeFieldId`) |

### 4. Verdict: DO IT (Option B)
The Light Table playground will feature bidirectional linking between the visual bounding box overlay and an accessible semantic region ledger, satisfying WCAG 2.2 AA.

---

## ADR 004: Strict CSP with Per-Request Nonces in Next.js Middleware

### 1. Problem
The current FastAPI CSP header includes `'unsafe-inline' 'unsafe-eval'` in `script-src`. To meet OWASP ASVS L2 and the project constitution, all scripts and inline styles must be protected by cryptographic per-request nonces, with zero `'unsafe-inline'` or `'unsafe-eval'`.

### 2. Alternatives
- **Option A (Static CSP without nonces):** Use hashes or allow `'self'`, but this breaks Next.js App Router hydration scripts unless `'unsafe-inline'` is permitted.
- **Option B (Next.js Middleware Nonce Injection):** Generate a CSPRNG base64 nonce in Next.js `middleware.ts` per request. Pass the nonce via `x-nonce` request header to root layout and inject it into the `Content-Security-Policy` header.

### 3. Decision Protocol Scoring
| Metric | Option A (Static CSP) | Option B (Next.js Nonce Middleware) |
| :--- | :--- | :--- |
| **Security** | 2/5 (Forces unsafe-inline) | 5/5 (Eliminates script injection XSS vectors) |
| **Correctness** | 3/5 | 5/5 (Standard Next.js recommended security architecture) |
| **Air-Gap Fit** | 4/5 | 5/5 (100% local, no external dependencies) |

### 4. Verdict: DO IT (Option B)
Implement Next.js middleware with per-request nonce generation, strict CSP (`object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`), and coordinate with FastAPI headers.

---

## ADR 005: 100% Self-Hosted OFL Fonts for Complete Air-Gap Operation

### 1. Problem
Document extraction platforms in enterprise and defense environments often run in air-gapped networks with zero egress. Using Google Fonts (`fonts.googleapis.com` or `fonts.gstatic.com`) leaks client IPs, fails in offline environments, and violates air-gapped mode.

### 2. Alternatives
- **Option A (Google Fonts via next/font):** Downloads at build time in Vercel, but external font fetch during build or runtime fails in strict enterprise proxy environments.
- **Option B (Self-Hosted OFL Font Assets):** Bundle Open Font License (OFL) WOFF2 font files directly inside `apps/web/public/fonts/` and declare them via `next/font/local`.
  - Editorial/Display Serif: *Fraunces* or *Newsreader*
  - UI Humanist Grotesque: *Plus Jakarta Sans* or *General Sans*
  - Monospace (Code, IDs, Tabular Numerals): *JetBrains Mono* or *IBM Plex Mono*
  - Urdu/Arabic (Naskh/Nastaliq): *Noto Naskh Arabic*

### 3. Decision Protocol Scoring
| Metric | Option A (Google Fonts CDN) | Option B (Self-Hosted Local WOFF2) |
| :--- | :--- | :--- |
| **Security & Privacy** | 2/5 (IP leakage to third-party CDNs) | 5/5 (Zero external requests) |
| **Air-Gap Fit** | 1/5 (Completely breaks air-gapped mode) | 5/5 (100% offline self-hosted compatibility) |
| **Performance** | 3/5 (External DNS, TLS, connection setup) | 5/5 (Served directly from same origin with immutable caching) |

### 4. Verdict: DO IT (Option B)
Bundle 100% local WOFF2 font files using `next/font/local`. No third-party font CDNs.
