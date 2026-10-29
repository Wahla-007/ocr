import React from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FileQuestion, ArrowRight, Home, BookOpen } from "lucide-react";

export default function NotFound() {
  const requestId = "req_404_" + Math.random().toString(36).substring(2, 10);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface-base)] text-[var(--ink-primary)] transition-colors light-table-grid">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto space-y-6">
        <div className="p-8 border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] shadow-card relative registration-mark registration-mark-tl registration-mark-tr registration-mark-bl registration-mark-br space-y-5 w-full">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line-hairline)]">
            <span className="font-mono text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-wider">
              DOCKET NO. ERR-404
            </span>
            <span className="archival-stamp text-[var(--semantic-error)]">MISFILED RECORD</span>
          </div>

          <div className="w-14 h-14 rounded-full bg-[var(--surface-raised)] border border-[var(--line-strong)] text-[var(--ink-primary)] flex items-center justify-center mx-auto shadow-subtle">
            <FileQuestion className="w-7 h-7 text-[var(--signal)]" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-serif font-bold text-[var(--ink-primary)] tracking-tight">
              The Missing File: Record Not Found
            </h1>
            <p className="text-xs text-[var(--ink-secondary)] leading-relaxed max-w-sm mx-auto">
              The requested archival path or ledger docket does not exist in this catalog index. It may have been relocated or purged under the retention schedule.
            </p>
          </div>

          <div className="p-2.5 bg-[var(--surface-sunken)] border border-[var(--line-hairline)] rounded-sm font-mono text-[11px] text-[var(--ink-muted)] flex items-center justify-between">
            <span>Audit Trace Reference:</span>
            <span className="font-bold text-[var(--ink-primary)]">{requestId}</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="primary" size="sm" className="w-full sm:w-auto" leftIcon={<Home className="w-3.5 h-3.5" />}>
                Return to Light Table
              </Button>
            </Link>
            <Link href="/docs" className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full sm:w-auto" leftIcon={<BookOpen className="w-3.5 h-3.5" />}>
                Open Documentation
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
