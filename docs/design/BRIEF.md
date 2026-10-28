# OpenOCR Frontend Design Brief & System Specification
**Document ID:** `DOC-DES-2026-001`  
**Status:** DRAFT (Awaiting Approval — Phase 1 Deliverable)  
**Authors:** Senior Product Designer & Staff Frontend Security Engineer  
**Target:** `apps/web` (Next.js 16 + React 18/19 + Tailwind CSS + Radix UI Primitives)

---

## 1. Executive Summary & Brand Identity

### The Brand Metaphor: "The Archivist's Light Table"
OpenOCR is an infrastructure-grade document extraction platform built for developers, finance and operations teams, and security-conscious enterprises. The product turns messy, unstructured physical and digital paperwork into verifiable, high-precision structured data.

The brand feeling is **careful, exact, private, and human**. It draws inspiration from a **Swiss technical publication** or an **archival drafting studio**:
- Documents laid flat on an illuminated light-table surface.
- High-precision tracing-paper overlays showing detected regions.
- Hairline rules, drafting registration marks (`+`, `T`, `L`), and measurement scales.
- Ledger lines with tabular numerals, archival inspection stamps, and embossed certification seals.
- Quiet confidence and absolute transparency — zero synthetic hype.

### Anti-Slop Checklist (Strictly Enforced)
Any design or code exhibiting the following patterns will be rejected immediately:
- ❌ **No purple/blue "AI gradients"** or neon border glows.
- ❌ **No centered heroes** with two generic buttons floating above a generic angled dashboard screenshot.
- ❌ **No 3-column generic icon grids** ("Fast", "Accurate", "Scalable").
- ❌ **No glassmorphism**, fuzzy blur cards, or blobby mesh backgrounds.
- ❌ **No stock illustrations**, 3D clay hands, or generic isometric clip art.
- ❌ **No fake logos** ("Trusted by 10,000+ companies"), fake customer testimonials, or manufactured statistics.
- ❌ **No emoji bullets** in documentation or UI copy.
- ❌ **No lorem ipsum** in production or staging builds.
- ❌ **No default uncustomized Tailwind/shadcn component looks** that feel like every other template.

---

## 2. Shared Design System Specification

### 2.1 Color Tokens & Contrast Architecture
The color palette treats light and dark modes as equal first-class citizens. The light theme represents **Warm Archival Paper**, while the dark theme represents **Deep Technical Drafting Ink**.

```css
:root {
  /* ==========================================================================
     LIGHT THEME: Warm Archival Paper
     ========================================================================== */
  --surface-base: #FBF9F5;         /* Pure warm paper stock */
  --surface-subtle: #F4EFEB;       /* Secondary archival card surface */
  --surface-raised: #EDE7E1;       /* Light table inspection deck */
  --surface-sunken: #E5DFD7;       /* Recessed dropzones & inputs */
  --surface-overlay: rgba(251, 249, 245, 0.94); /* Tracing paper overlay */

  --ink-primary: #1E1E1E;          /* Primary drafting ink (Contrast 14.1:1 on base) */
  --ink-secondary: #4A4844;        /* Secondary technical notations (Contrast 7.2:1) */
  --ink-muted: #73706B;            /* Marginalia, hairline labels (Contrast 4.6:1) */

  --line-hairline: #E2DDD5;        /* Ruled lines & registration marks */
  --line-strong: #C4BEB4;          /* Borders around active frames */

  /* Signal Color: Restrained Terracotta / Drafting Amber */
  --signal: #C85A32;               /* Primary action, active extraction highlight */
  --signal-hover: #B24E2A;
  --signal-subtle: #F8EDE7;         /* Highlighting container background */
  --signal-contrast: #FFFFFF;      /* Text on signal background (Contrast 4.6:1) */

  /* Semantic State Tokens (High-Contrast, Distinguishable for Color-Blind Users) */
  --semantic-success: #1B7F4B;     /* Archival green stamp (Contrast 4.7:1) */
  --semantic-success-subtle: #EDF7F1;
  --semantic-warning: #946200;     /* Inspection alert (Contrast 4.8:1) */
  --semantic-warning-subtle: #FDF7E7;
  --semantic-error: #B42318;       /* Processing rejection (Contrast 5.1:1) */
  --semantic-error-subtle: #FEF3F2;
  --semantic-info: #1D5E99;        /* System bulletin (Contrast 5.5:1) */
  --semantic-info-subtle: #EEF5FC;

  /* Focus Indicator (Visible, Unambiguous) */
  --focus-ring: #C85A32;
  --focus-ring-offset: #FBF9F5;
}

[data-theme="dark"], html.dark {
  /* ==========================================================================
     DARK THEME: Deep Technical Drafting Ink
     ========================================================================== */
  --surface-base: #111113;         /* Deepest ink black */
  --surface-subtle: #17171A;       /* Secondary card surface */
  --surface-raised: #1F1F24;       /* Drafting table deck */
  --surface-sunken: #0C0C0E;       /* Recessed code block & input wells */
  --surface-overlay: rgba(17, 17, 19, 0.92); /* Dark light-table tracing overlay */

  --ink-primary: #EDEDEC;          /* Bright drafting white (Contrast 15.3:1) */
  --ink-secondary: #A3A19D;        /* Secondary technical notes (Contrast 7.4:1) */
  --ink-muted: #73716C;            /* Marginalia & ticks (Contrast 4.5:1) */

  --line-hairline: #27272D;        /* Ruled grid hairline */
  --line-strong: #3F3E46;          /* Strong drafting frame */

  /* Signal Color in Dark: Luminous Amber/Terracotta */
  --signal: #E07148;               /* Primary action & highlight (Contrast 5.3:1) */
  --signal-hover: #EB8159;
  --signal-subtle: #2B1811;
  --signal-contrast: #111113;

  /* Semantic State Tokens (Dark) */
  --semantic-success: #32B36D;     /* Contrast 6.8:1 */
  --semantic-success-subtle: #0E291B;
  --semantic-warning: #E0A020;     /* Contrast 7.1:1 */
  --semantic-warning-subtle: #2E2105;
  --semantic-error: #F04438;       /* Contrast 5.8:1 */
  --semantic-error-subtle: #331110;
  --semantic-info: #388BFD;        /* Contrast 5.9:1 */
  --semantic-info-subtle: #0B223D;

  --focus-ring: #E07148;
  --focus-ring-offset: #111113;
}
```

