"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { authApi } from "@/lib/auth";
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, KeyRound, ShieldCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setErrorMsg(null);
    setLoading(true);

    try {
      await authApi.forgotPassword(email, honeypot || undefined);
      setSubmitted(true);
    } catch (err: any) {
      // Anti-enumeration: Even on failure, show submission unless critical rate limit
      if (err.status === 429) {
        setErrorMsg("Too many recovery attempts. Please wait a few minutes before trying again.");
      } else {
        setSubmitted(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[var(--surface-base)] text-[var(--ink-primary)] transition-colors light-table-grid">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 hover:opacity-85 transition-opacity"
            title="OpenOCR Home"
          >
            <div className="h-7 w-7 rounded-sm bg-[var(--ink-primary)] text-[var(--surface-base)] flex items-center justify-center font-mono font-bold text-xs shadow-subtle">
              //
            </div>
            <span className="font-serif font-bold text-lg tracking-tight text-[var(--ink-primary)]">
              OpenOCR
            </span>
          </Link>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-[var(--ink-primary)]">
            The Key Exchange: Recovery
          </h1>
          <p className="text-xs text-[var(--ink-secondary)] max-w-xs mx-auto">
            Dispatch a single-use credential recovery token to your registered email address.
          </p>
        </div>

        {/* Archival Docket Card */}
        <div className="bg-[var(--surface-base)] border border-[var(--line-strong)] rounded-sm p-6 sm:p-8 shadow-card relative registration-mark registration-mark-tl registration-mark-tr registration-mark-bl registration-mark-br space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line-hairline)]">
            <span className="font-mono text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-wider">
              DOCKET NO. OCR-REC-01
            </span>
            <span className="archival-stamp text-[var(--semantic-warning)]">RECOVERY</span>
          </div>

          {submitted ? (
            <div className="space-y-4 text-center py-3 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-[var(--semantic-success-subtle)] text-[var(--semantic-success)] border border-[var(--semantic-success)] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                  Recovery Dispatch Initiated
                </h3>
                <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                  If an active account is registered with <strong className="text-[var(--ink-primary)] font-mono">{email}</strong>, a secure 15-minute recovery token has been dispatched.
                </p>
              </div>

              <div className="p-3 bg-[var(--surface-subtle)] border border-[var(--line-hairline)] rounded-sm text-xs text-[var(--ink-secondary)] font-mono text-left space-y-1">
                <div className="flex items-center gap-1 font-semibold text-[var(--ink-primary)]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--semantic-success)]" />
                  <span>Session Security Notice</span>
                </div>
                <p className="text-[11px]">
                  Completing password reset will terminate all existing active sessions across all devices immediately.
                </p>
              </div>

              <div className="pt-2">
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Return to Sign In Desk
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Bot Honeypot */}
              <div className="hidden" aria-hidden="true">
                <input
                  type="text"
                  name="user_rec_hp"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              <Input
                label="Registered Email Address"
                type="email"
                required
                autoComplete="email"
                placeholder="archivist@organization.gov"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />

              {errorMsg && (
                <div className="p-3 bg-[var(--semantic-error-subtle)] border border-[var(--semantic-error)] rounded-sm text-xs text-[var(--semantic-error)] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                className="w-full"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Send Recovery Dispatch
              </Button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In Desk
                </Link>
              </div>
            </form>
          )}

          <div className="pt-3 border-t border-[var(--line-hairline)] text-center">
            <span className="text-[11px] font-mono text-[var(--ink-muted)]">
              OWASP ASVS Level 2 Anti-Enumeration Protection
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
