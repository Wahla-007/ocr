"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  ShieldAlert,
  Bot,
  Filter,
  User,
  Check,
  RefreshCw,
  MessageSquare,
  Sparkles,
  Sliders,
  ChevronRight,
  Inbox,
  AlertCircle,
  Archive,
} from "lucide-react";
import { SupportTicket, TicketReply } from "@/lib/tickets";
import { authApi, AuthUser } from "@/lib/auth";

export default function AdminSupportDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Reply Station Form State
  const [replyMessage, setReplyMessage] = useState("");
  const [authorName, setAuthorName] = useState("Dr. Sarah Chen (Core Engine)");
  const [targetStatus, setTargetStatus] = useState<SupportTicket["status"]>("Waiting on Customer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch tickets from API
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/support/tickets");
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        setStats(data.stats || {});
        if (!activeTicketId && data.tickets && data.tickets.length > 0) {
          setActiveTicketId(data.tickets[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    authApi
      .getCurrentUser()
      .then((user) => {
        if (!isMounted) return;
        if (!user) {
          router.push("/login?next=/admin/support");
          return;
        }
        setCurrentUser(user);
        setAuthChecking(false);
        if (user.is_admin) {
          fetchTickets();
        }
      })
      .catch(() => {
        if (!isMounted) return;
        router.push("/login?next=/admin/support");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeTicket = tickets.find((t) => t.id === activeTicketId) || null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Submit reply / answer
  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeTicket || !replyMessage.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/v1/support/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeTicket.id,
          reply: replyMessage.trim(),
          authorName,
          authorRole: "Core Platform Engineering",
          status: targetStatus,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setReplyMessage("");
        showToast("Answer dispatched & status updated");
        // Update local state
        setTickets((prev) =>
          prev.map((t) => (t.id === data.ticket.id ? data.ticket : t))
        );
      }
    } catch (err) {
      console.error("Failed to dispatch reply:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct status update
  const handleUpdateStatus = async (newStatus: SupportTicket["status"]) => {
    if (!activeTicket) return;
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/v1/support/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeTicket.id,
          status: newStatus,
          authorName,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Status changed to ${newStatus}`);
        setTickets((prev) =>
          prev.map((t) => (t.id === data.ticket.id ? data.ticket : t))
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Preset Handlers
  const applyPreset = (presetText: string, presetStatus: SupportTicket["status"]) => {
    setReplyMessage(presetText);
    setTargetStatus(presetStatus);
  };

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (severityFilter !== "all" && t.severity.toLowerCase() !== severityFilter.toLowerCase()) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        t.reference.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const getStatusBadge = (status: SupportTicket["status"]) => {
    switch (status) {
      case "New":
        return <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono text-[10px] font-bold border border-purple-500/20">NEW</span>;
      case "Open":
        return <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-bold border border-blue-500/20">OPEN</span>;
      case "Waiting on Engineering":
        return <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[10px] font-bold border border-amber-500/20">PENDING ENG</span>;
      case "Waiting on Customer":
        return <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono text-[10px] font-bold border border-sky-500/20">PENDING USER</span>;
      case "Resolved":
        return <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/20">RESOLVED</span>;
      case "Closed":
        return <span className="px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 font-mono text-[10px] font-bold border border-zinc-500/20">CLOSED</span>;
    }
  };

  const getSeverityBadge = (sev: SupportTicket["severity"]) => {
    switch (sev) {
      case "S1":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-red-500/10 text-red-500 font-bold border border-red-500/30">S1 • URGENT</span>;
      case "S2":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/30">S2 • MAJOR</span>;
      case "S3":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/30">S3 • MINOR</span>;
      case "S4":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-zinc-500/10 text-zinc-400 font-medium border border-zinc-500/20">S4 • GENERAL</span>;
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[var(--surface-base)] text-[var(--ink-primary)] flex flex-col light-table-grid">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--signal)] border-t-transparent animate-spin" />
          <p className="font-mono text-xs text-[var(--ink-secondary)] tracking-wider uppercase">
            Verifying Archival Security Clearance...
          </p>
        </div>
      </div>
    );
  }

  if (currentUser && !currentUser.is_admin) {
    return (
      <div className="min-h-screen bg-[var(--surface-base)] text-[var(--ink-primary)] flex flex-col light-table-grid">
        <Header />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[var(--surface-base)] border border-[var(--line-strong)] rounded-sm p-8 shadow-card text-center space-y-5">
            <div className="w-12 h-12 rounded-full bg-[var(--semantic-error-subtle)] text-[var(--semantic-error)] border border-[var(--semantic-error)] flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--semantic-error)] font-bold">
                SECURITY CLEARANCE RESTRICTED
              </span>
              <h1 className="font-serif text-xl font-bold text-[var(--ink-primary)]">
                Administrator Access Required
              </h1>
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                This terminal is restricted to system administrators. You are currently authenticated as{" "}
                <span className="font-mono font-semibold text-[var(--ink-primary)]">{currentUser.email}</span>.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" size="sm" onClick={() => router.push("/")}>
                Return to Light Table
              </Button>
              <Button variant="primary" size="sm" onClick={() => router.push("/login?next=/admin/support")}>
                Sign In as Administrator
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--ink-primary)] transition-colors antialiased">
      <Header />

      {/* Floating Action Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-sm bg-[var(--surface-raised)] border border-[var(--signal)] text-xs font-mono text-[var(--ink-primary)] shadow-card flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[var(--semantic-success)]" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="max-w-[1720px] mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
        {/* Top Control Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--line-strong)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[var(--signal)] font-bold tracking-wider uppercase flex items-center gap-1.5">
                <LifeBuoy className="w-3.5 h-3.5" />
                Help Desk Operations
              </span>
              <Badge variant="signal" className="text-[10px]">ADMIN DISPATCH</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--ink-primary)] tracking-tight mt-1">
              Engineering Support &amp; Resolution Station
            </h1>
            <p className="text-xs sm:text-sm text-[var(--ink-secondary)] mt-0.5">
              Live triage queue for enterprise, developer, and community tickets. Reply to customers and update ticket lifecycles in real time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/support">
              <Button variant="outline" size="sm">
                Customer View (/support)
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTickets}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
            >
              Sync Tickets
            </Button>
          </div>
        </div>

        {/* Operational KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] space-y-1 shadow-subtle">
            <span className="text-[10px] font-mono text-[var(--ink-muted)] uppercase tracking-wider block">
              Total Queue
            </span>
            <div className="flex items-baseline justify-between">
              <span className="font-serif text-2xl font-bold text-[var(--ink-primary)] tabular-nums">
                {stats.total ?? tickets.length}
              </span>
              <Inbox className="w-4 h-4 text-[var(--ink-muted)]" />
            </div>
          </div>

          <div className="p-3 border border-purple-500/30 rounded-sm bg-purple-500/5 space-y-1">
            <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 uppercase tracking-wider block font-semibold">
              New / Unassigned
            </span>
            <div className="flex items-baseline justify-between">
              <span className="font-serif text-2xl font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                {tickets.filter((t) => t.status === "New").length}
              </span>
              <Sparkles className="w-4 h-4 text-purple-500" />
            </div>
          </div>

          <div className="p-3 border border-amber-500/30 rounded-sm bg-amber-500/5 space-y-1">
            <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 uppercase tracking-wider block font-semibold">
              Pending Engineering
            </span>
            <div className="flex items-baseline justify-between">
              <span className="font-serif text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {tickets.filter((t) => t.status === "Waiting on Engineering").length}
              </span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
          </div>

          <div className="p-3 border border-sky-500/30 rounded-sm bg-sky-500/5 space-y-1">
            <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider block font-semibold">
              Waiting on Customer
            </span>
            <div className="flex items-baseline justify-between">
              <span className="font-serif text-2xl font-bold text-sky-600 dark:text-sky-400 tabular-nums">
                {tickets.filter((t) => t.status === "Waiting on Customer").length}
              </span>
              <User className="w-4 h-4 text-sky-500" />
            </div>
          </div>

          <div className="p-3 border border-emerald-500/30 rounded-sm bg-emerald-500/5 space-y-1">
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block font-semibold">
              Resolved &amp; Closed
            </span>
            <div className="flex items-baseline justify-between">
              <span className="font-serif text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {tickets.filter((t) => t.status === "Resolved" || t.status === "Closed").length}
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
          </div>

          <div className="p-3 border border-red-500/30 rounded-sm bg-red-500/5 space-y-1">
            <span className="text-[10px] font-mono text-red-500 uppercase tracking-wider block font-semibold">
              S1 Outages
            </span>
            <div className="flex items-baseline justify-between">
              <span className="font-serif text-2xl font-bold text-red-500 tabular-nums">
                {tickets.filter((t) => t.severity === "S1").length}
              </span>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
          </div>
        </div>

        {/* Master-Detail Split Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[720px]">
          {/* Left Column: Ticket Ledger & Filter Desk (5 cols) */}
          <div className="lg:col-span-5 flex flex-col border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] overflow-hidden shadow-card">
            {/* Search and Filter Bar */}
            <div className="p-3 border-b border-[var(--line-hairline)] bg-[var(--surface-subtle)] space-y-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by ref, subject, or email..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-[var(--surface-sunken)] border border-[var(--line-hairline)] rounded-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--signal)]"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap gap-1 text-[11px] font-mono">
                {[
                  { id: "all", label: "All" },
                  { id: "new", label: "New" },
                  { id: "open", label: "Open" },
                  { id: "waiting on engineering", label: "Eng Pending" },
                  { id: "waiting on customer", label: "User Pending" },
                  { id: "resolved", label: "Resolved" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-2 py-0.5 rounded-sm border transition-colors cursor-pointer ${
                      statusFilter === tab.id
                        ? "bg-[var(--signal)] text-white border-[var(--signal)] font-bold shadow-subtle"
                        : "bg-[var(--surface-base)] text-[var(--ink-muted)] border-[var(--line-hairline)] hover:text-[var(--ink-primary)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ticket List Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--line-hairline)]">
              {filteredTickets.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-[var(--ink-muted)] space-y-1">
                  <Inbox className="w-8 h-8 mx-auto opacity-40 mb-2" />
                  <p className="font-bold text-[var(--ink-primary)]">No matching tickets</p>
                  <p>Try clearing your status or search filters.</p>
                </div>
              ) : (
                filteredTickets.map((ticket) => {
                  const isSelected = activeTicketId === ticket.id;
                  return (
                    <div
                      key={ticket.id}
                      onClick={() => setActiveTicketId(ticket.id)}
                      className={`p-3 text-xs transition-colors cursor-pointer space-y-1.5 ${
                        isSelected
                          ? "bg-[var(--signal-subtle)] border-l-4 border-l-[var(--signal)] ring-1 ring-[var(--signal)]/30"
                          : "hover:bg-[var(--surface-subtle)]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-xs font-bold text-[var(--signal)] shrink-0">
                            {ticket.reference}
                          </span>
                          <span className="font-semibold text-[var(--ink-primary)] truncate">
                            {ticket.subject}
                          </span>
                        </div>
                        <div className="shrink-0 flex items-center gap-1">
                          {getStatusBadge(ticket.status)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono text-[var(--ink-muted)]">
                        <span className="truncate max-w-[180px] text-[var(--ink-secondary)]">
                          {ticket.email}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {getSeverityBadge(ticket.severity)}
                          <span className="text-[10px] uppercase text-[var(--ink-muted)]">
                            {ticket.planTier}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-[var(--ink-muted)] line-clamp-2 leading-relaxed">
                        {ticket.description}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-[var(--ink-muted)] border-t border-[var(--line-hairline)]/50">
                        <span>{ticket.replies?.length || 1} messages</span>
                        <span>Updated {ticket.updatedAt}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Ticket Resolution Station & Thread (7 cols) */}
          <div className="lg:col-span-7 flex flex-col border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] overflow-hidden shadow-card">
            {activeTicket ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Active Ticket Header & Status Switcher */}
                <div className="p-4 border-b border-[var(--line-hairline)] bg-[var(--surface-subtle)] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[var(--signal)]">
                          {activeTicket.reference}
                        </span>
                        {getSeverityBadge(activeTicket.severity)}
                        {getStatusBadge(activeTicket.status)}
                      </div>
                      <h2 className="text-base sm:text-lg font-serif font-bold text-[var(--ink-primary)] truncate">
                        {activeTicket.subject}
                      </h2>
                    </div>

                    {/* Quick Status Setter Dropdown / Action */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[var(--ink-muted)]">Status:</span>
                      <select
                        value={activeTicket.status}
                        onChange={(e) => handleUpdateStatus(e.target.value as any)}
                        className="text-xs font-mono px-2.5 py-1 bg-[var(--surface-base)] border border-[var(--line-strong)] rounded-sm text-[var(--ink-primary)] font-bold focus:outline-none focus:border-[var(--signal)]"
                      >
                        <option value="New">New</option>
                        <option value="Open">Open</option>
                        <option value="Waiting on Customer">Waiting on Customer</option>
                        <option value="Waiting on Engineering">Waiting on Engineering</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[var(--ink-muted)] pt-1 border-t border-[var(--line-hairline)]">
                    <div>
                      <span className="text-[var(--ink-muted)]">Customer: </span>
                      <strong className="text-[var(--ink-primary)]">{activeTicket.email}</strong>
                    </div>
                    <div>
                      <span className="text-[var(--ink-muted)]">Entitlement: </span>
                      <span className="font-bold uppercase text-[var(--signal)]">
                        {activeTicket.planTier === "self_hosted"
                          ? "Enterprise (Tier 1)"
                          : activeTicket.planTier === "developer"
                          ? "Developer Pro (Tier 2)"
                          : "Free Tier"}
                      </span>
                    </div>
                    {activeTicket.requestId && (
                      <div>
                        <span className="text-[var(--ink-muted)]">Job/Request ID: </span>
                        <code className="text-[var(--ink-primary)]">{activeTicket.requestId}</code>
                      </div>
                    )}
                    <div>
                      <span className="text-[var(--ink-muted)]">Created: </span>
                      <span>{activeTicket.createdAt}</span>
                    </div>
                  </div>
                </div>

                {/* Conversation Timeline & Messages */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[var(--surface-sunken)]/20">
                  <div className="text-center">
                    <span className="px-3 py-1 rounded-sm bg-[var(--surface-raised)] border border-[var(--line-hairline)] text-[10px] font-mono text-[var(--ink-muted)]">
                      Ticket Initiated • SLA Countdown Clock Active
                    </span>
                  </div>

                  {/* Render Message Thread */}
                  {activeTicket.replies?.map((rep, idx) => {
                    const isStaff = rep.sender === "agent";
                    const isSystem = rep.sender === "system";

                    if (isSystem) {
                      return (
                        <div key={rep.id || idx} className="text-center py-1">
                          <span className="text-[11px] font-mono text-[var(--ink-muted)] bg-[var(--surface-subtle)] px-2.5 py-0.5 rounded-sm border border-[var(--line-hairline)]">
                            ⚡ {rep.message} — <span className="tabular-nums">{rep.createdAt}</span>
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={rep.id || idx}
                        className={`flex flex-col space-y-1.5 max-w-[85%] ${
                          isStaff ? "ml-auto items-end" : "mr-auto items-start"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--ink-muted)]">
                          <span className="font-bold text-[var(--ink-primary)]">
                            {rep.authorName}
                          </span>
                          {rep.authorRole && (
                            <span className="px-1.5 py-0.2 rounded bg-[var(--signal-subtle)] text-[var(--signal)] border border-[var(--signal)]/30 font-semibold text-[10px]">
                              {rep.authorRole}
                            </span>
                          )}
                          <span>•</span>
                          <span className="tabular-nums">{rep.createdAt}</span>
                        </div>

                        <div
                          className={`p-3.5 rounded-sm text-xs font-mono leading-relaxed select-text whitespace-pre-wrap ${
                            isStaff
                              ? "bg-[var(--surface-base)] text-[var(--ink-primary)] border-2 border-[var(--signal)] shadow-sm"
                              : "bg-[var(--surface-base)] text-[var(--ink-primary)] border border-[var(--line-strong)]"
                          }`}
                        >
                          {rep.message}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Staff Reply Station & Preset Actions */}
                <div className="p-4 border-t border-[var(--line-hairline)] bg-[var(--surface-base)] space-y-3">
                  {/* Preset Responses */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[var(--ink-secondary)] font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-[var(--signal)]" />
                        Quick Response Engineering Templates:
                      </span>
                      <span className="text-[var(--ink-muted)]">1-Click Insert</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          applyPreset(
                            "Thank you for reporting this. We are inspecting the Docling layout engine logs for your document. Could you provide the Job ID or raw input snippet so we can verify token bounding boxes?",
                            "Waiting on Customer"
                          )
                        }
                        className="px-2 py-1 rounded-sm border border-[var(--line-hairline)] bg-[var(--surface-subtle)] text-[10px] font-mono text-[var(--ink-secondary)] hover:border-[var(--signal)] hover:text-[var(--signal)] transition-colors cursor-pointer"
                      >
                        + Request Job ID &amp; Logs
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          applyPreset(
                            "Our core engineering team has deployed a patch to the text line merger and geometry normalizer. Your document has been verified against the test suite and should now extract cleanly.",
                            "Resolved"
                          )
                        }
                        className="px-2 py-1 rounded-sm border border-[var(--line-hairline)] bg-[var(--surface-subtle)] text-[10px] font-mono text-[var(--ink-secondary)] hover:border-[var(--semantic-success)] hover:text-[var(--semantic-success)] transition-colors cursor-pointer"
                      >
                        + Fix Deployed (Resolve)
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          applyPreset(
                            "For air-gapped MinIO S3 clustering on Kubernetes, set `minio.s3_endpoint_url: http://minio.storage.svc:9000` and `s3_force_path_style: true` in your Helm values.yaml file.",
                            "Waiting on Customer"
                          )
                        }
                        className="px-2 py-1 rounded-sm border border-[var(--line-hairline)] bg-[var(--surface-subtle)] text-[10px] font-mono text-[var(--ink-secondary)] hover:border-[var(--signal)] hover:text-[var(--signal)] transition-colors cursor-pointer"
                      >
                        + Helm / MinIO Guidance
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          applyPreset(
                            "We have verified your account tier and credited 5,000 additional evaluation pages to your API key for enterprise benchmarking.",
                            "Resolved"
                          )
                        }
                        className="px-2 py-1 rounded-sm border border-[var(--line-hairline)] bg-[var(--surface-subtle)] text-[10px] font-mono text-[var(--ink-secondary)] hover:border-[var(--semantic-success)] hover:text-[var(--semantic-success)] transition-colors cursor-pointer"
                      >
                        + Credit Adjustment Applied
                      </button>
                    </div>
                  </div>

                  {/* Active Reply Composer Form */}
                  <form onSubmit={handleSendReply} className="space-y-3">
                    <textarea
                      rows={3}
                      required
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your response to the customer. This will update the ticket thread and customer portal view..."
                      className="w-full p-3 text-xs font-mono bg-[var(--surface-sunken)] border border-[var(--line-hairline)] hover:border-[var(--line-strong)] focus:border-[var(--signal)] rounded-sm text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none transition-colors"
                    />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-[var(--ink-muted)]">Signing As:</span>
                        <input
                          type="text"
                          value={authorName}
                          onChange={(e) => setAuthorName(e.target.value)}
                          className="px-2 py-1 bg-[var(--surface-sunken)] border border-[var(--line-hairline)] rounded-sm text-xs font-mono text-[var(--ink-primary)] w-48"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-mono">
                          <span className="text-[var(--ink-muted)]">Set Status:</span>
                          <select
                            value={targetStatus}
                            onChange={(e) => setTargetStatus(e.target.value as any)}
                            className="text-xs font-mono px-2 py-1 bg-[var(--surface-sunken)] border border-[var(--line-hairline)] rounded-sm text-[var(--ink-primary)]"
                          >
                            <option value="Waiting on Customer">Waiting on Customer</option>
                            <option value="Waiting on Engineering">Waiting on Engineering</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Closed">Closed</option>
                            <option value="Open">Open</option>
                          </select>
                        </div>

                        <Button
                          type="submit"
                          size="sm"
                          variant="primary"
                          disabled={isSubmitting || !replyMessage.trim()}
                          rightIcon={<Send className="w-3.5 h-3.5" />}
                        >
                          {isSubmitting ? "Dispatching..." : "Send Answer"}
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-[var(--ink-muted)] font-mono space-y-2">
                <LifeBuoy className="w-10 h-10 opacity-30 text-[var(--signal)] mb-2" />
                <h3 className="font-bold text-sm text-[var(--ink-primary)]">No Ticket Selected</h3>
                <p className="text-xs max-w-xs">
                  Choose a support ticket from the active ledger on the left to review conversation history, assign engineers, or dispatch replies.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
