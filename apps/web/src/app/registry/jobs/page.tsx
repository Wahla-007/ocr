"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FileText, ArrowRight, Check, Clock, AlertCircle, ExternalLink } from "lucide-react";

interface JobItem {
  id: string;
  filename: string;
  status: "done" | "queued" | "failed";
  doc_type: string;
  pages: number;
  confidence: number;
  latency_ms: number;
  created_at: string;
}

export default function JobsHistoryPage() {
  const [jobs, setJobs] = useState<JobItem[]>([
    {
      id: "job_91a02f81c4e2",
      filename: "Acme_Invoice_4092.pdf",
      status: "done",
      doc_type: "invoice",
      pages: 2,
      confidence: 0.99,
      latency_ms: 48,
      created_at: "2026-10-28 21:04:12",
    },
    {
      id: "job_88e411b029a1",
      filename: "Q3_Financial_Statement.pdf",
      status: "done",
      doc_type: "report",
      pages: 4,
      confidence: 0.97,
      latency_ms: 82,
      created_at: "2026-10-28 20:55:01",
    },
    {
      id: "job_77c102fa9102",
      filename: "Equipment_Lease_Agreement.pdf",
      status: "done",
      doc_type: "contract",
      pages: 1,
      confidence: 0.98,
      latency_ms: 36,
      created_at: "2026-10-23 18:12:44",
    },
  ]);

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--ink-primary)] transition-colors">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line-strong)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[var(--signal)] font-bold tracking-wider uppercase">
                The Registry
              </span>
              <Badge variant="outline">AUDIT ARCHIVE</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--ink-primary)] tracking-tight mt-1">
              Job Docket & Extraction History
            </h1>
            <p className="text-xs sm:text-sm text-[var(--ink-secondary)] mt-0.5">
              Historical ledger of processed documents, latency measurements, and intelligence outputs.
            </p>
          </div>

          <Link href="/">
            <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Open Light Table
            </Button>
          </Link>
        </div>

        {/* Jobs Table */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-mono font-bold uppercase tracking-wider text-[var(--ink-secondary)]">
              Historical Extractions
            </h2>
            <span className="text-xs font-mono text-[var(--ink-muted)]">
              {jobs.length} Entries Recorded
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Docket / Job ID</TableHead>
                <TableHead>Document File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Pages</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Timestamp (UTC)</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-mono text-xs font-bold text-[var(--ink-primary)]">
                    {job.id}
                  </TableCell>
                  <TableCell className="font-medium text-xs flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[var(--signal)]" />
                    <span>{job.filename}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={job.status === "done" ? "success" : "default"}>
                      {job.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize text-xs font-mono text-[var(--ink-secondary)]">
                    {job.doc_type}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {job.pages}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">
                    <Badge confidence={job.confidence}>
                      {Math.round(job.confidence * 100)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums text-[var(--ink-muted)]">
                    {job.latency_ms}ms
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-[var(--ink-secondary)]">
                    {job.created_at}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href="/">
                      <Button variant="outline" size="xs" rightIcon={<ExternalLink className="w-3 h-3" />}>
                        Inspect
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </main>
    </div>
  );
}
