"use client";

import React, { useState } from "react";
import {
  X,
  Code,
  Key,
  DollarSign,
  BookOpen,
  Copy,
  Check,
  ExternalLink,
  Plus,
  RefreshCw,
  Sparkles,
  Zap,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

interface DeveloperModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  creditsBalance: number;
  setCreditsBalance?: (balance: number) => void;
}

type TabType = "quickstart" | "keys" | "pricing" | "endpoints";
type CodeLang = "curl" | "python" | "typescript" | "go";

export function DeveloperModal({
  isOpen,
  onClose,
  apiKey,
  setApiKey,
  creditsBalance,
  setCreditsBalance,
}: DeveloperModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("quickstart");
  const [activeLang, setActiveLang] = useState<CodeLang>("curl");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [monthlyPages, setMonthlyPages] = useState<number>(10000);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerateKey = async () => {
    setIsGeneratingKey(true);
    try {
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Production Live Key", plan: "developer_payg" }),
      });
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.key);
        if (setCreditsBalance && data.credits_remaining) {
          setCreditsBalance(data.credits_remaining);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleTopUp = async () => {
    try {
      const res = await fetch("/api/v1/keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({ key: apiKey, amount_credits: 5000 }),
      });
      if (res.ok) {
        const data = await res.json();
        if (setCreditsBalance && data.credits_remaining) {
          setCreditsBalance(data.credits_remaining);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Cost calculations
  const openocrCost = (monthlyPages * 0.001).toFixed(2);
  const awsCost = (monthlyPages * 0.015).toFixed(2);
  const googleCost = (monthlyPages * 0.05).toFixed(2);
  const savingsVsAws = ((1 - Number(openocrCost) / Number(awsCost)) * 100).toFixed(0);
  const savingsVsGoogle = ((1 - Number(openocrCost) / Number(googleCost)) * 100).toFixed(0);

  const getCodeSnippet = (lang: CodeLang): string => {
    switch (lang) {
      case "curl":
        return `# 1. Extract Invoice or Document directly with OpenOCR API
curl -X POST https://api.openocr.io/api/v1/extract \\
  -H "X-API-Key: ${apiKey}" \\
  -F "file=@invoice.pdf" \\
  -F "format=json"

# Response Headers:
# X-OpenOCR-Credits-Used: 1
# X-OpenOCR-Cost-USD: 0.001
# X-OpenOCR-Credits-Remaining: 9999`;

      case "python":
        return `import requests

API_KEY = "${apiKey}"
API_URL = "https://api.openocr.io/api/v1/extract"

# Upload and extract invoice fields in one request
with open("invoice.pdf", "rb") as f:
    response = requests.post(
        API_URL,
        headers={"X-API-Key": API_KEY},
        files={"file": f},
        params={"format": "json"}
    )

result = response.json()

# Access structured invoice fields directly
invoice = result["fields"]["invoice"]
print(f"Invoice #: {invoice['invoice_number']}")
print(f"Vendor:    {invoice['supplier']['name']}")
print(f"Total:     {invoice['total']} {invoice['currency']}")
print(f"Product:   {result['fields']['product']}")
print(f"Billing:   {result['billing']['cost_usd']} USD charged")`;

      case "typescript":
        return `import fs from "fs";

const API_KEY = "${apiKey}";
const API_URL = "https://api.openocr.io/api/v1/extract";

async function extractDocument() {
  const fileBuffer = fs.readFileSync("invoice.pdf");
  const formData = new FormData();
  formData.append("file", new Blob([fileBuffer]), "invoice.pdf");

  const response = await fetch(\`\${API_URL}?format=json\`, {
    method: "POST",
    headers: {
      "X-API-Key": API_KEY,
    },
    body: formData,
  });

  const data = await response.json();
  console.log("Document Type:", data.document_type);
  console.log("Invoice Total:", data.fields?.invoice?.total);
  console.log("Credits Used:", response.headers.get("X-OpenOCR-Credits-Used"));
  console.log("Cost:", response.headers.get("X-OpenOCR-Cost-USD"), "USD");
}

extractDocument();`;

      case "go":
        return `package main

import (
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
)

func main() {
	file, _ := os.Open("invoice.pdf")
	defer file.Close()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", "invoice.pdf")
	io.Copy(part, file)
	writer.Close()

	req, _ := http.NewRequest("POST", "https://api.openocr.io/api/v1/extract", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("X-API-Key", "${apiKey}")

	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	fmt.Println(string(respBody))
}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 bg-zinc-50 dark:bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white tracking-wide uppercase font-mono flex items-center gap-2">
                OpenOCR Developer API
                <span className="px-2 py-0.5 rounded text-[10px] font-normal bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  $0.001 / page
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Low-cost, high-speed pure CPU document intelligence API with zero cloud GPU latency.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 px-6 text-xs font-mono">
          <button
            onClick={() => setActiveTab("quickstart")}
            className={`py-3 px-4 border-b-2 font-medium flex items-center gap-2 transition-colors ${
              activeTab === "quickstart"
                ? "border-zinc-900 dark:border-white text-zinc-900 dark:text-white font-semibold"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Quickstart</span>
          </button>
          <button
            onClick={() => setActiveTab("keys")}
            className={`py-3 px-4 border-b-2 font-medium flex items-center gap-2 transition-colors ${
              activeTab === "keys"
                ? "border-zinc-900 dark:border-white text-zinc-900 dark:text-white font-semibold"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>API Keys & Metering</span>
          </button>
          <button
            onClick={() => setActiveTab("pricing")}
            className={`py-3 px-4 border-b-2 font-medium flex items-center gap-2 transition-colors ${
              activeTab === "pricing"
                ? "border-zinc-900 dark:border-white text-zinc-900 dark:text-white font-semibold"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Pricing & Calculator</span>
          </button>
          <button
            onClick={() => setActiveTab("endpoints")}
            className={`py-3 px-4 border-b-2 font-medium flex items-center gap-2 transition-colors ${
              activeTab === "endpoints"
                ? "border-zinc-900 dark:border-white text-zinc-900 dark:text-white font-semibold"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Endpoints Reference</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* TAB 1: QUICKSTART */}
          {activeTab === "quickstart" && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Key className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Your Active API Key</span>
                    <span className="font-mono text-slate-200 text-xs font-semibold">{apiKey}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(apiKey, "api-key-copy")}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === "api-key-copy" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Key</span>
                    </>
                  )}
                </button>
              </div>

              {/* Language Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-slate-400 text-xs font-semibold uppercase">
                    Select Client Language
                  </span>
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                    {(["curl", "python", "typescript", "go"] as CodeLang[]).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setActiveLang(lang)}
                        className={`px-3 py-1 rounded-md font-mono text-[11px] uppercase transition-colors ${
                          activeLang === lang
                            ? "bg-slate-800 text-emerald-400 font-bold"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {lang === "typescript" ? "Node / TS" : lang}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative rounded-xl bg-slate-950 border border-slate-800/90 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/60 bg-slate-900/40 text-[10px] font-mono text-slate-500">
                    <span>POST /api/v1/extract</span>
                    <button
                      onClick={() => handleCopy(getCodeSnippet(activeLang), "code-snippet-copy")}
                      className="flex items-center gap-1 hover:text-slate-200 transition-colors"
                    >
                      {copiedKey === "code-snippet-copy" ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copied Code</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Snippet</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 overflow-x-auto text-[11px] font-mono text-slate-300 leading-relaxed">
                    <code>{getCodeSnippet(activeLang)}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KEYS & USAGE */}
          {activeTab === "keys" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Credits Remaining</span>
                  <p className="font-mono text-xl font-bold text-white">
                    {creditsBalance.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-emerald-400 font-mono block">
                    ≈ ${(creditsBalance * 0.001).toFixed(2)} USD value
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Cost Per Page</span>
                  <p className="font-mono text-xl font-bold text-emerald-400">
                    $0.001
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    Pure CPU runtime (&lt; 20MB RAM)
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Rate Limit</span>
                  <p className="font-mono text-xl font-bold text-slate-200">
                    120 <span className="text-xs font-normal text-slate-400">req/min</span>
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    Instant burstable
                  </span>
                </div>
              </div>

              {/* Key Management Box */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-300 font-semibold uppercase">
                    Active API Key
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleTopUp}
                      className="px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-[11px] flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+5,000 Credits (Test)</span>
                    </button>
                    <button
                      onClick={handleGenerateKey}
                      disabled={isGeneratingKey}
                      className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isGeneratingKey ? "animate-spin" : ""}`} />
                      <span>Rotate Key</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 font-mono text-xs text-slate-300">
                  <code className="flex-1 select-all">{apiKey}</code>
                  <button
                    onClick={() => handleCopy(apiKey, "key-tab-copy")}
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedKey === "key-tab-copy" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PRICING & COST COMPARISON CALCULATOR */}
          {activeTab === "pricing" && (
            <div className="space-y-6">
              {/* Cost Savings Calculator */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono text-white font-bold uppercase tracking-wider block">
                      Monthly Cost Comparison Calculator
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Estimate your enterprise document extraction savings at $0.001/page
                    </span>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs">
                    Save {savingsVsGoogle}% vs Google / {savingsVsAws}% vs AWS
                  </div>
                </div>

                {/* Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono text-slate-400">
                    <span>Monthly Pages:</span>
                    <span className="font-bold text-white text-sm">{monthlyPages.toLocaleString()} pages</span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="100000"
                    step="1000"
                    value={monthlyPages}
                    onChange={(e) => setMonthlyPages(Number(e.target.value))}
                    className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-600">
                    <span>1,000 pages</span>
                    <span>50,000 pages</span>
                    <span>100,000 pages</span>
                  </div>
                </div>

                {/* Cost Breakdown Grid */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-600/50 space-y-1">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold block">
                      OpenOCR API
                    </span>
                    <p className="font-mono text-lg font-extrabold text-white">
                      ${openocrCost}
                    </p>
                    <span className="text-[10px] font-mono text-emerald-400 block">$0.001 / page</span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">
                      AWS Textract
                    </span>
                    <p className="font-mono text-lg font-semibold text-slate-400">
                      ${awsCost}
                    </p>
                    <span className="text-[10px] font-mono text-slate-600 block">$0.015 / page</span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">
                      Google Document AI
                    </span>
                    <p className="font-mono text-lg font-semibold text-slate-400">
                      ${googleCost}
                    </p>
                    <span className="text-[10px] font-mono text-slate-600 block">$0.050 / page</span>
                  </div>
                </div>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Developer PAYG</span>
                  <p className="font-mono text-xl font-bold text-white">$0 <span className="text-xs font-normal text-slate-400">/ mo</span></p>
                  <p className="text-[11px] text-emerald-400 font-mono font-semibold">$0.001 per page</p>
                  <ul className="space-y-1 text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                    <li>• Zero monthly minimum</li>
                    <li>• 120 requests / min</li>
                    <li>• Full JSON & bbox data</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-800/60 space-y-2 relative">
                  <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-mono text-[9px] font-extrabold uppercase">
                    Popular
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 uppercase block font-semibold">Starter Growth</span>
                  <p className="font-mono text-xl font-bold text-white">$9 <span className="text-xs font-normal text-slate-400">/ mo</span></p>
                  <p className="text-[11px] text-emerald-400 font-mono font-semibold">10,000 pages included</p>
                  <ul className="space-y-1 text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                    <li>• $0.0009 / page overage</li>
                    <li>• 240 requests / min</li>
                    <li>• Priority queue support</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Enterprise On-Prem</span>
                  <p className="font-mono text-xl font-bold text-white">Custom</p>
                  <p className="text-[11px] text-slate-300 font-mono">Air-gapped Docker</p>
                  <ul className="space-y-1 text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                    <li>• Unlimited local processing</li>
                    <li>• Zero cloud data leakage</li>
                    <li>• HIPAA / DPDP compliant</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ENDPOINTS REFERENCE */}
          {activeTab === "endpoints" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase">
                    POST
                  </span>
                  <code className="font-mono text-xs text-white">/api/v1/extract</code>
                  <span className="text-slate-500 text-[11px] ml-auto">Core Extraction API</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Accepts a document file (PDF, PNG, JPG, WEBP) via multipart form-data or JSON with base64/URL. Returns structured invoice/identity fields, bounding boxes, markdown, and plain text.
                </p>
                <div className="text-[10px] font-mono text-slate-500 space-y-0.5">
                  <p>Headers: <span className="text-slate-300">X-API-Key: ocr_live_...</span></p>
                  <p>Params: <span className="text-slate-300">format=json | markdown | text</span></p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-400 border border-blue-800 uppercase">
                    GET
                  </span>
                  <code className="font-mono text-xs text-white">/api/v1/usage</code>
                  <span className="text-slate-500 text-[11px] ml-auto">Credit & Quota Tracking</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Returns your current API key plan, remaining balance, total pages processed, and dollar expenditure.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-400 border border-blue-800 uppercase">
                    GET
                  </span>
                  <code className="font-mono text-xs text-white">/api/v1/pricing</code>
                  <span className="text-slate-500 text-[11px] ml-auto">Commercial Pricing Matrix</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Public endpoint returning all cost tiers, volume discounts, and cloud competitor cost comparison.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-400 border border-blue-800 uppercase">
                    GET
                  </span>
                  <code className="font-mono text-xs text-white">/api/v1/health</code>
                  <span className="text-slate-500 text-[11px] ml-auto">Liveness & Readiness Probe</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Returns API health, OCR engine status, and pricing rate.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
