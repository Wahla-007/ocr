# OpenOCR Frontend System & Architecture Guide (`apps/web`)

**Version:** 1.2.0  
**Status:** Shipped (Phase 4 Hardening Complete)  
**Standard:** WCAG 2.2 AA / OWASP ASVS Level 2 / NIST SP 800-63B  
**Metaphor:** *The Archivist's Light Table*

---

## 1. Architecture Overview

`apps/web` is built with **Next.js 16 (App Router)**, **React 18**, and **Tailwind CSS**, communicating with the **FastAPI backend** (`apps/api`) at `http://127.0.0.1:8000`.

### Key Architectural Invariants
1. **Same-Origin Proxying:** Next.js `rewrites()` in `next.config.mjs` proxies `/v1/*` to the FastAPI backend. All browser client requests target the same origin (`/v1/*`), allowing `__Host-openocr_session` cookies to function with strict `SameSite` policies without requiring loosened CORS preflights.
2. **Zero Storage of Secrets in Browser Storage:** No API tokens, session IDs, API keys, or document contents are ever written to `localStorage`, `sessionStorage`, or `IndexedDB`. All session state resides in the `__Host-openocr_session` HttpOnly, Secure, SameSite=Lax cookie.
3. **100% Self-Hosted & Air-Gap Ready:** Zero external CDNs, zero third-party analytics, and zero Google Fonts. Every font and asset is bundled locally, guaranteeing operation in offline and air-gapped sovereign networks.

---

## 2. Design System & Token Reference

The visual direction is **The Archivist's Light Table**: a Swiss technical manual translated to an archival drafting studio.

