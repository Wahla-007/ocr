"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { authApi } from "@/lib/auth";
import { CheckCircle2, AlertCircle, Mail, ArrowRight, ShieldCheck, MailCheck, RefreshCw } from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  // States: 'idle' | 'confirming' | 'verified' | 'expired' | 'invalid'
  const [state, setState] = useState<"idle" | "confirming" | "verified" | "expired" | "invalid">(
    token ? "idle" : "invalid"
  );
  const [message, setMessage] = useState<string>("");
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  // OWASP Defense: Single-use tokens are submitted via POST upon explicit human user confirmation.
  // This prevents email scanners, previewers, and spam gateways from burning tokens on GET requests.
  const handleConfirmVerification = async () => {
    if (!token) return;

    setState("confirming");
    setMessage("");

    try {
      const res = await authApi.verifyEmail(token);
      setState("verified");
      setMessage(res.message || "Your email address has been certified and verified successfully.");
    } catch (err: any) {
      if (err.code === "TOKEN_EXPIRED") {
        setState("expired");
        setMessage("This verification link has expired (lifetime: 24 hours). Please request a new link.");
      } else if (err.code === "TOKEN_USED" || err.message?.includes("already")) {
        setState("verified");
        setMessage("This email address has already been verified. You may proceed to sign in.");
      } else {
        setState("invalid");
        setMessage("The verification token is invalid or malformed. Please request a fresh link.");
      }
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail || resending) return;

    setResending(true);
    try {
      await authApi.resendVerification(resendEmail);
      setResendDone(true);
    } catch {
      setResendDone(true);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 hover:opacity-85 transition-opacity"
          title="OpenOCR Home"
        >
          <div className="h-7 w-7 rounded-[6px] bg-zinc-900 text-white dark:bg-white dark:text-black flex items-center justify-center font-mono font-bold text-xs shadow-sm">
            //
          </div>
          <span className="font-serif font-bold text-xl tracking-tight text-zinc-900 dark:text-white">
            OpenOCR
          </span>
        </Link>
        <h1 className="text-2xl font-serif font-bold tracking-tight text-zinc-900 dark:text-white pt-1">
          Email Verification
        </h1>
        <p className="text-xs text-zinc-500 dark:text-[#a1a4a5] max-w-xs mx-auto">
          Verify your email address to activate your document extraction workspace.
        </p>
      </div>

      {/* Clean Modern Card */}
      <div className="bg-white dark:bg-[#0a0a0c] border border-zinc-200 dark:border-[#292d30] rounded-2xl p-7 sm:p-9 shadow-xl shadow-zinc-200/40 dark:shadow-[0_8px_30px_rgb(0,0,0,0.6)] space-y-6">

        {/* State 1: Human Confirmation Required (Scanner Protection) */}
        {state === "idle" && (
          <div className="space-y-4 text-center py-2 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-[var(--surface-raised)] border border-[var(--line-strong)] text-[var(--ink-primary)] flex items-center justify-center mx-auto">
              <MailCheck className="w-6 h-6 text-[var(--signal)]" />
            </div>
            <div className="space-y-1">
              <h2 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                Confirm Email Verification
              </h2>
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed max-w-sm mx-auto">
                Click the action below to complete verification. Single-use tokens are submitted via POST to prevent link scanners from burning tokens.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="md"
              className="w-full"
              onClick={handleConfirmVerification}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Confirm Email Address
            </Button>
          </div>
        )}

        {/* State 2: In-Flight Confirming */}
        {state === "confirming" && (
          <div className="py-8 text-center space-y-3 animate-fade-in">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[var(--signal)]" />
            <p className="text-xs font-mono text-[var(--ink-secondary)]">
              Verifying token against cryptographic vault...
            </p>
          </div>
        )}

        {/* State 3: Successfully Verified */}
        {state === "verified" && (
          <div className="space-y-4 text-center py-2 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-[var(--semantic-success-subtle)] text-[var(--semantic-success)] border border-[var(--semantic-success)] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                Verification Sealed
              </h2>
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">{message}</p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => router.push("/login")}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Your Account
            </Button>
          </div>
        )}

        {/* State 4: Expired or Invalid Token */}
        {(state === "expired" || state === "invalid") && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-start gap-3 p-3 bg-[var(--semantic-error-subtle)] border border-[var(--semantic-error)] rounded-sm text-xs text-[var(--semantic-error)]">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{state === "expired" ? "Link Expired" : "Invalid Token"}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  {message || "The verification link is invalid, expired, or was already consumed."}
                </p>
              </div>
            </div>

            {/* Resend Verification Sub-Form */}
            <div className="p-4 border border-[var(--line-hairline)] rounded-sm bg-[var(--surface-subtle)] space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--ink-primary)]">
                Request Fresh Verification Link
              </h3>
              {resendDone ? (
                <p className="text-xs text-[var(--semantic-success)] font-medium">
                  A new verification link has been dispatched to your email address if registered.
                </p>
              ) : (
                <form onSubmit={handleResend} className="space-y-3">
                  <Input
                    label="Email Address"
                    type="email"
                    required
                    placeholder="archivist@organization.gov"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    disabled={resending}
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    loading={resending}
                    className="w-full"
                  >
                    Resend Verification Email
                  </Button>
                </form>
              )}
            </div>

            <div className="pt-2 text-center">
              <Link href="/login" className="text-xs text-[var(--signal)] hover:underline font-medium">
                Return to Sign In Desk
              </Link>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-[var(--line-hairline)] text-center">
          <span className="text-[11px] font-mono text-[var(--ink-muted)]">
            OpenOCR Archival Trust & Security Protocol
          </span>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-zinc-50/50 dark:bg-[#000000] text-zinc-900 dark:text-white transition-colors relative overflow-hidden">
      {/* Subtle Ambient Violet Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-purple-500/10 dark:bg-[#9281f7]/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="w-full max-w-[420px] space-y-6 relative z-10">
        <Suspense fallback={<div className="text-xs font-mono text-zinc-400">Loading verification details...</div>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
