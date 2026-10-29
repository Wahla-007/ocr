"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  LifeBuoy,
  ShieldCheck,
  Clock,
  Send,
  AlertTriangle,
  CheckCircle2,
  Search,
  FileText,
  HelpCircle,
  ExternalLink,
  MessageSquare,
  Lock,
  ArrowRight,
  User,
  Building,
  KeyRound,
  Server,
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
  const [environment, setEnvironment] = useState("cloud_api");
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
      planTier: "developer", // Server-derived based on authenticated user session
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
        return <Badge variant="signal">S1 • CRITICAL OUTAGE</Badge>;
      case "S2":
        return <Badge variant="outline">S2 • MAJOR IMPACT</Badge>;
      case "S3":
        return <Badge variant="outline">S3 • MINOR ISSUE</Badge>;
      case "S4":
        return <Badge variant="outline">S4 • QUESTION</Badge>;
    }
  };

  const getTierPriorityBadge = (tier: string) => {
    switch (tier) {
      case "self_hosted":
        return <span className="font-mono text-[10px] text-amber-500 font-bold uppercase">ENTERPRISE SLA (HIGHEST)</span>;
      case "developer":
        return <span className="font-mono text-[10px] text-[var(--signal)] font-bold uppercase">DEVELOPER PRIORITY</span>;
      default:
        return <span className="font-mono text-[10px] text-[var(--ink-muted)] uppercase">COMMUNITY QUEUE</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--ink-primary)] transition-colors">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line-strong)] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[var(--signal)] font-bold tracking-wider uppercase">
                Customer Support Portal
              </span>
              <Badge variant="outline">PLAN-BASED PRIORITY SLA</Badge>
            </div>
            <h1 className="text-3xl font-serif font-bold text-[var(--ink-primary)] tracking-tight mt-1">
              Engineering Support & Issue Resolution
            </h1>
            <p className="text-xs sm:text-sm text-[var(--ink-secondary)] mt-0.5">
              Direct line to OpenOCR engineers. Tickets are automatically prioritized by entitlement tier (Self-Hosted/Enterprise &gt; Developer &gt; Free).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/docs">
              <Button variant="outline" size="sm" leftIcon={<FileText className="w-3.5 h-3.5" />}>
                Browse Documentation
              </Button>
            </Link>
          </div>
        </div>

        {/* Priority SLA Rules Notice */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-4 border border-[var(--line-hairline)] rounded-sm bg-[var(--surface-subtle)] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--ink-primary)]">Enterprise / Self-Hosted</span>
              <span className="text-amber-500 font-bold text-[10px]">TIER 1 (HIGHEST)</span>
            </div>
            <p className="text-[11px] text-[var(--ink-secondary)]">
              Direct access to core extraction engineers, custom SLA profiles, and high-severity incident dispatch.
            </p>
          </div>

          <div className="p-4 border border-[var(--line-hairline)] rounded-sm bg-[var(--surface-subtle)] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--ink-primary)]">Developer Pro</span>
              <span className="text-[var(--signal)] font-bold text-[10px]">TIER 2 (PRIORITY)</span>
            </div>
            <p className="text-[11px] text-[var(--ink-secondary)]">
              Priority queueing for API questions, webhook verification assistance, and layout bug investigations.
            </p>
          </div>

          <div className="p-4 border border-[var(--line-hairline)] rounded-sm bg-[var(--surface-subtle)] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--ink-primary)]">Free Explorer</span>
              <span className="text-[var(--ink-muted)] text-[10px]">TIER 3 (COMMUNITY)</span>
            </div>
            <p className="text-[11px] text-[var(--ink-secondary)]">
              Curated Knowledge Base articles, community forum answers, and bounded aging progression.
            </p>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[var(--line-hairline)] pb-2 font-mono text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab("create");
              setSubmittedTicket(null);
            }}
            className={`px-3 py-1.5 rounded-sm font-bold transition-colors ${
              activeTab === "create"
                ? "bg-[var(--signal)] text-white"
                : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subtle)]"
            }`}
          >
            Open New Ticket
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("track")}
            className={`px-3 py-1.5 rounded-sm font-bold transition-colors ${
              activeTab === "track"
                ? "bg-[var(--signal)] text-white"
                : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subtle)]"
            }`}
          >
            Track My Tickets ({myTickets.length})
          </button>
        </div>

        {/* Tab 1: Create Ticket Flow */}
        {activeTab === "create" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Guided Form (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {submittedTicket ? (
                <div className="p-6 border border-emerald-500/40 bg-emerald-500/5 rounded-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    <div>
                      <h2 className="font-mono text-sm font-bold text-[var(--ink-primary)]">
                        Ticket Registered: #{submittedTicket.reference}
                      </h2>
                      <span className="text-xs text-[var(--ink-secondary)]">
                        A confirmation receipt has been sent to your email.
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-[var(--surface-base)] border border-[var(--line-hairline)] rounded-sm font-mono text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-muted)]">Subject:</span>
                      <span className="font-bold text-[var(--ink-primary)]">{submittedTicket.subject}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-muted)]">Severity:</span>
                      <span>{submittedTicket.severity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-muted)]">Assigned Queue:</span>
                      <span className="text-[var(--signal)] font-bold">Developer Priority Queue</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("track")}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    View in Ticket Tracker
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-6 border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] shadow-card space-y-4">
                  <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-[var(--ink-primary)] flex items-center gap-2">
                    <LifeBuoy className="w-4 h-4 text-[var(--signal)]" />
                    <span>Create Engineering Support Ticket</span>
                  </h2>

                  {/* Subject */}
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-[var(--ink-muted)] block">
                      Ticket Subject / Brief Problem Statement:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Docling layout error on multi-column invoice"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-[var(--surface-sunken)] border border-[var(--line-hairline)] rounded-sm text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--signal)]"
                    />
                  </div>

                  {/* Category & Severity Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-mono text-[var(--ink-muted)] block">
                        Category:
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono bg-[var(--surface-sunken)] border border-[var(--line-hairline)] rounded-sm text-[var(--ink-primary)] focus:outline-none focus:border-[var(--signal)]"
                      >
                        <option value="api_bug">API Bug / Parsing Error</option>
                        <option value="account_auth">Account / API Key / Login</option>
                        <option value="billing_credits">Billing &amp; Credit Usage</option>
                        <option value="self_hosted">Self-Hosted / Air-Gap Cluster</option>
                        <option value="security">Security Vulnerability Report</option>
                        <option value="feature_request">Feature / Schema Request</option>
                        <option value="other">Other Inquiry</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-mono text-[var(--ink-muted)] block">
                        Severity Level:
                      </label>
                      <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs font-mono bg-[var(--surface-sunken)] border border-[var(--line-hairline)] rounded-sm text-[var(--ink-primary)] focus:outline-none focus:border-[var(--signal)]"
                      >
                        <option value="S4">S4 — General Question</option>
                        <option value="S3">S3 — Minor Bug / Layout Skew</option>
                        <option value="S2">S2 — Major Impact / Partial Failure</option>
                        <option value="S1">S1 — Production Down (Requires confirmation)</option>
                      </select>
                    </div>
                  </div>

                  {/* Contact Email & Request ID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-mono text-[var(--ink-muted)] block">
                        Contact Email Address:
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="engineer@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono bg-[var(--surface-sunken)] border border-[var(--line-hairline)] rounded-sm text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--signal)]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-mono text-[var(--ink-muted)] block">
                        Failed Request ID / Job ID (Optional):
                      </label>
                      <input
                        type="text"
                        placeholder="req_8492026af01 or job_91a02..."
                        value={requestId}
                        onChange={(e) => setRequestId(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono bg-[var(--surface-sunken)] border border-[var(--line-hairline)] rounded-sm text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--signal)]"
                      />
                    </div>
                  </div>

                  {/* Description with Secret Guard */}
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-[var(--ink-muted)] block flex items-center justify-between">
                      <span>Detailed Technical Description:</span>
                      <span className="text-[10px] text-[var(--ink-muted)]">Markdown supported</span>
                    </label>
                    <textarea
                      rows={5}
                      required
                      placeholder="Include reproduction steps, file parameters, unexpected vs expected field outputs..."
                      value={description}
                      onChange={(e) => handleDescChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-[var(--surface-sunken)] border border-[var(--line-hairline)] rounded-sm text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--signal)]"
                    />
                    {hasSecretWarning && (
                      <div className="p-2 border border-amber-500/40 bg-amber-500/10 rounded-sm text-[11px] font-mono text-amber-500 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Security Notice: This input appears to contain an API key or password. Please remove secrets before submitting.</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-[var(--line-hairline)]">
                    <span className="text-[11px] text-[var(--ink-muted)]">
                      Priority will be calculated based on your authenticated subscription tier.
                    </span>
                    <Button type="submit" variant="primary" size="sm" rightIcon={<Send className="w-3.5 h-3.5" />}>
                      Submit Ticket
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* Right: Instant Knowledge Base Deflection (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 border border-[var(--line-hairline)] rounded-sm bg-[var(--surface-subtle)] space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2 text-[var(--signal)] font-bold uppercase">
                  <HelpCircle className="w-4 h-4" />
                  <span>Instant Answers (Deflection)</span>
                </div>
                <p className="text-[11px] text-[var(--ink-secondary)]">
                  Before submitting, check if one of these common solutions resolves your inquiry immediately:
                </p>

                <div className="space-y-2 pt-1">
                  <Link
                    href="/docs#uploads"
                    className="p-2.5 bg-[var(--surface-base)] border border-[var(--line-hairline)] rounded-sm block hover:border-[var(--signal)] transition-colors"
                  >
                    <div className="font-bold text-[var(--ink-primary)] text-xs flex items-center justify-between">
                      <span>Large Document Uploads (&gt;10MB)</span>
                      <ExternalLink className="w-3 h-3 text-[var(--ink-muted)]" />
                    </div>
                    <span className="text-[10px] text-[var(--ink-muted)] block mt-0.5">
                      Use pre-signed direct S3 URLs to bypass API memory limits.
                    </span>
                  </Link>

                  <Link
                    href="/docs#webhooks"
                    className="p-2.5 bg-[var(--surface-base)] border border-[var(--line-hairline)] rounded-sm block hover:border-[var(--signal)] transition-colors"
                  >
                    <div className="font-bold text-[var(--ink-primary)] text-xs flex items-center justify-between">
                      <span>Webhook HMAC Signature Verification</span>
                      <ExternalLink className="w-3 h-3 text-[var(--ink-muted)]" />
                    </div>
                    <span className="text-[10px] text-[var(--ink-muted)] block mt-0.5">
                      Sample timing-safe Python and Node.js code snippets.
                    </span>
                  </Link>

                  <Link
                    href="/docs#ratelimits"
                    className="p-2.5 bg-[var(--surface-base)] border border-[var(--line-hairline)] rounded-sm block hover:border-[var(--signal)] transition-colors"
                  >
                    <div className="font-bold text-[var(--ink-primary)] text-xs flex items-center justify-between">
                      <span>Rate Limits &amp; 429 Retry-After</span>
                      <ExternalLink className="w-3 h-3 text-[var(--ink-muted)]" />
                    </div>
                    <span className="text-[10px] text-[var(--ink-muted)] block mt-0.5">
                      Inspect X-RateLimit headers and quota resets.
                    </span>
                  </Link>
                </div>
              </div>

              {/* Status & Uptime Badge */}
              <div className="p-3 border border-[var(--line-hairline)] rounded-sm bg-[var(--surface-base)] flex items-center justify-between font-mono text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[var(--ink-secondary)]">All Cloud Extraction Workers Operational</span>
                </div>
                <Badge variant="signal">100% HEALTHY</Badge>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Track Tickets Flow */}
        {activeTab === "track" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--ink-muted)]" />
                <input
                  type="text"
                  placeholder="Filter by ticket reference (e.g. OCR-2026-4812)..."
                  value={searchReference}
                  onChange={(e) => setSearchReference(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-[var(--surface-sunken)] border border-[var(--line-hairline)] rounded-sm text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--signal)]"
                />
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab("create")}
                leftIcon={<LifeBuoy className="w-3.5 h-3.5" />}
              >
                Open Another Ticket
              </Button>
            </div>

            {/* Tickets Table */}
            <div className="border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] shadow-card overflow-hidden">
              <div className="divide-y divide-[var(--line-hairline)]">
                {myTickets
                  .filter((t) => !searchReference || t.reference.toLowerCase().includes(searchReference.toLowerCase()) || t.subject.toLowerCase().includes(searchReference.toLowerCase()))
                  .map((ticket) => (
                    <div key={ticket.id} className="p-4 space-y-2 hover:bg-[var(--surface-subtle)] transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="font-bold text-[var(--signal)]">{ticket.reference}</span>
                          <span className="text-[var(--ink-muted)]">•</span>
                          <span className="font-bold text-[var(--ink-primary)]">{ticket.subject}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getSeverityBadge(ticket.severity)}
                          <Badge variant="outline">{ticket.status}</Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[var(--ink-muted)] pt-1">
                        <div className="flex items-center gap-3">
                          <span>Queue: {getTierPriorityBadge(ticket.planTier)}</span>
                          <span>•</span>
                          <span>Opened: {ticket.createdAt}</span>
                        </div>
                        <span className="text-[var(--ink-secondary)] italic">
                          Latest: {ticket.lastReply}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
