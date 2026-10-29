# TASK: Build the OpenOCR Support Platform (support.<domain>): tickets, live chat, knowledge base and an agent console, with plan-based priority

## Role
Act as a senior full-stack engineer, security engineer and product designer. Follow `AGENTS.md` (Decision Protocol, security, self-hosted rules, testing), the frontend brief (design system, accessibility, CSP) and the chat widget brief. Where this brief conflicts with any of them, flag it and propose a resolution before building.

## Goal
A customer support portal on its own subdomain (`support.<domain>`) that:
1. Uses the **same user accounts and backend** as the main product (single user table, same API service).
2. Lets customers sign in, create and track tickets, chat with support, search the KB, and manage their support profile.
3. Gives staff an **agent console** to triage, reply, chat, assign and report.
4. **Prioritizes work by customer plan.** Order: **Self-Hosted/Enterprise (highest) > Developer > Free**. Severity and SLA clocks refine the order within the tiers.
5. Is secure, auditable, accessible, privacy-respecting and cheap to run.

## Ground rules
1. **Recon first**, then design, then code. Stop for approval at Phase 1.
2. **No invented SLAs, response times, plans or entitlements.** Everything customer-facing about response targets comes from config I set. Until I provide values, show "Priority support" labels without numbers.
3. **Priority is decided by the server from entitlement records, never from client input.** A user cannot choose or claim a plan tier.
4. The portal is operated by me. It is **not** shipped inside self-hosted deployments. Self-hosted customers reach support through this portal from outside their network, and self-hosted installs make zero calls to it.
5. Staff tooling is a high-value attack target. Treat anything a customer can type as hostile content that staff will view.

## Process (stop for approval where stated)
**Phase 0, recon:** inspect auth/session code, user and plan/credits models, entitlement logic, API conventions, Redis, queue/worker, email sender, storage, design tokens, KB (`/kb`), chat widget plans, CSP/middleware, and deployment/DNS setup. Report what's reusable.
**Phase 1, design (STOP for approval):** `docs/support/DESIGN.md`: architecture, subdomain/session design, data model, priority and SLA model, threat model, page list with concepts, build-vs-buy decision for realtime, attachment pipeline, cost estimate, and rollout plan. Run the Decision Protocol on each major choice.
**Phase 2, backend foundation:** auth handoff, organizations/entitlements, tickets, messages, attachments, priority engine, SLA timers, notifications, audit log.
**Phase 3, customer portal.**
**Phase 4, agent console, live chat, reporting.**
**Phase 5, hardening, testing, docs, launch checklist.**

## 1. Architecture and subdomain security
- New frontend app `apps/support` (Next.js, same design tokens and shared UI package). Backend: new routers under `apps/api/app/api/v1/support/*` in the **same FastAPI service and database** (no separate user store). Propose a shared package for tokens/components; don't copy-paste.
- **Cookie and session design (critical):** `__Host-` cookies cannot be shared across subdomains, and widening a cookie to the parent domain would also expose it to every other subdomain, so don't do that. Instead, the support site gets **its own session cookie** (`__Host-openocr_support_session`, HttpOnly, Secure, SameSite=Lax), established by a **one-time authorization-code handoff** from the main auth: user clicks "Sign in" on the support site → redirected to the main login (reuse the existing login and MFA UI) → returns with a short-lived (≤60 s), single-use, hashed, audience-bound code plus `state` and PKCE → the support site exchanges it server-side for its own session. Same user, separate session, no shared cookie. Validate redirect URIs against an exact allowlist; reject open redirects.
- Session coupling: password change, "sign out everywhere", account deactivation or deletion revoke support sessions too (shared revocation check). Logout on one site offers to log out of the other.
- Same-origin API calls for the support app (rewrites/reverse proxy), no wildcard CORS, strict CSP with nonces, `frame-ancestors 'none'`, HSTS (consider `includeSubDomains` consequences before enabling), and `Referrer-Policy: strict-origin-when-cross-origin` or stricter. Support pages are `noindex` except a public KB if I approve indexing it.
- **Agent console isolation:** staff tools live on a route group with stricter controls: mandatory MFA (TOTP/WebAuthn), short idle timeout, re-authentication for sensitive actions, optional IP allowlist, and separate role checks. Evaluate (Decision Protocol) putting it on a separate subdomain (`agent.support.<domain>`) to contain any customer-content XSS from reaching staff sessions; recommend one and explain why.
- Signing in requires a **verified email**. Anonymous visitors may read the public KB and use the chat widget handoff, but must sign in (or verify their email by magic link) to open a ticket.

