"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CodeBlock } from "@/components/ui/CodeBlock";
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
  Clock,
  UploadCloud,
  AlertTriangle,
  Activity,
} from "lucide-react";

type CodeLang = "curl" | "python" | "typescript" | "go";

export default function ApiPlatformFieldManualPage() {
  const [selectedLang, setSelectedLang] = useState<CodeLang>("python");
  const [testKey, setTestKey] = useState<string>("");
  const [activeSection, setActiveSection] = useState<string>("extract");

  const sections = [
    { id: "overview", number: "01", title: "Architecture & Protocols" },
    { id: "auth", number: "02", title: "Authentication & Bearer Keys" },
    { id: "extract", number: "03", title: "Document Extraction Endpoint" },
    { id: "jobs", number: "04", title: "Async Jobs & Polling" },
    { id: "uploads", number: "05", title: "Direct Signed Storage URLs" },
    { id: "webhooks", number: "06", title: "HMAC Webhook Verification" },
    { id: "errors", number: "07", title: "Standard Error Envelopes" },
    { id: "ratelimits", number: "08", title: "Rate Limits & Quota Headers" },
  ];

  const effectiveKey = testKey.trim() || "ocr_live_your_developer_key";

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

        # Prevent replay attacks: Reject deliveries older than 5 minutes (300s)
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

  const getSectionCode = (sectionId: string, lang: CodeLang): string => {
    switch (sectionId) {
      case "jobs":
        if (lang === "curl") {
          return `# 1. Enqueue asynchronous extraction job (wait=false)
curl -X POST "https://api.openocr.io/v1/extract" \\
  -H "Authorization: Bearer ${effectiveKey}" \\
  -F "file=@financial_statement.pdf" \\
  -F "wait=false"

# Returns: {"id": "job_91a02f81c4e2", "status": "queued"}

# 2. Poll job status until complete (supports format=json|markdown|text)
curl -X GET "https://api.openocr.io/v1/jobs/job_91a02f81c4e2?format=json" \\
  -H "Authorization: Bearer ${effectiveKey}"`;
        } else if (lang === "python") {
          return `import httpx
import time

headers = {
    "Authorization": "Bearer ${effectiveKey}",
    "X-Requested-With": "OpenOCR-Client"
}

# 1. Enqueue asynchronous job
with open("financial_statement.pdf", "rb") as f:
    res = httpx.post(
        "https://api.openocr.io/v1/extract",
        headers=headers,
        files={"file": f},
        params={"wait": "false"}
    )
job_id = res.json()["id"]
print(f"Queued Job ID: {job_id}")

# 2. Poll status with exponential backoff
while True:
    status_res = httpx.get(
        f"https://api.openocr.io/v1/jobs/{job_id}",
        headers=headers,
        params={"format": "json"}
    )
    job = status_res.json()
    if job["status"] == "done":
        print(f"Complete in {job['latency_ms']}ms. Doc Type: {job['doc_type']}")
        print(f"Summary: {job['summary']}")
        break
    elif job["status"] == "failed":
        print(f"Extraction failed: {job.get('error_code')}")
        break
    time.sleep(1.5)`;
        } else if (lang === "typescript") {
          return `import axios from "axios";
import fs from "fs";
import FormData from "form-data";

const headers = { Authorization: "Bearer ${effectiveKey}" };

// 1. Enqueue asynchronous job
const form = new FormData();
form.append("file", fs.createReadStream("financial_statement.pdf"));

const { data: queued } = await axios.post(
  "https://api.openocr.io/v1/extract?wait=false",
  form,
  { headers: { ...headers, ...form.getHeaders() } }
);

console.log("Enqueued Job ID:", queued.id);

// 2. Poll job status until done
while (true) {
  const { data: job } = await axios.get(
    \`https://api.openocr.io/v1/jobs/\${queued.id}?format=json\`,
    { headers }
  );

  if (job.status === "done") {
    console.log("Extraction Intelligence:", job.fields);
    break;
  } else if (job.status === "failed") {
    throw new Error(\`Extraction failed: \${job.error_code}\`);
  }
  await new Promise((r) => setTimeout(r, 1500));
}`;
        } else {
          return `package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

func pollJob(jobID, apiKey string) {
	client := &http.Client{}
	url := fmt.Sprintf("https://api.openocr.io/v1/jobs/%s?format=json", jobID)

	for {
		req, _ := http.NewRequest("GET", url, nil)
		req.Header.Set("Authorization", "Bearer "+apiKey)
		resp, _ := client.Do(req)

		var job map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&job)
		resp.Body.Close()

		if job["status"] == "done" {
			fmt.Printf("Extraction Success: %v\\n", job["summary"])
			return
		}
		time.Sleep(1500 * time.Millisecond)
	}
}`;
        }

      case "uploads":
        if (lang === "curl") {
          return `# Step 1: Request pre-signed direct upload URL
curl -X POST "https://api.openocr.io/v1/uploads/sign" \\
  -H "Authorization: Bearer ${effectiveKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "filename": "heavy_docket_80mb.pdf",
    "mime": "application/pdf",
    "size_bytes": 83886080
  }'

# Step 2: Upload raw binary directly to storage via HTTP PUT
curl -X PUT "<upload_url_from_step_1>" \\
  -H "Content-Type: application/pdf" \\
  --data-binary "@heavy_docket_80mb.pdf"

# Step 3: Trigger extraction referencing the storage key
curl -X POST "https://api.openocr.io/v1/extract?file_key=<file_key>&wait=true" \\
  -H "Authorization: Bearer ${effectiveKey}"`;
        } else if (lang === "python") {
          return `import httpx
import os

file_path = "heavy_docket_80mb.pdf"
size_bytes = os.path.getsize(file_path)
headers = {"Authorization": "Bearer ${effectiveKey}"}

# Step 1: Request pre-signed S3/MinIO upload URL
with httpx.Client() as client:
    sign_res = client.post(
        "https://api.openocr.io/v1/uploads/sign",
        headers=headers,
        json={
            "filename": os.path.basename(file_path),
            "mime": "application/pdf",
            "size_bytes": size_bytes
        }
    )
    presigned = sign_res.json()
    upload_url = presigned["upload_url"]
    file_key = presigned["file_key"]

    # Step 2: Upload raw binary directly to storage
    with open(file_path, "rb") as f:
        client.put(upload_url, content=f.read(), headers={"Content-Type": "application/pdf"})

    # Step 3: Trigger zero-copy extraction via file_key
    extract_res = client.post(
        "https://api.openocr.io/v1/extract",
        headers=headers,
        params={"file_key": file_key, "wait": "true"}
    )
    print("Intelligence Extracted:", extract_res.json())`;
        } else if (lang === "typescript") {
          return `import axios from "axios";
import fs from "fs";

const fileBuffer = fs.readFileSync("heavy_docket_80mb.pdf");
const headers = { Authorization: "Bearer ${effectiveKey}" };

// Step 1: Sign upload
const { data: presigned } = await axios.post(
  "https://api.openocr.io/v1/uploads/sign",
  {
    filename: "heavy_docket_80mb.pdf",
    mime: "application/pdf",
    size_bytes: fileBuffer.length,
  },
  { headers }
);

// Step 2: Direct PUT to storage (bypasses API gateway memory)
await axios.put(presigned.upload_url, fileBuffer, {
  headers: { "Content-Type": "application/pdf" },
});

// Step 3: Submit extraction job via file_key
const { data: result } = await axios.post(
  \`https://api.openocr.io/v1/extract?file_key=\${encodeURIComponent(presigned.file_key)}&wait=true\`,
  null,
  { headers }
);

console.log("Extracted Payload:", result);`;
        } else {
          return `package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
)

func directUpload(filePath, apiKey string) {
	data, _ := os.ReadFile(filePath)
	
	signBody, _ := json.Marshal(map[string]interface{}{
		"filename": filePath,
		"mime": "application/pdf",
		"size_bytes": len(data),
	})
	req, _ := http.NewRequest("POST", "https://api.openocr.io/v1/uploads/sign", bytes.NewReader(signBody))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	// Execute upload to storage and trigger extraction
}`;
        }

      case "webhooks":
        return hmacPythonCode;

      case "errors":
        if (lang === "curl") {
          return `# Example: Sending an unsupported executable file
curl -i -X POST "https://api.openocr.io/v1/extract" \\
  -H "Authorization: Bearer ${effectiveKey}" \\
  -F "file=@malicious.exe"

# HTTP/1.1 415 Unsupported Media Type
# Content-Type: application/json
#
# {
#   "error": {
#     "code": "UNSUPPORTED_TYPE",
#     "message": "MIME type 'application/x-msdownload' is not supported. Allowed: PDF, PNG, JPG, WEBP, TIFF.",
#     "request_id": "req_8492026af01"
#   }
# }`;
        } else if (lang === "python") {
          return `import httpx

try:
    response = httpx.post(
        "https://api.openocr.io/v1/extract",
        headers={"Authorization": "Bearer ${effectiveKey}"},
        files={"file": open("oversized_docket.pdf", "rb")}
    )
    response.raise_for_status()
except httpx.HTTPStatusError as exc:
    # OpenOCR Standard RFC Error Envelope
    err = exc.response.json().get("error", {})
    code = err.get("code")
    message = err.get("message")
    req_id = err.get("request_id")
    
    if code == "FILE_TOO_LARGE":
        print(f"Document exceeds plan limits. Req ID: {req_id}")
    elif code == "QUOTA_EXCEEDED":
        print(f"Daily credits exhausted. Upgrade at /pricing")
    else:
        print(f"[{code}] {message} (Trace: {req_id})")`;
        } else {
          return `// TypeScript Error Handling
try {
  await axios.post("https://api.openocr.io/v1/extract", form, { headers });
} catch (error: any) {
  if (error.response?.data?.error) {
    const { code, message, request_id } = error.response.data.error;
    switch (code) {
      case "FILE_TOO_LARGE":
        console.error("Document exceeds file size limits:", message);
        break;
      case "QUOTA_EXCEEDED":
        console.error("Credits exhausted. Upgrade plan at /pricing");
        break;
      default:
        console.error(\`[\${code}] \${message} (Ref: \${request_id})\`);
    }
  }
}`;
        }

      case "ratelimits":
        if (lang === "curl") {
          return `# Read Rate Limit and Quota Headers on Any Response
curl -i -X POST "https://api.openocr.io/v1/extract" \\
  -H "Authorization: Bearer ${effectiveKey}" \\
  -F "file=@doc.pdf" \\
  -F "wait=true"

# Response Headers:
# X-RateLimit-Limit: 300
# X-RateLimit-Remaining: 299
# X-Quota-Limit: 10000
# X-Quota-Remaining: 9980
# X-Quota-Reset: 1729987200
# Retry-After: 60 (present when HTTP 429 occurs)`;
        } else {
          return `import httpx
import time

def extract_with_backoff(file_path: str, api_key: str):
    headers = {"Authorization": f"Bearer {api_key}"}
    
    while True:
        with open(file_path, "rb") as f:
            resp = httpx.post(
                "https://api.openocr.io/v1/extract",
                headers=headers,
                files={"file": f},
                params={"wait": "true"}
            )
        
        # Read standard headers
        rate_rem = resp.headers.get("X-RateLimit-Remaining")
        quota_rem = resp.headers.get("X-Quota-Remaining")
        print(f"Remaining in window: {rate_rem} reqs | Remaining credits: {quota_rem}")
        
        if resp.status_code == 429:
            retry_after = int(resp.headers.get("Retry-After", 5))
            print(f"Rate limited (429). Waiting {retry_after}s before retry...")
            time.sleep(retry_after)
            continue
            
        return resp.json()`;
        }

      default: // "extract", "auth", "overview"
        if (lang === "curl") {
          return `curl -X POST "https://api.openocr.io/v1/extract" \\
  -H "Authorization: Bearer ${effectiveKey}" \\
  -H "X-Requested-With: OpenOCR-Client" \\
  -F "file=@commercial_invoice.pdf" \\
  -F "wait=true" \\
  -F "format=json"`;
        } else if (lang === "python") {
          return `import httpx

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
    print(f" • {field['label']}: {field['value']}")`;
        } else if (lang === "typescript") {
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
        } else {
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
    }
  };

  const getSectionSampleResponse = (sectionId: string): string => {
    switch (sectionId) {
      case "jobs":
        return `{
  "id": "job_91a02f81c4e2",
  "status": "done",
  "doc_type": "financial_statement",
  "pages": 4,
  "credits_charged": 4,
  "latency_ms": 142.6,
  "summary": "Audited Q3 Financial Balance Sheet for Apex Analytics Group.",
  "confidence": 0.982,
  "created_at": "2026-10-29T04:12:00Z",
  "completed_at": "2026-10-29T04:12:02Z",
  "fields": [
    {
      "key": "net_income",
      "label": "Net Income",
      "value": 1450000.00,
      "page": 2
    }
  ]
}`;
      case "uploads":
        return `{
  "upload_url": "https://storage.openocr.io/openocr-raw/uploads/91a02f81-c4e2/docket.pdf?X-Amz-Signature=8492026af...",
  "file_key": "uploads/91a02f81-c4e2/docket.pdf",
  "expires_in": 900
}`;
      case "webhooks":
        return `{
  "event": "extraction.completed",
  "delivery_id": "wh_0192a74c",
  "timestamp": 1729987200,
  "job": {
    "id": "job_91a02f81c4e2",
    "status": "done",
    "doc_type": "invoice",
    "pages": 2
  }
}`;
      case "errors":
        return `{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "Document file size (34.2MB) exceeds the 10MB limit for your Free Plan.",
    "request_id": "req_8492026af01",
    "plan": "free",
    "upgrade_url": "/pricing"
  }
}`;
      case "ratelimits":
        return `{
  "status": "rate_limits_healthy",
  "sliding_window_seconds": 60,
  "rate_limit_per_minute": 300,
  "remaining_in_window": 284,
  "daily_quota_total": 10000,
  "daily_quota_remaining": 9420,
  "quota_reset_utc": "2026-10-30T00:00:00Z"
}`;
      default:
        return `{
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
    }
  };

  const activeSectionObj = sections.find((s) => s.id === activeSection) || sections[2];

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
          <div className="lg:col-span-5 space-y-12 text-xs text-[var(--ink-secondary)] leading-relaxed">
            {/* Section 01: Overview */}
            <section id="overview" className="space-y-3 scroll-mt-24">
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
            <section id="auth" className="space-y-3 scroll-mt-24">
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
            <section id="extract" className="space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[var(--signal)] font-bold">03.</span>
                <h2 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                  Document Extraction Endpoint
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="signal">POST</Badge>
                <code className="font-mono font-bold text-xs text-[var(--ink-primary)]">/v1/extract</code>
              </div>
              <p>
                Submits document bytes for immediate extraction. Set <code className="font-mono bg-[var(--surface-subtle)] px-1">wait=true</code> to hold the HTTP connection for synchronous completion (up to 25s), or <code className="font-mono bg-[var(--surface-subtle)] px-1">wait=false</code> to receive a queued job ID.
              </p>
              <div className="p-3 border border-[var(--line-hairline)] rounded-sm bg-[var(--surface-subtle)] space-y-2">
                <div className="font-mono text-[11px] font-bold text-[var(--ink-primary)] uppercase">Supported Parameters:</div>
                <ul className="space-y-1 font-mono text-[11px] text-[var(--ink-secondary)]">
                  <li>• <strong className="text-[var(--ink-primary)]">file</strong> (multipart/form-data): Raw file bytes (PDF, PNG, JPG, WEBP, TIFF).</li>
                  <li>• <strong className="text-[var(--ink-primary)]">wait</strong> (boolean, default=true): Synchronous hold vs async queueing.</li>
                  <li>• <strong className="text-[var(--ink-primary)]">format</strong> (string, default=&quot;json&quot;): json, markdown, or plain text.</li>
                </ul>
              </div>
            </section>

            {/* Section 04: Async Jobs & Polling */}
            <section id="jobs" className="space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[var(--signal)] font-bold">04.</span>
                <h2 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                  Async Jobs & Status Polling
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">GET</Badge>
                <code className="font-mono font-bold text-xs text-[var(--ink-primary)]">/v1/jobs/{`{id}`}</code>
              </div>
              <p>
                For large multi-page reports or batch runs, call <code className="font-mono bg-[var(--surface-subtle)] px-1">/v1/extract?wait=false</code>. You will receive an immediate HTTP 200 payload containing the <code className="font-mono bg-[var(--surface-subtle)] px-1">job_id</code>.
              </p>
              <p>
                Poll <code className="font-mono bg-[var(--surface-subtle)] px-1">/v1/jobs/{`{id}`}</code> at 1 to 2 second intervals. When <code className="font-mono bg-[var(--surface-subtle)] px-1">status == &quot;done&quot;</code>, the full extraction schema is returned. If failed, <code className="font-mono bg-[var(--surface-subtle)] px-1">error_code</code> contains the machine failure reason.
              </p>
              <div className="p-3 border border-[var(--line-hairline)] rounded-sm bg-[var(--surface-subtle)] space-y-2">
                <div className="font-mono text-[11px] font-bold text-[var(--ink-primary)] uppercase">Job Lifecycle States:</div>
                <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                  <div className="p-1.5 border border-[var(--line-hairline)] rounded-sm text-center">
                    <span className="text-[var(--ink-muted)] block text-[10px]">STAGE 1</span>
                    <strong className="text-amber-600">queued</strong>
                  </div>
                  <div className="p-1.5 border border-[var(--line-hairline)] rounded-sm text-center">
                    <span className="text-[var(--ink-muted)] block text-[10px]">STAGE 2</span>
                    <strong className="text-blue-600">processing</strong>
                  </div>
                  <div className="p-1.5 border border-[var(--line-hairline)] rounded-sm text-center">
                    <span className="text-[var(--ink-muted)] block text-[10px]">STAGE 3</span>
                    <strong className="text-emerald-600">done / failed</strong>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 05: Direct Signed Storage URLs */}
            <section id="uploads" className="space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[var(--signal)] font-bold">05.</span>
                <h2 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                  Direct Signed Storage URLs
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="signal">POST</Badge>
                <code className="font-mono font-bold text-xs text-[var(--ink-primary)]">/v1/uploads/sign</code>
              </div>
              <p>
                Rule 6 Architectural Invariant: For documents over 10MB or client-side web apps, file bytes should never bottleneck the application server. Instead, use pre-signed object storage URLs.
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-[var(--ink-secondary)]">
                <li><strong className="text-[var(--ink-primary)]">Request URL:</strong> Call <code className="font-mono bg-[var(--surface-subtle)] px-1">/v1/uploads/sign</code> with <code className="font-mono bg-[var(--surface-subtle)] px-1">filename</code>, <code className="font-mono bg-[var(--surface-subtle)] px-1">mime</code>, and <code className="font-mono bg-[var(--surface-subtle)] px-1">size_bytes</code>.</li>
                <li><strong className="text-[var(--ink-primary)]">Direct PUT:</strong> Upload the binary file directly to S3/MinIO via HTTP PUT with the returned pre-signed URL (expires in 15 minutes).</li>
                <li><strong className="text-[var(--ink-primary)]">Execute:</strong> Trigger extraction via <code className="font-mono bg-[var(--surface-subtle)] px-1">/v1/extract?file_key={"{file_key}"}</code>.</li>
              </ol>
            </section>

            {/* Section 06: Webhooks */}
            <section id="webhooks" className="space-y-3 scroll-mt-24">
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

            {/* Section 07: Standard Error Envelopes */}
            <section id="errors" className="space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[var(--signal)] font-bold">07.</span>
                <h2 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                  Standard Error Envelopes
                </h2>
              </div>
              <p>
                All 4xx and 5xx responses strictly adhere to our predictable, machine-readable JSON error envelope:
              </p>
              <div className="p-3 border border-[var(--line-hairline)] rounded-sm bg-[var(--surface-sunken)] font-mono text-[11px] space-y-1">
                <div>{`{ "error": { "code": "...", "message": "...", "request_id": "..." } }`}</div>
              </div>
              <div className="space-y-2 pt-1">
                <div className="font-mono text-[11px] font-bold text-[var(--ink-primary)] uppercase">Standard Error Codes:</div>
                <div className="divide-y divide-[var(--line-hairline)] border border-[var(--line-hairline)] rounded-sm bg-[var(--surface-subtle)] font-mono text-[11px]">
                  <div className="p-2 flex justify-between items-center">
                    <span className="font-bold text-[var(--signal)]">FILE_TOO_LARGE</span>
                    <span className="text-[var(--ink-muted)]">HTTP 413 • Exceeds tier file size</span>
                  </div>
                  <div className="p-2 flex justify-between items-center">
                    <span className="font-bold text-[var(--signal)]">UNSUPPORTED_TYPE</span>
                    <span className="text-[var(--ink-muted)]">HTTP 415 • Disallowed MIME format</span>
                  </div>
                  <div className="p-2 flex justify-between items-center">
                    <span className="font-bold text-[var(--signal)]">TOO_MANY_PAGES</span>
                    <span className="text-[var(--ink-muted)]">HTTP 400 • Exceeds page limit</span>
                  </div>
                  <div className="p-2 flex justify-between items-center">
                    <span className="font-bold text-[var(--signal)]">QUOTA_EXCEEDED</span>
                    <span className="text-[var(--ink-muted)]">HTTP 429 • Daily credits exhausted</span>
                  </div>
                  <div className="p-2 flex justify-between items-center">
                    <span className="font-bold text-[var(--signal)]">RATE_LIMITED</span>
                    <span className="text-[var(--ink-muted)]">HTTP 429 • Window request limit hit</span>
                  </div>
                  <div className="p-2 flex justify-between items-center">
                    <span className="font-bold text-[var(--signal)]">JOB_NOT_FOUND</span>
                    <span className="text-[var(--ink-muted)]">HTTP 404 • Invalid or expired job ID</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 08: Rate Limits & Quota Headers */}
            <section id="ratelimits" className="space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[var(--signal)] font-bold">08.</span>
                <h2 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                  Rate Limits & Quota Headers
                </h2>
              </div>
              <p>
                Every API response includes standardized HTTP headers detailing your sliding window capacity and daily credit quota:
              </p>
              <div className="p-3 border border-[var(--line-hairline)] rounded-sm bg-[var(--surface-subtle)] space-y-2 font-mono text-[11px]">
                <div className="flex justify-between items-center border-b border-[var(--line-hairline)] pb-1">
                  <span className="font-bold text-[var(--ink-primary)]">X-RateLimit-Limit</span>
                  <span className="text-[var(--ink-muted)]">Permitted req/min (e.g. 60 or 300)</span>
                </div>
                <div className="flex justify-between items-center border-b border-[var(--line-hairline)] pb-1">
                  <span className="font-bold text-[var(--ink-primary)]">X-RateLimit-Remaining</span>
                  <span className="text-[var(--ink-muted)]">Requests remaining in current window</span>
                </div>
                <div className="flex justify-between items-center border-b border-[var(--line-hairline)] pb-1">
                  <span className="font-bold text-[var(--ink-primary)]">X-Quota-Limit</span>
                  <span className="text-[var(--ink-muted)]">Total daily credits for your plan</span>
                </div>
                <div className="flex justify-between items-center border-b border-[var(--line-hairline)] pb-1">
                  <span className="font-bold text-[var(--ink-primary)]">X-Quota-Remaining</span>
                  <span className="text-[var(--ink-muted)]">Unconsumed credits left today</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[var(--ink-primary)]">X-Quota-Reset</span>
                  <span className="text-[var(--ink-muted)]">Epoch Unix timestamp of midnight UTC</span>
                </div>
              </div>
              <p>
                If your client receives an HTTP 429, inspect the <code className="font-mono bg-[var(--surface-subtle)] px-1">Retry-After</code> header and apply jittered exponential backoff before repeating the request.
              </p>
            </section>
          </div>

          {/* Right Column: The SDK Patch Bay & Live Memory Tester (5 cols) */}
          <div className="lg:col-span-5 space-y-6 sticky top-20">
            {/* The SDK Patch Bay */}
            <div className="p-5 border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--line-hairline)] pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[var(--signal)]" />
                  <div>
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--ink-primary)] block">
                      The SDK Patch Bay
                    </span>
                    <span className="font-mono text-[10px] text-[var(--signal)]">
                      {activeSectionObj.number}. {activeSectionObj.title}
                    </span>
                  </div>
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

              {/* Dynamic Code Snippet based on activeSection and selectedLang */}
              <CodeBlock
                language={selectedLang}
                code={getSectionCode(activeSection, selectedLang)}
                showLineNumbers
              />
            </div>

            {/* Authoritative Live API Response Schema */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-[var(--ink-secondary)] uppercase tracking-wider">
                  Sample Protocol Response ({activeSectionObj.number})
                </span>
                <span className="text-[11px] text-[var(--semantic-success)] font-bold">200 OK</span>
              </div>
              <CodeBlock
                language="json"
                filename={`${activeSection}_payload.json`}
                code={getSectionSampleResponse(activeSection)}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