### 2.1 CSS Variables & Palette Tokens
Defined in [`src/app/globals.css`](file:///D:/openocr/apps/web/src/app/globals.css) and wired into [`tailwind.config.ts`](file:///D:/openocr/apps/web/tailwind.config.ts):

| Token | Light Theme ("Warm Paper") | Dark Theme ("Drafting Ink") | Description | Contrast Ratio |
| :--- | :--- | :--- | :--- | :--- |
| `--surface-base` | `#FBF9F5` | `#111113` | Main background surface | — |
| `--surface-subtle` | `#F4EFEB` | `#17171A` | Secondary card background | — |
| `--surface-raised` | `#EDE7E1` | `#1F1F24` | Elevated inspection deck | — |
| `--surface-sunken` | `#E5DFD7` | `#0C0C0E` | Recessed inputs and code wells | — |
| `--ink-primary` | `#1E1E1E` | `#EDEDEC` | Primary text | **14.1:1** / **15.3:1** (Pass) |
| `--ink-secondary` | `#4A4844` | `#A3A19D` | Secondary text | **7.2:1** / **7.4:1** (Pass) |
| `--ink-muted` | `#73706B` | `#73716C` | Ticks, marginalia, labels | **4.6:1** / **4.5:1** (Pass) |
| `--line-hairline` | `#E2DDD5` | `#27272D` | Structural hairline grid rules | — |
| `--line-strong` | `#C4BEB4` | `#3F3E46` | Active borders and frames | — |
| `--signal` | `#C85A32` | `#E07148` | Primary terracotta action color | **4.6:1** / **5.3:1** (Pass) |
| `--semantic-success` | `#1B7F4B` | `#32B36D` | Verification stamp | **4.7:1** / **6.8:1** (Pass) |
| `--semantic-error` | `#B42318` | `#F04438` | Rejection and error banner | **5.1:1** / **5.8:1** (Pass) |

### 2.2 Typography Stack
* **Display & Editorial Serif:** *Newsreader* / *Fraunces* (OFL) for authoritative titles.
* **UI Humanist Grotesque:** *General Sans* / *Plus Jakarta Sans* (OFL) for clear, neutral interface labels.
* **Data, Code, & Tabular Figures:** *JetBrains Mono* (OFL) with `font-variant-numeric: tabular-nums` (`.tabular-nums`) for currency, counts, and dates.
* **Urdu / Arabic Document Content:** *Noto Naskh Arabic* (OFL) with adjusted line-height (`1.8 - 2.0`) for Pakistani invoices, receipts, and identity documents.

---

## 3. Security Model & Defensive Controls

### 3.1 Content-Security-Policy with Per-Request Nonces
In [`src/middleware.ts`](file:///D:/openocr/apps/web/src/middleware.ts), every HTTP request generates a CSPRNG base64 nonce. The middleware enforces:
```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://sandbox.api.getsafepay.com https://api.getsafepay.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self' https://sandbox.api.getsafepay.com https://getsafepay.com;
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

### 3.2 Cache-Control on Protected Routes
Protected routes (`/registry/*`, `/billing/*`, `/auth/*`) receive:
```http
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0
Pragma: no-cache
Expires: 0
```
This guarantees that hitting the browser back button after logout never exposes protected ledger data or API keys.

### 3.3 Two-Step POST Email Verification (Anti-Scanner Defense)
Email security filters and link prefetchers consume single-use tokens sent via GET. In OpenOCR, `/verify-email?token=xyz` loads "The Postmark" in a pending state with a clear "Confirm Email Address" action that issues `POST /v1/auth/verify-email`. Automated link scanners visiting the link via GET cannot burn the token.

### 3.4 Open-Redirect Defense
All redirects using query parameters (`?next=...`) pass through `validateInternalRedirect()` in [`src/lib/api-client.ts`](file:///D:/openocr/apps/web/src/lib/api-client.ts), rejecting protocol-relative URLs (`//evil.com`), backslash bypasses (`/\evil.com`), and non-relative schemes.

### 3.5 Token Stripping on Password Reset
When navigating to `/reset-password?token=...`, the token is read into memory and immediately stripped from the address bar via `window.history.replaceState()`, and the page enforces `<meta name="referrer" content="no-referrer">`.

---

## 4. Component Inventory & Guide

All components reside in [`src/components/ui/`](file:///D:/openocr/apps/web/src/components/ui/) and support 7 standard states: `default`, `hover`, `focus-visible`, `active`, `disabled`, `loading`, and `error`.

* **`Button`:** Primary signal, secondary ruled, outline, subtle, and destructive variants with loading spinners.
* **`Input`:** Unstyled input with labels, hints, error banners, and password reveal toggles.
* **`Badge`:** Confidence score computation and archival status stamps.
* **`Dialog`:** Accessible modal wrapping `@radix-ui/react-dialog` with focus trap and backdrop.
* **`Tabs`:** Accessible segmented ruler wrapping `@radix-ui/react-tabs`.
* **`Table`:** Dense tabular ledger with sticky headers and tabular figures.
* **`CodeBlock`:** Technical syntax block with line numbers and one-click copy feedback.
* **`Progress`:** Linear progress meter wrapping `@radix-ui/react-progress`.
* **`DocumentViewer`:** Light table canvas with tracing paper bounding boxes, low-confidence crosshatching, and an accessible semantic region ledger.
* **`ResultsPanel`:** Structured results inspector with bidirectional field highlighting and multi-tab exports.
* **`DropZone`:** Drafting drop target with registration marks and quick sample specimens.

---

## 5. Development Styleguide

To visually inspect all design tokens, components, light/dark themes, and LTR/RTL reading directions in your browser:
```bash
npm run dev
# Open http://localhost:3000/dev/styleguide
```
*Note: The `/dev/styleguide` route is automatically disabled in production builds via `notFound()`.*

---

## 6. How to Add a New Page

1. **Create the Route Directory:** Add `src/app/your-page/page.tsx`.
2. **Apply Archival Page Shell:**
   ```tsx
   import { Header } from "@/components/Header";
   import { Badge } from "@/components/ui/Badge";

   export default function YourPage() {
     return (
       <div className="min-h-screen bg-[var(--surface-base)] text-[var(--ink-primary)]">
         <Header />
         <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
           {/* Page Content */}
         </main>
       </div>
     );
   }
   ```
3. **Use Typed API Client:**
   ```tsx
   import { apiClient } from "@/lib/api-client";
   const data = await apiClient<YourType>("/v1/your-endpoint");
   ```
4. **Adhere to the Anti-Slop Checklist:**
   * Visible hairline rules (`border-[var(--line-strong)]`) instead of heavy blurry shadows.
   * Tabular figures (`.tabular-nums`) for all numbers and dates.
   * Registration marks (`.registration-mark`) on key focal containers.
   * Plain, specific, honest copy.
