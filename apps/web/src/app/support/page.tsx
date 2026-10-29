"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  LifeBuoy,
  Clock,
  Send,
  AlertTriangle,
  CheckCircle2,
  Search,
  FileText,
  HelpCircle,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  Bot,
} from "lucide-react";

interface TicketItem {
  id: string;
  reference: string;
  subject: string;
  category: string;
  severity: "S1" | "S2" | "S3" | "S4";
  planTier: "self_hosted" | "developer" | "free";
  status: "New" | "Open" | "Waiting on Customer" | "Waiting on Engineering" | "Resolved";
  createdAt: string;
  lastReply: string;
}

export default function SupportPortalPage() {
  const [activeTab, setActiveTab] = useState<"create" | "track">("create");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("api_bug");
  const [severity, setSeverity] = useState<"S1" | "S2" | "S3" | "S4">("S3");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [requestId, setRequestId] = useState("");
  const [hasSecretWarning, setHasSecretWarning] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<TicketItem | null>(null);

  // Sample tracked tickets for display
  const [myTickets, setMyTickets] = useState<TicketItem[]>([
    {
      id: "t_01",
      reference: "OCR-2026-4812",
      subject: "Intermittent timeout on 34-page financial audit PDF",
      category: "api_bug",
      severity: "S2",
      planTier: "developer",
      status: "Waiting on Customer",
      createdAt: "2026-10-28 14:22 UTC",
      lastReply: "Engineering requested the job ID to trace Docling layout logs.",
    },
    {
      id: "t_02",
      reference: "OCR-2026-3901",
      subject: "Helm chart MinIO cluster credential configuration question",
      category: "self_hosted",
      severity: "S3",
      planTier: "self_hosted",
      status: "Resolved",
      createdAt: "2026-10-25 09:15 UTC",
      lastReply: "Resolved with MinIO s3_endpoint_url override syntax.",
    },
  ]);

  const [searchReference, setSearchReference] = useState("");

  const handleDescChange = (text: string) => {
    setDescription(text);
    if (/ocr_(live|test)_[a-zA-Z0-9_-]{16,}/i.test(text) || /password[:=]\s*\S+/i.test(text)) {
      setHasSecretWarning(true);
    } else {
      setHasSecretWarning(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !email.trim() || !description.trim()) return;

    const newTicket: TicketItem = {
      id: `t_${Date.now()}`,
      reference: `OCR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      subject: subject.trim(),
      category,
      severity,
      planTier: "developer",
      status: "New",
      createdAt: "Just now",
      lastReply: "Ticket registered in queue. Priority scoring applied.",
    };

    setSubmittedTicket(newTicket);
    setMyTickets((prev) => [newTicket, ...prev]);
    setSubject("");
    setDescription("");
    setRequestId("");
  };

  const getSeverityBadge = (sev: "S1" | "S2" | "S3" | "S4") => {
    switch (sev) {
      case "S1":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-semibold border border-red-500/20">S1 • Urgent Outage</span>;
      case "S2":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/20">S2 • Major</span>;
      case "S3":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">S3 • Minor</span>;
      case "S4":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-400 font-semibold border border-zinc-500/20">S4 • General</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--ink-primary)] transition-colors antialiased">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-10 sm:py-16 space-y-10">
        {/* Minimal Hero Header */}
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-[var(--signal)] tracking-wide">
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>Support &amp; Issue Resolution</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[var(--ink-primary)] tracking-tight">
            How can our engineers help?
          </h1>
          <p className="text-sm text-[var(--ink-secondary)] leading-relaxed">
            Direct assistance from core OCR pipeline engineers. Tickets are prioritized by customer entitlement tier with SLA commitments.
          </p>
        </div>

        {/* Clean Status & Tier Strip (Non-Boxy) */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-3 px-1 border-y border-[var(--line-hairline)] text-xs text-[var(--ink-muted)]">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[var(--ink-primary)] font-medium">All Cloud Systems Operational</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="text-amber-500 font-medium">Enterprise (Tier 1)</span>
            <span className="text-[var(--line-hairline)]">•</span>
            <span className="text-[var(--signal)] font-medium">Developer Pro (Tier 2)</span>
            <span className="text-[var(--line-hairline)]">•</span>
            <span>Community (Tier 3)</span>
          </div>
        </div>

        {/* Minimal Navigation Line Tabs */}
        <div className="flex items-center justify-between border-b border-[var(--line-hairline)]">
          <div className="flex items-center gap-8 text-sm">
            <button
              type="button"
              onClick={() => {
                setActiveTab("create");
                setSubmittedTicket(null);
              }}
              className={`pb-3 font-medium transition-colors relative cursor-pointer ${
                activeTab === "create"
                  ? "text-[var(--ink-primary)] font-semibold"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]"
              }`}
            >
              <span>Submit Request</span>
              {activeTab === "create" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--signal)] rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("track")}
              className={`pb-3 font-medium transition-colors relative cursor-pointer flex items-center gap-2 ${
                activeTab === "track"
                  ? "text-[var(--ink-primary)] font-semibold"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]"
              }`}
            >
              <span>My Tickets</span>
              <span className="px-1.5 py-0.2 text-[10px] font-mono rounded-full bg-[var(--surface-subtle)] text-[var(--ink-secondary)]">
                {myTickets.length}
              </span>
              {activeTab === "track" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--signal)] rounded-full" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-[var(--ink-muted)] pb-3">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("open-openocr-chat"));
                }
              }}
              className="hover:text-[var(--signal)] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Ask Assistant</span>
            </button>
            <span className="text-[var(--line-hairline)]">•</span>
            <Link href="/docs" className="hover:text-[var(--signal)] flex items-center gap-1 transition-colors">
              <span>Docs</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Tab 1: Create Ticket (Clean, Uncluttered, Minimalist) */}
        {activeTab === "create" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start pt-2">
            {/* Left: Clean Form */}
            <div className="lg:col-span-8 space-y-6">
              {submittedTicket ? (
                <div className="py-8 px-6 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <h2 className="text-sm font-semibold text-[var(--ink-primary)]">
                        Ticket Registered • #{submittedTicket.reference}
                      </h2>
                      <p className="text-xs text-[var(--ink-secondary)]">
                        A confirmation receipt has been dispatched to your email address.
                      </p>
                    </div>
                  </div>

                  <div className="py-3 px-4 rounded-lg bg-[var(--surface-base)] border border-[var(--line-hairline)] font-mono text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-muted)]">Subject:</span>
                      <span className="font-medium text-[var(--ink-primary)]">{submittedTicket.subject}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-muted)]">Severity:</span>
                      <span>{submittedTicket.severity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-muted)]">Queue:</span>
                      <span className="text-[var(--signal)] font-semibold">Developer Priority</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveTab("track")}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      View in Ticket Tracker
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Subject Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--ink-secondary)] block">
                      Summary
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Brief overview of the issue..."
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-mono bg-[var(--surface-sunken)]/60 border border-[var(--line-hairline)] hover:border-[var(--line-strong)] focus:border-[var(--signal)] rounded-lg text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Category & Severity Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[var(--ink-secondary)] block">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs font-mono bg-[var(--surface-sunken)]/60 border border-[var(--line-hairline)] hover:border-[var(--line-strong)] focus:border-[var(--signal)] rounded-lg text-[var(--ink-primary)] focus:outline-none transition-colors"
                      >
                        <option value="api_bug">API Bug / Parsing Defect</option>
                        <option value="account_auth">Account / API Key / Access</option>
                        <option value="billing_credits">Billing &amp; Credits Usage</option>
                        <option value="self_hosted">Self-Hosted / Air-Gap Deployment</option>
                        <option value="security">Security Vulnerability Disclosure</option>
                        <option value="feature_request">Feature Request / Schema Suggestion</option>
                        <option value="other">General Inquiry</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[var(--ink-secondary)] block">
                        Severity
                      </label>
                      <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 text-xs font-mono bg-[var(--surface-sunken)]/60 border border-[var(--line-hairline)] hover:border-[var(--line-strong)] focus:border-[var(--signal)] rounded-lg text-[var(--ink-primary)] focus:outline-none transition-colors"
                      >
                        <option value="S4">S4 — General Question</option>
                        <option value="S3">S3 — Minor Bug / Layout Skew</option>
                        <option value="S2">S2 — Major Impact / Partial Failure</option>
                        <option value="S1">S1 — Critical Production Outage</option>
                      </select>
                    </div>
                  </div>

                  {/* Email & Optional Request ID Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[var(--ink-secondary)] block">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs font-mono bg-[var(--surface-sunken)]/60 border border-[var(--line-hairline)] hover:border-[var(--line-strong)] focus:border-[var(--signal)] rounded-lg text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[var(--ink-secondary)] block">
                        Request ID / Job ID <span className="text-[var(--ink-muted)] font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. req_8492026af01"
                        value={requestId}
                        onChange={(e) => setRequestId(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs font-mono bg-[var(--surface-sunken)]/60 border border-[var(--line-hairline)] hover:border-[var(--line-strong)] focus:border-[var(--signal)] rounded-lg text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-[var(--ink-secondary)]">
                        Description &amp; Reproduction Steps
                      </label>
                      <span className="text-[10px] font-mono text-[var(--ink-muted)]">Markdown supported</span>
                    </div>
                    <textarea
                      rows={5}
                      required
                      placeholder="Describe the expected vs actual output, document parameters, environment details..."
                      value={description}
                      onChange={(e) => handleDescChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-mono bg-[var(--surface-sunken)]/60 border border-[var(--line-hairline)] hover:border-[var(--line-strong)] focus:border-[var(--signal)] rounded-lg text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none transition-colors leading-relaxed"
                    />

                    {hasSecretWarning && (
                      <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs font-mono text-amber-500 flex items-center gap-2 mt-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Security Notice: This input appears to contain an API key or credential. Please redact before submitting.</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs text-[var(--ink-muted)]">
                      Queue priority is assigned automatically from your authenticated plan.
                    </span>
                    <Button type="submit" variant="primary" size="sm" rightIcon={<Send className="w-3.5 h-3.5" />}>
                      Submit Ticket
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* Right: Clean Knowledge Suggestions */}
            <div className="lg:col-span-4 space-y-6 pt-1">
              <div className="space-y-3">
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] block">
                  Quick Solutions
                </span>
                <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                  Most extraction inquiries can be resolved directly through verified documentation:
                </p>

                <div className="space-y-2 pt-1">
                  <Link
                    href="/docs#uploads"
                    className="group block p-3 rounded-lg hover:bg-[var(--surface-subtle)] transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs font-medium text-[var(--ink-primary)] group-hover:text-[var(--signal)]">
                      <span>Large File Uploads (&gt;10MB)</span>
                      <ArrowRight className="w-3 h-3 text-[var(--ink-muted)] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <span className="text-[11px] text-[var(--ink-muted)] block mt-0.5">
                      Direct S3 upload signing to bypass gateway limits.
                    </span>
                  </Link>

                  <Link
                    href="/docs#webhooks"
                    className="group block p-3 rounded-lg hover:bg-[var(--surface-subtle)] transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs font-medium text-[var(--ink-primary)] group-hover:text-[var(--signal)]">
                      <span>Webhook HMAC Signatures</span>
                      <ArrowRight className="w-3 h-3 text-[var(--ink-muted)] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <span className="text-[11px] text-[var(--ink-muted)] block mt-0.5">
                      Constant-time verification snippets in Python &amp; Go.
                    </span>
                  </Link>

                  <Link
                    href="/docs#ratelimits"
                    className="group block p-3 rounded-lg hover:bg-[var(--surface-subtle)] transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs font-medium text-[var(--ink-primary)] group-hover:text-[var(--signal)]">
                      <span>Rate Limits &amp; 429 Codes</span>
                      <ArrowRight className="w-3 h-3 text-[var(--ink-muted)] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <span className="text-[11px] text-[var(--ink-muted)] block mt-0.5">
                      Understanding Retry-After and sliding window quotas.
                    </span>
                  </Link>
                </div>
              </div>

              {/* Instant Assistant Link */}
              <div className="p-4 rounded-xl bg-[var(--surface-subtle)]/50 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink-primary)]">
                  <Bot className="w-4 h-4 text-[var(--signal)]" />
                  <span>Prefer an instant answer?</span>
                </div>
                <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                  The OpenOCR Assistant answers technical questions 24/7 directly from our knowledge base.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("open-openocr-chat"));
                    }
                  }}
                  className="text-xs font-mono font-semibold text-[var(--signal)] hover:underline inline-flex items-center gap-1 cursor-pointer pt-1"
                >
                  <span>Launch Assistant Chat</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Track Tickets (Minimal List View) */}
        {activeTab === "track" && (
          <div className="space-y-6 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[var(--ink-muted)]" />
                <input
                  type="text"
                  placeholder="Search by reference or subject..."
                  value={searchReference}
                  onChange={(e) => setSearchReference(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs font-mono bg-[var(--surface-sunken)]/60 border border-[var(--line-hairline)] hover:border-[var(--line-strong)] focus:border-[var(--signal)] rounded-lg text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none transition-colors"
                />
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setActiveTab("create");
                  setSubmittedTicket(null);
                }}
              >
                Submit New Request
              </Button>
            </div>

            {/* Clean Ticket List (No heavy box borders) */}
            <div className="divide-y divide-[var(--line-hairline)] border-y border-[var(--line-hairline)]">
              {myTickets
                .filter(
                  (t) =>
                    !searchReference ||
                    t.reference.toLowerCase().includes(searchReference.toLowerCase()) ||
                    t.subject.toLowerCase().includes(searchReference.toLowerCase())
                )
                .map((ticket) => (
                  <div
                    key={ticket.id}
                    className="py-5 px-2 hover:bg-[var(--surface-subtle)]/40 transition-colors space-y-2 rounded-lg"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-semibold text-[var(--signal)]">
                          {ticket.reference}
                        </span>
                        <span className="text-sm font-medium text-[var(--ink-primary)]">
                          {ticket.subject}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {getSeverityBadge(ticket.severity)}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] text-[var(--ink-secondary)]">
                          {ticket.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ink-muted)] font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--ink-secondary)]">
                          {ticket.planTier === "self_hosted"
                            ? "Enterprise Queue"
                            : ticket.planTier === "developer"
                            ? "Developer Priority Queue"
                            : "Community Queue"}
                        </span>
                        <span>•</span>
                        <span>{ticket.createdAt}</span>
                      </div>
                      <span className="text-[var(--ink-secondary)] italic text-[11px]">
                        Latest: {ticket.lastReply}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