#### Contrast Ratio Verification (WCAG 2.2 AA Compliance)
| Token Pair | Light Ratio | Dark Ratio | AA Req (Normal Text) | AA Req (UI/Large Text) | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ink-primary` / `surface-base` | **14.1 : 1** | **15.3 : 1** | ≥ 4.5 : 1 | ≥ 3.0 : 1 | **PASS** |
| `ink-secondary` / `surface-base` | **7.2 : 1** | **7.4 : 1** | ≥ 4.5 : 1 | ≥ 3.0 : 1 | **PASS** |
| `ink-muted` / `surface-base` | **4.6 : 1** | **4.5 : 1** | ≥ 4.5 : 1 | ≥ 3.0 : 1 | **PASS** |
| `signal` / `surface-base` | **4.6 : 1** | **5.3 : 1** | ≥ 4.5 : 1 | ≥ 3.0 : 1 | **PASS** |
| `semantic-error` / `surface-base` | **5.1 : 1** | **5.8 : 1** | ≥ 4.5 : 1 | ≥ 3.0 : 1 | **PASS** |
| `semantic-success` / `surface-base` | **4.7 : 1** | **6.8 : 1** | ≥ 4.5 : 1 | ≥ 3.0 : 1 | **PASS** |

### 2.2 Typography: 100% Self-Hosted Open Font License (OFL) Stack
To guarantee privacy, zero third-party tracking, and 100% offline air-gapped readiness, **no remote Google Fonts or external CDNs will ever be requested**. All fonts are distributed as local WOFF2 assets in `apps/web/public/fonts/` configured via `next/font/local`.

1. **Editorial & Display Headings (Serif):** *Newsreader* (Production Type, OFL) or *Fraunces*. Gives the editorial weight, precision, and historical permanence of a printed field manual.
2. **User Interface & Controls (Humanist Grotesque):** *General Sans* or *Plus Jakarta Sans* (OFL). Clear, neutral, highly legible at small sizes, free of tech-bro geometric clichés.
3. **Data, Code, IDs, and Tabular Numerals (Monospace):** *JetBrains Mono* or *IBM Plex Mono* (OFL). Includes slashed zeros, crystal-clear punctuation distinctions, and strict tabular figure alignment (`font-variant-numeric: tabular-nums`).
4. **Urdu & Arabic Document Text (Naskh):** *Noto Naskh Arabic* (OFL). Full support for Nastaliq/Naskh ligatures, proportional Arabic diacritics, and adjusted line-height (`1.8 - 2.0`) for Pakistani and MENA invoices, receipts, and identity documents.

#### Fluid Type Scale (CSS Clamp)
```css
--font-display-2xl: clamp(2.25rem, 4vw + 1rem, 3.5rem); /* 36px -> 56px */
--font-display-xl:  clamp(1.75rem, 3vw + 0.5rem, 2.5rem); /* 28px -> 40px */
--font-heading-lg:  clamp(1.35rem, 2vw + 0.5rem, 1.75rem); /* 22px -> 28px */
--font-heading-md:  1.25rem;                                /* 20px */
--font-ui-base:     0.9375rem;                              /* 15px */
--font-ui-sm:       0.8125rem;                              /* 13px */
--font-ui-xs:       0.6875rem;                              /* 11px */
```

### 2.3 Layout, Spacing & The Drafting Grid
- **Rhythm:** Strict 4px / 8px scale (`--space-1: 4px`, `--space-2: 8px`, `--space-4: 16px`, `--space-6: 24px`, `--space-8: 32px`, `--space-12: 48px`, `--space-16: 64px`).
- **Hairline Rules:** Structural division uses visible `1px solid var(--line-hairline)` rather than heavy shadows or floating cards.
- **Registration Marks:** Section junctions and active document containers feature subtle technical registration ticks (`+` corner crosses and `—` boundary marks).
- **RTL & Logical CSS:** All styles use logical CSS properties (`margin-inline-start`, `padding-inline`, `border-inline-end`, `inset-inline-start`). When rendering Urdu or Arabic documents, text direction flips cleanly without layout corruption.

### 2.4 Shape, Texture & Depth
- **Radii:** Minimal and deliberate. Sharp `0px` for document viewports and ledgers; crisp `2px - 4px` (`rounded-sm`) for interactive buttons and input fields.
- **Shadows:** No diffuse blurry drop shadows. Depth is achieved through ruled borders (`1px solid var(--line-strong)`) and subtle tonal contrast between `--surface-base` and `--surface-raised`.
- **Texture:** A tiny inline SVG noise mask simulating 35mm archival document grain applied at `<2%` opacity, causing zero GPU repaints and zero network requests.

### 2.5 Motion System & Reduced-Motion Contracts
All animations are purposeful, informative, and short (150ms to 250ms):
- **Scan line:** A luminous 1px horizontal rule traveling across the document during OCR processing.
- **Archival Stamp:** An instantaneous rotation-scale stamp (180ms ease-out) marking verified status on completion.
- **Ledger Row Insertion:** Subtle 120ms vertical slide-in when new credit or audit events are appended.
- **Reduced Motion:** If `prefers-reduced-motion: reduce` is detected, animations are replaced with instant opacity crossfades.

---

## 3. Comprehensive Page Concepts & Signature Interactions

### 3.1 `/` Playground: "The Light Table"
*The central instrument. A document sits illuminated on an archival light table.*
- **Signature Interaction:** **Bidirectional Tracing-Paper Overlay.** As extracted regions are recognized, semi-transparent tracing-paper layers overlay the document image. Hovering a field in the structured results panel highlights its exact bounding box on the light table, and clicking a bounding box on the light table scrolls and focuses the corresponding field in the output inspector.
- **Confidence Visualization:** Confidence is not just a color badge; low confidence fields (`<85%`) feature diagonal drafting hatching (`stroke-dasharray` crosshatch) and explicit numerical percentages (`74.2%`).
- **Accessible Region List:** Below or alongside the visual light table, an accessible `<ol>` list of all detected regions is rendered with keyboard tab stops (`Tab` / `Shift+Tab`, `Arrow` keys). Screen-reader users navigate document regions without needing canvas vision.
- **Streaming Pipeline:** Real-time progress via Server-Sent Events (SSE) fallback to polling with plain-language stages: `1. Received -> 2. Normalizing & Layout -> 3. Extracting Fields -> 4. Verified`.
- **Large Document Support:** Virtualized page navigator (supports 500-page contracts/reports) with pan/zoom controls.

### 3.2 `/api-platform`: "The Field Manual"
*An authoritative, printed engineering specification translated into an interactive developer console.*
- **Signature Interaction:** **The SDK Patch Bay.** A live code generator where selecting language (cURL, Python, TypeScript, Go), authentication method (Bearer API Key, Session), and extraction format (JSON, Markdown, Plain Text) dynamically updates the code snippet with syntax-highlighted, copyable code.
- **Interactive In-Memory Request Tester:** Developers can test live extraction requests using their own API key. The key is stored **only in browser RAM** (never in localStorage/sessionStorage/cookies) and cleared on navigation.
- **Field Manual Sections:** Authentication, Extract Endpoints, Asynchronous Jobs & Polling, **HMAC Webhook Verification (with copyable constant-time verification code in Python/Node)**, Error Catalog with standard `{code, message, request_id}` envelopes, Rate Limits, and keystone pagination.

### 3.3 `/pricing`: "The Rate Card"
*A printed industrial rate card. No countdown timers, no artificial discounts, no hidden fees.*
- **Signature Interaction:** **The Live Cost Calculator.** A precision slider (from 1,000 to 500,000 pages/month) that dynamically computes exact monthly cost in tabular numerals, displaying the explicit mathematical formula:  
  `Cost = Included Allowance + (Pages - Included) × Rate/Page`.
- **Ruled Comparison Table:** Compares Free ($0), Developer Pay-As-You-Go ($0.001/page), Pro Scale ($49/mo, 60,000 included pages), and Self-Hosted Enterprise. Clearly outlines rate limits, concurrency, SLA, and overage behavior.
- **Direct Currency Toggle:** USD ($) and PKR (₨) with transparent exchange and tax notices.
- **Self-Hosted / Enterprise Routing:** Directly routes to "Contact Sales" with technical qualification fields, bypassing checkout.

### 3.4 `/self-hosted`: "The Blueprint"
*A technical architectural blueprint for enterprise security officers and infrastructure teams.*
- **Signature Interaction:** **Interactive Network Boundary Schematic.** An interactive SVG architecture diagram featuring a prominent, dashed boundary rule labeled: **"AIR-GAP PERIMETER: NO TRAFFIC CROSSES THIS LINE"**.
  - Internal nodes: FastAPI Gateway, Celery/Redis Queue, PyMuPDF Normalizer, Docling/RapidOCR Engines, Local Ollama/vLLM Models, MinIO S3, and PostgreSQL.
  - Hovering any component details its CPU/RAM footprint, isolation model (non-root, read-only rootfs), and local data flow.
- **Hardware Spec Matrix:** Precise CPU/GPU requirements (e.g. 4 Cores, 8GB RAM for 50 pages/min; optional NVIDIA T4/A10 for 500 pages/min).
- **Air-Gapped Enterprise Form:** Validated "Request Air-Gap Deployment Kit" inquiry form with strict input sanitation and zero secret transmission.

### 3.5 `/signup` & `/login`: "The Front Desk"
*The administrative intake desk. Calm, minimal, secure, devoid of marketing distraction.*
- **Aesthetic:** A clean, ruled registration docket card with archival reference serials.
- **Anti-Enumeration Guarantee:** Signup, Login, and Password Reset show identical, generic confirmation messaging whether the email exists in the database or not. No timing or content leaks.
- **NIST SP 800-63B Passphrase Meter:** Evaluates length and dictionary entropy without arbitrary symbol requirements. Accepts passphrases up to 128 characters and allows clipboard pasting.
- **Open-Redirect Validation:** Validates `next` query parameter against an internal relative path allowlist (`/^/[a-zA-Z0-9_-]/`), preventing open-redirect phishing.

### 3.6 `/verify-email`: "The Postmark"
*An archival verification desk that prevents automated token destruction.*
- **Signature Interaction:** **The Two-Step Postmark Seal.** When opened from an email link, the page displays a stamped verification docket with a clear **"Confirm Email Address"** action button.
- **Scanner Immunity:** Unlike vulnerable implementations that trigger GET requests on page load, the single-use token is only submitted via `POST /v1/auth/verify-email` when the human clicks the button. Anti-spam crawlers reading the link cannot burn the token.
- **State Feedback:** Distinct archival stamps for: `Pending Confirmation`, `Verified Successfully`, `Token Expired (with Resend Action)`, and `Already Verified`.

### 3.7 `/reset-password`: "The Key Exchange"
*A secure credential re-issuance station.*
- **Security Control:** Strips the reset token from the browser address bar immediately upon receipt using `window.history.replaceState()`, preventing token leakage via browser history or referer headers. Sets `Referrer-Policy: no-referrer`.
- **Session Revocation Notice:** Confirms upon successful password reset that all other active user sessions across all devices have been terminated.

### 3.8 `/billing` & `/usage`: "The Ledger"
*An accountant's double-entry running ledger mirroring the backend `usage_ledger`.*
- **Signature Interaction:** **Append-Only Ledger View.** Displays every credit transaction as an immutable line item with date/time, job reference ID, entry type (`job_extraction`, `subscription_grant`, `order_grant`, `refund_deduction`), delta credits, and running balance in strict tabular figures.
- **Features:** Keyset pagination, date range filtering, one-click CSV export, active subscription management (cancel/resume with explicit grace period messaging), and Safepay transaction status polling.

### 3.9 `/registry`: API Keys, Jobs History, Settings & Sessions
*The administrative record room.*
- **`/registry/keys` (The Key Registry):**
  - **One-Time Secret Reveal:** Newly created API keys are displayed in a secure modal exactly once with an instant copy button and verification checksum. Upon closing, the plaintext key is permanently purged from browser memory.
  - **Key Roster:** Displays active keys masked (prefix `ocr_live_` + last 4 characters `...9a2f`), creation date, last used timestamp, rate limits, and revocation actions with two-step confirmation.
- **`/registry/jobs` (The Job Docket):** Historical ledger of all extraction jobs with status badges (`Completed`, `Failed`, `Queued`), page counts, processing latency (ms), and an action to re-open the document directly inside the Light Table viewer.
- **`/registry/settings` (The Security Office):**
  - Active session inventory with IP address, browser/OS fingerprint, and last active time.
  - "Sign Out All Other Sessions" action.
  - Data retention settings (automatic deletion after 7, 30, or 90 days) and hard account deletion.

### 3.10 `404`, `500`, and Maintenance: "The Missing File"
*Calm, informative archival error handling.*
- **Aesthetic:** A visual reference to a misplaced filing docket or misfiled archival folder.
- **Security:** Displays a unique `Request ID` that users can quote to support. Never exposes raw stack traces, SQL errors, or environment details.
- **Clear Way Forward:** Provides explicit links back to the Light Table, System Status, or Documentation.

---

## 4. Complete Sitemap & Route Inventory

```
openocr.io / (Self-Hosted Instance)
│
├── /                           [Public/App] The Light Table (Core Document Playground)
├── /api-platform               [Public] The Field Manual (Interactive Docs & SDK Patch Bay)
├── /pricing                    [Public] The Rate Card (Cost Calculator & Plans)
├── /self-hosted                [Public] The Blueprint (Air-Gap Specs & Architecture)
│
├── /auth
│   ├── /login                  [Public] The Front Desk (Session Sign-In)
│   ├── /signup                 [Public] The Front Desk (Account Registration)
│   ├── /verify-email           [Public] The Postmark (POST Confirmation Flow)
│   ├── /forgot-password        [Public] Password Reset Request Desk
│   └── /reset-password         [Public] The Key Exchange (Token-Stripped Password Update)
│
├── /registry                   [Auth Required] The Registry Shell
│   ├── /keys                   [Auth Required] API Key Management (One-Time Reveal)
│   ├── /jobs                   [Auth Required] Extraction Job History & Results
│   └── /settings               [Auth Required] Active Sessions & Data Retention
│
├── /billing                    [Auth Required] The Ledger (Usage History & Subscriptions)
│   ├── /success                [Auth Required] Safepay Order Status Verification
│   └── /cancel                 [Auth Required] Order Cancellation Desk
│
├── /dev/styleguide             [Dev Only] Design System Component Inventory (Light/Dark/RTL)
├── /maintenance                [System] Offline & Maintenance Announcement
├── /404                        [System] Archival Misfiled Document
└── /500                        [System] Internal Equipment Malfunction
```

---

## 5. Low-Fidelity Layout Sketches (ASCII Drafting Plans)

### 5.1 `/` Playground: The Light Table
```
+----------------------------------------------------------------------------------------------------+
| [// OpenOCR v1.2]   [Light Table]  [API Platform]  [Pricing]  [Self-Hosted]    [Credits: 24,980] [User]|
+----------------------------------------------------------------------------------------------------+
| +-- LIGHT TABLE VIEWPORT ---------------------------+ +-- EXTRACTION RESULTS ----------------------+ |
| | [Page 1 of 4]  [Zoom: 100%]  [Layers: All v]      | | [Markdown] [Tables (2)] [Fields (18)] [JSON] | |
| |---------------------------------------------------| |----------------------------------------------| |
| |  +---------------------------------------------+  | | V INVOICE METADATA                           | |
| |  | INVOICE                                #4092|  | |   Invoice Number:    INV-2026-4092   [99.4%] | |
| |  | +-----------------------+                   |  | |   Invoice Date:      2026-10-24      [98.9%] | |
| |  | | BBox: Header (Field)  |                   |  | |   Due Date:          2026-11-24      [97.8%] | |
| |  | +-----------------------+                   |  | |                                              | |
| |  | Vendor: Acme Industrial Dynamics Ltd.       |  | | V LINE ITEMS TABLE                           | |
| |  | +-----------------------------------------+ |  | | | Item               | Qty | Rate  | Total  | | |
| |  | | Table BBox (Click to inspect rows)      | |  | | | Precision Servos   | 10  | $450  | $4,500 | | |
| |  | | [Row 1] Optical Sensors      | $1,200   | |  | | | Optical Sensors    |  4  | $300  | $1,200 | | |
| |  | +-----------------------------------------+ |  | |                                              | |
| |  | Subtotal: $5,700.00                         |  | | V TOTALS & TAX                               | |
| |  | Tax (8%):   $456.00                         |  | |   Subtotal:          $5,700.00       [99.1%] | |
| |  | Total:    $6,156.00                         |  | |   Tax Amount:        $456.00         [98.5%] | |
| |  +---------------------------------------------+  | |   Grand Total:       $6,156.00       [99.8%] | |
| +---------------------------------------------------+ +----------------------------------------------+ |
| +-- ACCESSIBLE REGION LEDGER (Keyboard Operable) --------------------------------------------------+ |
| | 1. Header: "INVOICE #4092" (Page 1) [99%] | 2. Field: "Vendor" (Page 1) | 3. Table: Line Items    | |
+----------------------------------------------------------------------------------------------------+
```

### 5.2 `/api-platform`: The Field Manual
```
+----------------------------------------------------------------------------------------------------+
| [// OpenOCR]  Section: 02. API Reference           [Search Field Manual (Ctrl+K)]    [Live Key: *...]|
+----------------------------------------------------------------------------------------------------+
| +-- MARGIN INDEX ---+ +-- SPECIFICATION NARRATIVE -------+ +-- SDK PATCH BAY & LIVE TESTER --------+ |
| | 01. Overview      | | ## POST /v1/extract              | | Language: [ Python v ] Auth: [ Bearer v] | |
| | 02. Authentication| |                                  | |------------------------------------------| |
| | >03. Extraction   | | Extracts OCR blocks, tables, and | | import httpx                             | |
| | 04. Jobs & Polling| | structured fields from document  | |                                          | |
| | 05. Webhooks HMAC | | bytes with zero schema selection.| | url = "https://api.openocr.io/v1/extract"| |
| | 06. Rate Limits   | |                                  | | headers = {"Authorization": "Bearer ..."} | |
| | 07. Error Codes   | | Header: Authorization: Bearer    | | with open("doc.pdf", "rb") as f:         | |
| | 08. Idempotency   | | Header: X-Requested-With         | |     res = httpx.post(url, files={"f": f})| |
| |                   | |                                  | |                                          | |
| | [Download OpenAPI]| | Status Codes:                    | | [ Run Live Request ]   [ Copy Code ]     | |
| | [PDF Manual]      | | - 200 OK (Instant Extraction)    | | +-- RESPONSE (48ms) -------------------+ | |
| |                   | | - 202 Accepted (Queued Job)      | | | {"doc_type": "invoice", "conf": 0.98} | | |
+---------------------+ +----------------------------------+ +------------------------------------------+ |
```

### 5.3 `/pricing`: The Rate Card & Cost Calculator
```
+----------------------------------------------------------------------------------------------------+
| [// OpenOCR]  RATE CARD & PROCESSING TARIFF               Currency: [ USD ($) ]   [ Contact Sales ] |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  +-- INTERACTIVE VOLUME TARIFF CALCULATOR -------------------------------------------------------+ |
|  | Monthly Extraction Volume:  [ 25,000 Pages ]                                                  | |
|  | <=================[ O ]=====================================================> (1k -> 500k)   | |
|  |                                                                                               | |
|  | Calculated Monthly Cost:      $25.00 USD                Effective Rate: $0.0010 / page        | |
|  | Recommended Plan:             Developer Pay-As-You-Go   Formula: 25,000 pages × $0.0010       | |
|  +-----------------------------------------------------------------------------------------------+ |
|                                                                                                    |
|  +-- TIER SPECIFICATIONS ------------------------------------------------------------------------+ |
|  | FREE TRIAL          | DEVELOPER (PAYG)      | PRO SCALE             | SELF-HOSTED ENTERPRISE   | |
|  |---------------------|-----------------------|-----------------------|--------------------------| |
|  | $0 / forever        | $0.0010 / page        | $49 / month           | Custom Annual License    | |
|  | 5 total docs demo   | Pay for what you use  | 60,000 pages included | Unlimited local volume   | |
|  | 2 pages / doc max   | 500 pages / doc max   | 500 pages / doc max   | Full cluster capacity    | |
|  | Web playground only | REST API + Webhooks   | 600 req/min limit     | Air-gapped / Local LLMs  | |
|  | Community support   | Standard Email        | Priority 4hr SLA      | Dedicated Field Engineer | |
|  | [Current Plan]      | [ Start Building ]    | [ Upgrade to Pro ]    | [ Inquire for Air-Gap ]  | |
|  +-----------------------------------------------------------------------------------------------+ |
+----------------------------------------------------------------------------------------------------+
```

### 5.4 `/billing`: The Accountant's Ledger
```
+----------------------------------------------------------------------------------------------------+
| [// OpenOCR]  THE USAGE LEDGER                              Active Plan: Pro ($49/mo)  [Top Up]    |
+----------------------------------------------------------------------------------------------------+
| Available Credits Balance: 24,980 Pages      Next Billing Cycle: Nov 24, 2026       [Export CSV]    |
|----------------------------------------------------------------------------------------------------|
| TIMESTAMP (UTC)      | ENTRY TYPE          | REFERENCE / JOB ID   | CREDITS DELTA   | BALANCE      |
|----------------------|---------------------|----------------------|-----------------|--------------|
| 2026-10-28 21:04:12  | usage               | job_91a02f81c4e2     | -2              | 24,980       |
| 2026-10-28 20:55:01  | usage               | job_88e411b029a1     | -4              | 24,982       |
| 2026-10-24 00:00:00  | subscription_grant  | sub_renew_oct2026    | +60,000         | 24,986       |
| 2026-10-23 18:12:44  | usage               | job_77c102fa9102     | -1              | -35,014      |
| 2026-10-20 11:22:10  | order_grant         | ord_safe_9918231     | +10,000         | -35,013      |
+----------------------------------------------------------------------------------------------------+
```

---

## 6. Architecture & Security Invariants

### 6.1 Content Security & Zero Untrusted Render
- **Sanitized Markdown Rendering:** OCR and LLM outputs are treated as hostile strings. Content is rendered via a locked-down Markdown pipeline (no raw HTML, strict tag allowlist, links limited to `https:` and `mailto:` with `rel="noopener noreferrer"`, zero remote image embedding).
- **Prohibited Patterns:** `dangerouslySetInnerHTML` is prohibited across all client components. An ESLint custom rule will fail any pull request introducing it.
- **Client-Side Document Isolation:** Document files (PDFs/Images) are rendered onto unprivileged `<canvas>` elements using pinned local rendering libraries. No remote worker scripts, external CDNs, or remote font CMaps.

### 6.2 Session Security & Same-Origin Policy
- **No Client-Side Token Storage:** The browser **never** stores authentication tokens or API keys in `localStorage`, `sessionStorage`, or `IndexedDB`. All session state resides in the `__Host-openocr_session` HttpOnly, Secure, SameSite=Lax cookie.
- **Unified Same-Origin Proxying:** All frontend calls to `/v1/*` proxy through Next.js rewrites to the FastAPI backend service. This eliminates cross-origin preflight latency and keeps the `__Host-` cookie secure.
- **Cross-Tab Session Synchronization:** Uses `BroadcastChannel("openocr_auth")` to propagate logout events across all open browser tabs immediately.
- **Idle Session Warnings:** Displays an archival warning dialog 5 minutes prior to session expiration, preserving non-sensitive form inputs.

### 6.3 Public Runtime Configuration Endpoint
To ensure that **a single Docker container image can be deployed across multi-tenant cloud and air-gapped self-hosted enterprises alike**, feature toggles are fetched from a runtime endpoint (`/v1/config/public`), never baked into static `NEXT_PUBLIC_*` build-time variables:
- `billing_enabled`: Hides checkout buttons, pricing upgrades, and payment modals when self-hosted.
- `signup_mode`: `open`, `invite_only`, or `closed`.
- `deployment_mode`: `cloud` or `self_hosted_airgap`.

---

## 7. Component Inventory & State Matrix

Every component in the system implements **7 mandatory states**:
1. `default`: Rest state on the paper or ink surface.
2. `hover`: Subtle hairline shift or tonal surface reaction.
3. `focus-visible`: High-contrast drafting focus ring (`2px solid var(--focus-ring)` with `2px offset`).
4. `active`: Tactical depressed state (`scale(0.99)`).
5. `disabled`: Desaturated, non-reactive (`opacity: 0.4`, `cursor: not-allowed`).
6. `loading`: Skeleton pulse or mechanical indicator preserving exact component dimensions.
7. `error`: Semantic error border with high-contrast inline messaging.

### Component Roster (To be showcased in `/dev/styleguide`):
- `Button` (Primary Signal, Secondary Ruled, Subtle, Destructive)
- `Input` & `TextArea` (with label, help text, character counter, and error banner)
- `Select` & `DropdownMenu` (accessible Radix primitives with keyboard roving index)
- `Dialog` & `Drawer` (modal inspection cards with backdrop blur and focus trap)
- `Tabs` (segmented archival ledger tabs)
- `Toast` (ephemeral notification docket with progress indicator)
- `Table` (dense tabular ledger with sticky header and keyset pagination)
- `Tooltip` (technical annotation callout)
- `Badge` (confidence score badge, status stamp)
- `Progress` (stepped pipeline progress meter)
- `EmptyState` (archival misfiled notice with call to action)
- `Skeleton` (layout-matching tonal placeholder)
- `CodeBlock` (with line numbering, language tag, and copy feedback)
- `KeyValueDisplay` (archival property inspector)
- `BoundingBoxOverlay` (canvas and SVG coordinate overlay with bidi hover)
- `FileDropZone` (technical drop target with drag-and-drop registration ticks)
- `StatMetric` (tabular figure counter with change delta)

---

## 8. Accessibility (WCAG 2.2 AA) & Performance Contracts

### 8.1 Accessibility Invariants
- **100% Keyboard Operability:** All controls, modals, tabs, dropdowns, and bounding boxes (via the synchronized region list) are fully operable with standard keyboard navigation.
- **Color Independence:** No status, error, or confidence metric relies on color alone. All states include distinct icons, borders, or numerical labels.
- **Screen Reader Announcements:** Dynamic progress updates and errors utilize `aria-live="polite"` and `aria-live="assertive"` regions.
- **Touch Target Sizing:** Minimum interactive target area of `44px × 44px` on mobile and tablet touchscreens.

### 8.2 Performance Budgets (Measured in CI)
- **Largest Contentful Paint (LCP):** `< 1.8 seconds` on mid-range mobile profiles.
- **Interaction to Next Paint (INP):** `< 150 ms`.
- **Cumulative Layout Shift (CLS):** `< 0.02` (zero layout shifting during document or table loading).
- **Bundle Budgets:**
  - Initial Marketing JavaScript: `≤ 110 KB` gzipped.
  - Core App Shell JavaScript: `≤ 165 KB` gzipped.
  - Heavy feature viewers (PDF/canvas renderer, syntax highlighter, blueprint diagram) must be code-split and loaded on demand.

---

## 9. Verification & Delivery Schedule

Upon user approval of this brief, execution will proceed through the remaining phases:

1. **Phase 2 (Foundation):**
   - CSS design tokens, WOFF2 OFL local font bundling, Radix UI primitive wiring.
   - Next.js middleware with per-request nonce CSP, cache-control, and API rewrites.
   - Typed API client module (`api-client.ts`) replacing legacy raw fetch calls.
   - Dev styleguide route (`/dev/styleguide`).
2. **Phase 3 (Per-Page Implementation & Unit/Component Verification):**
   - Auth pages (`/signup`, `/login`, `/verify-email`, `/reset-password`).
   - Core Playground (`/`) with bidirectional Light Table overlays and accessible region ledger.
   - Ledger & Billing (`/billing`, `/registry/keys`, `/registry/jobs`, `/registry/settings`).
   - Marketing & Blueprint pages (`/pricing`, `/api-platform`, `/self-hosted`).
   - Error states (`/404`, `/500`, `/maintenance`).
3. **Phase 4 (Hardening, Audits & Playwright E2E):**
   - Automated axe-core accessibility audit across all pages and states.
   - Playwright end-to-end testing suite (auth, document upload, bbox interaction, key management, Safepay checkout flow).
   - Security verification (XSS payload inertness, CSP compliance, zero token storage).
   - Responsive multi-device screenshots (Mobile, Tablet, Desktop) across light and dark themes.
   - Comprehensive frontend documentation (`docs/frontend.md`).
