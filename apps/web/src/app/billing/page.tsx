"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { authApi, AuthUser } from "@/lib/auth";
import {
  billingApi,
  BillingStatus,
  SubscriptionData,
  InvoiceData,
} from "@/lib/billing";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import {
  CreditCard,
  Check,
  AlertCircle,
  FileText,
  RotateCw,
  Download,
  ShieldCheck,
  ArrowRight,
  Sliders,
  DollarSign,
} from "lucide-react";

interface LedgerRow {
  id: string;
  timestamp: string;
  type: "usage" | "subscription_grant" | "order_grant" | "adjustment";
  description: string;
  referenceId: string;
  delta: number;
  balanceAfter: number;
}

export default function BillingPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [currency, setCurrency] = useState<"USD" | "PKR">("USD");

  // Sample ledger entries mirroring backend usage_ledger
  const [ledgerEntries, setLedgerEntries] = useState<LedgerRow[]>([
    {
      id: "leg_01",
      timestamp: "2026-10-28 21:04:12",
      type: "usage",
      description: "Document Extraction (2 Pages)",
      referenceId: "job_91a02f81c4e2",
      delta: -2,
      balanceAfter: 24980,
    },
    {
      id: "leg_02",
      timestamp: "2026-10-28 20:55:01",
      type: "usage",
      description: "Batch Extraction (4 Pages)",
      referenceId: "job_88e411b029a1",
      delta: -4,
      balanceAfter: 24982,
    },
    {
      id: "leg_03",
      timestamp: "2026-10-24 00:00:00",
      type: "subscription_grant",
      description: "Monthly Pro Included Credits",
      referenceId: "sub_renew_oct2026",
      delta: 60000,
      balanceAfter: 24986,
    },
    {
      id: "leg_04",
      timestamp: "2026-10-20 11:22:10",
      type: "order_grant",
      description: "Growth Pack Top-Up (10,000 pages)",
      referenceId: "ord_safe_9918231",
      delta: 10000,
      balanceAfter: 4986,
    },
  ]);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const currentUser = await authApi.getCurrentUser();
      if (!currentUser) {
        router.push("/login?next=/billing");
        return;
      }
      setUser(currentUser);

      const [statusRes, invRes] = await Promise.all([
        billingApi.getStatus(),
        billingApi.getInvoices().catch(() => []),
      ]);

      setBillingStatus(statusRes);
      setInvoices(invRes);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to retrieve billing ledger details.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (planCode: string) => {
    setActionLoading(planCode);
    setErrorMsg(null);
    try {
      const res = await billingApi.checkout(planCode);
      if (res?.checkout_url) {
        window.location.href = res.checkout_url;
      } else {
        throw new Error("Missing checkout URL from gateway response.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Payment initiation failed. Please check your network.");
      setActionLoading(null);
    }
  };

  const handleExportCSV = () => {
    const headers = "Timestamp (UTC),Entry Type,Description,Reference ID,Delta Credits,Balance After\n";
    const rows = ledgerEntries
      .map(
        (e) =>
          `"${e.timestamp}","${e.type}","${e.description}","${e.referenceId}",${e.delta},${e.balanceAfter}`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `openocr_ledger_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const creditPacks = [
    {
      code: currency === "USD" ? "pack_starter_usd" : "pack_starter_pkr",
      name: "Starter Pack",
      credits: "3,000 pages",
      price: currency === "USD" ? "$10.00" : "Rs 2,800",
      description: "Instant capacity for testing workflows and small ad-hoc invoice runs.",
    },
    {
      code: currency === "USD" ? "pack_growth_usd" : "pack_growth_pkr",
      name: "Growth Pack",
      credits: "10,000 pages",
      price: currency === "USD" ? "$25.00" : "Rs 7,000",
      popular: true,
      description: "Best balance of volume and cost for regular production processing.",
    },
    {
      code: currency === "USD" ? "pack_scale_usd" : "pack_scale_pkr",
      name: "Scale Pack",
      credits: "50,000 pages",
      price: currency === "USD" ? "$100.00" : "Rs 28,000",
      description: "High volume enterprise credit pack with maximum bulk processing discount.",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--ink-primary)] transition-colors">
      <Header
        creditsBalance={billingStatus?.credit_balance ?? 24980}
        plan={user?.plan || "free"}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line-strong)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[var(--signal)] font-bold tracking-wider uppercase">
                The Ledger
              </span>
              <Badge variant="outline">APPEND-ONLY ACCOUNTING</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--ink-primary)] tracking-tight mt-1">
              Account Ledger & Settlement
            </h1>
            <p className="text-xs sm:text-sm text-[var(--ink-secondary)] mt-0.5">
              Strict double-entry credit ledger. Records are appended and immutable.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-sm border border-[var(--line-strong)] bg-[var(--surface-subtle)] p-0.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setCurrency("USD")}
                className={`px-2 py-1 rounded-sm transition-colors ${
                  currency === "USD"
                    ? "bg-[var(--surface-base)] text-[var(--ink-primary)] font-bold shadow-subtle"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                }`}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => setCurrency("PKR")}
                className={`px-2 py-1 rounded-sm transition-colors ${
                  currency === "PKR"
                    ? "bg-[var(--surface-base)] text-[var(--ink-primary)] font-bold shadow-subtle"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                }`}
              >
                PKR (₨)
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export CSV
            </Button>
          </div>
        </div>

        {/* Status Messages */}
        {errorMsg && (
          <div className="p-3 bg-[var(--semantic-error-subtle)] border border-[var(--semantic-error)] rounded-sm text-xs text-[var(--semantic-error)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] space-y-1 shadow-card relative registration-mark registration-mark-tl registration-mark-tr">
            <span className="font-mono text-[11px] text-[var(--ink-muted)] uppercase tracking-wider">
              Available Credits Balance
            </span>
            <div className="text-3xl font-mono font-bold tabular-nums text-[var(--ink-primary)]">
              {(billingStatus?.credit_balance ?? 24980).toLocaleString()}
            </div>
            <p className="text-[11px] text-[var(--ink-secondary)]">Pages remaining for programmatic extraction</p>
          </div>

          <div className="p-4 border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] space-y-1 shadow-card">
            <span className="font-mono text-[11px] text-[var(--ink-muted)] uppercase tracking-wider">
              Active Tier
            </span>
            <div className="flex items-center gap-2 text-2xl font-serif font-bold text-[var(--ink-primary)]">
              <span>{user?.plan === "pro" ? "Pro Scale" : "Developer Tier"}</span>
              <Badge variant={user?.plan === "pro" ? "signal" : "outline"} className="text-xs">
                {(user?.plan || "free").toUpperCase()}
              </Badge>
            </div>
            <p className="text-[11px] text-[var(--ink-secondary)]">Next cycle renewal: Nov 24, 2026</p>
          </div>

          <div className="p-4 border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] space-y-1 shadow-card relative registration-mark registration-mark-bl registration-mark-br">
            <span className="font-mono text-[11px] text-[var(--ink-muted)] uppercase tracking-wider">
              Rate Specification
            </span>
            <div className="text-3xl font-mono font-bold tabular-nums text-[var(--signal)]">
              $0.0010
            </div>
            <p className="text-[11px] text-[var(--ink-secondary)]">Cost per page on Developer Pay-As-You-Go</p>
          </div>
        </div>

        {/* Section 1: The Running Ledger Table */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-mono font-bold uppercase tracking-wider text-[var(--ink-secondary)]">
              Double-Entry Ledger Audit History
            </h2>
            <span className="text-xs font-mono text-[var(--ink-muted)]">
              Append-Only • Keyset Verified
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp (UTC)</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reference ID</TableHead>
                <TableHead className="text-right">Delta</TableHead>
                <TableHead className="text-right">Running Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledgerEntries.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-[11px] text-[var(--ink-secondary)]">
                    {row.timestamp}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.delta > 0 ? "success" : "default"}>
                      {row.type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-[var(--ink-primary)]">
                    {row.description}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-[var(--ink-muted)]">
                    {row.referenceId}
                  </TableCell>
                  <TableCell
                    className={`font-mono text-right tabular-nums font-bold ${
                      row.delta > 0 ? "text-[var(--semantic-success)]" : "text-[var(--semantic-error)]"
                    }`}
                  >
                    {row.delta > 0 ? `+${row.delta.toLocaleString()}` : row.delta.toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono text-right tabular-nums font-bold text-[var(--ink-primary)]">
                    {row.balanceAfter.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        {/* Section 2: Top-Up Credit Packs */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--line-hairline)] pb-2">
            <div>
              <h2 className="text-base font-mono font-bold uppercase tracking-wider text-[var(--ink-secondary)]">
                Acquire Credit Top-Up Packs
              </h2>
              <p className="text-xs text-[var(--ink-muted)]">
                Direct one-time capacity expansion. Credits never expire and apply across all API keys.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--semantic-success)]">
              <ShieldCheck className="w-4 h-4" />
              <span>PCI-DSS SAQ-A Certified (Safepay)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {creditPacks.map((pack) => (
              <div
                key={pack.code}
                className={`p-5 rounded-sm border bg-[var(--surface-base)] flex flex-col justify-between space-y-4 shadow-card ${
                  pack.popular ? "border-[var(--signal)] ring-1 ring-[var(--signal)]" : "border-[var(--line-strong)]"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-lg text-[var(--ink-primary)]">
                      {pack.name}
                    </span>
                    {pack.popular && (
                      <Badge variant="signal" className="text-[10px]">
                        POPULAR
                      </Badge>
                    )}
                  </div>
                  <div className="text-2xl font-mono font-bold tabular-nums text-[var(--ink-primary)]">
                    {pack.price}
                  </div>
                  <div className="font-mono text-xs font-semibold text-[var(--signal)]">
                    {pack.credits}
                  </div>
                  <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                    {pack.description}
                  </p>
                </div>

                <Button
                  variant={pack.popular ? "primary" : "secondary"}
                  size="sm"
                  loading={actionLoading === pack.code}
                  onClick={() => handleCheckout(pack.code)}
                  className="w-full"
                >
                  Purchase {pack.name}
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Invoices & Receipts */}
        <section className="space-y-3">
          <h2 className="text-base font-mono font-bold uppercase tracking-wider text-[var(--ink-secondary)]">
            Official Tax Invoices & Settlement Receipts
          </h2>
          {invoices.length === 0 ? (
            <div className="p-6 border border-[var(--line-hairline)] rounded-sm bg-[var(--surface-subtle)] text-center text-xs text-[var(--ink-muted)] font-mono">
              No commercial settlement receipts on file yet. Receipts are generated automatically upon order settlement.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date Issued</TableHead>
                  <TableHead>Settlement Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono font-bold text-[var(--ink-primary)]">
                      {inv.invoice_number}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-[var(--ink-secondary)]">
                      {inv.issued_at}
                    </TableCell>
                    <TableCell className="font-mono tabular-nums font-bold">
                      ${(inv.amount_minor / 100).toFixed(2)} {inv.currency}
                    </TableCell>
                    <TableCell>
                      <Badge variant="success">PAID</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="xs" leftIcon={<Download className="w-3 h-3" />}>
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </main>
    </div>
  );
}
