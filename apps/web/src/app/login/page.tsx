"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { authApi, validateInternalRedirect } from "@/lib/auth";
import { ArrowRight, AlertCircle, ShieldCheck, Mail } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const handleResend = async () => {
    if (!email) return;
    try {
      await authApi.resendVerification(email);
      setResendStatus("A new verification dispatch was sent to your email address.");
    } catch {
      setResendStatus("Verification link dispatched if account is registered and unverified.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent double submit

    setErrorMsg(null);
    setResendStatus(null);
    setLoading(true);

    try {
      await authApi.login(email, password, rememberMe, honeypot || undefined);
      // Validate internal destination to prevent open-redirect phishing
      const target = validateInternalRedirect(nextParam, "/");
      router.push(target);
    } catch (err: any) {
      // Anti-enumeration: uniform generic message unless deliberate lockout
      if (err.status === 429) {
        const retry = err.retryAfter ? ` Please wait ${err.retryAfter} seconds.` : "";
        setErrorMsg(`Too many authentication attempts.${retry}`);
      } else if (err.code === "EMAIL_NOT_VERIFIED") {
        setErrorMsg("Please verify your email address before signing in.");
      } else {
        setErrorMsg("Invalid email or password credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Bot Honeypot */}
      <div className="hidden" aria-hidden="true">
        <input
          type="text"
          name="user_note_hp"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <Input
        label="Email Address"
        type="email"
        required
        autoComplete="email"
        placeholder="archivist@organization.gov"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />

      <div className="space-y-1">
        <Input
          label="Passphrase"
          isPassword
          required
          autoComplete="current-password"
          placeholder="••••••••••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loading}
              className="rounded-sm border-[var(--line-strong)] text-[var(--signal)] focus:ring-[var(--focus-ring)] accent-[var(--signal)]"
            />
            <span className="text-xs text-[var(--ink-secondary)]">Remember session (14 days)</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-xs text-[var(--ink-muted)] hover:text-[var(--signal)] transition-colors"
          >
            Forgot passphrase?
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-[var(--semantic-error-subtle)] border border-[var(--semantic-error)] rounded-sm text-xs text-[var(--semantic-error)] flex flex-col gap-1.5 animate-fade-in">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          {errorMsg.includes("verify your email") && (
            <button
              type="button"
              onClick={handleResend}
              className="text-left underline hover:opacity-85 font-mono text-[11px] pt-1"
            >
              Resend verification link to {email}
            </button>
          )}
        </div>
      )}

      {resendStatus && (
        <div className="p-3 bg-[var(--surface-raised)] border border-[var(--line-strong)] rounded-sm text-xs text-[var(--ink-secondary)] flex items-center gap-2">
          <Mail className="w-4 h-4 text-[var(--semantic-success)] shrink-0" />
          <span>{resendStatus}</span>
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
        Sign In to Light Table
      </Button>

      {/* Archival Security Pledge */}
      <div className="pt-4 border-t border-[var(--line-hairline)] text-center space-y-2">
        <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--ink-muted)] font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--semantic-success)]" />
          <span>HttpOnly Session • Anti-Enumeration • Zero Log Retention</span>
        </div>
        <p className="text-xs text-[var(--ink-secondary)]">
          Need a workspace?{" "}
          <Link href="/signup" className="text-[var(--signal)] hover:underline font-medium">
            Register new account
          </Link>
        </p>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[var(--surface-base)] text-[var(--ink-primary)] transition-colors light-table-grid">
      <div className="w-full max-w-md space-y-6">
        {/* Header / Brand */}
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
            The Front Desk: Authentication
          </h1>
          <p className="text-xs text-[var(--ink-secondary)] max-w-xs mx-auto">
            Access your secure document extraction deck and private keyset registry.
          </p>
        </div>

        {/* Archival Docket Card */}
        <div className="bg-[var(--surface-base)] border border-[var(--line-strong)] rounded-sm p-6 sm:p-8 shadow-card relative registration-mark registration-mark-tl registration-mark-tr registration-mark-bl registration-mark-br">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line-hairline)] mb-5">
            <span className="font-mono text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-wider">
              DOCKET NO. OCR-AUTH-01
            </span>
            <Badge variant="outline">RESTRICTED</Badge>
          </div>

          <Suspense fallback={<div className="h-48 flex items-center justify-center text-xs text-[var(--ink-muted)]">Loading credentials desk...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
