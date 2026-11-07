"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
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
  Bot,
  LifeBuoy,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Info,
  Lightbulb,
  AlertOctagon,
  Printer,
  Share2,
  ThumbsUp,
  ThumbsDown,
  Download,
} from "lucide-react";

type CodeLang = "curl" | "python" | "typescript" | "csharp";

interface NavItem {
  id: string;
  title: string;
  category: string;
  badge?: string;
  keywords: string;
}

interface NavFolder {
  id: string;
  title: string;
  items: NavItem[];
}

const NAV_STRUCTURE: NavFolder[] = [
  {
    id: "overview",
    title: "Overview & Foundations",
    items: [
      { id: "intro", title: "What is OpenOCR?", category: "Overview", keywords: "introduction overview features invariants" },
      { id: "architecture", title: "Architecture & Pipeline", category: "Overview", badge: "Core", keywords: "topology normalizer parser llm omniroute" },
      { id: "quickstart", title: "Quickstart (5-Minute)", category: "Overview", keywords: "get started tutorial first request curl python" },
    ],
  },
  {
    id: "api-reference",
    title: "REST API Reference",
    items: [
      { id: "authentication", title: "Authentication & Keys", category: "API Reference", keywords: "bearer token x-api-key argon2id authorization" },
      { id: "endpoint-extract", title: "POST /v1/extract", category: "API Reference", badge: "Sync", keywords: "extract multipart synchronous wait preview bboxes" },
      { id: "endpoint-jobs", title: "POST /v1/jobs (Async)", category: "API Reference", badge: "Async", keywords: "jobs asynchronous queue polling worker redis" },
      { id: "endpoint-keys", title: "GET & POST /v1/keys", category: "API Reference", keywords: "api keys tier check permissions revoke" },
      { id: "endpoint-health", title: "GET /v1/health & Usage", category: "API Reference", keywords: "health check status quota limits usage" },
    ],
  },
  {
    id: "document-models",
    title: "Document Model Catalog",
    items: [
      { id: "model-invoices", title: "Invoices & Receipts", category: "Models", keywords: "invoice receipt line items tax total math balance" },
      { id: "model-identity", title: "ID Cards & Passports", category: "Models", badge: "MRZ", keywords: "passport mrz icao driving licence identity" },
      { id: "model-bank", title: "Bank Statements", category: "Models", keywords: "bank statement transactions balance reconciliation" },
      { id: "model-discovery", title: "Zero-Selection Discovery", category: "Models", keywords: "auto classification arbitrary forms contract resume" },
    ],
  },
  {
    id: "self-hosted",
    title: "Self-Hosted & Enterprise",
    items: [
      { id: "deployment-docker", title: "Docker Compose Setup", category: "Self-Hosted", badge: "Recommended", keywords: "docker compose production deployment standalone" },
      { id: "deployment-airgap", title: "Air-Gapped & Offline VPC", category: "Self-Hosted", keywords: "offline air gap on premise private no egress" },
      { id: "deployment-llm", title: "Multi-Model LLM Gateway", category: "Self-Hosted", keywords: "omniroute ollama gemini vllm local inference" },
      { id: "deployment-db", title: "PostgreSQL & Redis Scaling", category: "Self-Hosted", keywords: "migrations alembic asyncpg task workers redis" },
    ],
  },
  {
    id: "security-ops",
    title: "Security & Operations",
    items: [
      { id: "sec-retention", title: "Zero Retention Guarantee", category: "Security", keywords: "privacy gdpr zero data retention ephemeral memory" },
      { id: "sec-ratelimits", title: "Rate Limits & Quota Headers", category: "Security", keywords: "throttling sliding window retry after headers" },
      { id: "sec-errors", title: "RFC 7807 Error Envelopes", category: "Security", keywords: "problem details error codes 400 401 402 422 500" },
    ],
  },
];

