# TASK: Implement a complete, white-hat search visibility system for OpenOCR
(Technical SEO, content SEO, AEO answer engines, GEO generative engines, local/international, and measurement)

## Role
Act as a senior technical SEO, content strategist and frontend engineer. Follow `AGENTS.md` (Decision Protocol, security, self-hosted rules) and the frontend brief. Where SEO advice conflicts with security, privacy, performance or self-hosted mode, those win; flag the conflict and propose the best compromise.

## Ground rules (read first)
1. **Verify, don't assume.** Search guidance changes (Google core updates, structured-data eligibility, AI-search behavior, crawler names). Before implementing anything, check the **current official documentation** (Google Search Central, Bing Webmaster guidelines, schema.org, and each AI vendor's published crawler docs) and cite what you relied on in `docs/seo/SOURCES.md`. If you can't verify a claim, label it "unverified" or leave it out. Do not repeat folklore.
2. **White hat only.** No keyword stuffing, hidden text, cloaking, doorway pages, scraped or spun content, fake reviews/ratings/testimonials, fabricated statistics, fake author or customer names, purchased links, link schemes, expired-domain tricks, or mass-generated thin pages. Structured data must match visible content exactly.
3. **Honesty over hype.** Nobody can guarantee rankings or AI citations. Report what is controllable (technical health, content quality, authority-building actions, measurement) and be explicit about what isn't.
4. **Helpful content first.** Every indexable page must serve a real user need better than the pages currently ranking. Written for people, structured for machines.
5. **Self-hosted mode is sacred.** In self-hosted/air-gapped deployments: no sitemap pings, no analytics, no external requests, and the whole site defaults to `noindex`. SEO features are enabled only in managed mode via runtime config (`SEO_ENABLED`, `PUBLIC_SITE_URL`).
6. **No third-party trackers by default** (consistent with the CSP and privacy stance). Measurement uses Search Console/Bing Webmaster data plus privacy-friendly, self-hosted, cookieless analytics, or server logs, and only in managed mode.

## Process (stop for my approval where stated)
**Phase 0, audit:** crawl and inspect the current site (rendering mode per route, metadata, headings, links, speed, headers, sitemap/robots, structured data, indexability, duplicate URLs). Report findings by priority.
**Phase 1, strategy (STOP for my approval):** deliver `docs/seo/STRATEGY.md`: audience and intents, keyword/topic map, page-by-page target queries, content plan, internal-linking map, competitor gap analysis, link-earning plan, KPI definitions and baselines. Run the Decision Protocol on each proposed content investment (what it costs, what it could earn, and what to skip).
**Phase 2, technical foundation:** implement section 1 and section 2.
**Phase 3, content and structured data:** implement sections 3-6 page by page.
**Phase 4, AEO/GEO, authority, measurement:** sections 7-10.
**Phase 5, QA and handover:** automated checks, docs, ongoing playbook.

## 1. Indexation architecture (what Google should and should not see)
Define an explicit **index policy per route**, documented in a table and enforced in code and tests:
- **Index:** `/`, `/api-platform` (and each docs page), `/pricing`, `/self-hosted`, use-case/solution pages, blog/guides, comparison pages, changelog, about, security/trust page, legal pages (privacy/terms can be indexed or noindex, your call, but be consistent).
- **Noindex, nofollow-safe (and excluded from sitemap):** `/login`, `/signup`, `/verify-email`, `/reset-password`, `/billing`, dashboard, API keys, jobs, settings, any authenticated route, search/filter parameter URLs, `/dev/*`, error pages, and every result/job/share URL. Send `X-Robots-Tag: noindex` on API and authenticated responses as well as the meta tag.
- **Important:** do **not** block noindex pages in `robots.txt` if you need crawlers to see the noindex directive. Use `robots.txt` for crawl-budget control of truly useless paths only (e.g., `/api/`, `/_next/` internals where appropriate). Never block CSS/JS needed for rendering.
- User documents and extraction results are private: they must never be reachable by crawlers (authenticated, signed, `noindex`, unguessable IDs).
- The playground (`/`) must be crawlable and indexable with meaningful **server-rendered** content and not only a JS app shell.

