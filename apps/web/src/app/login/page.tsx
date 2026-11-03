"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { authApi, validateInternalRedirect } from "@/lib/auth";
import { ArrowRight, AlertCircle, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [nextParam, setNextParam] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setNextParam(params.get("next"));
    }
  }, []);

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
    if (!email.trim() || !password) {
      setErrorMsg("Please enter both your email address and password.");
      return;
    }

    setErrorMsg(null);
    setResendStatus(null);
    setLoading(true);

    try {
      const user = await authApi.login(email.trim(), password, rememberMe, honeypot || undefined);
      // Specific logic: if logging in with admin credentials, automatically show the Admin Dashboard
      if (user.is_admin) {
        router.push("/admin/support");
      } else {
        // Validate internal destination to prevent open-redirect phishing
        const target = validateInternalRedirect(nextParam, "/");
        router.push(target);
      }
    } catch (err: any) {
      let displayMsg = "Invalid email or password credentials.";
      if (typeof err?.message === "string" && err.message.trim() && err.message !== "[object Object]") {
        displayMsg = err.message;
      }

      if (err.status === 429) {
        const retry = err.retryAfter ? ` Please wait ${err.retryAfter} seconds.` : "";
        setErrorMsg(`Too many authentication attempts.${retry}`);
      } else if (err.code === "EMAIL_NOT_VERIFIED") {
        setErrorMsg("Please verify your email address before signing in.");
      } else if (err.code === "ACCOUNT_LOCKED" || err.status === 423) {
        setErrorMsg("Account is temporarily locked. Please try again in 15 minutes.");
      } else if (err.status === 401) {
        setErrorMsg("Invalid email or password credentials.");
      } else {
        setErrorMsg(displayMsg);
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
        {/* Header / Brand */}
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
            Sign in to your account
          </h1>
          <p className="text-xs text-zinc-500 dark:text-[#a1a4a5] max-w-xs mx-auto">
            Access your document extraction workspaces and private API keys.
          </p>
        </div>

        {/* Clean Modern Auth Card */}
        <div className="bg-white dark:bg-[#0a0a0c] border border-zinc-200 dark:border-[#292d30] rounded-2xl p-7 sm:p-9 shadow-xl shadow-zinc-200/40 dark:shadow-[0_8px_30px_rgb(0,0,0,0.6)]">
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
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />

            <div className="space-y-1.5">
              <Input
                label="Password"
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
                    className="w-4 h-4 rounded-[4px] border-zinc-300 dark:border-zinc-700 text-purple-600 dark:text-[#9281f7] focus:ring-purple-500 accent-purple-600 dark:accent-[#9281f7] cursor-pointer"
                  />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">Remember for 14 days</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-[#9281f7] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-[8px] text-xs text-red-600 dark:text-red-400 flex flex-col gap-1.5 animate-fade-in">
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
              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 rounded-[8px] text-xs text-purple-700 dark:text-purple-300 flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-600 dark:text-[#9281f7] shrink-0" />
                <span>{resendStatus}</span>
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
              Sign In
            </Button>

            {/* Security Pledge & Switch to Signup */}
            <div className="pt-4 border-t border-zinc-200 dark:border-[#292d30] text-center">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-purple-600 dark:text-[#9281f7] hover:underline font-medium">
                  Create an account
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
