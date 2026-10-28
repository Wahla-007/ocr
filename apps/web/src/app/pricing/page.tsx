"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { authApi, AuthUser } from "@/lib/auth";
import { billingApi } from "@/lib/billing";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import {
  Check,
  X,
  ShieldCheck,
  Server,
  ArrowRight,
  HelpCircle,
  Code2,
  Sliders,
  DollarSign,
  AlertCircle,
} from "lucide-react";

export default function PricingRateCardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [monthlyPages, setMonthlyPages] = useState<number>(25000);
  const [currency, setCurrency] = useState<"USD" | "PKR">("USD");
  const [loadingCode, setLoadingCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    authApi.getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  // Cost calculation based on volume slider
  const ratePerPageUSD = 0.001; // $0.0010 per page
  const calculatedCostUSD = (monthlyPages * ratePerPageUSD).toFixed(2);
  const calculatedCostPKR = Math.round(monthlyPages * 0.28).toLocaleString();

  const handleCheckout = async (planCode: string) => {
    setErrorMsg(null);
    if (!user) {
      router.push(`/login?next=/pricing`);
      return;
    }

    if (!user.email_verified) {
      setErrorMsg("Please verify your email address before initiating checkout.");
      return;
    }

    setLoadingCode(planCode);
    try {
      const res = await billingApi.checkout(planCode);
      if (res?.checkout_url) {
        window.location.href = res.checkout_url;
      } else {
        throw new Error("Invalid response from payment gateway.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Checkout session failed. Please try again.");
      setLoadingCode(null);
    }
  };

  const faqItems = [
    {
      q: "How does OpenOCR achieve $0.0010/page compared to AWS ($0.015) and Google ($0.05)?",
      a: "OpenOCR runs on optimized pure CPU execution (<20MB RAM per worker) utilizing deterministic layout parsing (Docling/RapidOCR) and targeted local inference. Zero expensive GPU cloud markups.",
    },
    {
      q: "What happens when I exceed my included monthly volume?",
      a: "On Developer Pay-As-You-Go, you simply pay $0.0010 per additional page extracted. Processing is never interrupted. On the Free Trial, jobs halt at 5 documents until upgraded.",
    },
    {
      q: "Are documents retained or used for model training?",
      a: "Never. OpenOCR stores zero document bytes in operational logs. Customer documents are strictly processed in isolated worker containers and purged per your data retention schedule.",
    },
    {
      q: "Can I deploy OpenOCR entirely offline in an air-gapped network?",
      a: "Yes. Our Self-Hosted Enterprise plan delivers complete Docker Compose and Helm distribution kits designed to run with zero outbound internet egress.",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--ink-primary)] transition-colors">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line-strong)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[var(--signal)] font-bold tracking-wider uppercase">
                The Rate Card
              </span>
              <Badge variant="outline">OFFICIAL TARIFF</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--ink-primary)] tracking-tight mt-1">
              Industrial Processing Tariff
            </h1>
            <p className="text-xs sm:text-sm text-[var(--ink-secondary)] mt-0.5">
              Transparent volume pricing with zero artificial markups or hidden fees.
            </p>
          </div>

          {/* Currency Toggle */}
          <div className="flex items-center rounded-sm border border-[var(--line-strong)] bg-[var(--surface-subtle)] p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setCurrency("USD")}
              className={`px-3 py-1 rounded-sm transition-colors ${
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
              className={`px-3 py-1 rounded-sm transition-colors ${
                currency === "PKR"
                  ? "bg-[var(--surface-base)] text-[var(--ink-primary)] font-bold shadow-subtle"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              }`}
            >
              PKR (₨)
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-[var(--semantic-error-subtle)] border border-[var(--semantic-error)] rounded-sm text-xs text-[var(--semantic-error)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Signature Element: Interactive Volume Cost Calculator */}
        <section className="p-6 border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] shadow-card relative registration-mark registration-mark-tl registration-mark-tr registration-mark-bl registration-mark-br space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--line-hairline)] pb-3">
            <div>
              <h2 className="text-base font-mono font-bold uppercase tracking-wider text-[var(--ink-primary)] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[var(--signal)]" />
                Interactive Volume Tariff Calculator
              </h2>
              <p className="text-xs text-[var(--ink-secondary)]">
                Drag the volume slider to compute monthly expenditure and plan recommendation.
              </p>
            </div>
            <span className="font-mono text-xs text-[var(--signal)] font-bold">
              Formula: {monthlyPages.toLocaleString()} pages × $0.0010
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between font-mono text-sm">
              <span className="text-[var(--ink-secondary)]">Monthly Extraction Volume:</span>
              <span className="text-xl font-bold text-[var(--ink-primary)] tabular-nums">
                {monthlyPages.toLocaleString()} Pages / Month
              </span>
            </div>

            <input
              type="range"
              min={1000}
              max={500000}
              step={1000}
              value={monthlyPages}
              onChange={(e) => setMonthlyPages(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-[var(--surface-sunken)] rounded-sm appearance-none cursor-pointer accent-[var(--signal)] border border-[var(--line-hairline)]"
            />

            <div className="flex justify-between text-[11px] font-mono text-[var(--ink-muted)]">
              <span>1,000 Pages</span>
              <span>100,000 Pages</span>
              <span>250,000 Pages</span>
              <span>500,000 Pages</span>
            </div>
          </div>

          {/* Computed Result Box */}
          <div className="p-4 bg-[var(--surface-subtle)] border border-[var(--line-hairline)] rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="font-mono text-[11px] text-[var(--ink-muted)] uppercase tracking-wider">
                Projected Monthly Expenditure
              </span>
              <div className="text-3xl font-mono font-bold tabular-nums text-[var(--ink-primary)]">
                {currency === "USD" ? `$${calculatedCostUSD} USD` : `₨ ${calculatedCostPKR} PKR`}
              </div>
              <p className="text-xs text-[var(--ink-secondary)] font-mono">
                Effective Rate: $0.0010 USD / page processed
              </p>
            </div>

            <div className="text-right space-y-1">
              <span className="font-mono text-[11px] text-[var(--ink-muted)] uppercase tracking-wider block">
                Recommended Architecture
              </span>
              <div className="font-serif text-lg font-bold text-[var(--signal)]">
                {monthlyPages > 100000 ? "Self-Hosted Enterprise" : "Developer Pay-As-You-Go"}
              </div>
              <Link href={monthlyPages > 100000 ? "/self-hosted" : "/signup"}>
                <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  {monthlyPages > 100000 ? "Inquire for Air-Gap Kit" : "Establish Developer Key"}
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Ruled Comparison Table */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-mono font-bold uppercase tracking-wider text-[var(--ink-secondary)]">
              Complete Tier Specifications
            </h2>
            <p className="text-xs text-[var(--ink-muted)]">
              Plain-language technical boundaries. No hidden quotas or surprise renewals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Free Plan */}
            <div className="p-5 border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] flex flex-col justify-between space-y-4 shadow-card">
              <div className="space-y-2">
                <span className="font-mono text-xs uppercase text-[var(--ink-muted)] font-bold">Inspection</span>
                <h3 className="font-serif text-xl font-bold text-[var(--ink-primary)]">Free Trial</h3>
                <div className="text-2xl font-mono font-bold text-[var(--ink-primary)]">$0 / forever</div>
                <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                  For immediate in-browser inspection on the Light Table.
                </p>
                <ul className="text-xs font-mono space-y-1.5 pt-2 text-[var(--ink-secondary)]">
                  <li>• 5 Total specimen uploads</li>
                  <li>• Max 2 pages per document</li>
                  <li>• Web Light Table access</li>
                  <li>• No API keys permitted</li>
                </ul>
              </div>
              <Link href="/">
                <Button variant="outline" size="sm" className="w-full">
                  Try Light Table
                </Button>
              </Link>
            </div>

            {/* Developer PAYG */}
            <div className="p-5 border-2 border-[var(--signal)] rounded-sm bg-[var(--surface-base)] flex flex-col justify-between space-y-4 shadow-card ring-1 ring-[var(--signal)]">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase text-[var(--signal)] font-bold">Standard</span>
                  <Badge variant="signal" className="text-[10px]">POPULAR</Badge>
                </div>
                <h3 className="font-serif text-xl font-bold text-[var(--ink-primary)]">Developer PAYG</h3>
                <div className="text-2xl font-mono font-bold text-[var(--ink-primary)]">$0.0010 / page</div>
                <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                  Full programmatic API access. Pay only for exact pages processed.
                </p>
                <ul className="text-xs font-mono space-y-1.5 pt-2 text-[var(--ink-secondary)]">
                  <li>• REST API & signed URLs</li>
                  <li>• Max 500 pages per document</li>
                  <li>• 120 req/min rate limit</li>
                  <li>• HMAC Webhook dispatch</li>
                </ul>
              </div>
              <Link href="/signup">
                <Button variant="primary" size="sm" className="w-full">
                  Start Building
                </Button>
              </Link>
            </div>

            {/* Pro Scale */}
            <div className="p-5 border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] flex flex-col justify-between space-y-4 shadow-card">
              <div className="space-y-2">
                <span className="font-mono text-xs uppercase text-[var(--ink-muted)] font-bold">Production</span>
                <h3 className="font-serif text-xl font-bold text-[var(--ink-primary)]">Pro Scale</h3>
                <div className="text-2xl font-mono font-bold text-[var(--ink-primary)]">$49 / month</div>
                <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                  Includes 60,000 monthly pages plus priority queue concurrency.
                </p>
                <ul className="text-xs font-mono space-y-1.5 pt-2 text-[var(--ink-secondary)]">
                  <li>• 60,000 included pages</li>
                  <li>• $0.0008 / overage page</li>
                  <li>• 600 req/min rate limit</li>
                  <li>• 4-Hour support SLA</li>
                </ul>
              </div>
              <Button
                variant="secondary"
                size="sm"
                loading={loadingCode === "pro_monthly"}
                onClick={() => handleCheckout("sub_pro_monthly_usd")}
                className="w-full"
              >
                Subscribe Pro
              </Button>
            </div>

            {/* Self-Hosted */}
            <div className="p-5 border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] flex flex-col justify-between space-y-4 shadow-card">
              <div className="space-y-2">
                <span className="font-mono text-xs uppercase text-[var(--ink-muted)] font-bold">Perimeter</span>
                <h3 className="font-serif text-xl font-bold text-[var(--ink-primary)]">Self-Hosted</h3>
                <div className="text-2xl font-mono font-bold text-[var(--ink-primary)]">Custom License</div>
                <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                  Air-gapped deployment inside your VPC with zero outbound calls.
                </p>
                <ul className="text-xs font-mono space-y-1.5 pt-2 text-[var(--ink-secondary)]">
                  <li>• Docker Compose & Helm</li>
                  <li>• Unlimited internal pages</li>
                  <li>• Local Ollama / vLLM support</li>
                  <li>• Dedicated field engineer</li>
                </ul>
              </div>
              <Link href="/self-hosted">
                <Button variant="outline" size="sm" className="w-full">
                  Review Blueprint
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Honest FAQ */}
        <section className="space-y-4 pt-4 border-t border-[var(--line-hairline)]">
          <div className="space-y-1">
            <h2 className="text-base font-mono font-bold uppercase tracking-wider text-[var(--ink-secondary)]">
              Frequently Asked Technical Questions
            </h2>
            <p className="text-xs text-[var(--ink-muted)]">
              Direct answers without marketing evasion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqItems.map((item, idx) => (
              <div key={idx} className="p-4 border border-[var(--line-hairline)] rounded-sm bg-[var(--surface-subtle)] space-y-1.5">
                <h3 className="font-serif font-bold text-sm text-[var(--ink-primary)] flex items-start gap-1.5">
                  <span className="font-mono text-[var(--signal)]">Q:</span>
                  <span>{item.q}</span>
                </h3>
                <p className="text-xs text-[var(--ink-secondary)] leading-relaxed pl-4">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
