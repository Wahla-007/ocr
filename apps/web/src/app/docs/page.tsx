"use client";

import React, { useState, useMemo } from "react";
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
  Server,
  Database,
  Search,
  CheckCircle2,
  HelpCircle,
  FileSpreadsheet,
  FileCode,
  ShieldAlert,
  KeyRound,
  RefreshCw,
  Cpu,
} from "lucide-react";

type CodeLang = "curl" | "python" | "typescript" | "go";
type WebhookLang = "python" | "node" | "go";
type SchemaType = "invoice" | "receipt" | "driving_license" | "contract";

export default function DocumentationPage() {
  const [selectedLang, setSelectedLang] = useState<CodeLang>("python");
  const [webhookLang, setWebhookLang] = useState<WebhookLang>("python");
  const [activeSchema, setActiveSchema] = useState<SchemaType>("invoice");
  const [testKey, setTestKey] = useState<string>("");
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [copiedKey, setCopiedKey] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickstartCopied, setQuickstartCopied] = useState(false);

  const sections = [
    { id: "overview", number: "01", group: "Foundations", title: "Architecture & Protocols", keywords: "invariants zero selection pymupdf pipeline architecture docling paddleocr" },
    { id: "auth", number: "02", group: "Foundations", title: "Authentication & Bearer Keys", keywords: "api key argon2id bearer header security tokens permissions csprng" },
    { id: "quickstart", number: "03", group: "Foundations", title: "5-Minute Quickstart", keywords: "quick start tutorial first request curl python sdk npm pip" },
    { id: "extract", number: "04", group: "Endpoints", title: "Document Extraction API", keywords: "extract post synchronous multipart file bounding box layout markdown json" },
    { id: "jobs", number: "05", group: "Endpoints", title: "Async Jobs & Status Polling", keywords: "jobs asynchronous queue polling batch worker redis celery" },
    { id: "uploads", number: "06", group: "Endpoints", title: "Direct Storage Uploads", keywords: "s3 minio presigned sign large files zero copy put bucket" },
    { id: "webhooks", number: "07", group: "Reliability", title: "HMAC Webhook Verification", keywords: "webhooks hmac sha256 timing attack constant time signature compare replay" },
    { id: "errors", number: "08", group: "Reliability", title: "Standard Error Envelopes", keywords: "rfc 7807 error codes 400 401 403 404 413 415 422 429 500 status codes" },
    { id: "ratelimits", number: "09", group: "Reliability", title: "Rate Limits & Quota Headers", keywords: "ratelimit quota headers sliding window retry after 429 throttle" },
    { id: "schemas", number: "10", group: "Intelligence", title: "Document Extraction Schemas", keywords: "schemas invoice receipt driving license contract nda pydantic types" },
    { id: "selfhosted", number: "11", group: "Intelligence", title: "Self-Hosted & Air-Gapped", keywords: "self hosted docker compose offline air gapped on premise private vpc" },
  ];

  const effectiveKey = testKey.trim() || "ocr_live_your_developer_key";

  const handleCopyKey = () => {
    navigator.clipboard.writeText(effectiveKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyQuickstart = () => {
    const cmd = `curl -X POST "https://api.openocr.io/v1/extract" \\\n  -H "Authorization: Bearer ${effectiveKey}" \\\n  -F "file=@invoice.pdf" \\\n  -F "wait=true"`;
    navigator.clipboard.writeText(cmd);
    setQuickstartCopied(true);
    setTimeout(() => setQuickstartCopied(false), 2000);
  };

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.keywords.toLowerCase().includes(q) ||
        s.number.includes(q) ||
        s.group.toLowerCase().includes(q)
    );
  }, [searchQuery, sections]);

  // Code snippets dynamically tailored to active section and selected language
  const getSectionCode = (sectionId: string, lang: CodeLang): string => {
    switch (sectionId) {
      case "overview":
        if (lang === "curl") {
          return `# Check OpenOCR Cluster Health & Engine Capabilities
curl -X GET "https://api.openocr.io/v1/health" \\
  -H "Accept: application/json"

# Returns:
# {
#   "status": "healthy",
#   "version": "1.0.0",
#   "engines": ["docling", "paddleocr", "rapidocr"],
#   "gpu_accelerated": true,
#   "timestamp_utc": "2026-10-29T05:20:00Z"
# }`;
        } else if (lang === "python") {
          return `import httpx

# Probe OpenOCR health & engine capabilities
resp = httpx.get("https://api.openocr.io/v1/health")
health = resp.json()

print(f"Cluster Status: {health['status']}")
print(f"Available Engines: {', '.join(health['engines'])}")
print(f"GPU Accelerated: {health['gpu_accelerated']}")`;
        } else if (lang === "typescript") {
          return `import axios from "axios";

// Check OpenOCR cluster capabilities & health
const { data: health } = await axios.get("https://api.openocr.io/v1/health");

console.log("Cluster Status:", health.status);
console.log("Engines:", health.engines.join(", "));
console.log("GPU Acceleration:", health.gpu_accelerated);`;
        } else {
          return `package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

func main() {
	resp, _ := http.Get("https://api.openocr.io/v1/health")
	defer resp.Body.Close()

	var health map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&health)
	fmt.Printf("Cluster Status: %v\\n", health["status"])
}`;
        }

      case "auth":
        if (lang === "curl") {
          return `# Validate API Key & Read Current Plan Scopes
curl -X GET "https://api.openocr.io/v1/usage" \\
  -H "Authorization: Bearer ${effectiveKey}"

# Response:
# {
#   "key_name": "Developer Production Key",
#   "plan": "developer",
#   "rate_limit_per_min": 300,
#   "daily_quota": 10000,
#   "remaining_today": 9420
# }`;
        } else if (lang === "python") {
          return `import httpx

headers = {"Authorization": "Bearer ${effectiveKey}"}

# Validate credentials and inspect available quota
resp = httpx.get("https://api.openocr.io/v1/usage", headers=headers)

if resp.status_code == 401:
    raise PermissionError("Invalid or revoked API key.")
    
usage = resp.json()
print(f"Plan: {usage['plan']} | Credits Remaining: {usage['remaining_today']}")`;
        } else if (lang === "typescript") {
          return `import axios from "axios";

const headers = { Authorization: "Bearer ${effectiveKey}" };

try {
  const { data: usage } = await axios.get("https://api.openocr.io/v1/usage", { headers });
  console.log(\`Authenticated under \${usage.plan} plan.\`);
  console.log(\`Credits remaining: \${usage.remaining_today}/\${usage.daily_quota}\`);
} catch (err: any) {
  if (err.response?.status === 401) {
    console.error("Authentication failed: Check your bearer token.");
  }
}`;
        } else {
          return `package main

import (
	"fmt"
	"net/http"
)

func checkAuth(key string) {
	req, _ := http.NewRequest("GET", "https://api.openocr.io/v1/usage", nil)
	req.Header.Set("Authorization", "Bearer "+key)

	resp, _ := http.DefaultClient.Do(req)
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		fmt.Println("API Key valid and authorized.")
	} else {
		fmt.Printf("Authorization failed: HTTP %d\\n", resp.StatusCode)
	}
}`;
        }

      case "quickstart":
        if (lang === "curl") {
          return `# 1-Line Extraction Quickstart
curl -X POST "https://api.openocr.io/v1/extract" \\
  -H "Authorization: Bearer ${effectiveKey}" \\
  -F "file=@document.pdf" \\
  -F "wait=true" \\
  -F "format=json"`;
        } else if (lang === "python") {
          return `import httpx

# Fast, typed document extraction
with open("invoice.pdf", "rb") as f:
    resp = httpx.post(
        "https://api.openocr.io/v1/extract",
        headers={"Authorization": "Bearer ${effectiveKey}"},
        files={"file": f},
        params={"wait": "true", "format": "json"}
    )

data = resp.json()
print(f"Doc Type: {data['doc_type']}")
for field in data["fields"]:
    print(f" • {field['label']}: {field['value']}")`;
        } else if (lang === "typescript") {
          return `import axios from "axios";
import fs from "fs";
import FormData from "form-data";

const form = new FormData();
form.append("file", fs.createReadStream("invoice.pdf"));

const { data } = await axios.post("https://api.openocr.io/v1/extract?wait=true", form, {
  headers: {
    ...form.getHeaders(),
    Authorization: "Bearer ${effectiveKey}",
  },
});

console.log("Document Type:", data.doc_type);
console.log("Fields:", data.fields);`;
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
	file, _ := os.Open("invoice.pdf")
	defer file.Close()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", "invoice.pdf")
	io.Copy(part, file)
	writer.Close()

	req, _ := http.NewRequest("POST", "https://api.openocr.io/v1/extract?wait=true", body)
	req.Header.Set("Authorization", "Bearer ${effectiveKey}")
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, _ := http.DefaultClient.Do(req)
	defer resp.Body.Close()
	fmt.Printf("HTTP Status: %s\\n", resp.Status)
}`;
        }

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

    # Step 2: Upload raw binary directly to storage (zero memory on API server)
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
        return `import hmac
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

      case "schemas":
        return `// Retrieve Schema Validation Definition Programmatically
curl -X GET "https://api.openocr.io/v1/schemas/${activeSchema}" \\
  -H "Authorization: Bearer ${effectiveKey}"

// Validates keys, types, bounding boxes, and arithmetic invariants`;

      case "selfhosted":
        return `# Self-Hosted Air-Gapped Run (Docker Compose)
version: '3.8'
services:
  openocr-api:
    image: openocr/api:latest
    environment:
      - DATABASE_URL=postgresql://postgres:secret@db:5432/openocr
      - REDIS_URL=redis://redis:6379/0
      - S3_ENDPOINT_URL=http://minio:9000
      - S3_BUCKET_NAME=openocr-raw
      - SELF_HOSTED_MODE=true
    ports:
      - "8000:8000"

  openocr-worker:
    image: openocr/worker:latest
    environment:
      - REDIS_URL=redis://redis:6379/0
      - S3_ENDPOINT_URL=http://minio:9000
      - OCR_ENGINE_PRIMARY=docling
      - OCR_ENGINE_FALLBACK=paddleocr`;

      default: // "extract"
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
	file, err := os.Open("commercial_invoice.pdf")
	if err != nil {
		panic(err)
	}
	defer file.Close()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", "commercial_invoice.pdf")
	io.Copy(part, file)
	writer.Close()

	req, _ := http.NewRequest("POST", "https://api.openocr.io/v1/extract?wait=true&format=json", body)
	req.Header.Set("Authorization", "Bearer ${effectiveKey}")
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	fmt.Printf("Extraction Response Status: %s\\n", resp.Status)
}`;
        }
    }
  };

  const getSectionSampleResponse = (sectionId: string): string => {
    switch (sectionId) {
      case "overview":
        return `{
  "status": "healthy",
  "version": "1.0.0",
  "engines": ["docling", "paddleocr", "rapidocr"],
  "gpu_accelerated": true,
  "cluster_region": "us-east-1",
  "uptime_seconds": 1849200
}`;
      case "auth":
        return `{
  "key_id": "key_8f0a21bc9e44",
  "name": "Developer Production Key",
  "plan": "developer",
  "active": true,
  "rate_limit_per_minute": 300,
  "daily_quota": 10000,
  "remaining_today": 9420,
  "scopes": ["extract:write", "jobs:read", "uploads:sign"]
}`;
      case "jobs":
        return `{
  "id": "job_91a02f81c4e2",
  "status": "done",
  "pages": 4,
  "latency_ms": 384.2,
  "doc_type": "tax_return",
  "doc_type_confidence": 0.998,
  "overall_confidence": 0.988,
  "fields_count": 32,
  "summary": "Form 1040 Individual Income Tax Return for Tax Year 2025. Adjusted Gross Income verified.",
  "completed_at": "2026-10-29T05:22:14Z"
}`;
      case "uploads":
        return `{
  "upload_url": "https://s3.us-east-1.amazonaws.com/openocr-raw/uploads/2026-10-29/heavy_docket_80mb.pdf?AWSAccessKeyId=AKIAIOSFODNN7EXAMPLE...",
  "file_key": "uploads/2026-10-29/heavy_docket_80mb.pdf",
  "expires_in_seconds": 900,
  "max_bytes": 104857600
}`;
      case "webhooks":
        return `{
  "event": "extraction.completed",
  "job_id": "job_91a02f81c4e2",
  "doc_type": "invoice",
  "status": "done",
  "delivery_attempt": 1,
  "timestamp": 1729900000,
  "result_url": "https://api.openocr.io/v1/jobs/job_91a02f81c4e2"
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
      case "schemas":
        if (activeSchema === "invoice") {
          return `{
  "doc_type": "invoice",
  "invoice_number": "INV-2026-4092",
  "vendor": {
    "name": "Acme Precision Robotics GmbH",
    "tax_id": "DE-814920482",
    "address": "Industriestrasse 42, 70565 Stuttgart"
  },
  "customer": {
    "name": "Apex Automation Systems Inc",
    "address": "400 Valley Road, Suite 200, Austin TX"
  },
  "dates": {
    "issue_date": "2026-10-14",
    "due_date": "2026-11-13"
  },
  "totals": {
    "currency": "USD",
    "subtotal": 5200.00,
    "tax_amount": 956.00,
    "total_amount": 6156.00
  },
  "validation": {
    "is_valid": true,
    "arithmetic_check": "5200.00 + 956.00 == 6156.00"
  }
}`;
        } else if (activeSchema === "receipt") {
          return `{
  "doc_type": "receipt",
  "merchant": {
    "name": "Starlight Artisan Cafe & Roasters",
    "store_id": "LOC-042",
    "address": "128 Market St, San Francisco, CA"
  },
  "transaction": {
    "timestamp": "2026-10-28T09:14:22Z",
    "cashier": "Morgan B.",
    "payment_method": "Visa *4092"
  },
  "financials": {
    "subtotal": 24.50,
    "tax": 2.15,
    "tip": 4.00,
    "total": 30.65
  }
}`;
        } else if (activeSchema === "driving_license") {
          return `{
  "doc_type": "driving_license",
  "jurisdiction": "California DMV",
  "license_number": "D9402914",
  "holder": {
    "full_name": "ELENA MARIE ROSTOVA",
    "date_of_birth": "1994-06-18",
    "address": "840 ORCHARD WAY, PALO ALTO, CA 94301"
  },
  "validity": {
    "issued": "2023-07-01",
    "expires": "2028-06-18",
    "class": "C - NONCOMMERCIAL"
  },
  "biometric": {
    "portrait_detected": true,
    "signature_present": true
  }
}`;
        } else {
          return `{
  "doc_type": "contract",
  "title": "Mutual Non-Disclosure & Intellectual Property Assignment",
  "execution_date": "2026-10-01",
  "parties": [
    { "role": "Disclosing Party", "name": "Vanguard Autonomous Corp" },
    { "role": "Receiving Party", "name": "Quantum Kinetics Labs LLC" }
  ],
  "governing_law": "State of Delaware",
  "confidentiality_duration_months": 36,
  "signatures": {
    "party_a_signed": true,
    "party_b_signed": true
  }
}`;
        }

      case "selfhosted":
        return `{
  "status": "healthy",
  "mode": "self_hosted",
  "air_gapped": true,
  "gpu_available": false,
  "ocr_backends": ["docling", "paddleocr", "rapidocr"],
  "external_network_calls": 0,
  "billing_disabled": true
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
      "page": 1,
      "bbox": { "x": 380, "y": 42, "width": 140, "height": 18 }
    },
    {
      "key": "total_amount",
      "label": "Total Amount",
      "value": 6156.00,
      "page": 2,
      "bbox": { "x": 420, "y": 620, "width": 110, "height": 22 }
    }
  ]
}`;
    }
  };

  const activeSectionObj = sections.find((s) => s.id === activeSection) || sections[0];
  const groups = Array.from(new Set(sections.map((s) => s.group)));

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--ink-primary)] transition-colors">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Top Header & Breadcrumb */}
        <div className="border-b border-[var(--line-strong)] pb-6 mb-8">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[var(--signal)] font-bold tracking-wider uppercase">
              Documentation
            </span>
            <span className="text-zinc-400">/</span>
            <Badge variant="outline">API SPECIFICATION v1.0</Badge>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
            <div>
              <h1 className="text-3xl font-serif font-bold text-[var(--ink-primary)] tracking-tight">
                OpenOCR Developer Documentation & API Reference
              </h1>
              <p className="text-xs sm:text-sm text-[var(--ink-secondary)] mt-1 max-w-3xl">
                Comprehensive technical guide for zero-selection document intelligence, asynchronous worker queues, direct storage uploads, timing-safe HMAC webhooks, and air-gapped clusters.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/pricing">
                <Button variant="outline" size="sm" leftIcon={<KeyRound className="w-3.5 h-3.5" />}>
                  Get Live Key
                </Button>
              </Link>
              <Link href="/self-hosted">
                <Button variant="outline" size="sm" leftIcon={<Server className="w-3.5 h-3.5" />}>
                  Self-Hosted Blueprint
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 3-Column Layout: Sidebar Index (3 cols) | Technical Narrative (5 cols) | Interactive SDK Patch Bay (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Sticky Grouped Index & Quick Filter (3 cols) */}
          <nav className="lg:col-span-3 hidden lg:block sticky top-20 space-y-4 select-none font-mono text-xs border-r border-[var(--line-hairline)] pr-4">
            {/* Quick Filter Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--ink-muted)]" />
              <input
                type="text"
                placeholder="Filter docs... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-[var(--surface-sunken)] border border-[var(--line-hairline)] rounded-sm text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--signal)]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-2 text-[10px] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Grouped Section Links */}
            <div className="space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
              {groups.map((group) => {
                const groupSections = filteredSections.filter((s) => s.group === group);
                if (groupSections.length === 0) return null;

                return (
                  <div key={group} className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)] block mb-1">
                      {group}
                    </span>
                    {groupSections.map((s) => (
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
                        <span className="text-[11px]">{s.title}</span>
                      </a>
                    ))}
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-[var(--line-hairline)] space-y-2">
              <Link
                href="/pricing"
                className="text-[11px] text-[var(--ink-muted)] hover:text-[var(--signal)] flex items-center justify-between"
              >
                <span>Rate Card & Quotas</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
              <Link
                href="/self-hosted"
                className="text-[11px] text-[var(--ink-muted)] hover:text-[var(--signal)] flex items-center justify-between"
              >
                <span>Self-Hosted Cluster</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </nav>

          {/* Middle Column: Detailed Technical Specification Narrative (5 cols) */}
          <div className="lg:col-span-5 space-y-14 text-xs text-[var(--ink-secondary)] leading-relaxed">
            {/* Section 01: Architecture & Overview */}
            <section id="overview" className="space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[var(--signal)] font-bold">01.</span>
                <h2 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                  Architecture & Protocol Invariants
                </h2>
              </div>
              <p>
                OpenOCR exposes a pure RESTful interface versioned under <code className="font-mono text-[var(--ink-primary)] bg-[var(--surface-subtle)] px-1 py-0.5 rounded-sm">/v1</code>. Every extraction operates under <strong>zero schema selection</strong>: documents are classified first, normalized via PyMuPDF, analyzed by deterministic layout engines, and structured via isolated LLM layers.
              </p>
              <div className="p-3 bg-[var(--surface-subtle)] border border-[var(--line-hairline)] rounded-sm space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[var(--ink-primary)]">Base Production URL:</span>
                  <Badge variant="signal">PRODUCTION</Badge>
                </div>
                <div className="text-[var(--signal)] font-bold">https://api.openocr.io/v1</div>
                <div className="text-[10px] text-[var(--ink-muted)] pt-1 border-t border-[var(--line-hairline)]">
                  Self-hosted default: <code className="text-[var(--ink-primary)]">http://localhost:8000/v1</code>
                </div>
              </div>
              <div className="p-3 border border-[var(--line-hairline)] rounded-sm space-y-2">
                <div className="font-mono text-[11px] font-bold text-[var(--ink-primary)] uppercase flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-[var(--signal)]" />
                  <span>Processing Pipeline Topology:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 font-mono text-[11px] text-[var(--ink-secondary)]">
                  <li><strong>Ingestion:</strong> Multi-part stream or S3 zero-copy storage key.</li>
                  <li><strong>Normalizer:</strong> PyMuPDF rendering to vector primitives (72 to 300 DPI).</li>
                  <li><strong>Layout Parser:</strong> IBM Docling extracts reading order, tables, and bounding boxes.</li>
                  <li><strong>Fallback OCR:</strong> PaddleOCR / RapidOCR triggered on degraded or skewed text.</li>
                  <li><strong>Structuring Layer:</strong> Post-processor validates schema and calculates confidence.</li>
                </ol>
              </div>
            </section>

            {/* Section 02: Authentication */}
            <section id="auth" className="space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[var(--signal)] font-bold">02.</span>
                <h2 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                  Authentication & Bearer Keys
                </h2>
              </div>
              <p>
                Programmatic API calls require an API key passed via the standard HTTP Bearer header:
              </p>
              <div className="p-2.5 bg-[var(--surface-sunken)] border border-[var(--line-strong)] font-mono text-xs rounded-sm text-[var(--ink-primary)] flex items-center justify-between">
                <span>Authorization: Bearer ocr_live_your_developer_key</span>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                  title="Copy Header"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p>
                Keys are generated with a CSPRNG and hashed using Argon2id in our database. API keys are exempt from cookie CSRF checks but subject to per-key rate limits (120 to 600 req/min).
              </p>
              <div className="p-3 border border-[var(--line-hairline)] rounded-sm bg-[var(--surface-subtle)] space-y-2">
                <div className="font-mono text-[11px] font-bold text-[var(--ink-primary)] uppercase">Key Prefix Conventions:</div>
                <ul className="space-y-1 font-mono text-[11px] text-[var(--ink-secondary)]">
                  <li>• <strong className="text-[var(--ink-primary)]">ocr_live_*</strong>: Production keys with live credit metering.</li>
                  <li>• <strong className="text-[var(--ink-primary)]">ocr_test_*</strong>: Sandbox keys with synthetic responses.</li>
                </ul>
              </div>
            </section>

            {/* Section 03: 5-Minute Quickstart */}
            <section id="quickstart" className="space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[var(--signal)] font-bold">03.</span>
                <h2 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                  5-Minute Integration Quickstart
                </h2>
              </div>
              <p>
                Get your first document extracted in under two minutes with zero SDK dependencies using cURL or your language of choice:
              </p>
              <div className="p-4 bg-[var(--surface-sunken)] border border-[var(--signal)]/40 rounded-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-[var(--signal)] uppercase">
                    Step 1: Execute Extraction via Terminal
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyQuickstart}
                    className="text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] flex items-center gap-1"
                  >
                    {quickstartCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{quickstartCopied ? "Copied" : "Copy cURL"}</span>
                  </button>
                </div>
                <div className="font-mono text-[11px] bg-[var(--surface-base)] p-2.5 rounded-sm overflow-x-auto text-[var(--ink-primary)]">
                  curl -X POST &quot;https://api.openocr.io/v1/extract&quot; \<br />
                  &nbsp;&nbsp;-H &quot;Authorization: Bearer {effectiveKey}&quot; \<br />
                  &nbsp;&nbsp;-F &quot;file=@invoice.pdf&quot; \<br />
                  &nbsp;&nbsp;-F &quot;wait=true&quot;
                </div>
                <div className="text-[11px] text-[var(--ink-secondary)]">
                  Notice that you did not specify a document template. OpenOCR auto-detects the invoice structure, verifies math integrity, and extracts typed key-value pairs with exact page coordinates.
                </div>
              </div>
            </section>

            {/* Section 04: Document Extraction API */}
            <section id="extract" className="space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[var(--signal)] font-bold">04.</span>
                <h2 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                  Document Extraction API
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

            {/* Section 05: Async Jobs & Polling */}
            <section id="jobs" className="space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[var(--signal)] font-bold">05.</span>
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

            {/* Section 06: Direct Storage Uploads */}
            <section id="uploads" className="space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[var(--signal)] font-bold">06.</span>
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

            {/* Section 07: Webhooks */}
            <section id="webhooks" className="space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[var(--signal)] font-bold">07.</span>
                <h2 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                  HMAC Webhook Verification
                </h2>
              </div>
              <p>
                Every asynchronous webhook payload is signed with an HMAC-SHA256 signature passed in the <code className="font-mono bg-[var(--surface-subtle)] px-1">X-OpenOCR-Signature</code> header. You must verify this signature using constant-time comparison to defeat timing attacks.
              </p>
              <p>
                Signatures use the standard format <code className="font-mono bg-[var(--surface-subtle)] px-1">t={"{timestamp}"},v1={"{hmac_hex}"}</code>. Payloads older than 300 seconds are rejected to protect against replay attacks.
              </p>

              {/* Ready-to-Copy Webhook Code Tabs */}
              <div className="p-3 border border-[var(--line-strong)] rounded-sm bg-[var(--surface-sunken)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-[var(--ink-primary)] uppercase">
                    Verification Implementations:
                  </span>
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    {(["python", "node", "go"] as WebhookLang[]).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setWebhookLang(lang)}
                        className={`px-1.5 py-0.5 rounded-sm uppercase font-bold ${
                          webhookLang === lang
                            ? "bg-[var(--signal)] text-white"
                            : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="font-mono text-[11px] overflow-x-auto text-[var(--ink-secondary)]">
                  {webhookLang === "python" && (
                    <pre className="text-[11px] leading-relaxed">
{`import hmac, hashlib, time

def verify(body: bytes, sig_header: str, secret: str) -> bool:
    parts = dict(p.split("=") for p in sig_header.split(","))
    if abs(time.time() - int(parts["t"])) > 300:
        return False # Replay protection
    signed = f"{parts['t']}.".encode() + body
    expected = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, parts["v1"])`}
                    </pre>
                  )}
                  {webhookLang === "node" && (
                    <pre className="text-[11px] leading-relaxed">
{`const crypto = require("crypto");

function verify(rawBody, sigHeader, secret) {
  const parts = Object.fromEntries(sigHeader.split(",").map(p => p.split("=")));
  if (Math.abs(Date.now()/1000 - Number(parts.t)) > 300) return false;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(\`\${parts.t}.\`);
  hmac.update(rawBody);
  const expected = Buffer.from(hmac.digest("hex"));
  const actual = Buffer.from(parts.v1);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}`}
                    </pre>
                  )}
                  {webhookLang === "go" && (
                    <pre className="text-[11px] leading-relaxed">
{`package webhook

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "math"
    "time"
)

func Verify(body []byte, ts int64, sig, secret string) bool {
    if math.Abs(float64(time.Now().Unix() - ts)) > 300 {
        return false // Replay window exceeded
    }
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write([]byte(fmt.Sprintf("%d.", ts)))
    mac.Write(body)
    expected := hex.EncodeToString(mac.Sum(nil))
    return hmac.Equal([]byte(expected), []byte(sig))
}`}
                    </pre>
                  )}
                </div>
              </div>
            </section>

            {/* Section 08: Standard Error Envelopes */}
            <section id="errors" className="space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[var(--signal)] font-bold">08.</span>
                <h2 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                  Standard Error Envelopes & Recovery Catalog
                </h2>
              </div>
              <p>
                All 4xx and 5xx responses strictly adhere to our predictable, machine-readable JSON error envelope:
              </p>
              <div className="p-3 border border-[var(--line-hairline)] rounded-sm bg-[var(--surface-sunken)] font-mono text-[11px] space-y-1">
                <div>{`{ "error": { "code": "...", "message": "...", "request_id": "..." } }`}</div>
              </div>
              <div className="space-y-2 pt-1">
                <div className="font-mono text-[11px] font-bold text-[var(--ink-primary)] uppercase">Standard Error Codes Matrix:</div>
                <div className="divide-y divide-[var(--line-hairline)] border border-[var(--line-hairline)] rounded-sm bg-[var(--surface-subtle)] font-mono text-[11px]">
                  <div className="p-2 flex justify-between items-center">
                    <div>
                      <strong className="text-[var(--signal)]">UNAUTHORIZED</strong>
                      <span className="text-[var(--ink-muted)] block text-[10px]">HTTP 401 • Missing or invalid bearer key</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-bold">Inspect Authorization header</span>
                  </div>
                  <div className="p-2 flex justify-between items-center">
                    <div>
                      <strong className="text-[var(--signal)]">FILE_TOO_LARGE</strong>
                      <span className="text-[var(--ink-muted)] block text-[10px]">HTTP 413 • Exceeds tier file size (10MB-100MB)</span>
                    </div>
                    <span className="text-[10px] text-blue-600 font-bold">Use /v1/uploads/sign</span>
                  </div>
                  <div className="p-2 flex justify-between items-center">
                    <div>
                      <strong className="text-[var(--signal)]">UNSUPPORTED_TYPE</strong>
                      <span className="text-[var(--ink-muted)] block text-[10px]">HTTP 415 • Disallowed MIME format</span>
                    </div>
                    <span className="text-[10px] text-[var(--ink-muted)]">PDF, PNG, JPG, TIFF, WEBP</span>
                  </div>
                  <div className="p-2 flex justify-between items-center">
                    <div>
                      <strong className="text-[var(--signal)]">TOO_MANY_PAGES</strong>
                      <span className="text-[var(--ink-muted)] block text-[10px]">HTTP 422 • Exceeds plan page maximum</span>
                    </div>
                    <span className="text-[10px] text-amber-600 font-bold">Split pages or upgrade</span>
                  </div>
                  <div className="p-2 flex justify-between items-center">
                    <div>
                      <strong className="text-[var(--signal)]">QUOTA_EXCEEDED</strong>
                      <span className="text-[var(--ink-muted)] block text-[10px]">HTTP 429 • Daily credits exhausted</span>
                    </div>
                    <span className="text-[10px] text-amber-600 font-bold">Top-up or wait UTC reset</span>
                  </div>
                  <div className="p-2 flex justify-between items-center">
                    <div>
                      <strong className="text-[var(--signal)]">RATE_LIMITED</strong>
                      <span className="text-[var(--ink-muted)] block text-[10px]">HTTP 429 • Sliding window request limit reached</span>
                    </div>
                    <span className="text-[10px] text-blue-600 font-bold">Check Retry-After header</span>
                  </div>
                  <div className="p-2 flex justify-between items-center">
                    <div>
                      <strong className="text-[var(--signal)]">JOB_NOT_FOUND</strong>
                      <span className="text-[var(--ink-muted)] block text-[10px]">HTTP 404 • Invalid or expired job ID (24h TTL)</span>
                    </div>
                    <span className="text-[10px] text-[var(--ink-muted)]">Verify job ID</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 09: Rate Limits & Quota Headers */}
            <section id="ratelimits" className="space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[var(--signal)] font-bold">09.</span>
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
                  <span className="text-[var(--ink-muted)]">Permitted req/min (e.g. 120, 300, 600)</span>
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

            {/* Section 10: Document Schemas & Models */}
            <section id="schemas" className="space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[var(--signal)] font-bold">10.</span>
                <h2 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                  Document Extraction Schemas
                </h2>
              </div>
              <p>
                OpenOCR zero-schema engine classifies incoming files and extracts structured models matching these verified schemas:
              </p>

              {/* Interactive Schema Tabs */}
              <div className="flex items-center gap-1.5 font-mono text-[11px] border-b border-[var(--line-hairline)] pb-2">
                {(["invoice", "receipt", "driving_license", "contract"] as SchemaType[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setActiveSchema(st)}
                    className={`px-2.5 py-1 rounded-sm capitalize transition-colors font-bold ${
                      activeSchema === st
                        ? "bg-[var(--signal)] text-white"
                        : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subtle)]"
                    }`}
                  >
                    {st.replace("_", " ")}
                  </button>
                ))}
              </div>

              {/* Dynamic Schema Details */}
              <div className="p-3.5 border border-[var(--line-hairline)] rounded-sm bg-[var(--surface-subtle)] space-y-2 font-mono text-[11px]">
                {activeSchema === "invoice" && (
                  <>
                    <div className="font-bold text-[var(--ink-primary)] flex items-center justify-between">
                      <span>Commercial Invoice Schema (`invoice`)</span>
                      <Badge variant="signal">FINANCIAL AUDIT</Badge>
                    </div>
                    <ul className="space-y-1 text-[var(--ink-secondary)]">
                      <li>• <strong className="text-[var(--ink-primary)]">invoice_number</strong>: string (alphanumeric invoice code)</li>
                      <li>• <strong className="text-[var(--ink-primary)]">vendor</strong>: {`{ name, tax_id, address, iban }`}</li>
                      <li>• <strong className="text-[var(--ink-primary)]">customer</strong>: {`{ name, address, tax_id }`}</li>
                      <li>• <strong className="text-[var(--ink-primary)]">totals</strong>: {`{ currency, subtotal, tax_amount, total_amount }`}</li>
                      <li>• <strong className="text-[var(--ink-primary)]">validation</strong>: Arithmetic check verified: subtotal + tax == total</li>
                    </ul>
                  </>
                )}
                {activeSchema === "receipt" && (
                  <>
                    <div className="font-bold text-[var(--ink-primary)] flex items-center justify-between">
                      <span>Retail Receipt Schema (`receipt`)</span>
                      <Badge variant="outline">POINT OF SALE</Badge>
                    </div>
                    <ul className="space-y-1 text-[var(--ink-secondary)]">
                      <li>• <strong className="text-[var(--ink-primary)]">merchant</strong>: {`{ name, store_id, address }`}</li>
                      <li>• <strong className="text-[var(--ink-primary)]">transaction</strong>: {`{ timestamp, cashier, payment_method }`}</li>
                      <li>• <strong className="text-[var(--ink-primary)]">financials</strong>: {`{ subtotal, tax, tip, total }`}</li>
                      <li>• <strong className="text-[var(--ink-primary)]">items</strong>: Itemized line matrix with quantity & price</li>
                    </ul>
                  </>
                )}
                {activeSchema === "driving_license" && (
                  <>
                    <div className="font-bold text-[var(--ink-primary)] flex items-center justify-between">
                      <span>Identity & Driver&apos;s License Schema (`driving_license`)</span>
                      <Badge variant="outline">GOV AUDIT</Badge>
                    </div>
                    <ul className="space-y-1 text-[var(--ink-secondary)]">
                      <li>• <strong className="text-[var(--ink-primary)]">license_number</strong>: Normalized government identifier</li>
                      <li>• <strong className="text-[var(--ink-primary)]">holder</strong>: {`{ full_name, date_of_birth, address }`}</li>
                      <li>• <strong className="text-[var(--ink-primary)]">validity</strong>: {`{ issued, expires, class }`}</li>
                      <li>• <strong className="text-[var(--ink-primary)]">biometric</strong>: Face portrait and signature detection flags</li>
                    </ul>
                  </>
                )}
                {activeSchema === "contract" && (
                  <>
                    <div className="font-bold text-[var(--ink-primary)] flex items-center justify-between">
                      <span>Legal Agreement & NDA Schema (`contract`)</span>
                      <Badge variant="outline">LEGAL SPEC</Badge>
                    </div>
                    <ul className="space-y-1 text-[var(--ink-secondary)]">
                      <li>• <strong className="text-[var(--ink-primary)]">title</strong>: Formal contract or NDA header title</li>
                      <li>• <strong className="text-[var(--ink-primary)]">parties</strong>: Array of legal signatories and corporate entities</li>
                      <li>• <strong className="text-[var(--ink-primary)]">governing_law</strong>: Designated jurisdiction / state</li>
                      <li>• <strong className="text-[var(--ink-primary)]">signatures</strong>: Signature verification & timestamp flags</li>
                    </ul>
                  </>
                )}
              </div>
            </section>

            {/* Section 11: Self-Hosted & Air-Gapped */}
            <section id="selfhosted" className="space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[var(--signal)] font-bold">11.</span>
                <h2 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                  Self-Hosted & Air-Gapped Deployment
                </h2>
              </div>
              <p>
                OpenOCR is 100% self-hosted capable. The platform can operate in completely air-gapped VPCs with zero outbound internet requests.
              </p>
              <ul className="list-disc list-inside space-y-1 font-mono text-[11px] text-[var(--ink-secondary)]">
                <li>• <strong className="text-[var(--ink-primary)]">Zero CDN reliance:</strong> All fonts, glyphs, and assets are local static bundles.</li>
                <li>• <strong className="text-[var(--ink-primary)]">Local OCR Backends:</strong> IBM Docling (primary layout parser) with PaddleOCR and RapidOCR fallbacks.</li>
                <li>• <strong className="text-[var(--ink-primary)]">Billing Bypass:</strong> In self-hosted mode, payment gateways and subscription checks are completely deactivated.</li>
              </ul>
              <div className="pt-2">
                <Link href="/self-hosted">
                  <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                    View Full Self-Hosted Blueprint
                  </Button>
                </Link>
              </div>
            </section>
          </div>

          {/* Right Column: The SDK Patch Bay & Live Memory Tester (4 cols) */}
          <div className="lg:col-span-4 space-y-6 sticky top-20">
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
                  <span>Live Key Injector:</span>
                  <span className="text-[10px] text-emerald-600">Memory only</span>
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
                <span className="text-[11px] text-emerald-600 font-bold">200 OK</span>
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