## 2. Technical SEO foundation
**Rendering and crawlability**
- Server-render or statically generate every indexable page with real HTML content (headings, copy, links) present before JavaScript runs. Verify by fetching with JS disabled. No important content or links hidden behind client-only rendering, tabs that don't render in HTML, or infinite scroll without paginated links.
- Internal links are real `<a href>` elements with descriptive anchor text. No orphan pages: every indexable page reachable within 3 clicks from the home page and linked from at least two relevant pages.
- Clean, stable, lowercase, hyphenated URLs; no session IDs or tracking parameters in indexable URLs; one canonical URL per page (trailing-slash and `www` policy decided once and redirected with 301s). Self-referencing `<link rel="canonical">` on every indexable page, absolute URLs, matching the sitemap.
- Correct status codes: real `404`/`410` for missing pages (no soft 404s), `301` for permanent moves, no redirect chains/loops, `503` with `Retry-After` for maintenance.
- HTTPS everywhere, HSTS, no mixed content. One hostname variant.

**Sitemaps and robots**
- Generate `sitemap.xml` (and a sitemap index if large) at build/runtime from the route table: only canonical, indexable, 200-status URLs, accurate `lastmod` (only change when content truly changes), correct `hreflang` alternates if multilingual. Add `robots.txt` pointing to it. Submit via Search Console/Bing Webmaster (document the manual steps). IndexNow support for Bing/others if verified as useful, enabled in managed mode only.
- `robots.txt` generated per environment: staging/preview deployments fully disallowed **and** noindexed (add a test that fails if production-like pages ship `noindex` or if staging ships indexable).

