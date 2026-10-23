"use client";

import React, { useEffect, useState } from "react";
import { Header } from "../components/Header";
import { DropZone } from "../components/DropZone";
import { PipelineStepper } from "../components/PipelineStepper";
import { DocumentViewer } from "../components/DocumentViewer";
import { ResultsPanel } from "../components/ResultsPanel";
import { DeveloperModal } from "../components/DeveloperModal";
import {
  ExtractionResult,
  PipelineProgress,
} from "../lib/types";
import {
  checkBackendHealth,
  DEFAULT_API_KEY,
  DEFAULT_API_URL,
  uploadAndExtract,
} from "../lib/api";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function PlaygroundPage() {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [creditsBalance, setCreditsBalance] = useState(10000);
  const [isDeveloperModalOpen, setIsDeveloperModalOpen] = useState(false);
  const [developerModalInitialTab, setDeveloperModalInitialTab] = useState<"quickstart" | "keys" | "pricing" | "endpoints">("quickstart");

  // Active Document & Extraction State (null initially: upload-only first screen)
  const [activeFileName, setActiveFileName] = useState<string>("");
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);

  // Interaction State (Linked highlighting between canvas & sidebar)
  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);
  const [hoveredFieldKey, setHoveredFieldKey] = useState<string | null>(null);

  // Pipeline Execution State
  const [isProcessing, setIsProcessing] = useState(false);
  const [waitMode, setWaitMode] = useState(true);
  const [outputFormat, setOutputFormat] = useState<"json" | "markdown" | "text">("json");
  const [progress, setProgress] = useState<PipelineProgress>({
    stage: "idle",
    progressPercent: 0,
    message: "",
    elapsedMs: 0,
  });

  // Check backend health periodically
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const healthy = await checkBackendHealth(apiUrl);
      if (mounted) setIsBackendConnected(healthy);
    };
    check();
    const interval = setInterval(check, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [apiUrl]);

  const handleFileSelected = async (file: File) => {
    setActiveFileName(file.name);
    setIsProcessing(true);
    setSelectedFieldKey(null);

    // Immediately generate preview URL so image renders reliably
    if (file.type.startsWith("image/")) {
      try {
        const objUrl = URL.createObjectURL(file);
        setUploadedPreviewUrl(objUrl);
      } catch {}
    }

    const startTime = Date.now();
    setProgress({
      stage: "uploading",
      progressPercent: 15,
      message: `Uploading ${file.name}...`,
      elapsedMs: 0,
    });

    try {
      const res = await uploadAndExtract(
        file,
        apiKey,
        apiUrl,
        waitMode,
        outputFormat,
        (stageMsg, percent) => {
          let stage: PipelineProgress["stage"] = "uploading";
          if (percent >= 90) stage = "extracting";
          else if (percent >= 70) stage = "parsing";
          else if (percent >= 45) stage = "normalizing";

          setProgress({
            stage,
            progressPercent: percent,
            message: stageMsg,
            elapsedMs: Date.now() - startTime,
          });
        }
      );

      setResult(res);
      setProgress({
        stage: "completed",
        progressPercent: 100,
        message: `Extracted ${(res.document_type || res.doc_type || "DOCUMENT").toUpperCase()} in ${Date.now() - startTime}ms`,
        elapsedMs: Date.now() - startTime,
      });

      // Deduct credits in ledger
      const charged = res.credits_charged ?? res.usage?.credits ?? 25;
      setCreditsBalance((prev) => Math.max(0, prev - charged));
    } catch (err: any) {
      setProgress({
        stage: "error",
        progressPercent: 100,
        message: err.message || "Extraction failed",
        elapsedMs: Date.now() - startTime,
        error: err.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navigation */}
      <Header
        isBackendConnected={isBackendConnected}
        apiUrl={apiUrl}
        setApiUrl={setApiUrl}
        apiKey={apiKey}
        setApiKey={setApiKey}
        creditsBalance={creditsBalance}
        onGoToUpload={() => {
          setResult(null);
          setActiveFileName("");
        }}
        onOpenDeveloperModal={(tab) => {
          if (tab) setDeveloperModalInitialTab(tab);
          setIsDeveloperModalOpen(true);
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* ========================================================================= */}
        {/* VIEW 1: FIRST PAGE (UPLOAD / DRAG & DROP ONLY)                            */}
        {/* ========================================================================= */}
        {!result && (
          <div className="max-w-3xl mx-auto space-y-8 py-8 sm:py-14">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-xs">
                <span>Fast & Accurate Document Intelligence</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Universal Document OCR
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
                Zero-selection extraction for invoices, receipts, identity documents, contracts, and reports. Upload any file to get structured JSON, Markdown, and plain text.
              </p>
            </div>

            {/* Drop Zone */}
            <DropZone
              onFileSelected={handleFileSelected}
              isProcessing={isProcessing}
              waitMode={waitMode}
              setWaitMode={setWaitMode}
              outputFormat={outputFormat}
              setOutputFormat={setOutputFormat}
            />

            {/* Pipeline Stepper (Visible strictly during processing) */}
            {isProcessing && (
              <PipelineStepper progress={progress} />
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: EXTRACTION WORKSPACE (DOCUMENT PREVIEW & RESULTS)                 */}
        {/* ========================================================================= */}
        {result && (
          <div className="space-y-5">
            {/* Dynamic Document Header based on auto-detected type */}
            {(() => {
              const rawType = (result.document_type || result.detected_type || result.doc_type || "document").toLowerCase();
              const formattedType = rawType
                .replace(/_/g, " ")
                .replace(/\b\w/g, (char) => char.toUpperCase());
              const dynamicTitle = `${formattedType} OCR`;
              return (
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>Auto-Detected: {formattedType}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                    {dynamicTitle}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                    Zero-shot structured schema extraction and multimodal layout parsing for {formattedType.toLowerCase()} documents.
                  </p>
                </div>
              );
            })()}

            {/* Workspace Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setResult(null);
                    setActiveFileName("");
                    setUploadedPreviewUrl(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Upload Another Document</span>
                </button>
                <div className="h-4 w-px bg-slate-800 hidden sm:block" />
                <span className="text-xs font-mono text-slate-400 truncate max-w-[180px] sm:max-w-xs">
                  {activeFileName}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider uppercase bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
                  {result.document_type || result.detected_type || result.doc_type}
                </span>
                {result.latency_ms && (
                  <span className="text-xs text-slate-500 font-mono hidden sm:inline">
                    {result.latency_ms}ms
                  </span>
                )}
              </div>
            </div>

            {/* Split Screen Workspace: Document Canvas (Left) & Extraction Results (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Panel: Document Canvas with Bounding Box Overlays (Sticky & snug fit) */}
              <div className="lg:col-span-7 sticky top-20 self-start">
                <DocumentViewer
                  fileName={activeFileName}
                  result={result}
                  selectedFieldKey={selectedFieldKey}
                  onSelectField={setSelectedFieldKey}
                  hoveredFieldKey={hoveredFieldKey}
                  onHoverField={setHoveredFieldKey}
                  uploadedPreviewUrl={uploadedPreviewUrl}
                />
              </div>

              {/* Right Panel: Multimodal Extraction Results & Inspector */}
              <div className="lg:col-span-5">
                <ResultsPanel
                  result={result}
                  selectedFieldKey={selectedFieldKey}
                  onSelectField={setSelectedFieldKey}
                  hoveredFieldKey={hoveredFieldKey}
                  onHoverField={setHoveredFieldKey}
                  apiUrl={apiUrl}
                  apiKey={apiKey}
                  activeFormat={outputFormat}
                  onFormatChange={setOutputFormat}
                  onReset={() => {
                    setResult(null);
                    setActiveFileName("");
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer matching Screenshot */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-2.5">
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[11px] font-mono">
                Product
              </p>
              <ul className="space-y-1.5">
                <li><button onClick={() => { setDeveloperModalInitialTab("quickstart"); setIsDeveloperModalOpen(true); }} className="hover:text-slate-300 transition-colors text-left cursor-pointer">API Playground</button></li>
                <li><button onClick={() => { setDeveloperModalInitialTab("pricing"); setIsDeveloperModalOpen(true); }} className="hover:text-slate-300 transition-colors text-left cursor-pointer">Pricing ($0.001)</button></li>
                <li><button onClick={() => { setDeveloperModalInitialTab("endpoints"); setIsDeveloperModalOpen(true); }} className="hover:text-slate-300 transition-colors text-left cursor-pointer">Self-hosted</button></li>
              </ul>
            </div>
            <div className="space-y-2.5">
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[11px] font-mono">
                Developers
              </p>
              <ul className="space-y-1.5">
                <li><button onClick={() => { setDeveloperModalInitialTab("quickstart"); setIsDeveloperModalOpen(true); }} className="hover:text-slate-300 transition-colors text-left cursor-pointer">Quickstart Guide</button></li>
                <li><button onClick={() => { setDeveloperModalInitialTab("endpoints"); setIsDeveloperModalOpen(true); }} className="hover:text-slate-300 transition-colors text-left cursor-pointer">API Endpoints</button></li>
                <li><button onClick={() => { setDeveloperModalInitialTab("keys"); setIsDeveloperModalOpen(true); }} className="hover:text-slate-300 transition-colors text-left cursor-pointer">API Keys & Balance</button></li>
                <li><button onClick={() => { setDeveloperModalInitialTab("pricing"); setIsDeveloperModalOpen(true); }} className="hover:text-slate-300 transition-colors text-left cursor-pointer">Cost Calculator</button></li>
              </ul>
            </div>
            <div className="space-y-2.5">
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[11px] font-mono">
                Company
              </p>
              <ul className="space-y-1.5">
                <li><a href="#" className="hover:text-slate-300 transition-colors">Contact us</a></li>
                <li><a href="#" className="hover:text-slate-300 transition-colors">Support</a></li>
                <li><button onClick={() => { setDeveloperModalInitialTab("keys"); setIsDeveloperModalOpen(true); }} className="hover:text-slate-300 transition-colors text-left cursor-pointer">Create API Key</button></li>
              </ul>
            </div>
            <div className="space-y-2.5">
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[11px] font-mono">
                Legal
              </p>
              <ul className="space-y-1.5">
                <li><a href="#" className="hover:text-slate-300 transition-colors">Terms & conditions</a></li>
                <li><a href="#" className="hover:text-slate-300 transition-colors">Privacy policy</a></li>
                <li><a href="#" className="hover:text-slate-300 transition-colors">DPDP compliance</a></li>
                <li><a href="#" className="hover:text-slate-300 transition-colors">Refund & cancellation</a></li>
                <li><a href="#" className="hover:text-slate-300 transition-colors">GST & Invoicing</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
            <p>&copy; 2026 OpenOCR &bull; Commercial Document Intelligence at $0.001 / page</p>
            <div className="flex items-center gap-4 text-slate-600">
              <span>Universal Two-Stage Pipeline</span>
              <span>Docling 1.0</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Developer API & Pricing Modal */}
      <DeveloperModal
        isOpen={isDeveloperModalOpen}
        onClose={() => setIsDeveloperModalOpen(false)}
        apiKey={apiKey}
        setApiKey={setApiKey}
        creditsBalance={creditsBalance}
        setCreditsBalance={setCreditsBalance}
      />
    </div>
  );
}
