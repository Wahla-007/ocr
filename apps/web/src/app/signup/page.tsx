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
            Create your account
          </h1>
          <p className="text-xs text-zinc-500 dark:text-[#a1a4a5] max-w-xs mx-auto">
            Establish your document intelligence workspace and developer API keys.
          </p>
        </div>

        {/* Clean Modern Auth Card */}
        <div className="bg-white dark:bg-[#0a0a0c] border border-zinc-200 dark:border-[#292d30] rounded-2xl p-7 sm:p-9 shadow-xl shadow-zinc-200/40 dark:shadow-[0_8px_30px_rgb(0,0,0,0.6)]">
          {successMsg ? (
            <div className="space-y-4 text-center animate-fade-in py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-[#3ad389] border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center mx-auto">
                <MailCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-bold text-zinc-900 dark:text-white">
                  Verification Link Dispatched
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
                  {successMsg}
                </p>
              </div>
              <div className="p-3 bg-zinc-50 dark:bg-[#08080a] border border-zinc-200 dark:border-[#292d30] rounded-[8px] text-xs text-zinc-600 dark:text-zinc-400 font-mono text-left space-y-1">
                <div className="flex items-center gap-1 font-semibold text-zinc-900 dark:text-white">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#3ad389]" />
                  <span>Secure Email Verification</span>
                </div>
                <p className="text-[11px]">
                  Click the link in your email inbox to verify your account and activate your private workspace.
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
                label="Email Address"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />

              <div className="space-y-2">
                <Input
                  label="Password"
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
                  <div className="space-y-1.5 p-3 bg-zinc-50 dark:bg-[#08080a] border border-zinc-200 dark:border-[#292d30] rounded-[8px]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Password Strength:</span>
                      <span className="font-mono text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
                        {strength.label}
                      </span>
                    </div>
                    {/* Visual 4-Segment Bar */}
                    <div className="grid grid-cols-4 gap-1 h-1.5">
                      {[1, 2, 3, 4].map((seg) => (
                        <div
                          key={seg}
                          className={`h-full rounded-full transition-colors ${
                            strength.score >= seg ? strength.colorClass : "bg-zinc-200 dark:bg-zinc-800"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">{strength.feedback}</p>
                  </div>
                )}
              </div>

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
                Create Account
              </Button>

              {/* Data & Privacy Statement */}
              <div className="pt-3 border-t border-zinc-200 dark:border-[#292d30] space-y-2 text-center">
                <p className="text-[11px] text-zinc-400 dark:text-[#6e727a] leading-relaxed">
                  By registering, you agree to our fair usage terms. OpenOCR stores zero raw document bytes in server logs.
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Already have an account?{" "}
                  <Link href="/login" className="text-purple-600 dark:text-[#9281f7] hover:underline font-medium">
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