**Metadata (per page, via the framework's metadata API)**
- Unique `<title>` (≈50-60 characters, primary topic first, brand last) and `meta description` (≈120-160, accurate, compelling, no stuffing). Programmatic templates must still produce unique results per page; lint for duplicates and missing values.
- One `<h1>` per page matching search intent; logical `h2`/`h3` hierarchy; no skipped levels used for styling.
- Open Graph and Twitter/X card tags with a real, unique, generated social image per page (title, brand, concept art in the design system; self-hosted fonts), correct dimensions, `og:locale`, absolute URLs. Test share previews.
- `<html lang>` correct per page; `hreflang` with `x-default` when more than one language is published (see section 6).
- Favicon set, web app manifest, theme-color for light/dark.

**Performance and page experience (ranking and conversion factor)**
- Meet or beat the frontend budgets: LCP < 2.0 s, INP < 200 ms, CLS < 0.05 (field data is what counts, so wire up real-user measurement via Search Console's CrUX report and, in managed mode, optional cookieless RUM). Preload the LCP image/font, set image dimensions, `fetchpriority` for the hero, no render-blocking third-party code, modern image formats (AVIF/WebP) with responsive `srcset`, lazy-load below the fold, compress with Brotli, immutable caching for hashed assets, CDN-friendly headers.
- Mobile-first: responsive, readable without zoom, tap targets ≥ 44px, no intrusive interstitials or popups that cover content on landing.

**Images and media**
- Descriptive filenames and meaningful `alt` text (empty alt for decorative images), captions where useful, an image sitemap only if images are an acquisition channel. Provide text transcripts for any video/audio and add `VideoObject` markup only for real hosted videos.

**International and special cases**
- Self-hosted docs/versions: version duplicates of the docs must use `canonical` to the current version (or noindex old ones), to avoid duplicate-content dilution.
- Pagination with real links (`rel="next/prev"` is not used by Google; just make paginated URLs crawlable and self-canonical).
- Faceted or filtered URLs: noindex or canonicalize to the base.

## 3. Keyword, topic and content strategy
Research from real data (Search Console once available, search-result inspection, "People also ask", competitor pages, community questions on forums and GitHub issues) instead of invented volume numbers. If keyword-volume tools aren't available to you, say so and rank by intent and relevance rather than fabricating figures.

Build a **topic-cluster map** of pillar pages plus supporting pages, internally linked both ways. Starting hypotheses (validate and prune with the Decision Protocol):
- *Core problem keywords:* OCR API, document data extraction API, PDF to markdown, PDF table extraction, invoice/receipt/ID/bank-statement/contract extraction, handwriting OCR, structured JSON from documents, scanned PDF to searchable text, multi-language/Urdu/Arabic OCR.
- *Open-source and self-hosting intent:* self-hosted OCR, on-premise/air-gapped document processing, private-cloud OCR, GDPR/data-residency friendly OCR, OCR with local LLMs.
- *Comparison and alternative intent:* "X alternative" and "X vs OpenOCR" pages for relevant incumbents and open-source engines. These must be **factually accurate, fairly stated, dated, with sources**; no disparagement, no unverifiable claims; include where the competitor is genuinely better.
- *Developer intent:* tutorials ("extract tables from a PDF with Python in 5 minutes"), integration guides, SDK quickstarts, benchmark and accuracy methodology posts, migration guides, webhook verification guide, error-code reference.
- *Use-case and industry pages:* accounting/AP automation, KYC onboarding, legal discovery, logistics paperwork, healthcare forms, education, each with a real worked example, honest limitations and a clear next step. Only publish a page if you can make it genuinely useful and unique; no templated mass pages that swap one noun.
- *Trust content:* security and privacy page, data-retention policy, how document data is handled, status page, changelog, roadmap, open benchmarks you actually ran and can reproduce.

For every page specify: target user, primary query and intent (informational/commercial/transactional/navigational), secondary queries, the unique value (original data, working demo, screenshots, code, benchmark), required sections, internal links in/out, CTA, and the structured data type. Prefer fewer, excellent pages over many thin ones.

**On-page content standards (E-E-A-T in practice)**
- Lead with the direct answer, then depth. Short paragraphs, descriptive subheadings, scannable lists/tables where the content is naturally tabular, runnable code, real screenshots/GIFs from the product.
- Show experience and expertise: named authors/maintainers with real bios (only real people, with consent), "last reviewed" dates, methodology notes, citations to primary sources, honest limitations. Pages with claims about accuracy must link to the reproducible benchmark.
- Original assets that earn links: open benchmark dataset and results, accuracy leaderboard against public datasets, free tools (e.g., a PDF text-layer checker, a "does my PDF need OCR?" tool, a document-to-JSON demo), templates and schemas for common documents, an open-source repo with a great README.
- Content freshness: schedule reviews; update dates only when content materially changes.

## 4. Structured data (JSON-LD, validated)
Implement only types that match visible content, validate with Google's Rich Results Test and the Schema.org validator in CI, and keep one source of truth per entity:
- Site-wide: `Organization` (name, URL, logo, `sameAs` to real profiles: GitHub, LinkedIn, X, etc.), `WebSite` (do not add a SearchAction unless a real site search exists).
- `SoftwareApplication` (or `WebApplication`) for the product with accurate `offers` that mirror the real pricing page; **no `aggregateRating`/`review` markup unless real, verifiable, visible reviews exist.**
- `BreadcrumbList` on all nested pages; `Article`/`TechArticle`/`BlogPosting` with real author, `datePublished`, `dateModified`; `HowTo` only where the page is truly step-by-step and eligible; `FAQPage` only for genuine on-page Q&A (note Google's rich-result eligibility for FAQ is now very limited, but the content still helps users and answer engines; don't add FAQ blocks purely for markup); `Product`/`Offer` for pricing tiers where appropriate; `VideoObject` for real videos; `SoftwareSourceCode` for the open-source repo if applicable.
- Add `@id` identifiers and link entities together (Article → author → Organization). Escape JSON-LD safely (it's a script-injection surface; build it from typed objects, never from raw user input) and make sure the CSP nonce approach covers it.

## 5. Internal linking and information architecture
- A clear hierarchy: Home → Product/Solutions → Use cases → Docs/Guides → Blog, with breadcrumbs and a footer sitemap of key pages.
- Contextual links from guides to product pages and docs, and from docs back to relevant guides, with descriptive anchors. Hub pages for each cluster. A "related reading" component driven by explicit relationships, not random links.
- Track and fix: orphan pages, broken links, redirect chains, pages with no inbound links, cannibalization (two pages targeting the same query; merge or differentiate).

## 6. International and local reach (Pakistan-aware)
- Decide the language plan via the Decision Protocol. Start with high-quality English; consider Urdu (and Arabic) for landing pages and key guides only when you can produce **human-quality, reviewed** translations (machine translation without review is thin content). Use separate URLs per language (e.g., `/ur/`), `hreflang` with reciprocal tags and `x-default`, and RTL-correct layouts.
- Target region signals: pricing in the correct currencies, clear statements about regional compliance and data residency, content addressing local document types (e.g., CNIC, utility bills, FBR/tax invoices, bank statements) **only if the product actually supports them and you can demonstrate it**.
- If you have a physical business presence, set up a Google Business Profile (manual step; document it) and `LocalBusiness`/`Organization` details consistent everywhere (name, address, phone). If you're online-only, skip local-pack tactics.
- Developer-community distribution matters more than ads here: see section 9.

## 7. AEO: Answer Engine Optimization (featured snippets, People Also Ask, voice, direct answers)
- For each target question, create a section with the question as a heading, a **40-60 word direct answer** immediately beneath it, then the supporting detail, steps, table or code. Use definition-style sentences ("OpenOCR is…"; "To extract a table from a PDF, …").
- Use lists for steps and tables for comparisons so they are snippet-eligible. Cover the "People also ask" and follow-up questions for each topic, based on what you actually observe in results.
- Maintain a reusable **glossary** (OCR vs. IDP vs. layout analysis, bounding box, confidence score, etc.) with concise canonical definitions, linked from content.
- Keep answers factual, dated and sourced; avoid vague superlatives that assistants won't cite.

## 8. GEO: Generative engine optimization (AI Overviews, ChatGPT, Perplexity, Gemini, Copilot, Claude)
Be accurate about what is known. These systems cite pages that are crawlable, clearly written, authoritative and corroborated across the web. Do this:
- **Crawler policy:** research each vendor's current documented crawler/user-agent names and purposes (search/retrieval vs. training), then make a deliberate, documented choice in `robots.txt`. My default preference for the public marketing/docs site is to **allow search/retrieval bots** so the product can be cited, and to decide separately about training crawlers. Never block by guesswork; cite each vendor's docs. Never expose private paths to any bot.
- **Entity clarity:** a consistent product name, one-sentence description and category phrase used identically on the site, GitHub README, docs, social profiles and directories. Put an unambiguous "What is OpenOCR" paragraph on the home page and an About page. Keep `Organization`/`sameAs` consistent so models can resolve the entity.
- **Citable assets:** pages with unique, quotable, verifiable facts (benchmark results with methodology, pricing tables, supported formats/languages/limits, comparison matrices with dates) and clear attribution. Stats must come from your own reproducible measurements.
- **Machine-readable context:** keep clean semantic HTML, text-based tables, and accessible markup. Optionally publish `llms.txt` and plain-markdown versions of docs pages **as a low-cost experiment**, labeling it unproven (verify current adoption by the major engines before investing; do not expect it to affect rankings).
- **Corroboration off-site:** accurate listings and mentions on GitHub (strong README, topics, releases), Hugging Face/Awesome lists where relevant, Product Hunt/Hacker News/Reddit/Stack Overflow answers (genuine, helpful, disclosed, not spam), developer directories, G2/Capterra profiles (real reviews only), Wikipedia only if notable under their policies (never self-promote or edit unethically).
- **Monitoring:** build a small, reproducible **prompt-test set** (30-50 realistic questions users might ask an AI about document-OCR APIs) and record monthly whether OpenOCR is mentioned or cited, with the date, engine and source. Treat results as directional, since outputs vary.
- Keep claims verifiable. If an AI assistant states something wrong about the product, fix the underlying source pages and public docs rather than trying to manipulate outputs.

## 9. Off-page authority and distribution (earned, not bought)
Produce a prioritized plan with effort and expected value for each tactic, run through the Decision Protocol:
- An excellent open-source README, docs and examples, plus an active changelog and releases. Submit to relevant curated lists.
- Original research and benchmarks promoted to developer communities, with the methodology and data open.
- Guest articles, podcasts and conference talks with real expertise; integrations/partner pages (e.g., LangChain/LlamaIndex-style loaders, n8n/Zapier/Make connectors, Python/JS SDKs on PyPI/npm with good READMEs linking back).
- Digital PR for genuine milestones, and HARO-style expert responses where relevant.
- Broken-link and unlinked-mention outreach; competitor-link-gap analysis for legitimately relevant opportunities.
- Directories and review sites relevant to the category.
- **Never:** buy links, run PBNs, trade links at scale, spam comments/forums, or fake reviews.

## 10. Measurement, tooling and operations
- Set up (documented manual steps for me): Google Search Console (domain property), Bing Webmaster Tools, sitemap submissions, URL inspection spot checks, Core Web Vitals report, and a Rich Results monitoring routine.
- Analytics: privacy-friendly and cookieless (self-hosted option), managed mode only, and no personal data. Define events: playground use, signup start/complete, API key creation, docs-to-signup assisted conversions. Attribute organic traffic to landing pages and queries.
- Dashboard/report (monthly): impressions, clicks, CTR, average position by cluster, indexed vs. submitted pages, crawl errors, Core Web Vitals pass rate, top converting organic pages, referring domains gained (quality over quantity), AI-citation tests, and what to do next. Include leading indicators (indexation, impressions) since rankings take months.
- **CI checks that fail the build:** missing/duplicate titles or descriptions, missing canonical, missing `h1`, `noindex` on indexable pages or indexable on private ones, broken internal links, sitemap containing non-200/noindex/non-canonical URLs, invalid JSON-LD, images without alt, Lighthouse SEO/performance/accessibility below thresholds, bundle-size regressions, `robots.txt` correctness per environment.
- Log-file or CDN-log analysis (managed mode) to observe real crawler behavior: crawl frequency, wasted crawl on junk URLs, 4xx/5xx rates, and whether AI/search bots can access key pages.
- Run a **quarterly content audit:** update, merge, redirect or remove underperforming pages; fix cannibalization; refresh stats and screenshots.
- Maintain an SEO changelog (what changed, when, why) so effects can be attributed. Make changes in measurable batches, not all at once.

## 11. Things to avoid or challenge (apply the Decision Protocol)
Mass programmatic pages without unique value; AI-generated content published without expert review and original substance; fake FAQ/review/rating markup; overusing exact-match anchors; chasing high-volume keywords with the wrong intent; hiding content in accordions the HTML doesn't contain; duplicate content across languages or versions; auto-translating the whole site; adding SEO plugins/scripts that hurt performance; and any tactic whose benefit is unproven, which should go in `BACKLOG.md` as an experiment with a success metric rather than shipped by default.

## 12. Deliverables
1. Audit report and `docs/seo/STRATEGY.md` (approved before building).
2. Implemented technical SEO: metadata system, sitemap, robots, canonical and index policy, structured data components, social image generation, internal-linking components, hreflang-ready architecture.
3. Content briefs for each planned page, with the first batch of priority pages written to a publishable standard (marked for human review of facts and claims), using real product facts only.
4. AEO/GEO implementation: answer-first templates, glossary, crawler policy doc, prompt-test set, optional `llms.txt` experiment.
5. Authority plan with a prioritized outreach/distribution calendar.
6. Measurement setup guide, dashboard template, CI checks and reports.
7. `docs/seo/PLAYBOOK.md`: how to add a page the right way (checklist), monthly/quarterly routines, how to read the reports, what to do when traffic drops (diagnosis flow).
8. A list of **manual steps for me** (Search Console and Bing verification, Google Business Profile, directory and community profiles, outreach), a list of what you verified from official docs vs. what's unverified, and anything deferred with reasons.

## Definition of done
Every indexable page returns server-rendered content, has unique metadata, a canonical URL, valid structured data and internal links; private pages are provably noindexed and uncrawlable; sitemap and robots are correct per environment; CI blocks regressions; performance budgets pass; self-hosted mode makes zero external SEO/analytics calls and defaults to noindex; all claims on pages are true and sourced; and you've reviewed the work as a skeptical SEO auditor and listed remaining gaps honestly.

Begin with Phase 0 (audit) and Phase 1 (strategy). Don't write content or code until I approve the strategy.