export default function DocumentationPage() {
  const [activeId, setActiveId] = useState<string>("intro");
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    overview: true,
    "api-reference": true,
    "document-models": true,
    "self-hosted": true,
    "security-ops": true,
  });
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedLang, setSelectedLang] = useState<CodeLang>("curl");
  const [copiedKey, setCopiedKey] = useState(false);
  const [userRating, setUserRating] = useState<"yes" | "no" | null>(null);

  const toggleFolder = (folderId: string) => {
    setOpenFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Filter items in sidebar based on user search query
  const filteredFolders = useMemo(() => {
    if (!filterQuery.trim()) return NAV_STRUCTURE;
    const q = filterQuery.toLowerCase();
    return NAV_STRUCTURE.map((folder) => {
      const matchingItems = folder.items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.keywords.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
      );
      return {
        ...folder,
        items: matchingItems,
      };
    }).filter((folder) => folder.items.length > 0);
  }, [filterQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#000000] text-zinc-900 dark:text-[#f0f0f0] transition-colors selection:bg-[#9281f7]/30">
      <Header />

      {/* Microsoft Learn Sub-Header Bar with Breadcrumbs & Document Controls */}
      <div className="w-full border-b border-zinc-200 dark:border-[#292d30] bg-zinc-50/70 dark:bg-[#0b0e14]/70 px-4 sm:px-8 py-2 select-none">
        <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-4 text-xs font-mono">
          {/* Breadcrumb Hierarchy */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-zinc-500 dark:text-[#888c94] truncate">
            <Link href="/" className="hover:text-purple-600 dark:hover:text-[#9281f7] transition-colors">
              Docs
            </Link>
            <ChevronRight className="w-3 h-3 text-zinc-400 dark:text-[#555a64] shrink-0" />
            <span className="text-zinc-700 dark:text-[#b4b7bd]">OpenOCR Platform</span>
            <ChevronRight className="w-3 h-3 text-zinc-400 dark:text-[#555a64] shrink-0" />
            <span className="text-zinc-700 dark:text-[#b4b7bd]">Document Intelligence</span>
            <ChevronRight className="w-3 h-3 text-zinc-400 dark:text-[#555a64] shrink-0" />
            <span className="text-purple-600 dark:text-[#9281f7] font-semibold truncate">
              {NAV_STRUCTURE.flatMap((f) => f.items).find((i) => i.id === activeId)?.title || "API Reference"}
            </span>
          </nav>

          {/* Quick Action Tools */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-zinc-200 dark:border-[#292d30] bg-white dark:bg-[#000000] hover:bg-zinc-100 dark:hover:bg-[#14171f] text-zinc-600 dark:text-[#a1a4a5] hover:text-zinc-900 dark:hover:text-white transition-colors"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <Link
              href="/api"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-purple-200 dark:border-[#9281f7]/30 bg-purple-50 dark:bg-[#9281f7]/10 text-purple-700 dark:text-[#9281f7] hover:bg-purple-100 dark:hover:bg-[#9281f7]/20 transition-colors font-medium"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Manage API Keys</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Microsoft Learn 3-Pane Grid */}
      <div className="flex-1 w-full max-w-[1720px] mx-auto px-4 sm:px-8 py-6 flex gap-8 items-start">
        {/* Left Pane: Microsoft Tree Navigation (Width 300px) */}
        <aside className="w-72 xl:w-80 shrink-0 hidden lg:flex flex-col sticky top-24 max-h-[calc(100vh-120px)] border-r border-zinc-200 dark:border-[#292d30] pr-6 select-none font-sans">
          {/* Realtime Search / Filter Input */}
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400 dark:text-[#6e727a]" />
            <input
              type="text"
              placeholder="Filter by title or keyword..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs font-mono bg-zinc-100 dark:bg-[#0b0e14] border border-zinc-200 dark:border-[#292d30] rounded-[6px] text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-[#6e727a] focus:outline-none focus:border-purple-600 dark:focus:border-[#9281f7]"
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery("")}
                className="absolute right-2.5 top-2 text-[10px] font-mono text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
              >
                ×
              </button>
            )}
          </div>

          {/* Collapsible Hierarchy Tree */}
          <nav className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs scrollbar-thin">
            {filteredFolders.map((folder) => {
              const isOpen = openFolders[folder.id] ?? true;
              return (
                <div key={folder.id} className="space-y-1">
                  {/* Folder Group Header */}
                  <button
                    onClick={() => toggleFolder(folder.id)}
                    className="w-full flex items-center justify-between py-1 text-left font-semibold text-zinc-500 dark:text-[#888c94] uppercase tracking-wider text-[11px] hover:text-zinc-900 dark:hover:text-white transition-colors"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      {isOpen ? <FolderOpen className="w-3.5 h-3.5 text-purple-600 dark:text-[#9281f7]" /> : <Folder className="w-3.5 h-3.5" />}
                      <span className="truncate">{folder.title}</span>
                    </span>
                    {isOpen ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
                  </button>

                  {/* Folder Items */}
                  {isOpen && (
                    <div className="pl-2 border-l border-zinc-200 dark:border-[#1f2327] space-y-0.5 mt-1">
                      {folder.items.map((item) => {
                        const isActive = activeId === item.id;
                        return (
                          <a
                            key={item.id}
                            href={`#${item.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              setActiveId(item.id);
                              document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }}
                            className={`flex items-center justify-between py-1.5 px-2.5 rounded-[6px] text-xs transition-colors ${
                              isActive
                                ? "bg-purple-50 dark:bg-[#9281f7]/10 text-purple-700 dark:text-[#9281f7] font-medium border-l-2 border-purple-600 dark:border-[#9281f7]"
                                : "text-zinc-600 dark:text-[#a1a4a5] hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#0b0e14]"
                            }`}
                          >
                            <span className="truncate">{item.title}</span>
                            {item.badge && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-[#1f2327] text-zinc-600 dark:text-[#a1a4a5] shrink-0 ml-1">
                                {item.badge}
                              </span>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Quick Help Box */}
          <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-[#292d30] text-[11px] font-mono text-zinc-500 dark:text-[#888c94] space-y-1">
            <div className="flex items-center justify-between">
              <span>Platform Specs:</span>
              <span className="text-zinc-900 dark:text-white">v1.2.0-LTS</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Swagger Raw:</span>
              <Link href="/swagger" target="_blank" className="text-purple-600 dark:text-[#9281f7] hover:underline flex items-center gap-1">
                /swagger <ExternalLink className="w-2.5 h-2.5" />
              </Link>
            </div>
          </div>
        </aside>

        {/* Center Pane: Article Content (Flex 1) */}
        <main className="flex-1 min-w-0 max-w-4xl space-y-12">
          {/* Article Metadata Bar */}
          <div className="space-y-3 pb-6 border-b border-zinc-200 dark:border-[#292d30]">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-[4px] bg-purple-50 dark:bg-[#9281f7]/10 text-purple-700 dark:text-[#9281f7] font-mono text-[11px] font-semibold uppercase tracking-wider border border-purple-200 dark:border-[#9281f7]/30">
                Official Reference
              </span>
              <span className="text-xs text-zinc-500 dark:text-[#6e727a] font-mono">•</span>
              <span className="text-xs text-zinc-500 dark:text-[#a1a4a5] font-mono">Document Intelligence Platform</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-sans font-bold tracking-tight text-zinc-900 dark:text-white">
              OpenOCR Document Intelligence &amp; Self-Hosted API
            </h1>

            {/* Microsoft Learn Signature Article Stats */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500 dark:text-[#888c94] font-mono pt-1">
              <span>Article</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> 15 minutes to read
              </span>
              <span>•</span>
              <span>Updated: Nov 07, 2026</span>
              <span>•</span>
              <span>Contributors: 12 engineers</span>
            </div>
          </div>

          {/* Section 1: Intro */}
          <section id="intro" className="space-y-4 scroll-mt-28">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
              <span>What is OpenOCR?</span>
              <a href="#intro" className="text-zinc-400 hover:text-purple-600 text-sm">#</a>
            </h2>

            <p className="text-sm text-zinc-700 dark:text-[#c4c7cc] leading-relaxed">
              <strong>OpenOCR</strong> is a high-throughput, multimodal document intelligence system built for high-security, automated data extraction. Unlike legacy template-based OCR systems that require hand-drawn bounding box rules, OpenOCR utilizes <strong>zero-selection semantic synthesis</strong>: documents are auto-classified upon arrival, deskewed via GPU-accelerated rasterization, structurally parsed for cellular tables, and mapped to structured JSON schemas with objective confidence scores.
            </p>

            {/* Microsoft Alert: Note */}
            <div className="p-4 rounded-[8px] border-l-4 border-l-blue-500 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 text-xs text-zinc-800 dark:text-[#d0d4dc] space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-blue-700 dark:text-blue-400 font-sans uppercase tracking-wider text-[11px]">
                <Info className="w-4 h-4 shrink-0" />
                <span>Note</span>
              </div>
              <p className="leading-relaxed">
                OpenOCR provides an <strong>in-memory ephemeral architecture</strong>. All PDF rendering, OCR inference, and LLM reasoning occur strictly in volatile RAM. No image bytes or extracted text are permanently logged or written to storage, fulfilling strict HIPAA, GDPR, and SOC2 confidentiality controls.
              </p>
            </div>
          </section>

          {/* Section 2: Architecture */}
          <section id="architecture" className="space-y-4 scroll-mt-28">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
              <span>System Topology &amp; Invariants</span>
              <a href="#architecture" className="text-zinc-400 hover:text-purple-600 text-sm">#</a>
            </h2>

            <p className="text-sm text-zinc-700 dark:text-[#c4c7cc] leading-relaxed">
              Every document passes through five deterministic and isolated pipeline stages:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-[8px] border border-zinc-200 dark:border-[#292d30] bg-zinc-50/50 dark:bg-[#08080a] space-y-1.5 font-mono text-xs">
                <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white">
                  <span className="w-5 h-5 rounded bg-purple-100 dark:bg-[#9281f7]/20 text-purple-700 dark:text-[#9281f7] flex items-center justify-center text-[11px]">1</span>
                  <span>Stage 1: Geometry Normalization</span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-[#888c94] font-sans">
                  DPI scaling (72 to 300 DPI), affine perspective deskew, contrast leveling, and page dimension extraction via PyMuPDF.
                </p>
              </div>

              <div className="p-3.5 rounded-[8px] border border-zinc-200 dark:border-[#292d30] bg-zinc-50/50 dark:bg-[#08080a] space-y-1.5 font-mono text-xs">
                <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white">
                  <span className="w-5 h-5 rounded bg-purple-100 dark:bg-[#9281f7]/20 text-purple-700 dark:text-[#9281f7] flex items-center justify-center text-[11px]">2</span>
                  <span>Stage 2: Multimodal Visual Inference</span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-[#888c94] font-sans">
                  Visual token analysis via Gemini 2.5 Flash (or local Ollama/vLLM) to classify document topology and detect spatial semantics.
                </p>
              </div>

              <div className="p-3.5 rounded-[8px] border border-zinc-200 dark:border-[#292d30] bg-zinc-50/50 dark:bg-[#08080a] space-y-1.5 font-mono text-xs">
                <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white">
                  <span className="w-5 h-5 rounded bg-purple-100 dark:bg-[#9281f7]/20 text-purple-700 dark:text-[#9281f7] flex items-center justify-center text-[11px]">3</span>
                  <span>Stage 3: Cellular Matrix Structuring</span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-[#888c94] font-sans">
                  Extracts tables, row-column boundaries, and reading order using RapidOCR &amp; ONNX Runtime for complex tabular structures.
                </p>
              </div>

              <div className="p-3.5 rounded-[8px] border border-zinc-200 dark:border-[#292d30] bg-zinc-50/50 dark:bg-[#08080a] space-y-1.5 font-mono text-xs">
                <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white">
                  <span className="w-5 h-5 rounded bg-purple-100 dark:bg-[#9281f7]/20 text-purple-700 dark:text-[#9281f7] flex items-center justify-center text-[11px]">4</span>
                  <span>Stage 4: Deterministic Validation</span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-[#888c94] font-sans">
                  ICAO 9303 MRZ checksum calculations, invoice arithmetic balance verification (<code className="text-[10px]">subtotal + tax = total</code>), and strict empty field omission.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Quickstart */}
          <section id="quickstart" className="space-y-4 scroll-mt-28">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
              <span>Quickstart (5-Minute Integration)</span>
              <a href="#quickstart" className="text-zinc-400 hover:text-purple-600 text-sm">#</a>
            </h2>

            <p className="text-sm text-zinc-700 dark:text-[#c4c7cc] leading-relaxed">
              Extract any document file (<code className="text-xs font-mono bg-zinc-100 dark:bg-[#14171f] px-1 py-0.5 rounded">.pdf</code>, <code className="text-xs font-mono bg-zinc-100 dark:bg-[#14171f] px-1 py-0.5 rounded">.png</code>, <code className="text-xs font-mono bg-zinc-100 dark:bg-[#14171f] px-1 py-0.5 rounded">.jpg</code>, <code className="text-xs font-mono bg-zinc-100 dark:bg-[#14171f] px-1 py-0.5 rounded">.tiff</code>) with a single HTTP request:
            </p>

            {/* Microsoft Code Block with Language Tabs */}
            <div className="rounded-[8px] border border-zinc-200 dark:border-[#292d30] overflow-hidden bg-zinc-950 font-mono text-xs">
              <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900/90 text-zinc-400 select-none">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedLang("curl")}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${selectedLang === "curl" ? "bg-zinc-800 text-white font-semibold" : "hover:text-white"}`}
                  >
                    cURL
                  </button>
                  <button
                    onClick={() => setSelectedLang("python")}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${selectedLang === "python" ? "bg-zinc-800 text-white font-semibold" : "hover:text-white"}`}
                  >
                    Python (httpx)
                  </button>
                  <button
                    onClick={() => setSelectedLang("typescript")}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${selectedLang === "typescript" ? "bg-zinc-800 text-white font-semibold" : "hover:text-white"}`}
                  >
                    TypeScript (Node.js)
                  </button>
                  <button
                    onClick={() => setSelectedLang("csharp")}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${selectedLang === "csharp" ? "bg-zinc-800 text-white font-semibold" : "hover:text-white"}`}
                  >
                    C# (.NET)
                  </button>
                </div>

                <button
                  onClick={() => handleCopyCode(
                    selectedLang === "curl"
                      ? `curl -X POST "http://172.198.152.197/api/v1/extract?format=json" \\\n  -H "X-API-Key: ocr_live_your_key_here" \\\n  -F "file=@invoice.pdf"`
                      : selectedLang === "python"
                      ? `import httpx\n\nurl = "http://172.198.152.197/api/v1/extract?format=json"\nheaders = {"X-API-Key": "ocr_live_your_key_here"}\nwith open("invoice.pdf", "rb") as f:\n    resp = httpx.post(url, headers=headers, files={"file": f}, timeout=120.0)\n\nresult = resp.json()\nprint(f"Document Type: {result['doc_type']}")\nfor field in result['fields']:\n    print(f" • {field['label']}: {field['value']}")`
                      : selectedLang === "typescript"
                      ? `import fs from "fs";\nimport axios from "axios";\nimport FormData from "form-data";\n\nconst form = new FormData();\nform.append("file", fs.createReadStream("invoice.pdf"));\n\nconst { data } = await axios.post("http://172.198.152.197/api/v1/extract?format=json", form, {\n  headers: {\n    ...form.getHeaders(),\n    "X-API-Key": "ocr_live_your_key_here",\n  },\n  timeout: 120000,\n});\n\nconsole.log("Document Type:", data.doc_type);\nconsole.log("Extracted Fields:", data.fields);`
                      : `using System.Net.Http;\nusing System.IO;\n\nusing var client = new HttpClient();\nclient.DefaultRequestHeaders.Add("X-API-Key", "ocr_live_your_key_here");\n\nusing var form = new MultipartFormDataContent();\nusing var fileStream = File.OpenRead("invoice.pdf");\nform.Add(new StreamContent(fileStream), "file", "invoice.pdf");\n\nvar response = await client.PostAsync("http://172.198.152.197/api/v1/extract?format=json", form);\nvar json = await response.Content.ReadAsStringAsync();\nConsole.WriteLine(json);`
                  )}
                  className="flex items-center gap-1.5 text-xs hover:text-white text-zinc-400 transition-colors"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <div className="p-4 text-zinc-100 overflow-x-auto leading-relaxed">
                {selectedLang === "curl" && (
                  <pre>
                    <span className="text-zinc-500"># Direct synchronous document extraction</span>{"\n"}
                    <span className="text-purple-400">curl</span> -X POST <span className="text-emerald-300">"http://172.198.152.197/api/v1/extract?format=json"</span> \{"\n"}
                    {"  "}-H <span className="text-emerald-300">"X-API-Key: ocr_live_your_key_here"</span> \{"\n"}
                    {"  "}-F <span className="text-emerald-300">"file=@invoice.pdf"</span>
                  </pre>
                )}
                {selectedLang === "python" && (
                  <pre>
                    <span className="text-purple-400">import</span> httpx{"\n\n"}
                    url = <span className="text-emerald-300">"http://172.198.152.197/api/v1/extract?format=json"</span>{"\n"}
                    headers = {"{"}<span className="text-emerald-300">"X-API-Key"</span>: <span className="text-emerald-300">"ocr_live_your_key_here"</span>{"}"}{"\n\n"}
                    <span className="text-purple-400">with</span> open(<span className="text-emerald-300">"invoice.pdf"</span>, <span className="text-emerald-300">"rb"</span>) <span className="text-purple-400">as</span> f:{"\n"}
                    {"    "}resp = httpx.post(url, headers=headers, files={"{"}<span className="text-emerald-300">"file"</span>: f{"}"}, timeout=<span className="text-amber-300">120.0</span>){"\n\n"}
                    result = resp.json(){"\n"}
                    print(<span className="text-emerald-300">f"Doc Type: &#123;result['doc_type']&#125;"</span>){"\n"}
                    <span className="text-purple-400">for</span> field <span className="text-purple-400">in</span> result[<span className="text-emerald-300">'fields'</span>]:{"\n"}
                    {"    "}print(<span className="text-emerald-300">f" • &#123;field['label']&#125;: &#123;field['value']&#125;"</span>)
                  </pre>
                )}
                {selectedLang === "typescript" && (
                  <pre>
                    <span className="text-purple-400">import</span> fs <span className="text-purple-400">from</span> <span className="text-emerald-300">"fs"</span>;{"\n"}
                    <span className="text-purple-400">import</span> axios <span className="text-purple-400">from</span> <span className="text-emerald-300">"axios"</span>;{"\n"}
                    <span className="text-purple-400">import</span> FormData <span className="text-purple-400">from</span> <span className="text-emerald-300">"form-data"</span>;{"\n\n"}
                    <span className="text-purple-400">const</span> form = <span className="text-purple-400">new</span> FormData();{"\n"}
                    form.append(<span className="text-emerald-300">"file"</span>, fs.createReadStream(<span className="text-emerald-300">"invoice.pdf"</span>));{"\n\n"}
                    <span className="text-purple-400">const</span> &#123; data &#125; = <span className="text-purple-400">await</span> axios.post(<span className="text-emerald-300">"http://172.198.152.197/api/v1/extract?format=json"</span>, form, &#123;{"\n"}
                    {"  "}headers: &#123; ...form.getHeaders(), <span className="text-emerald-300">"X-API-Key"</span>: <span className="text-emerald-300">"ocr_live_your_key_here"</span> &#125;,{"\n"}
                    {"  "}timeout: <span className="text-amber-300">120000</span>,{"\n"}
                    &#125;);{"\n\n"}
                    console.log(<span className="text-emerald-300">"Extracted:"</span>, data.fields);
                  </pre>
                )}
                {selectedLang === "csharp" && (
                  <pre>
                    <span className="text-purple-400">using</span> System.Net.Http;{"\n"}
                    <span className="text-purple-400">using</span> System.IO;{"\n\n"}
                    <span className="text-purple-400">using var</span> client = <span className="text-purple-400">new</span> HttpClient();{"\n"}
                    client.DefaultRequestHeaders.Add(<span className="text-emerald-300">"X-API-Key"</span>, <span className="text-emerald-300">"ocr_live_your_key_here"</span>);{"\n\n"}
                    <span className="text-purple-400">using var</span> form = <span className="text-purple-400">new</span> MultipartFormDataContent();{"\n"}
                    <span className="text-purple-400">using var</span> stream = File.OpenRead(<span className="text-emerald-300">"invoice.pdf"</span>);{"\n"}
                    form.Add(<span className="text-purple-400">new</span> StreamContent(stream), <span className="text-emerald-300">"file"</span>, <span className="text-emerald-300">"invoice.pdf"</span>);{"\n\n"}
                    <span className="text-purple-400">var</span> response = <span className="text-purple-400">await</span> client.PostAsync(<span className="text-emerald-300">"http://172.198.152.197/api/v1/extract?format=json"</span>, form);{"\n"}
                    <span className="text-purple-400">var</span> json = <span className="text-purple-400">await</span> response.Content.ReadAsStringAsync();
                  </pre>
                )}
              </div>
            </div>
          </section>

          {/* Section 4: Authentication */}
          <section id="authentication" className="space-y-4 scroll-mt-28">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
              <span>Authentication &amp; API Key Tiers</span>
              <a href="#authentication" className="text-zinc-400 hover:text-purple-600 text-sm">#</a>
            </h2>

            <p className="text-sm text-zinc-700 dark:text-[#c4c7cc] leading-relaxed">
              OpenOCR supports two standard credential headers. Pass either of the following on every request:
            </p>

            {/* Microsoft Table */}
            <div className="overflow-x-auto border border-zinc-200 dark:border-[#292d30] rounded-[8px]">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-zinc-100 dark:bg-[#14171f] border-b border-zinc-200 dark:border-[#292d30] text-zinc-700 dark:text-[#a1a4a5] font-mono">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Header</th>
                    <th className="py-2.5 px-3 font-semibold">Example</th>
                    <th className="py-2.5 px-3 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-[#292d30] font-mono text-[11px]">
                  <tr className="hover:bg-zinc-50 dark:hover:bg-[#0b0e14]">
                    <td className="py-2 px-3 font-bold text-purple-600 dark:text-[#9281f7]">X-API-Key</td>
                    <td className="py-2 px-3 text-zinc-600 dark:text-[#a1a4a5]">ocr_live_4a89f...</td>
                    <td className="py-2 px-3 font-sans text-zinc-700 dark:text-[#c4c7cc]">Standard API Key header, recommended for server-to-server and microservice calls.</td>
                  </tr>
                  <tr className="hover:bg-zinc-50 dark:hover:bg-[#0b0e14]">
                    <td className="py-2 px-3 font-bold text-purple-600 dark:text-[#9281f7]">Authorization</td>
                    <td className="py-2 px-3 text-zinc-600 dark:text-[#a1a4a5]">Bearer ocr_live_4a89f...</td>
                    <td className="py-2 px-3 font-sans text-zinc-700 dark:text-[#c4c7cc]">RFC 6750 standard bearer authorization header.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Microsoft Alert: Important */}
            <div className="p-4 rounded-[8px] border-l-4 border-l-purple-500 bg-purple-50/70 dark:bg-[#9281f7]/10 border border-purple-200 dark:border-[#9281f7]/30 text-xs text-zinc-800 dark:text-[#d0d4dc] space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-purple-700 dark:text-[#9281f7] font-sans uppercase tracking-wider text-[11px]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Tier Requirement</span>
              </div>
              <p className="leading-relaxed">
                Direct programmatic API keys require a <strong>Developer</strong>, <strong>Pro</strong>, or <strong>Enterprise</strong> subscription. Free tier accounts can test documents via the Web Light Table Studio interface, but are blocked from generating automated API keys until upgraded.
              </p>
            </div>
          </section>

          {/* Section 5: POST /v1/extract */}
          <section id="endpoint-extract" className="space-y-4 scroll-mt-28">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">POST</span>
              <span>/v1/extract (Synchronous)</span>
              <a href="#endpoint-extract" className="text-zinc-400 hover:text-purple-600 text-sm">#</a>
            </h2>

            <p className="text-sm text-zinc-700 dark:text-[#c4c7cc] leading-relaxed">
              Executes synchronous document ingestion, rasterization, semantic vision reasoning, and structured JSON generation in a single HTTP request.
            </p>

            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-zinc-500 dark:text-[#888c94] pt-1">
              Request Parameters (Multipart Form-Data)
            </h3>

            <div className="overflow-x-auto border border-zinc-200 dark:border-[#292d30] rounded-[8px]">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-zinc-100 dark:bg-[#14171f] border-b border-zinc-200 dark:border-[#292d30] text-zinc-700 dark:text-[#a1a4a5] font-mono">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Parameter</th>
                    <th className="py-2.5 px-3 font-semibold">Type</th>
                    <th className="py-2.5 px-3 font-semibold">Required</th>
                    <th className="py-2.5 px-3 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-[#292d30] font-mono text-[11px]">
                  <tr className="hover:bg-zinc-50 dark:hover:bg-[#0b0e14]">
                    <td className="py-2 px-3 font-bold text-zinc-900 dark:text-white">file</td>
                    <td className="py-2 px-3 text-purple-600 dark:text-[#baa7ff]">Binary File</td>
                    <td className="py-2 px-3 text-rose-600 dark:text-rose-400 font-semibold">Required</td>
                    <td className="py-2 px-3 font-sans text-zinc-700 dark:text-[#c4c7cc]">The document binary (<code className="text-[10px]">PDF, PNG, JPG, WEBP, TIFF</code>). Max 50MB.</td>
                  </tr>
                  <tr className="hover:bg-zinc-50 dark:hover:bg-[#0b0e14]">
                    <td className="py-2 px-3 font-bold text-zinc-900 dark:text-white">format</td>
                    <td className="py-2 px-3 text-purple-600 dark:text-[#baa7ff]">String</td>
                    <td className="py-2 px-3 text-zinc-400">Optional</td>
                    <td className="py-2 px-3 font-sans text-zinc-700 dark:text-[#c4c7cc]">Desired schema response format: <code className="text-[10px]">json</code> (default), <code className="text-[10px]">markdown</code>, or <code className="text-[10px]">text</code>.</td>
                  </tr>
                  <tr className="hover:bg-zinc-50 dark:hover:bg-[#0b0e14]">
                    <td className="py-2 px-3 font-bold text-zinc-900 dark:text-white">max_pages</td>
                    <td className="py-2 px-3 text-purple-600 dark:text-[#baa7ff]">Integer</td>
                    <td className="py-2 px-3 text-zinc-400">Optional</td>
                    <td className="py-2 px-3 font-sans text-zinc-700 dark:text-[#c4c7cc]">Maximum pages to parse from PDF. Defaults to tier allowance (Free: 2, Pro: 500).</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-zinc-500 dark:text-[#888c94] pt-2">
              Response Structure (200 OK)
            </h3>

            <div className="rounded-[8px] border border-zinc-200 dark:border-[#292d30] overflow-hidden bg-zinc-950 p-4 font-mono text-xs text-zinc-100 overflow-x-auto">
              <pre>{`{
  "id": "ocr_153fa440a5374ab388244a54",
  "document_type": "invoice",
  "doc_type_confidence": 0.98,
  "overall_confidence": 0.96,
  "pages": 1,
  "latency_ms": 1420,
  "fields": [
    {
      "key": "invoice_number",
      "label": "Invoice Number",
      "value": "INV-2026-9041",
      "confidence": 0.99,
      "page": 1,
      "bbox": { "x": 420.5, "y": 85.0, "width": 84.0, "height": 14.5 },
      "box_source": "model"
    },
    {
      "key": "total_amount",
      "label": "Total Amount",
      "value": 1450.00,
      "confidence": 0.98,
      "page": 1,
      "bbox": { "x": 440.0, "y": 680.0, "width": 64.0, "height": 16.0 },
      "box_source": "model"
    }
  ],
  "tables": [
    {
      "id": "table_1",
      "headers": ["Description", "Quantity", "Unit Price", "Amount"],
      "rows": [
        ["Cloud Server Instance - Standard", "2", "$500.00", "$1000.00"],
        ["Dedicated Bandwidth Addon", "1", "$450.00", "$450.00"]
      ]
    }
  ]
}`}</pre>
            </div>
          </section>

          {/* Section 6: Self-Hosted Docker Deployment */}
          <section id="deployment-docker" className="space-y-4 scroll-mt-28">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
              <span>Self-Hosted Docker Deployment</span>
              <a href="#deployment-docker" className="text-zinc-400 hover:text-purple-600 text-sm">#</a>
            </h2>

            <p className="text-sm text-zinc-700 dark:text-[#c4c7cc] leading-relaxed">
              Deploy OpenOCR in your own private cloud, on-premises datacenter, or sovereign VPC with Docker Compose:
            </p>

            {/* Microsoft Code Block: Docker Compose */}
            <div className="rounded-[8px] border border-zinc-200 dark:border-[#292d30] overflow-hidden bg-zinc-950 font-mono text-xs">
              <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900/90 text-zinc-400 select-none">
                <span className="font-semibold text-zinc-300">docker-compose.selfhosted.yml</span>
                <button
                  onClick={() => handleCopyCode(
`version: '3.8'

services:
  web:
    image: ghcr.io/wahla-007/openocr-web:latest
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://api:8000
    depends_on:
      - api

  api:
    image: ghcr.io/wahla-007/openocr-api:latest
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:secure_pass@db:5432/openocr
      - REDIS_URL=redis://redis:6379/0
      - OMNIROUTE_BASE_URL=http://omniroute:20128/v1
    depends_on:
      - db
      - redis

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=secure_pass
      - POSTGRES_DB=openocr
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

volumes:
  pgdata:`
                  )}
                  className="flex items-center gap-1.5 text-xs hover:text-white text-zinc-400 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy YAML</span>
                </button>
              </div>

              <div className="p-4 text-zinc-100 overflow-x-auto leading-relaxed">
                <pre>{`version: '3.8'

services:
  web:
    image: ghcr.io/wahla-007/openocr-web:latest
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://api:8000
    depends_on:
      - api

  api:
    image: ghcr.io/wahla-007/openocr-api:latest
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:secure_pass@db:5432/openocr
      - REDIS_URL=redis://redis:6379/0
      - OMNIROUTE_BASE_URL=http://omniroute:20128/v1
    depends_on:
      - db
      - redis

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=secure_pass
      - POSTGRES_DB=openocr
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

volumes:
  pgdata:`}</pre>
              </div>
            </div>

            {/* Microsoft Alert: Tip */}
            <div className="p-4 rounded-[8px] border-l-4 border-l-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-xs text-zinc-800 dark:text-[#d0d4dc] space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400 font-sans uppercase tracking-wider text-[11px]">
                <Lightbulb className="w-4 h-4 shrink-0" />
                <span>Tip: Production Nginx Reverse Proxy</span>
              </div>
              <p className="leading-relaxed">
                Ensure your external reverse proxy (Nginx / Traefik / Envoy) has a <strong>read timeout of at least 300 seconds</strong> (<code className="font-mono">proxy_read_timeout 300s;</code>). Large or dense 50-page PDF extraction runs perform deep multi-chunk OCR that can run up to 45–90s without dropping socket connections.
              </p>
            </div>
          </section>

          {/* Section 7: Air-Gapped & Offline Deployment */}
          <section id="deployment-airgap" className="space-y-4 scroll-mt-28">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
              <span>Air-Gapped &amp; Offline VPC Deployment</span>
              <a href="#deployment-airgap" className="text-zinc-400 hover:text-purple-600 text-sm">#</a>
            </h2>

            <p className="text-sm text-zinc-700 dark:text-[#c4c7cc] leading-relaxed">
              For defense, banking, and confidential medical networks with <strong>zero external internet connectivity</strong>, OpenOCR can be bundled with completely local vision backends.
            </p>

            <div className="space-y-2 font-mono text-xs">
              <div className="p-3 bg-zinc-100 dark:bg-[#0b0e14] border border-zinc-200 dark:border-[#292d30] rounded-[6px]">
                <span className="text-zinc-500"># 1. Download offline standalone bundle</span>{"\n"}
                <span className="text-purple-600 dark:text-[#9281f7]">wget</span> https://releases.openocr.io/openocr-enterprise-selfhosted.tar.gz{"\n"}
                <span className="text-purple-600 dark:text-[#9281f7]">tar</span> -xzf openocr-enterprise-selfhosted.tar.gz{"\n"}
                <span className="text-purple-600 dark:text-[#9281f7]">cd</span> openocr-enterprise
              </div>
              <div className="p-3 bg-zinc-100 dark:bg-[#0b0e14] border border-zinc-200 dark:border-[#292d30] rounded-[6px]">
                <span className="text-zinc-500"># 2. Configure local Ollama / vLLM in .env</span>{"\n"}
                VISION_PROVIDER=ollama{"\n"}
                OLLAMA_BASE_URL=http://localhost:11434{"\n"}
                OLLAMA_MODEL=minicpm-v:latest
              </div>
            </div>
          </section>

          {/* Section 8: RFC 7807 Standard Error Codes */}
          <section id="sec-errors" className="space-y-4 scroll-mt-28">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
              <span>RFC 7807 Error Envelopes &amp; Troubleshooting</span>
              <a href="#sec-errors" className="text-zinc-400 hover:text-purple-600 text-sm">#</a>
            </h2>

            <p className="text-sm text-zinc-700 dark:text-[#c4c7cc] leading-relaxed">
              Every failed request returns standard RFC 7807 problem details with human-readable error messages and programmatic machine codes:
            </p>

            {/* Microsoft Error Codes Table */}
            <div className="overflow-x-auto border border-zinc-200 dark:border-[#292d30] rounded-[8px]">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-zinc-100 dark:bg-[#14171f] border-b border-zinc-200 dark:border-[#292d30] text-zinc-700 dark:text-[#a1a4a5] font-mono">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">HTTP Code</th>
                    <th className="py-2.5 px-3 font-semibold">Error Code</th>
                    <th className="py-2.5 px-3 font-semibold">Root Cause &amp; Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-[#292d30] font-mono text-[11px]">
                  <tr className="hover:bg-zinc-50 dark:hover:bg-[#0b0e14]">
                    <td className="py-2 px-3 font-bold text-amber-600 dark:text-amber-400">400</td>
                    <td className="py-2 px-3 text-zinc-900 dark:text-white font-bold">UNSUPPORTED_TYPE</td>
                    <td className="py-2 px-3 font-sans text-zinc-700 dark:text-[#c4c7cc]">Uploaded file format not supported. Ensure MIME type is PDF or image.</td>
                  </tr>
                  <tr className="hover:bg-zinc-50 dark:hover:bg-[#0b0e14]">
                    <td className="py-2 px-3 font-bold text-rose-600 dark:text-rose-400">401</td>
                    <td className="py-2 px-3 text-zinc-900 dark:text-white font-bold">UNAUTHORIZED</td>
                    <td className="py-2 px-3 font-sans text-zinc-700 dark:text-[#c4c7cc]">Missing or revoked API Key. Pass via <code className="text-[10px]">X-API-Key</code> or <code className="text-[10px]">Authorization: Bearer</code>.</td>
                  </tr>
                  <tr className="hover:bg-zinc-50 dark:hover:bg-[#0b0e14]">
                    <td className="py-2 px-3 font-bold text-amber-600 dark:text-amber-400">402</td>
                    <td className="py-2 px-3 text-zinc-900 dark:text-white font-bold">FREE_TIER_LIMIT</td>
                    <td className="py-2 px-3 font-sans text-zinc-700 dark:text-[#c4c7cc]">Account quota exhausted. Visit <Link href="/pricing" className="text-purple-600 dark:text-[#9281f7] underline">/pricing</Link> to upgrade.</td>
                  </tr>
                  <tr className="hover:bg-zinc-50 dark:hover:bg-[#0b0e14]">
                    <td className="py-2 px-3 font-bold text-purple-600 dark:text-[#9281f7]">429</td>
                    <td className="py-2 px-3 text-zinc-900 dark:text-white font-bold">RATE_LIMIT_EXCEEDED</td>
                    <td className="py-2 px-3 font-sans text-zinc-700 dark:text-[#c4c7cc]">Too many requests in sliding 60-second window. Inspect <code className="text-[10px]">Retry-After</code> header.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Microsoft Article Feedback Widget */}
          <div className="p-6 rounded-[12px] border border-zinc-200 dark:border-[#292d30] bg-zinc-50/70 dark:bg-[#08080a] flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Was this page helpful?</h4>
              <p className="text-xs text-zinc-500 dark:text-[#888c94]">Let us know how we can improve our documentation and developer guides.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setUserRating("yes")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium border transition-colors ${
                  userRating === "yes"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-bold"
                    : "border-zinc-200 dark:border-[#292d30] bg-white dark:bg-[#000000] text-zinc-700 dark:text-[#a1a4a5] hover:border-zinc-400"
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Yes</span>
              </button>
              <button
                onClick={() => setUserRating("no")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium border transition-colors ${
                  userRating === "no"
                    ? "border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 font-bold"
                    : "border-zinc-200 dark:border-[#292d30] bg-white dark:bg-[#000000] text-zinc-700 dark:text-[#a1a4a5] hover:border-zinc-400"
                }`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                <span>No</span>
              </button>
            </div>
          </div>
        </main>

        {/* Right Pane: Microsoft "In this article" (Sticky 240px) */}
        <aside className="w-56 xl:w-64 shrink-0 hidden xl:flex flex-col sticky top-24 max-h-[calc(100vh-120px)] border-l border-zinc-200 dark:border-[#292d30] pl-6 select-none font-sans text-xs">
          <span className="font-bold uppercase tracking-wider text-[11px] text-zinc-400 dark:text-[#6e727a] mb-3">
            In this article
          </span>

          <nav className="space-y-2 border-l border-transparent text-zinc-500 dark:text-[#888c94]">
            <a
              href="#intro"
              onClick={() => setActiveId("intro")}
              className={`block hover:text-purple-600 dark:hover:text-[#9281f7] transition-colors truncate ${activeId === "intro" ? "text-purple-600 dark:text-[#9281f7] font-semibold" : ""}`}
            >
              What is OpenOCR?
            </a>
            <a
              href="#architecture"
              onClick={() => setActiveId("architecture")}
              className={`block hover:text-purple-600 dark:hover:text-[#9281f7] transition-colors truncate ${activeId === "architecture" ? "text-purple-600 dark:text-[#9281f7] font-semibold" : ""}`}
            >
              System Topology
            </a>
            <a
              href="#quickstart"
              onClick={() => setActiveId("quickstart")}
              className={`block hover:text-purple-600 dark:hover:text-[#9281f7] transition-colors truncate ${activeId === "quickstart" ? "text-purple-600 dark:text-[#9281f7] font-semibold" : ""}`}
            >
              Quickstart (5-Minute)
            </a>
            <a
              href="#authentication"
              onClick={() => setActiveId("authentication")}
              className={`block hover:text-purple-600 dark:hover:text-[#9281f7] transition-colors truncate ${activeId === "authentication" ? "text-purple-600 dark:text-[#9281f7] font-semibold" : ""}`}
            >
              Authentication &amp; Tiers
            </a>
            <a
              href="#endpoint-extract"
              onClick={() => setActiveId("endpoint-extract")}
              className={`block hover:text-purple-600 dark:hover:text-[#9281f7] transition-colors truncate ${activeId === "endpoint-extract" ? "text-purple-600 dark:text-[#9281f7] font-semibold" : ""}`}
            >
              POST /v1/extract
            </a>
            <a
              href="#deployment-docker"
              onClick={() => setActiveId("deployment-docker")}
              className={`block hover:text-purple-600 dark:hover:text-[#9281f7] transition-colors truncate ${activeId === "deployment-docker" ? "text-purple-600 dark:text-[#9281f7] font-semibold" : ""}`}
            >
              Docker Compose Setup
            </a>
            <a
              href="#deployment-airgap"
              onClick={() => setActiveId("deployment-airgap")}
              className={`block hover:text-purple-600 dark:hover:text-[#9281f7] transition-colors truncate ${activeId === "deployment-airgap" ? "text-purple-600 dark:text-[#9281f7] font-semibold" : ""}`}
            >
              Air-Gapped &amp; Offline
            </a>
            <a
              href="#sec-errors"
              onClick={() => setActiveId("sec-errors")}
              className={`block hover:text-purple-600 dark:hover:text-[#9281f7] transition-colors truncate ${activeId === "sec-errors" ? "text-purple-600 dark:text-[#9281f7] font-semibold" : ""}`}
            >
              RFC 7807 Error Codes
            </a>
          </nav>

          <div className="mt-8 pt-4 border-t border-zinc-200 dark:border-[#292d30] space-y-2">
            <a
              href="https://github.com/Wahla-007/ocr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-zinc-500 hover:text-purple-600 dark:hover:text-[#9281f7] flex items-center justify-between"
            >
              <span>GitHub Repository</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <Link
              href="/support"
              className="text-[11px] text-zinc-500 hover:text-purple-600 dark:hover:text-[#9281f7] flex items-center justify-between"
            >
              <span>Submit Issue / Ticket</span>
              <LifeBuoy className="w-3 h-3" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
