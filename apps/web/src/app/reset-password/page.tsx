"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { authApi, evaluatePasswordStrength } from "@/lib/auth";
import { CheckCircle2, AlertCircle, ShieldCheck, ArrowRight, KeyRound } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();

  const [token, setToken] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // 1. Strict Referrer Policy (prevent token leakage in referer headers)
    const meta = document.createElement("meta");
    meta.name = "referrer";
    meta.content = "no-referrer";
    document.head.appendChild(meta);

    // 2. Read single-use token and immediately strip from address bar and history
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const rawToken = params.get("token");
      if (rawToken) {
        setToken(rawToken);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        setErrorMsg("Missing or invalid password reset token. Please request a new recovery dispatch.");
      }
    }
  }, []);

  const strength = evaluatePasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !token) return;

    setErrorMsg(null);
    if (newPassword.length < 12) {
      setErrorMsg("New passphrase must be at least 12 characters long per NIST SP 800-63B standards.");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.resetPassword(token, newPassword);
      setSuccessMsg(
        res.message || "Passphrase updated successfully. All other active sessions have been terminated."
      );
    } catch (err: any) {
      setErrorMsg(
        err.message || "Failed to update passphrase. The recovery token may be expired or already consumed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {successMsg ? (
        <div className="space-y-4 text-center py-4 animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-[var(--semantic-success-subtle)] text-[var(--semantic-success)] border border-[var(--semantic-success)] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
              New Master Key Issued
            </h2>
            <p className="text-xs text-[var(--ink-secondary)] leading-relaxed max-w-sm mx-auto">
              {successMsg}
            </p>
          </div>

          <div className="p-3 bg-[var(--surface-subtle)] border border-[var(--line-hairline)] rounded-sm text-xs text-[var(--ink-secondary)] font-mono text-left space-y-1">
            <div className="flex items-center gap-1 font-semibold text-[var(--ink-primary)]">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--semantic-success)]" />
              <span>Full Device Signout Enforced</span>
            </div>
            <p className="text-[11px]">
              All previously active browser sessions and API tokens have been invalidated for your security.
            </p>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => router.push("/login")}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In with New Passphrase
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Input
              label="New Master Passphrase"
              isPassword
              required
              autoComplete="new-password"
              placeholder="Minimum 12 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading || !token}
            />

            {/* NIST Passphrase Strength Meter */}
            {newPassword && (
              <div className="space-y-1.5 p-2.5 bg-[var(--surface-subtle)] border border-[var(--line-hairline)] rounded-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-[var(--ink-secondary)]">Strength:</span>
                  <span className="font-mono text-[11px] font-bold text-[var(--ink-primary)]">
                    {strength.label}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 h-1.5">
                  {[1, 2, 3, 4].map((seg) => (
                    <div
                      key={seg}
                      className={`h-full rounded-sm transition-colors ${
                        strength.score >= seg ? strength.colorClass : "bg-[var(--line-hairline)]"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-[var(--ink-muted)] leading-tight">{strength.feedback}</p>
              </div>
            )}
          </div>

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
            disabled={!token}
            className="w-full"
            rightIcon={<KeyRound className="w-4 h-4" />}
          >
            Issue New Passphrase
          </Button>

          <div className="pt-2 text-center">
            <Link href="/login" className="text-xs text-[var(--signal)] hover:underline font-medium">
              Cancel and Return to Sign In
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-zinc-50/50 dark:bg-[#000000] text-zinc-900 dark:text-white transition-colors relative overflow-hidden">
      {/* Subtle Ambient Violet Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-purple-500/10 dark:bg-[#9281f7]/10 blur-[130px] pointer-events-none rounded-full" />

      <div className="w-full max-w-[420px] space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 hover:opacity-85 transition-opacity"
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
            Choose a new password
          </h1>
          <p className="text-xs text-zinc-500 dark:text-[#a1a4a5] max-w-xs mx-auto">
            Establish a new master password for your document extraction account.
          </p>
        </div>

        <div className="bg-white dark:bg-[#0a0a0c] border border-zinc-200 dark:border-[#292d30] rounded-2xl p-7 sm:p-9 shadow-xl shadow-zinc-200/40 dark:shadow-[0_8px_30px_rgb(0,0,0,0.6)] space-y-5">
          <ResetPasswordForm />

          <div className="pt-3 border-t border-zinc-200 dark:border-[#292d30] text-center">
            <span className="text-[11px] font-mono text-zinc-400 dark:text-[#6e727a]">
              Referrer-Policy: no-referrer • Zero URL History Footprint
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
