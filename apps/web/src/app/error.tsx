"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const requestId = "req_err_" + (error.digest || Math.random().toString(36).substring(2, 10));

  useEffect(() => {
    // Log exception strictly with metadata, never leaking document content
    console.error("OpenOCR Uncaught Client Exception:", {
      message: error.message,
      digest: error.digest,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--surface-base)] text-[var(--ink-primary)] transition-colors light-table-grid select-none">
      <div className="w-full max-w-md p-8 border border-[var(--semantic-error)] rounded-sm bg-[var(--surface-base)] shadow-card relative registration-mark registration-mark-tl registration-mark-tr registration-mark-bl registration-mark-br space-y-5 text-center">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line-hairline)]">
          <span className="font-mono text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-wider">
            INCIDENT DOCKET NO. ERR-500
          </span>
          <span className="archival-stamp text-[var(--semantic-error)]">MALFUNCTION</span>
        </div>

        <div className="w-14 h-14 rounded-full bg-[var(--semantic-error-subtle)] border border-[var(--semantic-error)] text-[var(--semantic-error)] flex items-center justify-center mx-auto shadow-subtle">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl font-serif font-bold text-[var(--ink-primary)] tracking-tight">
            Equipment Malfunction
          </h1>
          <p className="text-xs text-[var(--ink-secondary)] leading-relaxed max-w-sm mx-auto">
            An unexpected error interrupted processing. To protect document privacy, raw stack details are suppressed.
          </p>
        </div>

        <div className="p-2.5 bg-[var(--surface-sunken)] border border-[var(--line-hairline)] rounded-sm font-mono text-[11px] text-[var(--ink-muted)] flex items-center justify-between">
          <span>Audit Incident ID:</span>
          <span className="font-bold text-[var(--ink-primary)]">{requestId}</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => reset()}
            className="w-full sm:w-auto"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Re-Calibrate & Retry
          </Button>
          <Link href="/" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full sm:w-auto" leftIcon={<Home className="w-3.5 h-3.5" />}>
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
