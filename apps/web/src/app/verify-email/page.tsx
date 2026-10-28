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
          <div className="h-7 w-7 rounded-sm bg-[var(--ink-primary)] text-[var(--surface-base)] flex items-center justify-center font-mono font-bold text-xs shadow-subtle">
            //
          </div>
          <span className="font-serif font-bold text-lg tracking-tight text-[var(--ink-primary)]">
            OpenOCR
          </span>
        </Link>
        <h1 className="text-2xl font-serif font-bold tracking-tight text-[var(--ink-primary)]">
          The Postmark: Email Verification
        </h1>
        <p className="text-xs text-[var(--ink-secondary)]">
          Archival verification desk for identity validation.
        </p>
      </div>

      {/* The Postmark Stamp Card */}
      <div className="bg-[var(--surface-base)] border border-[var(--line-strong)] rounded-sm p-6 sm:p-8 shadow-card relative registration-mark registration-mark-tl registration-mark-tr registration-mark-bl registration-mark-br space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line-hairline)]">
          <span className="font-mono text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-wider">
            POSTMARK DOCKET #OCR-VRF
          </span>
          {state === "verified" && (
            <span className="archival-stamp text-[var(--semantic-success)]">VERIFIED</span>
          )}
          {state === "idle" && (
            <span className="archival-stamp text-[var(--semantic-info)]">PENDING POST</span>
          )}
          {state === "confirming" && (
            <span className="archival-stamp text-[var(--signal)]">CONFIRMING...</span>
          )}
          {(state === "expired" || state === "invalid") && (
            <span className="archival-stamp text-[var(--semantic-error)]">VOID</span>
          )}
        </div>

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
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[var(--surface-base)] text-[var(--ink-primary)] transition-colors light-table-grid">
      <Suspense fallback={<div className="text-xs font-mono text-[var(--ink-muted)]">Loading postmark docket...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