## 2. Identity, organizations and entitlements (the source of priority)
- Add organizations: `organizations` (id, name, type: individual | team | enterprise | self_hosted), `org_members` (org_id, user_id, role: owner | admin | member | viewer), `entitlements` (org_id, plan_tier: free | developer | enterprise | self_hosted, support_level, sla_profile_id, valid_from, valid_to, source: billing | contract | manual, set_by, audit fields). Individuals get a personal org automatically.
- **Plan tier is derived server-side** from the entitlement record tied to the billing/subscription state (managed plans) or a verified support contract (self-hosted/enterprise). Changes to entitlements are audited and restricted to billing code or admins.
- **Self-hosted verification:** self-hosted customers are identified by a support contract/license record that I (admin) create or approve and link to their org. A user claiming to be self-hosted gets nothing until an admin links the org. Show expired contracts honestly (priority drops to the next tier, with a visible notice and renewal contact); never silently downgrade or upgrade.
- Org members see org tickets according to role (owner/admin see all, members see their own plus shared ones). Provide an invite flow (signed, expiring, single-use invites) and removal. Enterprise and self-hosted orgs may define named support contacts.
- **IDOR-proof everywhere:** every ticket, message, attachment, chat and org read/write is authorized in the query by org membership and role, with tests.

## 3. Ticket system
**Data model (reversible migrations, UUIDs, UTC, DB-level constraints):** `tickets` (id, public reference like `OCR-2026-000123`, org_id, requester_id, subject, category, severity, plan_tier_snapshot, priority_score, status, channel: portal | chat | email | api, assignee_id, team, tags, product_area, environment fields, sla targets/timers, first_response_at, resolved_at, closed_at, csat, created_at, updated_at, merged_into), `ticket_messages` (id, ticket_id, author_id, author_type: customer | agent | system | bot, visibility: public | internal, body_text, body_sanitized_html, created_at, edited_at, source), `attachments`, `ticket_events` (append-only audit of status, assignee, priority, SLA, merge changes), `ticket_participants` (CC'd org members), `macros/canned_replies`, `tags`, `csat_responses`, `sla_profiles`, `sla_timers`, `kb_suggestions_shown`.
- **Status workflow** with enforced transitions: New → Open → Waiting on Customer → Waiting on Internal/Engineering → On Hold → Resolved → Closed (auto-close after N days of resolved, configurable) and Reopened (customer reply within N days reopens). Timers pause on "Waiting on Customer".
- **Creation flow (customer):** guided form: category (Bug/API problem, Account/Login, Billing, Credits & Usage, Self-hosted install/upgrade, Security report, Feature request, Other), severity (S1 production down, S2 major impact, S3 minor, S4 question), affected area, description, environment details (API vs web, request IDs, job IDs, version, deployment mode), and optional attachments. **Before submitting**, show suggested KB articles ("These might solve it") based on subject and description, with an "I still need help" button. Deflection must never block or hide the submit option.
- Severity is **customer-proposed, agent-confirmed**: severity S1 requires a confirmation step explaining what S1 means, and agents can re-rate it with the change recorded. Repeated unjustified S1 claims are flagged for review.
- **Security reports** (suspected vulnerabilities, compromise) use a distinct, restricted-visibility path: marked confidential, visible only to security-role staff, with guidance to follow the responsible-disclosure policy and a reminder to avoid exploit details beyond what's needed.
- **Billing/refund/credit requests** are tickets for humans. The portal never auto-approves anything financial.
- Duplicate protection: warn on near-duplicate open tickets from the same org; idempotency keys on create; per-user and per-org rate limits and daily caps (tighter for Free).
- Customers can reply, add attachments, CC colleagues (org members only in v1), reopen, resolve ("this solved it"), and rate satisfaction (CSAT). Agents can reply publicly, add **internal notes** (never visible to customers, enforced server-side by visibility checks and tests), merge/split, link related tickets, change fields via macros, and set reminders.
- Full-text search across a user's own tickets; agents get org-wide search with filters (status, priority, tier, assignee, tag, SLA state, date).

## 4. Priority, queue and SLA engine
Implement as a small, **deterministic, unit-tested, config-driven** module (no model involved):
- **Tier weight** (configurable, default order): self_hosted/enterprise contract > developer > free. Contract-specific SLA profiles may override defaults for individual orgs.
- **Severity weight** modifies within the tier (S1 > S2 > S3 > S4). A Free-tier S1 does not outrank a Self-Hosted S1, but may outrank a Self-Hosted S4. Document the exact matrix in `docs/support/PRIORITY.md` and show me worked examples.
- **Aging:** priority rises slowly as tickets wait so Free-tier tickets never starve indefinitely (bounded so aging can't leapfrog a higher tier's high-severity ticket). Explain the formula and expose its parameters in config.
- **SLA timers** per profile: first-response and next-response/resolution targets, business-hours calendars and holidays (timezone-aware, UTC storage), pause/resume on waiting states, breach and near-breach events. Targets come from config/contract. If none is configured for a tier, no number is shown to the customer and no breach alerts fire for that tier (but internal ordering still applies).
- **Queue ordering for agents:** sorted by priority score, then SLA time-to-breach, then age. Make "why is this ticket ranked here" visible (tier, severity, SLA clock, aging) for transparency.
- **Breach handling:** near-breach warnings to the assignee, breach notifications to the team lead, and for self-hosted S1 an on-call notification path (email/webhook; integrate with an on-call tool only if I approve). Everything idempotent with deduplicated alerts.
- Priority snapshot rule: record the tier at creation (`plan_tier_snapshot`), then recompute when entitlements change by documented rules (e.g., upgrades apply to open tickets; downgrades apply only to new tickets, unless an admin overrides). Agent overrides are allowed, require a reason, and are audited.
- **Anti-abuse:** a user cannot raise their own priority; severity inflation is rate-limited and flagged; priority fields are not writable via the customer API (Pydantic `extra=forbid` and tests).

## 5. Live chat
- Realtime transport decision (Decision Protocol): SSE for server→client plus POST for client→server, or WebSocket. Pick the simplest option that supports presence, typing indicators and reconnection with message replay. Authenticate at connect, re-validate authorization per message, limit message size and rate, enforce origin checks (including WebSocket `Origin`), heartbeat, backpressure, and idle cutoff.
- Chat is **ticket-backed**: every chat session is a conversation attached to a ticket (created on first message or on request), so transcripts, SLA and audit all work the same way. If no agent is available, the chat converts to a ticket automatically with an honest message, and the user receives an email copy.
- Chat routing: queue ordered by the same priority engine (self-hosted first), agent capacity limits, assignment, transfer, and canned replies. Show the customer an honest wait indicator only if it is computed from real data. Never fake "agents typing" or fake queue positions.
- Agent presence and business hours from config; outside hours the chat offers ticket creation and the KB.
- Integrate with the **chatbot widget**: when the bot escalates, create a ticket here (with redacted transcript attached as the first internal/public message per user consent) instead of, or in addition to, the direct email defined in the chat brief. Update that escalation path and note the change in `DECISIONS.md`.
- Transcript retention, redaction and deletion follow the same policy as tickets.

## 6. Attachments (high-risk surface)
- Support screenshots, logs and diagnostic bundles. Allowlist by **magic bytes** (PNG, JPEG, WEBP, PDF, TXT, LOG, JSON, ZIP for diagnostic bundles only), max sizes and counts per ticket and per plan, extension and MIME consistency checks, and filename sanitization (no user filenames in paths).
- Upload via presigned URLs to a **private bucket**, quarantined until scanned (ClamAV or equivalent), then released; reject archives with excessive depth/ratio (zip bombs), executables, scripts, HTML and SVG.
- Serve downloads via **short-lived signed URLs** from a **separate cookieless domain**, always `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`, never inline-rendered HTML. Image previews are re-encoded server-side (strips EXIF and active content).
- **Customer documents are sensitive.** Show a clear warning not to upload confidential documents; offer guidance on redaction; agents don't open attachments casually (access is logged). Provide a **diagnostic bundle guide** for self-hosted customers (a command in the self-hosted install that gathers logs/config with secrets and document contents stripped and shows a manifest before anything is sent). Don't build the collector in this task unless I approve; document the requirements in the backlog.
- Auto-expire attachments per retention policy.

## 7. Notifications and email
- Events: ticket created (receipt with reference), agent reply, status change, waiting on you (with reminder cadence), resolved, CSAT request, SLA events (internal), assignment (internal), mention (internal). In-app notification center plus email, with per-user preferences (security/essential messages can't be disabled).
- Outbound email through the existing queue with retries, DKIM/SPF/DMARC-aligned sender (`support@`), plain text plus simple HTML, no remote images or tracking pixels, **strict header-injection prevention**, and a "reply to this email" experience **only if** I approve inbound parsing. If approved: verified inbound domain, signed reply tokens in the reply address, sender-must-match-participant check, quoted-text stripping, spoof/loop protection (auto-reply detection), attachment rules as above, and rate limits. Default for v1: emails link to the portal and don't accept replies.
- Never put secrets, magic-link tokens or document contents in email bodies beyond what's necessary. Magic-link/handoff tokens are single use and short-lived.

## 8. Knowledge base and deflection
- Reuse the same `/kb` content and ingestion as the chatbot (one source of truth). Public KB search on the support site; "Was this helpful?" feedback; suggested articles on the new-ticket form and in the chat. Track searches with no results into `kb_gaps` (redacted). Agents can insert KB links into replies and propose new KB articles from solved tickets (a review queue, never auto-publish).
- Link to the public status page and show active incidents in a banner when configured, so people don't file duplicates. Agents can bulk-attach tickets to an incident and send one update.

## 9. Security requirements (non-negotiable)
- **Stored XSS defense:** ticket and chat bodies are stored as text. Rich text is limited to a safe markdown subset rendered through the project's sanitizer (no raw HTML, no images from remote URLs, links limited to `https:`/`mailto:` with `rel="noopener noreferrer nofollow ugc"`), tested with large XSS/markdown-injection corpora, **specifically in the agent console**. Strict CSP with nonces. Treat inbound ticket content as hostile in every view, export, email and PDF.
- **CSRF** on all state-changing requests; **rate limits** (Redis) per IP, user, org and endpoint; bot protection on public forms (Turnstile/hCaptcha hook plus honeypot, config-driven).
- **Authorization matrix** documented and tested: customer, org member roles, agent, lead, admin, security-role. Least privilege: agents see account metadata needed to help (plan, status, recent request IDs, credits) but **not** document contents, API keys or secrets. No impersonation ("log in as user") in v1; if ever needed, it requires separate approval, a reason, a time limit, and customer-visible audit.
- **Audit log** (append-only): every agent action (view of sensitive fields, status/priority/assignee changes, internal notes, exports, attachment access, entitlement changes, merges, deletions), with who, when, what, request ID and IP. Logs are access-restricted and tamper-evident. Alerts on bulk exports or unusual access.
- **PII and secret redaction** (reuse the chat redactor): detect API keys (`ocr_live_...`), bearer tokens, JWTs, private keys, card numbers (Luhn), passwords in text, and warn the user before submit ("This looks like a secret. Remove it."), store redacted, and never email them. If a real key is posted, auto-flag the ticket and recommend revoking it.
- Data protection: TLS, encryption at rest, backups, least-privilege DB roles for the support module, no document contents in logs, structured logs with request IDs, secrets in env only, dependency and secret scanning in CI.
- Privacy and compliance: retention schedule (tickets default configurable, e.g., 24 months; attachments and chat shorter), user export and deletion procedures (tickets may be retained in anonymized form if required by law or for accounting; document this), privacy notice and consent text for review by a lawyer. No tracking cookies, no third-party widgets or scripts, self-hosted fonts and assets.
- Anti-enumeration: ticket references are not guessable identifiers for authorization (UUID-based auth, reference is display-only) and 404 vs 403 behavior doesn't leak existence.
- Operational: kill switches (`SUPPORT_CHAT_ENABLED`, `SUPPORT_TICKET_CREATION_ENABLED`), maintenance mode, graceful degradation (if the DB or queue is down, show a static "contact us by email" page).

## 10. Frontend design (customer + agent), concept "The Service Counter"
Extend the "Archivist's Light Table" system. The support site feels like a well-run records office: case files, index cards, tabs and stamps, calm and exact. It must be recognizably the same family as the main site but not a clone, and not a generic helpdesk template (no stock Zendesk look, no chat-bubble gradients).
- **Customer pages:**
  - *Sign in*: a "front desk" handoff screen explaining the redirect to the main login, with a clear error state.
  - *My cases* (dashboard): case-file index with status stamps, filter/search, an honest "Priority support" badge for plans that have it, and a prominent "New case".
  - *New case*: stepper (category, severity, details, review) with KB suggestions beside the form, secret-detection warnings, and a confirmation page with the reference.
  - *Case detail*: a thread styled as an annotated case file; status timeline; public vs. internal (agents only) distinction; attachments with scan status; CC list; reopen/resolve; CSAT.
  - *Chat*: compact panel or full page, queue state, transcript saved to the case.
  - *Help center*: KB search and categories.
  - *Organization*: members, roles, invites, support contacts, plan and contract status (read-only).
  - *Notification settings*, *account link*, *status banner*, and designed *empty/error/maintenance* states.
- **Agent console** (denser, keyboard-first): queue view sorted by priority with SLA clocks and "why ranked here", split view (list / ticket / customer context panel), macros, keyboard shortcuts, bulk actions with confirmation, internal-note composer with clear visual distinction from public replies (and a guard against accidentally replying publicly), side-by-side KB search, saved views, a reports dashboard (volume, first-response and resolution times vs. targets, backlog by tier, SLA breaches, CSAT, top categories, KB gaps, self-hosted ticket aging), and an admin area (SLA profiles, entitlements, roles, business hours, macros, categories).
- Accessibility (WCAG 2.2 AA) including the chat (live regions, focus management) and the agent console's keyboard flows. i18n-ready strings and RTL support. Light/dark themes. Performance budgets from the frontend brief apply; the agent console may be heavier but must lazy-load per view.
- All copy honest and specific. No fake agent names, avatars, ratings or response times.

## 11. Observability and operations
- Metrics: tickets created/resolved, first-response and resolution times by tier, SLA breach and near-breach counts, queue depth by tier, chat wait times, deflection rate (KB suggestion click-through), CSAT, email delivery failures, attachment scan outcomes, error rates, p95 latencies. Alerts on breaches, queue backlog, email/queue/scan failures, and auth anomalies.
- Runbook (`docs/support/OPERATIONS.md`): triage process, on-call for self-hosted S1, handling a security report, handling a posted secret, abuse/spam response, data deletion requests, onboarding a new self-hosted customer (create org, contract/entitlement, invite contacts), offboarding, changing SLA profiles, restoring from backup, incident communications, staff onboarding/offboarding with access reviews.

## 12. Testing (must pass before launch)
- **Unit:** priority matrix and aging (table-driven with my worked examples), SLA timers across business hours/holidays/DST/timezones, status transitions, redactor, visibility rules.
- **Integration (real Postgres/Redis):** auth handoff (reuse of code, expiry, wrong audience, state/PKCE mismatch), session revocation propagation, entitlements to priority, org roles, attachments pipeline, notification idempotency, concurrent updates (optimistic locking), duplicate suppression, reply races, merge/split correctness.
- **Security:** IDOR across tickets/messages/attachments/orgs/chats; internal notes never leaked to customers (API, email, search, exports, realtime channels); priority and severity tampering; privilege escalation between roles; stored XSS in subject, body, filename, tags and category in every renderer incl. the agent console; CSRF; open redirect in the handoff; WebSocket/SSE origin and auth tests; header injection in email; zip bombs and polyglot files; SSRF; rate-limit and spam tests; audit log completeness.
- **E2E (Playwright):** sign-in handoff → create ticket with KB deflection → agent replies → customer replies → resolve → CSAT; self-hosted org ticket jumps the queue ahead of Free; SLA warning/breach flow; chat → no agent → converts to ticket; chatbot escalation → ticket created; org invite flow; logout propagation.
- **Load/chaos:** many concurrent chats and tickets, queue under burst, scanner down (attachments stay quarantined), email down (tickets still created), DB failover, realtime reconnection storms.
- Accessibility (axe plus manual keyboard and screen reader on customer and agent flows) and performance budgets in CI. Show real outputs; never weaken tests to pass.

## 13. Deliverables
1. `docs/support/DESIGN.md` (approved first), `PRIORITY.md` with worked examples, threat model, `DECISIONS.md` entries.
2. Backend (routers, services, migrations, queue jobs, SLA engine, audit log), customer portal, agent console, live chat, notifications.
3. Initial seed: roles, sample SLA profile configs (clearly labeled placeholders), categories, macros, and a demo dataset for dev only (never in production).
4. Tests, CI integration, and a results report with real numbers.
5. `docs/support/OPERATIONS.md`, `PRIVACY.md` (draft text for legal review), admin guide, and a staff training one-pager.
6. A **manual-steps list for me**: DNS for `support.` and the user-content domain, TLS, mail domain records (SPF/DKIM/DMARC), staff accounts and MFA, SLA values, plan-to-tier mapping approval, contract/entitlement records for self-hosted customers, legal review, status page link, and the on-call arrangement.

## Definition of done
Customers sign in through the handoff and see only their org's cases; priority and queue order follow the documented matrix with self-hosted/enterprise first and aging preventing starvation; severity and plan tier can't be tampered with; internal notes never leak; attachments are scanned and served safely; chat and chatbot escalation create tickets; SLA timers and alerts behave correctly; agents work from a fast, keyboard-friendly console with a full audit trail; accessibility, performance and security suites pass; the portal is cleanly separated from self-hosted deployments; and you've reviewed it as a hostile reviewer and listed remaining risks honestly.

Begin with Phase 0 (recon) and Phase 1 (design). Don't write code until I approve the design.