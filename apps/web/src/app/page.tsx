"use client";

import React, { useEffect, useState } from "react";
import { Header } from "../components/Header";
import { DropZone } from "../components/DropZone";
import { PipelineStepper } from "../components/PipelineStepper";
import { DocumentViewer } from "../components/DocumentViewer";
import { ResultsPanel } from "../components/ResultsPanel";
import { DeveloperModal } from "../components/DeveloperModal";
import { UpgradeModal } from "../components/UpgradeModal";
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
import { ArrowLeft, ArrowRight, Zap, AlertTriangle, ShieldCheck } from "lucide-react";
import { PRO_DEMO_KEY } from "../lib/keys";

export default function PlaygroundPage() {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [creditsBalance, setCreditsBalance] = useState(10);
  const [itemsProcessed, setItemsProcessed] = useState(0);
  const [isDeveloperModalOpen, setIsDeveloperModalOpen] = useState(false);
  const [developerModalInitialTab, setDeveloperModalInitialTab] = useState<"quickstart" | "keys" | "pricing" | "endpoints">("quickstart");

  // Upgrade Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");

  // Active Document & Extraction State
  const [activeFileName, setActiveFileName] = useState<string>("");
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);

  // Interaction State
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

  const isPro = apiKey.startsWith("ocr_live_pro") || apiKey.includes("pro");
  const maxAllowedItems = isPro ? 999999 : 5;

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
    // Check if free user already exceeded 5 items before uploading
    if (!isPro && itemsProcessed >= 5) {
      setUpgradeReason("You have reached the free trial limit of 5 lifetime items. Upgrade to Pro for unlimited documents.");
      setIsUpgradeModalOpen(true);
      return;
    }

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

      // Increment document counter
      setItemsProcessed((prev) => prev + 1);

      // Deduct credits in ledger
      const charged = res.credits_charged ?? res.usage?.credits ?? 1;
      setCreditsBalance((prev) => Math.max(0, prev - charged));
    } catch (err: any) {
      const errMsg = err.message || "Extraction failed";

      // If user hit free limits
      if (
        errMsg.includes("FREE_TIER") ||
        errMsg.includes("Free plan") ||
        errMsg.includes("limit reached") ||
        errMsg.includes("402")
      ) {
        setUpgradeReason(errMsg);
        setIsUpgradeModalOpen(true);
      }

      setProgress({
        stage: "error",
        progressPercent: 100,
        message: errMsg,
        elapsedMs: Date.now() - startTime,
        error: errMsg,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSwitchToProKey = (proKey: string) => {
    setApiKey(proKey);
    setCreditsBalance(25000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors">
      {/* Top Navigation */}
      <Header
        isBackendConnected={isBackendConnected}
        apiUrl={apiUrl}
        setApiUrl={setApiUrl}
        apiKey={apiKey}
        setApiKey={setApiKey}
        creditsBalance={creditsBalance}
        itemsProcessed={itemsProcessed}
        maxItems={5}
        plan={isPro ? "pro" : "free"}
        onGoToUpload={() => {
          setResult(null);
          setActiveFileName("");
        }}
        onOpenDeveloperModal={(tab) => {
          if (tab) setDeveloperModalInitialTab(tab);
          setIsDeveloperModalOpen(true);
        }}
        onOpenUpgradeModal={() => {
          setUpgradeReason("Upgrade to Pro for unlimited documents and up to 500 pages per document.");
          setIsUpgradeModalOpen(true);
        }}
      />

      {/* Free tier banner when approaching or reaching limit */}
      {!isPro && itemsProcessed > 0 && (
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900/40 px-4 py-2 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-zinc-900 dark:text-white">Free Trial:</span>
              <span>{itemsProcessed} of 5 items processed. Max 2 pages per document.</span>
            </div>
            <button
              onClick={() => {
                setUpgradeReason("Upgrade to the Pro Plan ($9/mo) for unlimited documents, 500 pages/doc, and 300 req/min rate limit.");
                setIsUpgradeModalOpen(true);
              }}
              className="font-semibold text-zinc-900 dark:text-white hover:underline flex items-center gap-1"
            >
              <span>Upgrade to Pro</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* ========================================================================= */}
        {/* VIEW 1: UPLOAD / DROP ZONE                                                */}
        {/* ========================================================================= */}
        {!result && (
          <div className="max-w-3xl mx-auto space-y-8 py-8 sm:py-16">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-300 font-mono text-xs">
                <span>Research-Grade Document Intelligence</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Universal Document Extraction
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
                Zero-selection extraction for invoices, receipts, identity documents, and reports. High-speed pure CPU inference with structured JSON and spatial coordinates.
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
          <div className="space-y-4">
            {/* Minimalist Document Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setResult(null);
                    setActiveFileName("");
                    setUploadedPreviewUrl(null);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Upload Another</span>
                </button>
                <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />
                <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 truncate max-w-[200px] sm:max-w-xs">
                  {activeFileName}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                  {result.document_type || result.detected_type || result.doc_type}
                </span>
                {result.latency_ms && (
                  <span className="text-xs text-zinc-500 font-mono hidden sm:inline">
                    {result.latency_ms}ms CPU
                  </span>
                )}
              </div>
            </div>

            {/* Split Screen Workspace: Document Canvas (Left) & Extraction Results (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Panel: Document Canvas with Bounding Box Overlays */}
              <div className="lg:col-span-7 sticky top-16 self-start">
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

      {/* Clean Minimalist Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 py-8 text-xs text-zinc-500 dark:text-zinc-400 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-900 dark:text-white">OpenOCR</span>
            <span>&bull;</span>
            <span>Pure CPU Document Intelligence &bull; $0.001 / page</span>
          </div>

          <div className="flex items-center gap-5 text-xs">
            <button
              onClick={() => { setDeveloperModalInitialTab("quickstart"); setIsDeveloperModalOpen(true); }}
              className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              API Reference
            </button>
            <button
              onClick={() => { setDeveloperModalInitialTab("pricing"); setIsDeveloperModalOpen(true); }}
              className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Pricing ($0.001)
            </button>
            <button
              onClick={() => { setDeveloperModalInitialTab("endpoints"); setIsDeveloperModalOpen(true); }}
              className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Self-Hosted
            </button>
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

      {/* Upgrade to Pro Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        reason={upgradeReason}
        itemsProcessed={itemsProcessed}
        onSwitchToProKey={handleSwitchToProKey}
      />
    </div>
  );
}
