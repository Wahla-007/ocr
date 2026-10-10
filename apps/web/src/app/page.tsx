"use client";

import React, { useEffect, useState } from "react";
import { Header } from "../components/Header";
import { DropZone } from "../components/DropZone";
import { PipelineStepper } from "../components/PipelineStepper";
import { DocumentViewer } from "../components/DocumentViewer";
import { ResultsPanel } from "../components/ResultsPanel";
import { SAMPLE_DOCUMENTS } from "../lib/samples";
import {
  ExtractionResult,
  PipelineProgress,
  SampleDocument,
} from "../lib/types";
import {
  checkBackendHealth,
  DEFAULT_API_KEY,
  DEFAULT_API_URL,
  uploadAndExtract,
} from "../lib/api";

export default function PlaygroundPage() {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [creditsBalance, setCreditsBalance] = useState(100);

  // Active Document & Extraction State
  const [selectedSampleId, setSelectedSampleId] = useState<string>("clean-invoice");
  const [activeFileName, setActiveFileName] = useState<string>("clean_invoice.pdf");
  const [result, setResult] = useState<ExtractionResult | null>(
    SAMPLE_DOCUMENTS[0].result
  );

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
    setSelectedSampleId("");
    setActiveFileName(file.name);
    setIsProcessing(true);
    setSelectedFieldKey(null);

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
        message: `Extracted ${res.doc_type.toUpperCase()} in ${Date.now() - startTime}ms`,
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

  const handleSampleSelected = (sample: SampleDocument) => {
    setSelectedSampleId(sample.id);
    setActiveFileName(sample.fileName);
    setResult(sample.result);
    setSelectedFieldKey(null);
    setHoveredFieldKey(null);
    setProgress({
      stage: "completed",
      progressPercent: 100,
      message: `Loaded sample ${sample.title} (${sample.docType.toUpperCase()})`,
      elapsedMs: sample.result.latency_ms || 45,
    });
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
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Breadcrumb & Hero Header matching Screenshot */}
        <div className="space-y-3 pt-1">
          <a
            href="#"
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <span>&larr;</span>
            <span>Products</span>
          </a>

          {(() => {
            const raw = (result?.document_type || result?.detected_type || result?.doc_type || "invoice").toLowerCase();
            const isDL = raw === "driving_license" || raw === "driver_license";
            const isID = raw === "id_card" || raw === "identity_card";
            const isRcpt = raw === "receipt";
            const isCtr = raw === "contract";
            const isInv = raw === "invoice" || (!isDL && !isID && !isRcpt && !isCtr && raw !== "document" && raw !== "report");

            const heroTitle = isDL
              ? "Driver License OCR"
              : isID
              ? "ID Card OCR"
              : isRcpt
              ? "Store Receipt OCR"
              : isCtr
              ? "Contract OCR"
              : isInv
              ? "Invoice OCR"
              : "Document OCR";

            const checkTag = isInv || isRcpt ? "arithmetic" : isDL || isID ? "checksum" : "structure";
            const creditsTag = isInv ? 25 : isDL || isID ? 15 : isCtr ? 20 : 10;
            const endpointPath = isInv
              ? "/api/v1/id/invoice"
              : isDL
              ? "/api/v1/id/driving_license"
              : isID
              ? "/api/v1/id/id_card"
              : isRcpt
              ? "/api/v1/extract/receipt"
              : isCtr
              ? "/api/v1/extract/contract"
              : "/api/v1/extract";

            const heroDesc = isInv
              ? "Supplier, buyer, line items with HSN codes, the tax split and the totals. Arithmetic verification checks line totals and tax balances with zero manual schema entry."
              : isDL
              ? "Driver identification, license class, issuing jurisdiction, endorsements, and expiration checks. Automated format verification and biometric portrait verification."
              : isID
              ? "National identity credentials, full legal names, document numbers, date of birth, and biometric photo presence. Instant 90°/180°/270° orientation normalization."
              : isRcpt
              ? "Store receipts, itemized register logs, cashiers, sales taxes, and payment methods. Automated arithmetic consistency validation across all line items."
              : isCtr
              ? "Legal agreements, executing parties, effective dates, governing laws, and signature blocks. Structural entity extraction and verification."
              : "Universal layout analysis, table extraction, and zero-selection structured intelligence for any business document.";

            return (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1.5 max-w-4xl">
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                      {heroTitle}
                    </h1>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-900 border border-slate-800 text-slate-400 capitalize">
                      {checkTag}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {heroDesc}
                  </p>
                  <p className="text-xs font-mono text-slate-500 pt-0.5">
                    <span className="text-emerald-400 font-semibold">POST</span> {endpointPath}{" "}
                    <span className="text-slate-400">{creditsTag} credits per document</span>
                  </p>
                </div>
              </div>
            );
          })()}
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

        {/* Split Screen Workspace: Document Canvas (Left) & Extraction Results (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[500px] lg:min-h-[620px]">
          {/* Left Panel: Document Canvas with Bounding Box Overlays */}
          <div className="lg:col-span-7 h-full">
            <DocumentViewer
              fileName={activeFileName}
              result={result}
              selectedFieldKey={selectedFieldKey}
              onSelectField={setSelectedFieldKey}
              hoveredFieldKey={hoveredFieldKey}
              onHoverField={setHoveredFieldKey}
            />
          </div>

          {/* Right Panel: Multimodal Extraction Results & Inspector */}
          <div className="lg:col-span-5 h-full">
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
                if (SAMPLE_DOCUMENTS[0]) handleSampleSelected(SAMPLE_DOCUMENTS[0]);
              }}
            />
          </div>
        </div>
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
                <li><a href="#" className="hover:text-slate-300 transition-colors">Products</a></li>
                <li><a href="#" className="hover:text-slate-300 transition-colors">Playground</a></li>
                <li><a href="#" className="hover:text-slate-300 transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-slate-300 transition-colors">Self-hosted</a></li>
              </ul>
            </div>
            <div className="space-y-2.5">
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[11px] font-mono">
                Developers
              </p>
              <ul className="space-y-1.5">
                <li><a href="#" className="hover:text-slate-300 transition-colors">Quickstart</a></li>
                <li><a href="#" className="hover:text-slate-300 transition-colors">Streaming</a></li>
                <li><a href="#" className="hover:text-slate-300 transition-colors">Rate limits</a></li>
                <li><a href="#" className="hover:text-slate-300 transition-colors">Errors</a></li>
              </ul>
            </div>
            <div className="space-y-2.5">
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[11px] font-mono">
                Company
              </p>
              <ul className="space-y-1.5">
                <li><a href="#" className="hover:text-slate-300 transition-colors">Contact us</a></li>
                <li><a href="#" className="hover:text-slate-300 transition-colors">Support</a></li>
                <li><a href="#" className="hover:text-slate-300 transition-colors">Create an account</a></li>
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
            <p>&copy; 2026 Deepsearch AI &bull; Prices Include GST</p>
            <div className="flex items-center gap-4 text-slate-600">
              <span>Universal Two-Stage Pipeline</span>
              <span>Docling 1.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
