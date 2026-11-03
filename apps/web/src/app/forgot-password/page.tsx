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
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-zinc-50/50 dark:bg-[#000000] text-zinc-900 dark:text-white transition-colors relative overflow-hidden">
      {/* Subtle Ambient Violet Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-purple-500/10 dark:bg-[#9281f7]/10 blur-[130px] pointer-events-none rounded-full" />

      <div className="w-full max-w-[420px] space-y-6 relative z-10">
        {/* Brand Header */}
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
            Reset your password
          </h1>
          <p className="text-xs text-zinc-500 dark:text-[#a1a4a5] max-w-xs mx-auto">
            We will send a single-use password recovery link to your registered email address.
          </p>
        </div>

        {/* Clean Modern Auth Card */}
        <div className="bg-white dark:bg-[#0a0a0c] border border-zinc-200 dark:border-[#292d30] rounded-2xl p-7 sm:p-9 shadow-xl shadow-zinc-200/40 dark:shadow-[0_8px_30px_rgb(0,0,0,0.6)]">
          {submitted ? (
            <div className="space-y-4 text-center py-2 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-[#3ad389] border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-bold text-zinc-900 dark:text-white">
                  Recovery Link Dispatched
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  If an active account is registered with <strong className="text-zinc-900 dark:text-white font-mono">{email}</strong>, a secure 15-minute recovery token has been sent.
                </p>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-[#08080a] border border-zinc-200 dark:border-[#292d30] rounded-[8px] text-xs text-zinc-600 dark:text-zinc-400 font-mono text-left space-y-1">
                <div className="flex items-center gap-1 font-semibold text-zinc-900 dark:text-white">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#3ad389]" />
                  <span>Session Security Notice</span>
                </div>
                <p className="text-[11px]">
                  Completing a password reset terminates all existing active sessions across all devices immediately.
                </p>
              </div>

              <div className="pt-2">
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Return to Sign In
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
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />

              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-[8px] text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                className="w-full py-2.5 rounded-[8px] font-medium"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Send Recovery Link
              </Button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-[#a1a4a5] hover:text-zinc-900 dark:hover:text-white font-medium transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
              </div>
            </form>
          )}

          <div className="pt-3 border-t border-zinc-200 dark:border-[#292d30] text-center">
            <span className="text-[11px] font-mono text-zinc-400 dark:text-[#6e727a]">
              Anti-Enumeration Protected • Single-Use Token
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
