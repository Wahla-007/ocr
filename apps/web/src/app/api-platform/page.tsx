"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Input } from "@/components/ui/Input";
import {
  BookOpen,
  Code2,
  Terminal,
  ShieldCheck,
  Zap,
  Sliders,
  Copy,
  Check,
  Lock,
  ArrowRight,
  ExternalLink,
  Layers,
  FileText,
} from "lucide-react";

type CodeLang = "curl" | "python" | "typescript" | "go";

export default function ApiPlatformFieldManualPage() {
  const [selectedLang, setSelectedLang] = useState<CodeLang>("python");
  const [testKey, setTestKey] = useState<string>("");
  const [activeSection, setActiveSection] = useState<string>("extract");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  const sections = [
    { id: "overview", number: "01", title: "Architecture & Protocols" },
    { id: "auth", number: "02", title: "Authentication & Bearer Keys" },
    { id: "extract", number: "03", title: "Document Extraction Endpoint" },
    { id: "jobs", number: "04", title: "Async Jobs & Polling" },
    { id: "uploads", number: "05", title: "Direct Signed Storage URLs" },
    { id: "webhooks", number: "06", title: "HMAC Webhook Signature Verification" },
    { id: "errors", number: "07", title: "Standard Error Envelopes" },
    { id: "ratelimits", number: "08", title: "Rate Limits & Quota Headers" },
  ];

  // Dynamic code generation based on selected language and memory-only test key
  const effectiveKey = testKey.trim() || "ocr_live_your_developer_key";

  const getExtractCode = (lang: CodeLang): string => {
    switch (lang) {
      case "curl":
        return `curl -X POST "https://api.openocr.io/v1/extract" \\
  -H "Authorization: Bearer ${effectiveKey}" \\
  -H "X-Requested-With: OpenOCR-Client" \\
  -F "file=@commercial_invoice.pdf" \\
  -F "wait=true" \\
  -F "format=json"`;

      case "python":
        return `import httpx

# OpenOCR Zero-Selection Extraction
url = "https://api.openocr.io/v1/extract"
headers = {
    "Authorization": "Bearer ${effectiveKey}",
    "X-Requested-With": "OpenOCR-Client"
}

with open("commercial_invoice.pdf", "rb") as f:
    response = httpx.post(
        url,
        headers=headers,
        files={"file": f},
        params={"wait": "true", "format": "json"},
        timeout=30.0
    )

data = response.json()
print(f"Document Type: {data['doc_type']} (Confidence: {data['doc_type_confidence']})")
for field in data["fields"]:
    print(f" • {field['label']}: {field['value']} [{field['confidence']*100:.1f}%]")`;

      case "typescript":
        return `import fs from "fs";
import axios from "axios";
import FormData from "form-data";

const form = new FormData();
form.append("file", fs.createReadStream("commercial_invoice.pdf"));

const response = await axios.post("https://api.openocr.io/v1/extract", form, {
  params: { wait: "true", format: "json" },
  headers: {
    ...form.getHeaders(),
    Authorization: "Bearer ${effectiveKey}",
    "X-Requested-With": "OpenOCR-Client",
  },
  timeout: 30000,
});

console.log("Extracted Intelligence:", response.data);`;

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
	file, _ := os.Open("commercial_invoice.pdf")
	defer file.Close()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", "commercial_invoice.pdf")
	io.Copy(part, file)
	writer.Close()

	req, _ := http.NewRequest("POST", "https://api.openocr.io/v1/extract?wait=true", body)
	req.Header.Set("Authorization", "Bearer ${effectiveKey}")
	req.Header.Set("X-Requested-With", "OpenOCR-Client")
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()
	fmt.Printf("HTTP Status: %d\\n", resp.StatusCode)
}`;
    }
  };

  const sampleApiResponse = `{
  "id": "job_91a02f81c4e2",
  "status": "done",
  "doc_type": "invoice",
  "doc_type_confidence": 0.994,
  "overall_confidence": 0.985,
  "pages": 2,
  "latency_ms": 48.2,
  "credits_charged": 2,
  "cached": false,
  "summary": "Commercial invoice for 14 precision robotics actuators totaling $6,156.00 USD.",
  "fields": [
    {
      "key": "invoice_number",
      "label": "Invoice Number",
      "value": "INV-2026-4092",
      "confidence": 0.994,
      "page": 1,
      "bbox": { "x": 380, "y": 42, "width": 140, "height": 18 }
    },
    {
      "key": "total_amount",
      "label": "Total Amount",
      "value": 6156.00,
      "confidence": 0.998,
      "page": 2,
      "bbox": { "x": 420, "y": 620, "width": 110, "height": 22 }
    }
  ]
}`;

  const hmacPythonCode = `import hmac
import hashlib
import time

def verify_openocr_webhook(raw_payload_bytes: bytes, signature_header: str, secret_key: str) -> bool:
    """
    Verifies OpenOCR HMAC-SHA256 signature using constant-time comparison.
    Signature Header Format: t=1729900000,v1=abcdef0123456789...
    """
    try:
        parts = dict(item.split("=") for item in signature_header.split(","))
        timestamp = int(parts["t"])
        signature = parts["v1"]

        # Prevent replay attacks: Reject deliveries older than 5 minutes
        if abs(time.time() - timestamp) > 300:
            return False

        # Signed payload is: timestamp + "." + raw_body
        signed_payload = f"{timestamp}.".encode("utf-8") + raw_payload_bytes
        expected_sig = hmac.new(
            secret_key.encode("utf-8"),
            signed_payload,
            hashlib.sha256
        ).hexdigest()

        # Constant-time comparison defeats timing attacks
        return hmac.compare_digest(expected_sig, signature)
    except Exception:
        return False`;

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--ink-primary)] transition-colors">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Top Header */}
        <div className="border-b border-[var(--line-strong)] pb-6 mb-8">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[var(--signal)] font-bold tracking-wider uppercase">
              The Field Manual
            </span>
            <Badge variant="outline">API SPECIFICATION v1.0</Badge>
          </div>
          <h1 className="text-3xl font-serif font-bold text-[var(--ink-primary)] tracking-tight mt-1">
            Engineering Field Manual & SDK Reference
          </h1>
          <p className="text-xs sm:text-sm text-[var(--ink-secondary)] mt-0.5">
            Technical protocol documentation with live code generation, cryptographic webhook verification, and memory-only testing.
          </p>
        </div>

        {/* 3-Column Layout: Margin Index (2 cols) | Specification (5 cols) | Patch Bay & Tester (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Sticky Margin Index (2 cols) */}
          <nav className="lg:col-span-2 hidden lg:block sticky top-20 space-y-1 select-none font-mono text-xs border-r border-[var(--line-hairline)] pr-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] block mb-3">
              Section Index
            </span>
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setActiveSection(s.id)}
                className={`block py-1.5 px-2 rounded-sm transition-colors ${
                  activeSection === s.id
                    ? "bg-[var(--signal-subtle)] text-[var(--signal)] font-bold border-l-2 border-l-[var(--signal)]"
                    : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subtle)]"
                }`}
              >
                <span className="opacity-60 mr-1.5">{s.number}.</span>
                <span>{s.title}</span>
              </a>
            ))}
          </nav>

          {/* Middle Column: Detailed Specification Narrative (5 cols) */}
          <div className="lg:col-span-5 space-y-10 text-xs text-[var(--ink-secondary)] leading-relaxed">
            {/* Section 01: Overview */}
            <section id="overview" className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[var(--signal)] font-bold">01.</span>
                <h2 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                  Architecture & Protocol Invariants
                </h2>
              </div>
              <p>
                OpenOCR exposes a pure RESTful interface versioned under <code className="font-mono text-[var(--ink-primary)] bg-[var(--surface-subtle)] px-1 py-0.5 rounded-sm">/v1</code>. Every extraction operates under zero schema selection: documents are classified first, normalized via PyMuPDF, analyzed by deterministic layout engines, and structured via isolated LLM layers.
              </p>
              <div className="p-3 bg-[var(--surface-subtle)] border border-[var(--line-hairline)] rounded-sm space-y-1 font-mono text-[11px]">
                <div className="font-bold text-[var(--ink-primary)]">Base Endpoint URL:</div>
                <div className="text-[var(--signal)] font-bold">https://api.openocr.io/v1</div>
              </div>
            </section>

            {/* Section 02: Authentication */}
            <section id="auth" className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[var(--signal)] font-bold">02.</span>
                <h2 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                  Authentication & Key Scopes
                </h2>
              </div>
              <p>
                Programmatic API calls require an API key passed via the standard HTTP Bearer header:
              </p>
              <div className="p-2.5 bg-[var(--surface-sunken)] border border-[var(--line-strong)] font-mono text-xs rounded-sm text-[var(--ink-primary)]">
                Authorization: Bearer ocr_live_your_developer_key
              </div>
              <p>
                Keys are generated with a CSPRNG and hashed using Argon2id in our database. API keys are exempt from cookie CSRF checks but subject to per-key rate limits (120 to 600 req/min).
              </p>
            </section>

            {/* Section 03: Extraction */}
            <section id="extract" className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[var(--signal)] font-bold">03.</span>
                <h2 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                  Single Document Extraction
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="signal">POST</Badge>
                <code className="font-mono font-bold text-xs text-[var(--ink-primary)]">/v1/extract</code>
              </div>
              <p>
                Submits document bytes for immediate extraction. Set <code className="font-mono bg-[var(--surface-subtle)] px-1">wait=true</code> to hold the HTTP connection for synchronous completion (up to 25s), or <code className="font-mono bg-[var(--surface-subtle)] px-1">wait=false</code> to receive a queued job ID.
              </p>
            </section>

            {/* Section 06: Webhooks */}
            <section id="webhooks" className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[var(--signal)] font-bold">06.</span>
                <h2 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                  HMAC Webhook Signature Verification
                </h2>
              </div>
              <p>
                Every asynchronous webhook payload is signed with an HMAC-SHA256 signature passed in the <code className="font-mono bg-[var(--surface-subtle)] px-1">X-OpenOCR-Signature</code> header. You must verify this signature using constant-time comparison to defeat timing attacks.
              </p>
              <CodeBlock
                language="python"
                filename="webhook_verifier.py"
                code={hmacPythonCode}
              />
            </section>
          </div>

          {/* Right Column: The SDK Patch Bay & Live Memory Tester (5 cols) */}
          <div className="lg:col-span-5 space-y-6 sticky top-20">
            {/* The SDK Patch Bay */}
            <div className="p-5 border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--line-hairline)] pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[var(--signal)]" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--ink-primary)]">
                    The SDK Patch Bay
                  </span>
                </div>

                {/* Language Switcher Tabs */}
                <div className="flex items-center gap-1 font-mono text-[11px]">
                  {(["curl", "python", "typescript", "go"] as CodeLang[]).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setSelectedLang(lang)}
                      className={`px-2 py-0.5 rounded-sm uppercase font-bold transition-colors ${
                        selectedLang === lang
                          ? "bg-[var(--signal)] text-white"
                          : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subtle)]"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Memory-Only Key Slot */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-[var(--ink-muted)] uppercase flex items-center justify-between">
                  <span>Interactive Memory-Only Key:</span>
                  <span className="text-[10px] text-[var(--semantic-success)]">Never stored in storage</span>
                </label>
                <input
                  type="text"
                  placeholder="Paste your developer key here to customize snippets live"
                  value={testKey}
                  onChange={(e) => setTestKey(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-[var(--surface-sunken)] border border-[var(--line-strong)] rounded-sm text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--signal)]"
                />
              </div>

              {/* Dynamic Code Snippet */}
              <CodeBlock
                language={selectedLang}
                code={getExtractCode(selectedLang)}
                showLineNumbers
              />
            </div>

            {/* Authoritative Live API Response Schema */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-[var(--ink-secondary)] uppercase tracking-wider">
                  Authoritative Extraction Response (200 OK)
                </span>
                <span className="text-[11px] text-[var(--semantic-success)] font-bold">48ms Latency</span>
              </div>
              <CodeBlock
                language="json"
                filename="extraction_response.json"
                code={sampleApiResponse}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
