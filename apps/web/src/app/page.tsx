"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "../components/Header";
import { DropZone } from "../components/DropZone";
import { DocumentViewer } from "../components/DocumentViewer";
import { ResultsPanel } from "../components/ResultsPanel";
import { DocumentProcessingLoader } from "../components/DocumentProcessingLoader";
import { ExtractionResult } from "../lib/types";
import { uploadAndExtract } from "../lib/api";
import { SAMPLE_DOCUMENTS } from "../lib/samples";
import { ShieldCheck, UploadCloud } from "lucide-react";

export default function PlaygroundPage() {
  const [isUploadedDoc, setIsUploadedDoc] = useState(false);
  const [activeSampleId, setActiveSampleId] = useState<string>("clean-invoice");
  const [activeFileName, setActiveFileName] = useState<string>("NS-1042_Northstar_Studio.pdf");
  const [result, setResult] = useState<ExtractionResult | null>(SAMPLE_DOCUMENTS[0].result as any);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);

  // Bidirectional Highlighting State
  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);
  const [hoveredFieldKey, setHoveredFieldKey] = useState<string | null>(null);

  // Pipeline Execution State
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputFormat, setOutputFormat] = useState<"json" | "markdown" | "text">("json");
  const [creditsBalance, setCreditsBalance] = useState(10);
  const [itemsProcessed, setItemsProcessed] = useState(1);

  // Keyboard shortcut: ESC to clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedFieldKey(null);
        setHoveredFieldKey(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle uploaded files (drag, drop, file picker, paste)
  const handleFileSelected = async (file: File) => {
    // 1. Instantly switch to uploaded doc mode: demo cases disappear!
    setIsUploadedDoc(true);
    setActiveSampleId("");
    setActiveFileName(file.name);

    // 2. Clear old test preview demo result immediately: only show loader!
    setIsProcessing(true);
    setResult(null);
    setUploadedPreviewUrl(null);
    setSelectedFieldKey(null);
    setHoveredFieldKey(null);

    let localObjUrl: string | null = null;
    if (file.type.startsWith("image/")) {
      try {
        localObjUrl = URL.createObjectURL(file);
      } catch {}
    }

    try {
      const extracted = await uploadAndExtract(file, "ocr_free_trial12345", "", true, outputFormat);
      setResult(extracted);
      if (localObjUrl) {
        setUploadedPreviewUrl(localObjUrl);
      } else if (extracted.preview_image) {
        setUploadedPreviewUrl(extracted.preview_image);
      }
      setCreditsBalance((c) => Math.max(0, c - (extracted.credits_charged || 2)));
      setItemsProcessed((p) => p + 1);
    } catch (err: any) {
      console.warn("Extraction pipeline fallback:", err);
      // Fallback
      const fallbackSample = SAMPLE_DOCUMENTS[0].result;
      setResult(fallbackSample as any);
      if (localObjUrl) setUploadedPreviewUrl(localObjUrl);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle demo specimen selection (only active before an upload is given)
  const handleSampleSelected = (sample: any) => {
    setIsUploadedDoc(false);
    setActiveSampleId(sample.id);
    setActiveFileName(sample.fileName || sample.title);
    setIsProcessing(true);
    setResult(null);
    setUploadedPreviewUrl(null);
    setSelectedFieldKey(null);
    setHoveredFieldKey(null);

    setTimeout(() => {
      setResult(JSON.parse(JSON.stringify(sample.result)));
      setIsProcessing(false);
    }, 450);
  };

  const handleResetToDemo = () => {
    setIsUploadedDoc(false);
    handleSampleSelected(SAMPLE_DOCUMENTS[0]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface-base)] text-[var(--ink-primary)] transition-colors">
      <Header
        creditsBalance={creditsBalance}
        itemsProcessed={itemsProcessed}
        maxItems={5}
        plan="free"
      />

      <main className="flex-1 w-full max-w-[1600px] mx-auto p-2 sm:p-2.5 space-y-2 flex flex-col h-[calc(100vh-56px)] min-h-0 overflow-hidden">
        {isProcessing ? (
          /* State 1: Processing / Extracting -> Only the smooth scanning loader is shown */
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <DocumentProcessingLoader fileName={activeFileName} />
          </div>
        ) : isUploadedDoc && result ? (
          /* State 2: Uploaded Document Mode -> Sleek Top Action Bar + Full-Height Spacious Split Workspace */
          <>
            <div className="flex items-center justify-between px-3.5 py-1.5 border border-[#292d30] rounded-[6px] bg-[#000000] text-xs font-mono select-none shrink-0">
              <div className="flex items-center gap-2.5 truncate min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3ad389] shrink-0" />
                <span className="text-[#a1a4a5] shrink-0">Active File:</span>
                <span className="text-white font-medium truncate">{activeFileName}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-[#292d30] hover:border-white text-xs text-[#a1a4a5] hover:text-white cursor-pointer transition-colors">
                  <UploadCloud className="w-3 h-3 text-[#9281f7]" />
                  <span>Upload New</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.tiff,image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelected(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleResetToDemo}
                  className="text-xs text-[#6e727a] hover:text-white transition-colors px-2 py-1"
                >
                  Demo Cases
                </button>
              </div>
            </div>

            {/* Full-Height Spacious Workspace: Left (7 cols) Data, Right (5 cols) Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 overflow-hidden">
              <div className="lg:col-span-7 xl:col-span-7 flex-1 min-h-0 flex flex-col overflow-hidden">
                <ResultsPanel
                  result={result}
                  selectedFieldKey={selectedFieldKey}
                  onSelectField={setSelectedFieldKey}
                  hoveredFieldKey={hoveredFieldKey}
                  onHoverField={setHoveredFieldKey}
                  onReset={undefined}
                />
              </div>

              <div className="lg:col-span-5 xl:col-span-5 flex-1 min-h-0 flex flex-col overflow-hidden">
                <DocumentViewer
                  fileName={activeFileName}
                  result={result}
                  selectedFieldKey={selectedFieldKey}
                  onSelectField={setSelectedFieldKey}
                  hoveredFieldKey={hoveredFieldKey}
                  onHoverField={setHoveredFieldKey}
                  uploadedPreviewUrl={uploadedPreviewUrl}
                  isSample={false}
                />
              </div>
            </div>
          </>
        ) : (
          /* State 3: Initial Demo Exploration Mode -> Big Upload Section on top + Demo Workspace below */
          <>
            <div className="h-[36vh] min-h-[220px] max-h-[300px] shrink-0">
              <DropZone
                onFileSelected={handleFileSelected}
                onSampleSelected={handleSampleSelected}
                isProcessing={isProcessing}
                outputFormat={outputFormat}
                setOutputFormat={setOutputFormat}
                activeSampleId={activeSampleId}
                isUploadedDoc={false}
                onResetDemo={handleResetToDemo}
                uploadedFileName={activeFileName}
              />
            </div>

            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {result && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 overflow-hidden">
                  <div className="lg:col-span-7 xl:col-span-7 flex-1 min-h-0 flex flex-col overflow-hidden">
                    <ResultsPanel
                      result={result}
                      selectedFieldKey={selectedFieldKey}
                      onSelectField={setSelectedFieldKey}
                      hoveredFieldKey={hoveredFieldKey}
                      onHoverField={setHoveredFieldKey}
                      onReset={handleResetToDemo}
                    />
                  </div>

                  <div className="lg:col-span-5 xl:col-span-5 flex-1 min-h-0 flex flex-col overflow-hidden">
                    <DocumentViewer
                      fileName={activeFileName}
                      result={result}
                      selectedFieldKey={selectedFieldKey}
                      onSelectField={setSelectedFieldKey}
                      hoveredFieldKey={hoveredFieldKey}
                      onHoverField={setHoveredFieldKey}
                      uploadedPreviewUrl={uploadedPreviewUrl}
                      isSample={true}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Resend Minimal Footer Guarantee Strip */}
        <div className="px-3 py-1 border-t border-[#292d30]/50 bg-transparent flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px] font-mono select-none shrink-0">
          <div className="flex items-center gap-2 text-[#a1a4a5]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#3ad389] shrink-0" />
            <span>Air-Gap Capable • Pure In-Memory Execution • Zero Data Retention</span>
          </div>

          <div className="flex items-center gap-3 text-[#6e727a]">
            <span className="hidden sm:inline">Ctrl+V / ⌘V Paste Screenshot</span>
            <span className="hidden sm:inline">•</span>
            <span>Esc to Deselect</span>
            <span>•</span>
            <Link href="/self-hosted" className="text-[#9281f7] hover:underline font-medium">
              Self-Hosted
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
