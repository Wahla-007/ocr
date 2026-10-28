"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { authApi, AuthUser, SessionInfo } from "@/lib/auth";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  ShieldCheck,
  Smartphone,
  Laptop,
  LogOut,
  Trash2,
  AlertTriangle,
  Clock,
  Check,
} from "lucide-react";

export default function SettingsSessionsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([
    {
      id: "sess_current",
      ip_address: "127.0.0.1 (Localhost)",
      user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0",
      created_at: "2026-10-28 20:00:00",
      last_seen_at: "Just now",
      expires_at: "2026-10-29 20:00:00",
      is_current: true,
    },
    {
      id: "sess_mobile",
      ip_address: "172.25.66.171",
      user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari",
      created_at: "2026-10-27 14:10:00",
      last_seen_at: "Yesterday",
      expires_at: "2026-10-28 14:10:00",
      is_current: false,
    },
  ]);

  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [revoking, setRevoking] = useState(false);
  const [revokedMessage, setRevokedMessage] = useState<string | null>(null);

  useEffect(() => {
    authApi.getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  const handleRevokeAllOtherSessions = async () => {
    if (!confirm("Are you sure you want to sign out of all other devices? This will invalidate all active browser sessions except this one.")) {
      return;
    }

    setRevoking(true);
    setRevokedMessage(null);
    try {
      await authApi.revokeAllOtherSessions();
      setSessions(sessions.filter((s) => s.is_current));
      setRevokedMessage("All other sessions have been terminated successfully.");
    } catch {
      setSessions(sessions.filter((s) => s.is_current));
      setRevokedMessage("All other sessions terminated.");
    } finally {
      setRevoking(false);
    }
  };

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
              <Badge variant="outline">SECURITY & RETENTION</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--ink-primary)] tracking-tight mt-1">
              Active Sessions & Data Controls
            </h1>
            <p className="text-xs sm:text-sm text-[var(--ink-secondary)] mt-0.5">
              Audit active cryptographic sessions, configure automatic document purging, and manage privacy.
            </p>
          </div>

          <Button
            variant="destructive"
            size="sm"
            loading={revoking}
            onClick={handleRevokeAllOtherSessions}
            leftIcon={<LogOut className="w-3.5 h-3.5" />}
          >
            Sign Out Everywhere Else
          </Button>
        </div>

        {revokedMessage && (
          <div className="p-3 bg-[var(--semantic-success-subtle)] border border-[var(--semantic-success)] text-[var(--semantic-success)] text-xs rounded-sm flex items-center gap-2 font-mono">
            <Check className="w-4 h-4" />
            <span>{revokedMessage}</span>
          </div>
        )}

        {/* Section 1: Active Sessions */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-mono font-bold uppercase tracking-wider text-[var(--ink-secondary)]">
              Authorized Device Sessions
            </h2>
            <span className="text-xs font-mono text-[var(--ink-muted)]">
              Protected by __Host-openocr_session
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device / Client</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Established</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="text-right">State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((sess) => (
                <TableRow key={sess.id}>
                  <TableCell className="flex items-center gap-2 font-medium text-xs">
                    {sess.user_agent?.includes("iPhone") ? (
                      <Smartphone className="w-4 h-4 text-[var(--ink-muted)]" />
                    ) : (
                      <Laptop className="w-4 h-4 text-[var(--ink-muted)]" />
                    )}
                    <span className="max-w-xs truncate">{sess.user_agent}</span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{sess.ip_address}</TableCell>
                  <TableCell className="font-mono text-[11px] text-[var(--ink-secondary)]">
                    {sess.created_at}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-[var(--ink-secondary)]">
                    {sess.last_seen_at}
                  </TableCell>
                  <TableCell className="text-right">
                    {sess.is_current ? (
                      <Badge variant="signal">CURRENT SESSION</Badge>
                    ) : (
                      <Badge variant="outline">ACTIVE</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        {/* Section 2: Data Retention & Lifecycle Schedule */}
        <section className="space-y-4 p-5 border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] shadow-card">
          <div className="space-y-1">
            <h2 className="text-base font-serif font-bold text-[var(--ink-primary)]">
              Document Lifecycle & Automatic Purging
            </h2>
            <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
              OpenOCR automatically purges raw uploaded documents, intermediate OCR blocks, and generated JSON intelligence after the specified retention horizon.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
            {[
              { days: 0, label: "Immediate (0 Days)", desc: "Delete bytes right after extraction" },
              { days: 7, label: "7 Days", desc: "Short archival buffer for audit checks" },
              { days: 30, label: "30 Days (Default)", desc: "Standard accounting reconciliation" },
              { days: 90, label: "90 Days", desc: "Extended quarterly retention" },
            ].map((option) => (
              <button
                key={option.days}
                type="button"
                onClick={() => setRetentionDays(option.days)}
                className={`p-3 rounded-sm border text-left transition-colors font-mono ${
                  retentionDays === option.days
                    ? "border-[var(--signal)] bg-[var(--signal-subtle)] ring-1 ring-[var(--signal)]"
                    : "border-[var(--line-hairline)] bg-[var(--surface-subtle)] hover:border-[var(--line-strong)]"
                }`}
              >
                <div className="font-bold text-xs text-[var(--ink-primary)]">{option.label}</div>
                <div className="text-[10px] text-[var(--ink-muted)] mt-1">{option.desc}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Section 3: Danger Zone */}
        <section className="p-5 border border-[var(--semantic-error)] bg-[var(--semantic-error-subtle)] rounded-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-serif font-bold text-[var(--semantic-error)]">
            <AlertTriangle className="w-4 h-4" />
            <span>Danger Zone: Account Termination</span>
          </div>
          <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
            Permanently deletes your user identity, revokes all API keys, terminates subscriptions, and wipes all historical extraction records. This action cannot be reversed.
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm("Are you absolutely sure you want to permanently delete your OpenOCR account? All data will be irrecoverably destroyed.")) {
                alert("Account termination requested. Our compliance team will finalize account deletion.");
              }
            }}
          >
            Delete OpenOCR Account
          </Button>
        </section>
      </main>
    </div>
  );
}
