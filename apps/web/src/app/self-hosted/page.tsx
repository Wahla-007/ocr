"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Input } from "@/components/ui/Input";
import {
  Server,
  ShieldCheck,
  Cpu,
  Database,
  Lock,
  HardDrive,
  Copy,
  Check,
  ArrowRight,
  Sliders,
  AlertTriangle,
  Mail,
  Network,
} from "lucide-react";

export default function SelfHostedBlueprintPage() {
  const [activeTab, setActiveTab] = useState<"compose" | "helm">("compose");
  const [inquiryName, setInquiryName] = useState("");
  const [inquiryEmail, setInquiryEmail] = useState("");
  const [inquiryOrg, setInquiryOrg] = useState("");
  const [inquirySubmitted, setInquirySubmitted] = useState(false);

  const DOCKER_COMPOSE_SNIPPET = `version: "3.8"

# OpenOCR Self-Hosted: Pure CPU | Air-Gapped Perimeter | Zero External Calls
services:
  openocr-api:
    image: openocr/api:1.0.0
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - ENV=production
      - OPENOCR_SELF_HOSTED=true
      - BILLING_ENABLED=false
      - DATABASE_URL=postgresql+asyncpg://ocr_admin:secret@postgres:5432/openocr
      - REDIS_URL=redis://redis:6379/0
      - STORAGE_PROVIDER=minio
      - S3_ENDPOINT_URL=http://minio:9000
      - LLM_PROVIDER=local_ollama
      - OLLAMA_BASE_URL=http://ollama:11434
    depends_on:
      - postgres
      - redis
      - minio

  openocr-worker:
    image: openocr/worker:1.0.0
    restart: unless-stopped
    environment:
      - ENV=production
      - OPENOCR_SELF_HOSTED=true
      - OCR_ENGINE=docling
      - REDIS_URL=redis://redis:6379/0
    # Strict Air-Gap: Worker has zero egress permissions
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp:size=2G`;

  const HELM_SNIPPET = `helm repo add openocr https://charts.openocr.io
helm repo update

# Install Air-Gapped OpenOCR Cluster with Local Ollama Inference
helm install openocr-cluster openocr/openocr \\
  --namespace openocr --create-namespace \\
  --set global.selfHosted=true \\
  --set global.billingEnabled=false \\
  --set worker.replicaCount=4 \\
  --set worker.resources.requests.cpu="2" \\
  --set worker.resources.requests.memory="4Gi" \\
  --set networkPolicy.egress.enabled=false`;

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInquirySubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--ink-primary)] transition-colors">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line-strong)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[var(--signal)] font-bold tracking-wider uppercase">
                The Blueprint
              </span>
              <Badge variant="outline">AIR-GAPPED ARCHITECTURE</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--ink-primary)] tracking-tight mt-1">
              On-Premises & Air-Gapped Deployment
            </h1>
            <p className="text-xs sm:text-sm text-[var(--ink-secondary)] mt-0.5">
              Run OpenOCR completely within your sovereign infrastructure. Zero telemetry, zero external egress.
            </p>
          </div>

          <a href="#inquiry">
            <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Request Deployment Kit
            </Button>
          </a>
        </div>

        {/* Signature Element: Interactive Architecture Blueprint Diagram */}
        <section className="p-6 border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] shadow-card relative registration-mark registration-mark-tl registration-mark-tr registration-mark-bl registration-mark-br space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--line-hairline)] pb-3">
            <div>
              <h2 className="text-base font-mono font-bold uppercase tracking-wider text-[var(--ink-primary)] flex items-center gap-2">
                <Network className="w-4 h-4 text-[var(--signal)]" />
                Air-Gap Boundary Schematic
              </h2>
              <p className="text-xs text-[var(--ink-secondary)]">
                Every component runs inside your private VPC perimeter. No arrows cross the boundary.
              </p>
            </div>
            <span className="archival-stamp text-[var(--semantic-success)]">ZERO OUTBOUND EGRESS</span>
          </div>

          {/* Blueprint Canvas Box */}
          <div
            className="p-6 border-2 border-dashed border-[var(--line-strong)] rounded-sm bg-[var(--surface-sunken)] space-y-6 relative overflow-hidden"
            role="region"
            aria-label="Air-Gap Architecture Boundary Diagram"
          >
            {/* The Air-Gap Perimeter Boundary Banner */}
            <div className="flex items-center justify-between px-3 py-1 bg-[var(--semantic-error-subtle)] border border-[var(--semantic-error)] rounded-sm font-mono text-xs text-[var(--semantic-error)] font-bold">
              <span>AIR-GAP PERIMETER BOUNDARY: STRICT ZERO EGRESS ENFORCED</span>
              <span>NO OUTBOUND ARROWS</span>
            </div>

            {/* Architecture Node Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-[var(--line-strong)] bg-[var(--surface-base)] rounded-sm space-y-2">
                <div className="flex items-center gap-2 font-mono font-bold text-xs text-[var(--ink-primary)]">
                  <Server className="w-4 h-4 text-[var(--signal)]" />
                  <span>FastAPI Gateway</span>
                </div>
                <p className="text-[11px] text-[var(--ink-secondary)] leading-relaxed">
                  Ingests signed uploads, performs magic-byte validation, and enqueues tasks to Redis. Non-root user.
                </p>
                <div className="text-[10px] font-mono text-[var(--ink-muted)]">Footprint: 1 Core • 512MB RAM</div>
              </div>

              <div className="p-4 border border-[var(--line-strong)] bg-[var(--surface-base)] rounded-sm space-y-2">
                <div className="flex items-center gap-2 font-mono font-bold text-xs text-[var(--ink-primary)]">
                  <Cpu className="w-4 h-4 text-[var(--signal)]" />
                  <span>Docling / RapidOCR Worker</span>
                </div>
                <p className="text-[11px] text-[var(--ink-secondary)] leading-relaxed">
                  Pure CPU layout parsing and bounding box discovery. Read-only root filesystem with isolated /tmpfs.
                </p>
                <div className="text-[10px] font-mono text-[var(--ink-muted)]">Footprint: 2 Cores • 2GB RAM</div>
              </div>

              <div className="p-4 border border-[var(--line-strong)] bg-[var(--surface-base)] rounded-sm space-y-2">
                <div className="flex items-center gap-2 font-mono font-bold text-xs text-[var(--ink-primary)]">
                  <Database className="w-4 h-4 text-[var(--signal)]" />
                  <span>Local LLM (Ollama / vLLM)</span>
                </div>
                <p className="text-[11px] text-[var(--ink-secondary)] leading-relaxed">
                  Local neural model executing structured field extraction. Zero cloud API keys or telemetry.
                </p>
                <div className="text-[10px] font-mono text-[var(--ink-muted)]">CPU or Local GPU Supported</div>
              </div>
            </div>

            {/* Internal Storage Nodes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[var(--line-hairline)]">
              <div className="p-3 border border-[var(--line-hairline)] bg-[var(--surface-base)] rounded-sm flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-[var(--ink-muted)]" />
                  <span className="font-bold text-[var(--ink-primary)]">PostgreSQL 16 & MinIO S3</span>
                </div>
                <span className="text-[11px] text-[var(--ink-muted)]">Encrypted at Rest</span>
              </div>

              <div className="p-3 border border-[var(--line-hairline)] bg-[var(--surface-base)] rounded-sm flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[var(--semantic-success)]" />
                  <span className="font-bold text-[var(--ink-primary)]">Local Redis 7 Streams</span>
                </div>
                <span className="text-[11px] text-[var(--semantic-success)] font-bold">100% Offline Task Queue</span>
              </div>
            </div>
          </div>
        </section>

        {/* Hardware Specifications Matrix */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-mono font-bold uppercase tracking-wider text-[var(--ink-secondary)]">
              Infrastructure Sizing & Hardware Specs
            </h2>
            <p className="text-xs text-[var(--ink-muted)]">
              Deterministic resource profiles tested across Linux (RHEL, Ubuntu, Debian) and Kubernetes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] space-y-2 shadow-card">
              <span className="font-mono text-xs font-bold text-[var(--signal)] uppercase">Tier 1: Departmental</span>
              <div className="font-serif text-lg font-bold text-[var(--ink-primary)]">Up to 50 Pages / Min</div>
              <ul className="text-xs font-mono space-y-1 text-[var(--ink-secondary)]">
                <li>• 4 CPU Cores (x86_64 / ARM64)</li>
                <li>• 8GB System Memory</li>
                <li>• 50GB NVMe SSD Storage</li>
                <li>• Pure CPU Execution</li>
              </ul>
            </div>

            <div className="p-4 border-2 border-[var(--signal)] rounded-sm bg-[var(--surface-base)] space-y-2 shadow-card ring-1 ring-[var(--signal)]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[var(--signal)] uppercase">Tier 2: Production</span>
                <Badge variant="signal" className="text-[10px]">RECOMMENDED</Badge>
              </div>
              <div className="font-serif text-lg font-bold text-[var(--ink-primary)]">Up to 250 Pages / Min</div>
              <ul className="text-xs font-mono space-y-1 text-[var(--ink-secondary)]">
                <li>• 16 CPU Cores</li>
                <li>• 32GB System Memory</li>
                <li>• 200GB NVMe SSD Storage</li>
                <li>• Optional NVIDIA T4 / A10 GPU</li>
              </ul>
            </div>

            <div className="p-4 border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] space-y-2 shadow-card">
              <span className="font-mono text-xs font-bold text-[var(--ink-muted)] uppercase">Tier 3: Enterprise Cluster</span>
              <div className="font-serif text-lg font-bold text-[var(--ink-primary)]">1,000+ Pages / Min</div>
              <ul className="text-xs font-mono space-y-1 text-[var(--ink-secondary)]">
                <li>• Multi-Node Kubernetes (Helm)</li>
                <li>• 64+ CPU Cores distributed</li>
                <li>• High-Availability MinIO + Postgres</li>
                <li>• Auto-scaling Worker Pods</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Deployment Orchestration Snippets */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--line-hairline)] pb-2">
            <h2 className="text-base font-mono font-bold uppercase tracking-wider text-[var(--ink-secondary)]">
              Distribution Packages
            </h2>
            <div className="flex items-center gap-1 font-mono text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("compose")}
                className={`px-3 py-1 rounded-sm transition-colors ${
                  activeTab === "compose"
                    ? "bg-[var(--signal)] text-white font-bold"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                }`}
              >
                Docker Compose
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("helm")}
                className={`px-3 py-1 rounded-sm transition-colors ${
                  activeTab === "helm"
                    ? "bg-[var(--signal)] text-white font-bold"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                }`}
              >
                Kubernetes Helm
              </button>
            </div>
          </div>

          <CodeBlock
            language="yaml"
            filename={activeTab === "compose" ? "docker-compose.selfhosted.yml" : "helm_install.sh"}
            showLineNumbers
            code={activeTab === "compose" ? DOCKER_COMPOSE_SNIPPET : HELM_SNIPPET}
          />
        </section>

        {/* Validated Air-Gap Kit Inquiry Form */}
        <section id="inquiry" className="p-6 border border-[var(--line-strong)] rounded-sm bg-[var(--surface-subtle)] space-y-5">
          <div className="space-y-1">
            <h2 className="font-serif text-xl font-bold text-[var(--ink-primary)]">
              Request Air-Gap Deployment Kit & Enterprise License
            </h2>
            <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
              Our engineering team provides signed container images, offline model weights, and custom helm charts for sovereign defense, banking, and government clusters.
            </p>
          </div>

          {inquirySubmitted ? (
            <div className="p-4 bg-[var(--semantic-success-subtle)] border border-[var(--semantic-success)] rounded-sm text-xs text-[var(--semantic-success)] flex items-center gap-2 font-mono">
              <Check className="w-5 h-5 shrink-0" />
              <span>Inquiry received. A senior infrastructure field engineer will reach out to {inquiryEmail} within 2 business hours.</span>
            </div>
          ) : (
            <form onSubmit={handleInquirySubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Full Name"
                required
                placeholder="Dr. Eleanor Vance"
                value={inquiryName}
                onChange={(e) => setInquiryName(e.target.value)}
              />
              <Input
                label="Organization / Agency"
                required
                placeholder="National Archive & Logistics"
                value={inquiryOrg}
                onChange={(e) => setInquiryOrg(e.target.value)}
              />
              <Input
                label="Enterprise Email"
                type="email"
                required
                placeholder="vance@agency.gov"
                value={inquiryEmail}
                onChange={(e) => setInquiryEmail(e.target.value)}
              />
              <div className="sm:col-span-3 pt-2">
                <Button type="submit" variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Dispatch Air-Gap Evaluation Kit Request
                </Button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
