"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { authApi, AuthUser } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  AlertCircle,
  ExternalLink,
  Code2,
  Terminal,
  FileCode,
  Zap,
  ArrowRight,
  Lock,
  Sparkles,
  Layers,
  ChevronRight,
  Shield,
  Clock,
} from "lucide-react";

interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  last_four: string;
  created_at: string;
  last_used_at?: string | null;
  rate_limit: number;
}

export default function ApiPlatformPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingKeys, setLoadingKeys] = useState(false);

  // Modals & User Flow State
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [showTierPrompt, setShowTierPrompt] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);

  // Form & Secret State
  const [newKeyName, setNewKeyName] = useState("");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Code sample tab
  const [activeCodeTab, setActiveCodeTab] = useState<"curl" | "python" | "typescript">("curl");
  const [copiedCode, setCopiedCode] = useState(false);

  // Check login and load keys
  useEffect(() => {
    async function loadUserData() {
      try {
        const user = await authApi.getCurrentUser();
        setCurrentUser(user);
        if (user && user.plan !== "free") {
          fetchKeys();
        }
      } catch {
        setCurrentUser(null);
      } finally {
        setLoadingUser(false);
      }
    }
    loadUserData();
  }, []);

  const fetchKeys = async () => {
    setLoadingKeys(true);
    try {
      const data = await apiClient<ApiKeyItem[]>("/v1/keys");
      setKeys(Array.isArray(data) ? data : []);
    } catch {
      // If no backend keys, retain empty list
      setKeys([]);
    } finally {
      setLoadingKeys(false);
    }
  };

  // Plan verification helper
  const hasApiAccess = (user: AuthUser | null) => {
    if (!user) return false;
    if (user.is_admin) return true;
    const plan = (user.plan || "").toLowerCase();
    return plan === "starter" || plan === "pro" || plan === "business" || plan === "developer" || plan === "enterprise";
  };

  // Core Trigger: "Get API Key" / "Generate New API Key"
  const handleGetApiKey = () => {
    setActionError(null);

    // 1. If not logged in -> Prompt user to log in
    if (!currentUser) {
      setShowAuthPrompt(true);
      return;
    }

    // 2. If logged in, check pricing tier alignment
    if (!hasApiAccess(currentUser)) {
      setShowTierPrompt(true);
      return;
    }

    // 3. User tier aligns -> Allow API Key Creation
    setNewKeyName("Production Extraction Worker");
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim() || isCreating) return;

    setIsCreating(true);
    setActionError(null);

    try {
      const res = await apiClient<{
        id: string;
        name: string;
        key: string;
        key_prefix: string;
        last_four: string;
        created_at: string;
        message: string;
      }>("/v1/keys", {
        method: "POST",
        body: JSON.stringify({ name: newKeyName.trim() }),
      });

      setCreatedSecret(res.key);
      setShowCreateModal(false);
      setShowSecretModal(true);
      setNewKeyName("");

      // Add to list
      const newItem: ApiKeyItem = {
        id: res.id,
        name: res.name,
        key_prefix: res.key_prefix,
        last_four: res.last_four || "••••",
        created_at: res.created_at || new Date().toISOString(),
        rate_limit: 300,
      };
      setKeys((prev) => [newItem, ...prev]);
    } catch (err: any) {
      setActionError(err.message || "Failed to create API key. Please check your plan limits.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently revoke API Key "${name}"? Any services currently using it will be denied immediately.`)) {
      return;
    }

    try {
      await apiClient(`/v1/keys/${id}`, { method: "DELETE" });
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err: any) {
      alert(err.message || "Could not revoke key.");
    }
  };

  const copyToClipboard = (text: string, type: "key" | "code") => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === "key") {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
    }
  };

  // Code snippets for developers
  const codeSnippets = {
    curl: `curl -X POST https://api.openocr.io/v1/extract \\
  -H "Authorization: Bearer ocr_live_your_api_key_here" \\
  -H "Accept: application/json" \\
  -F "file=@invoice_sample.pdf" \\
  -F "output_format=json"`,
    python: `import requests

url = "https://api.openocr.io/v1/extract"
headers = {
    "Authorization": "Bearer ocr_live_your_api_key_here",
    "Accept": "application/json"
}

with open("invoice_sample.pdf", "rb") as f:
    files = {"file": f}
    data = {"output_format": "json"}
    response = requests.post(url, headers=headers, files=files, data=data)

result = response.json()
print("Extracted fields:", result.get("fields", []))
print("Markdown table:", result.get("markdown", ""))`,
    typescript: `import fs from "node:fs";

async function extractDocument() {
  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync("invoice_sample.pdf")]);
  formData.append("file", fileBlob, "invoice_sample.pdf");
  formData.append("output_format", "json");

  const response = await fetch("https://api.openocr.io/v1/extract", {
    method: "POST",
    headers: {
      "Authorization": "Bearer ocr_live_your_api_key_here",
      "Accept": "application/json"
    },
    body: formData,
  });

  const extraction = await response.json();
  console.log("Extraction Completed:", extraction.fields);
}

extractDocument();`,
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-[#000000] text-zinc-900 dark:text-white transition-colors">
      <Header />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
        {/* Ambient Violet Glow */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-purple-500/10 dark:bg-[#9281f7]/10 blur-[140px] pointer-events-none rounded-full" />

        {/* Hero Header */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-[#292d30] pb-8">
          <div className="space-y-3 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase text-purple-600 dark:text-[#9281f7] font-semibold tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                OpenOCR REST API Platform
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-purple-50 dark:bg-[#9281f7]/10 text-purple-600 dark:text-[#9281f7] border border-purple-200 dark:border-[#9281f7]/30">
                v1.2 Live
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-zinc-900 dark:text-white">
              Programmatic Document Extraction
            </h1>

            <p className="text-sm sm:text-base text-zinc-600 dark:text-[#a1a4a5] leading-relaxed">
              Integrate research-grade pure CPU document extraction into your pipelines, agents, and backends.
              Process commercial invoices, retail receipts, ID credentials, and financial tables with zero template training.
            </p>
          </div>

          {/* Quick Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Key className="w-4 h-4" />}
              onClick={handleGetApiKey}
              className="px-5 py-2.5 rounded-[8px] font-medium shadow-sm hover:shadow-purple-500/20"
            >
              Get API Key
            </Button>
            <Link href="/docs">
              <Button
                variant="outline"
                size="md"
                leftIcon={<Code2 className="w-4 h-4" />}
                className="px-4 py-2.5 rounded-[8px] border-zinc-200 dark:border-[#292d30]"
              >
                Swagger UI
              </Button>
            </Link>
          </div>
        </div>

        {/* Account & Tier Status Banner */}
        <div className="relative z-10 p-5 rounded-xl border border-zinc-200 dark:border-[#292d30] bg-white dark:bg-[#0a0a0c] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className={`p-2.5 rounded-lg shrink-0 ${currentUser ? (hasApiAccess(currentUser) ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-[#3ad389] border border-emerald-200 dark:border-emerald-800/40" : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40") : "bg-purple-50 dark:bg-[#9281f7]/10 text-purple-600 dark:text-[#9281f7] border border-purple-200 dark:border-[#9281f7]/30"}`}>
              {currentUser ? (
                hasApiAccess(currentUser) ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )
              ) : (
                <Lock className="w-5 h-5" />
              )}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-base text-zinc-900 dark:text-white">
                  {currentUser
                    ? `Account: ${currentUser.email}`
                    : "Not signed in"}
                </span>
                {currentUser && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-[4px] uppercase font-semibold border ${hasApiAccess(currentUser) ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-[#3ad389] border-emerald-200 dark:border-emerald-800/50" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"}`}>
                    {currentUser.plan.toUpperCase()} TIER
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-500 dark:text-[#a1a4a5]">
                {currentUser ? (
                  hasApiAccess(currentUser) ? (
                    "Your pricing tier includes full programmatic API access with dedicated concurrency and rate limits."
                  ) : (
                    "Your current Free tier is limited to web Light Table inspection. Upgrade to Developer or Pro tier to create API keys."
                  )
                ) : (
                  "Sign in to your account to generate, inspect, and rotate private API credentials."
                )}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {!currentUser ? (
              <Link href="/login?next=/api">
                <Button variant="primary" size="sm" className="rounded-[6px]">
                  Sign In to Continue
                </Button>
              </Link>
            ) : !hasApiAccess(currentUser) ? (
              <Link href="/pricing">
                <Button variant="primary" size="sm" className="rounded-[6px]">
                  Upgrade to Developer Tier
                </Button>
              </Link>
            ) : (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={handleGetApiKey}
                className="rounded-[6px]"
              >
                Create API Key
              </Button>
            )}
          </div>
        </div>

        {/* API Credentials Vault Section */}
        <section className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-serif font-bold text-zinc-900 dark:text-white">
                API Keys &amp; Credentials
              </h2>
              <p className="text-xs text-zinc-500 dark:text-[#a1a4a5]">
                Bearer tokens for authenticating machine-to-machine requests to the OpenOCR extraction engine.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={handleGetApiKey}
              className="self-start sm:self-auto rounded-[6px] border-zinc-200 dark:border-[#292d30]"
            >
              Generate Key
            </Button>
          </div>

          {/* Keys Table / State Card */}
          <div className="border border-zinc-200 dark:border-[#292d30] rounded-xl bg-white dark:bg-[#0a0a0c] overflow-hidden">
            {!currentUser ? (
              /* Unauthenticated State */
              <div className="p-8 sm:p-12 text-center space-y-4 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-[#9281f7]/10 border border-purple-200 dark:border-[#9281f7]/30 flex items-center justify-center mx-auto text-purple-600 dark:text-[#9281f7]">
                  <Lock className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-lg text-zinc-900 dark:text-white">
                    Sign in to access API keys
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-[#a1a4a5]">
                    API credentials are encrypted and scoped to your organization workspace. Please sign in or register to manage your keys.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Link href="/login?next=/api">
                    <Button variant="primary" size="sm" className="rounded-[6px] px-4">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button variant="outline" size="sm" className="rounded-[6px] px-4 border-zinc-200 dark:border-[#292d30]">
                      Register Account
                    </Button>
                  </Link>
                </div>
              </div>
            ) : !hasApiAccess(currentUser) ? (
              /* Tier Mismatch State */
              <div className="p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-lg text-zinc-900 dark:text-white">
                    API Access Requires Paid Subscription
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-[#a1a4a5] leading-relaxed">
                    Your current plan is <strong>Free</strong>, which includes web Light Table inspection only.
                    Programmatic API keys require an active Developer PAYG ($0.0010/page) or Pro plan.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-[#000000] border border-zinc-200 dark:border-[#292d30] text-xs font-mono text-left space-y-1.5 max-w-sm mx-auto">
                  <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                    <span>Developer Tier:</span>
                    <span className="text-purple-600 dark:text-[#9281f7] font-semibold">$0.0010 / page</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-500 dark:text-[#a1a4a5] text-[11px]">
                    <span>Rate Limit:</span>
                    <span>120 req/min</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-500 dark:text-[#a1a4a5] text-[11px]">
                    <span>Allowed API Keys:</span>
                    <span>Up to 3 Active Keys</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link href="/pricing">
                    <Button variant="primary" size="md" className="rounded-[6px] px-6">
                      View Pricing &amp; Upgrade
                    </Button>
                  </Link>
                </div>
              </div>
            ) : keys.length === 0 ? (
              /* Authorized but no keys created yet */
              <div className="p-8 sm:p-12 text-center space-y-4 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center mx-auto text-emerald-600 dark:text-[#3ad389]">
                  <Key className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-lg text-zinc-900 dark:text-white">
                    No active API keys yet
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-[#a1a4a5]">
                    Your account tier is eligible. Generate your first API key to start extracting documents programmatically.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={handleGetApiKey}
                  className="rounded-[6px]"
                >
                  Generate First Key
                </Button>
              </div>
            ) : (
              /* Keys Inventory Table */
              <div className="overflow-x-auto scrollbar-none">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-100/70 dark:bg-[#121215] border-b border-zinc-200 dark:border-[#292d30] text-zinc-500 dark:text-[#a1a4a5] uppercase text-[10px] tracking-wider select-none">
                    <tr>
                      <th className="py-3 px-4">Key Label</th>
                      <th className="py-3 px-4">Identifier Prefix</th>
                      <th className="py-3 px-4">Rate Limit</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-[#292d30]">
                    {keys.map((k) => (
                      <tr key={k.id} className="hover:bg-zinc-50 dark:hover:bg-[#111114] transition-colors">
                        <td className="py-3 px-4 font-sans font-medium text-zinc-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3ad389]" />
                            <span>{k.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-600 dark:text-[#a1a4a5]">
                          <span className="text-purple-600 dark:text-[#9281f7]">{k.key_prefix}_</span>
                          <span>••••••••{k.last_four}</span>
                        </td>
                        <td className="py-3 px-4 text-zinc-600 dark:text-[#a1a4a5]">
                          {k.rate_limit} req/min
                        </td>
                        <td className="py-3 px-4 text-zinc-500 dark:text-[#6e727a]">
                          {k.created_at ? k.created_at.slice(0, 10) : "Active"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleRevokeKey(k.id, k.name)}
                            className="p-1 rounded text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            title="Revoke API Key"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Developer Quickstart & Code Snippets */}
        <section className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-serif font-bold text-zinc-900 dark:text-white">
                Integration Quickstart
              </h2>
              <p className="text-xs text-zinc-500 dark:text-[#a1a4a5]">
                Send any document (PDF, PNG, JPG, TIFF) via multipart form data and receive structured schema.
              </p>
            </div>

            {/* Code Language Switcher */}
            <div className="flex items-center gap-1 p-1 rounded-lg border border-zinc-200 dark:border-[#292d30] bg-white dark:bg-[#0a0a0c] self-start sm:self-auto font-mono text-xs">
              {(["curl", "python", "typescript"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveCodeTab(tab)}
                  className={`px-3 py-1 rounded-[6px] transition-all capitalize ${activeCodeTab === tab ? "bg-purple-50 dark:bg-[#9281f7]/10 text-purple-600 dark:text-[#9281f7] font-semibold border border-purple-200 dark:border-[#9281f7]/30" : "text-zinc-600 dark:text-[#a1a4a5] hover:text-zinc-900 dark:hover:text-white"}`}
                >
                  {tab === "typescript" ? "TypeScript" : tab}
                </button>
              ))}
            </div>
          </div>

          {/* Snippet Block */}
          <div className="rounded-xl border border-zinc-200 dark:border-[#292d30] bg-zinc-950 text-white overflow-hidden font-mono text-xs shadow-lg">
            <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800 text-[11px] text-zinc-400">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span>POST /v1/extract</span>
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(codeSnippets[activeCodeTab], "code")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-[#3ad389]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
              </button>
            </div>

            <pre className="p-4 sm:p-6 overflow-x-auto scrollbar-none text-zinc-300 leading-relaxed">
              <code>{codeSnippets[activeCodeTab]}</code>
            </pre>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-5 rounded-xl border border-zinc-200 dark:border-[#292d30] bg-white dark:bg-[#0a0a0c] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-[#9281f7]/10 flex items-center justify-center text-purple-600 dark:text-[#9281f7]">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-serif font-bold text-base text-zinc-900 dark:text-white">
              Sub-Second Pure CPU Latency
            </h3>
            <p className="text-xs text-zinc-500 dark:text-[#a1a4a5] leading-relaxed">
              Optimized OCR pipeline runs on pure CPU architectures with deterministic sub-second turnaround and zero GPU memory cold-starts.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-zinc-200 dark:border-[#292d30] bg-white dark:bg-[#0a0a0c] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-[#9281f7]/10 flex items-center justify-center text-purple-600 dark:text-[#9281f7]">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-serif font-bold text-base text-zinc-900 dark:text-white">
              Multi-Format Normalization
            </h3>
            <p className="text-xs text-zinc-500 dark:text-[#a1a4a5] leading-relaxed">
              Unified schema outputs typed key-value pairs, nested markdown tables, bounding box coordinates, and raw token streams.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-zinc-200 dark:border-[#292d30] bg-white dark:bg-[#0a0a0c] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-[#9281f7]/10 flex items-center justify-center text-purple-600 dark:text-[#9281f7]">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="font-serif font-bold text-base text-zinc-900 dark:text-white">
              NIST SP 800-63B Compliant
            </h3>
            <p className="text-xs text-zinc-500 dark:text-[#a1a4a5] leading-relaxed">
              API secrets are hashed with SHA-256 / Argon2id at rest. Rate-limiting headers and per-request UUIDs prevent brute-force abuse.
            </p>
          </div>
        </section>
      </main>

      {/* MODAL 1: Authentication Prompt (User not logged in) */}
      {showAuthPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#0a0a0c] border border-zinc-200 dark:border-[#292d30] rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl relative">
            <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-[#9281f7]/10 border border-purple-200 dark:border-[#9281f7]/30 flex items-center justify-center text-purple-600 dark:text-[#9281f7]">
              <Lock className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-serif font-bold text-xl text-zinc-900 dark:text-white">
                Sign in to Get an API Key
              </h3>
              <p className="text-xs text-zinc-500 dark:text-[#a1a4a5] leading-relaxed">
                You must be authenticated to generate and manage private API keys. Please sign in to your OpenOCR account or create a new workspace.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => router.push("/login?next=/api")}
                className="w-full rounded-[8px] font-medium"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In to Continue
              </Button>

              <Button
                variant="outline"
                size="md"
                onClick={() => router.push("/signup")}
                className="w-full rounded-[8px] border-zinc-200 dark:border-[#292d30]"
              >
                Create New Account
              </Button>

              <button
                type="button"
                onClick={() => setShowAuthPrompt(false)}
                className="w-full text-center text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 pt-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Plan Tier Mismatch Prompt (User is logged in on Free Tier) */}
      {showTierPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#0a0a0c] border border-zinc-200 dark:border-[#292d30] rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl relative">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  CURRENT TIER: FREE
                </span>
              </div>
              <h3 className="font-serif font-bold text-xl text-zinc-900 dark:text-white">
                API Access Requires Plan Upgrade
              </h3>
              <p className="text-xs text-zinc-500 dark:text-[#a1a4a5] leading-relaxed">
                Programmatic API keys are not available on the Free plan. Free accounts are limited to web Light Table inspection.
                Upgrade to the <strong>Developer PAYG</strong> tier to unlock immediate API key generation and automated webhook routing.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-[#000000] border border-zinc-200 dark:border-[#292d30] text-xs font-mono space-y-1.5">
              <div className="flex items-center justify-between text-zinc-800 dark:text-zinc-200 font-semibold">
                <span>Developer PAYG:</span>
                <span className="text-purple-600 dark:text-[#9281f7]">$0.0010 / page</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-[#a1a4a5]">
                Includes 3 API keys, 120 req/min rate limit, and up to 500 pages per request.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => router.push("/pricing")}
                className="w-full rounded-[8px] font-medium"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                View Plans &amp; Upgrade
              </Button>

              <button
                type="button"
                onClick={() => setShowTierPrompt(false)}
                className="w-full text-center text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 pt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Create API Key Dialog (Plan matches!) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#0a0a0c] border border-zinc-200 dark:border-[#292d30] rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-[#292d30]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-[#9281f7]/10 flex items-center justify-center text-purple-600 dark:text-[#9281f7]">
                  <Key className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-lg text-zinc-900 dark:text-white">
                  Generate API Key
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <Input
                label="Key Label / Purpose"
                type="text"
                required
                placeholder="e.g. Production Ingestion Pipeline"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                disabled={isCreating}
              />

              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-[#000000] border border-zinc-200 dark:border-[#292d30] text-xs font-mono space-y-1">
                <div className="flex items-center justify-between text-zinc-500 dark:text-[#a1a4a5]">
                  <span>Tier:</span>
                  <span className="text-zinc-900 dark:text-white font-semibold">
                    {currentUser?.plan.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-500 dark:text-[#a1a4a5]">
                  <span>Rate Limit:</span>
                  <span>300 requests / min</span>
                </div>
              </div>

              {actionError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={isCreating}
                  className="flex-1 rounded-[8px]"
                >
                  Generate Secret Key
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-[8px] border-zinc-200 dark:border-[#292d30]"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: One-Time Secret Reveal Dialog */}
      {showSecretModal && createdSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#0a0a0c] border border-zinc-200 dark:border-[#292d30] rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-[#3ad389] shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-zinc-900 dark:text-white">
                  API Key Created Successfully
                </h3>
                <p className="text-xs text-zinc-500 dark:text-[#a1a4a5]">
                  Please copy your secret key right now. It will never be displayed again.
                </p>
              </div>
            </div>

            {/* Secret Box */}
            <div className="p-3.5 rounded-lg bg-zinc-900 text-white font-mono text-xs flex items-center justify-between gap-3 border border-zinc-800">
              <span className="break-all select-all text-purple-300">
                {createdSecret}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(createdSecret, "key")}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-200 hover:text-white transition-colors"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-[#3ad389]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey ? "Copied!" : "Copy"}</span>
              </button>
            </div>

            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                For security, OpenOCR stores only cryptographic hashes (SHA-256) of your API keys. If you lose this secret, you will need to revoke it and generate a new one.
              </span>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setShowSecretModal(false);
                  setCreatedSecret(null);
                }}
                className="w-full rounded-[8px]"
              >
                I have securely saved this key
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
