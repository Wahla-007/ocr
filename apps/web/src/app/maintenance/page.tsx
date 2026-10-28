import React from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Clock, ShieldCheck, Home } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface-base)] text-[var(--ink-primary)] transition-colors light-table-grid select-none">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto space-y-6">
        <div className="p-8 border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] shadow-card relative registration-mark registration-mark-tl registration-mark-tr registration-mark-bl registration-mark-br space-y-5 w-full">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line-hairline)]">
            <span className="font-mono text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-wider">
              OPERATIONS BULLETIN
            </span>
            <span className="archival-stamp text-[var(--semantic-warning)]">MAINTENANCE DECK</span>
          </div>

          <div className="w-14 h-14 rounded-full bg-[var(--surface-raised)] border border-[var(--line-strong)] text-[var(--ink-primary)] flex items-center justify-center mx-auto shadow-subtle">
            <Clock className="w-7 h-7 text-[var(--signal)]" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-serif font-bold text-[var(--ink-primary)] tracking-tight">
              Scheduled Infrastructure Calibration
            </h1>
            <p className="text-xs text-[var(--ink-secondary)] leading-relaxed max-w-sm mx-auto">
              The extraction pipeline is currently undergoing scheduled cryptographic key rotation and database optimization. Programmatic API jobs are paused.
            </p>
          </div>

          <div className="p-3 bg-[var(--surface-subtle)] border border-[var(--line-hairline)] rounded-sm font-mono text-[11px] text-[var(--ink-secondary)] text-left space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[var(--ink-primary)]">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--semantic-success)]" />
              <span>Integrity Guarantee</span>
            </div>
            <p className="text-[11px]">
              No in-flight documents or queue jobs will be lost. Workers will resume processing automatically once calibration completes.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/">
              <Button variant="outline" size="sm" leftIcon={<Home className="w-3.5 h-3.5" />}>
                Return to Home Deck
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
