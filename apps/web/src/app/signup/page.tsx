"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { authApi, evaluatePasswordStrength } from "@/lib/auth";
import { ArrowRight, CheckCircle2, AlertCircle, ShieldCheck, MailCheck } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Hidden bot honeypot

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const strength = evaluatePasswordStrength(password, email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent double submit

    setErrorMsg(null);
    setSuccessMsg(null);

    if (password.length < 12) {
      setErrorMsg("Password must be at least 12 characters long per NIST SP 800-63B guidelines.");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.signup(email, password, honeypot || undefined);
      setSuccessMsg(
        res.message || "Registration recorded! A verification link has been dispatched to your email inbox."
      );
    } catch (err: any) {
      setErrorMsg(err.message || "Registration could not be completed. Please verify your details.");
    } finally {
      setLoading(false);
    }
  };

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
            The Front Desk: Registration
          </h1>
          <p className="text-xs text-[var(--ink-secondary)] max-w-xs mx-auto">
            Establish your archival workspace and developer extraction credentials.
          </p>
        </div>

        {/* Archival Docket Card */}
        <div className="bg-[var(--surface-base)] border border-[var(--line-strong)] rounded-sm p-6 sm:p-8 shadow-card relative registration-mark registration-mark-tl registration-mark-tr registration-mark-bl registration-mark-br">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line-hairline)] mb-5">
            <span className="font-mono text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-wider">
              DOCKET NO. OCR-REG-01
            </span>
            <span className="archival-stamp text-[var(--semantic-info)]">UNVERIFIED</span>
          </div>

          {successMsg ? (
            <div className="space-y-4 text-center animate-fade-in py-4">
              <div className="w-12 h-12 rounded-full bg-[var(--semantic-success-subtle)] text-[var(--semantic-success)] border border-[var(--semantic-success)] flex items-center justify-center mx-auto">
                <MailCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                  Verification Link Dispatched
                </h3>
                <p className="text-xs text-[var(--ink-secondary)] leading-relaxed max-w-sm mx-auto">
                  {successMsg}
                </p>
              </div>
              <div className="p-3 bg-[var(--surface-subtle)] border border-[var(--line-hairline)] rounded-sm text-xs text-[var(--ink-secondary)] font-mono text-left space-y-1">
                <div className="flex items-center gap-1 font-semibold text-[var(--ink-primary)]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--semantic-success)]" />
                  <span>Postmark Protocol</span>
                </div>
                <p className="text-[11px]">
                  Open the link in your inbox. To prevent automated scanner consumption, you will be asked to confirm verification via a single click.
                </p>
              </div>
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={() => router.push("/login")}>
                  Return to Sign In
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Bot Honeypot */}
              <div className="hidden" aria-hidden="true">
                <input
                  type="text"
                  name="user_reg_hp"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              <Input
                label="Organization / Personal Email"
                type="email"
                required
                autoComplete="email"
                placeholder="developer@acme.corp"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />

              <div className="space-y-2">
                <Input
                  label="Master Passphrase"
                  isPassword
                  required
                  autoComplete="new-password"
                  placeholder="At least 12 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />

                {/* NIST SP 800-63B Passphrase Strength Meter */}
                {password && (
                  <div className="space-y-1.5 p-2.5 bg-[var(--surface-subtle)] border border-[var(--line-hairline)] rounded-sm">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[11px] text-[var(--ink-secondary)]">Passphrase Strength:</span>
                      <span className="font-mono text-[11px] font-bold text-[var(--ink-primary)]">
                        {strength.label}
                      </span>
                    </div>
                    {/* Visual 4-Segment Bar */}
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
                className="w-full"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Create OpenOCR Account
              </Button>

              {/* Data & Privacy Statement */}
              <div className="pt-3 border-t border-[var(--line-hairline)] space-y-2 text-center">
                <p className="text-[11px] text-[var(--ink-muted)] leading-relaxed">
                  By registering, you agree to our fair usage and privacy terms. OpenOCR stores zero raw document bytes in application logs and purges processed data per your tier schedule.
                </p>
                <p className="text-xs text-[var(--ink-secondary)]">
                  Already have an account?{" "}
                  <Link href="/login" className="text-[var(--signal)] hover:underline font-medium">
                    Sign in here
                  </Link>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
