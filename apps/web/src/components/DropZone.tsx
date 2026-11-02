"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  UploadCloud,
  FileText,
  Check,
  Loader2,
  Sparkles,
  Clipboard,
  Receipt,
  CreditCard,
  FileSpreadsheet,
  Globe,
  FileCheck,
  RotateCcw,
} from "lucide-react";
import { SAMPLE_DOCUMENTS } from "../lib/samples";
import { Button } from "./ui/Button";

interface DropZoneProps {
  onFileSelected: (file: File) => void;
  onSampleSelected?: (sampleDoc: any) => void;
  isProcessing: boolean;
  outputFormat: "json" | "markdown" | "text";
  setOutputFormat: (format: "json" | "markdown" | "text") => void;
  activeSampleId?: string;
  isUploadedDoc?: boolean;
  onResetDemo?: () => void;
  uploadedFileName?: string;
}

// Icon helper for specimen types
const getSpecimenIcon = (docType: string) => {
  const type = docType.toLowerCase();
  if (type.includes("receipt")) return <Receipt className="w-3.5 h-3.5" />;
  if (type.includes("license") || type.includes("id")) return <CreditCard className="w-3.5 h-3.5" />;
  if (type.includes("table") || type.includes("spreadsheet")) return <FileSpreadsheet className="w-3.5 h-3.5" />;
  if (type.includes("web") || type.includes("pricing") || type.includes("document")) return <Globe className="w-3.5 h-3.5" />;
  if (type.includes("contract")) return <FileCheck className="w-3.5 h-3.5" />;
  return <FileText className="w-3.5 h-3.5" />;
};

export function DropZone({
  onFileSelected,
  onSampleSelected,
  isProcessing,
  outputFormat,
  setOutputFormat,
  activeSampleId,
  isUploadedDoc = false,
  onResetDemo,
  uploadedFileName,
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [justPasted, setJustPasted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global Clipboard Paste Listener (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isProcessing) return;

      // Check for file items in clipboard (e.g. captured screenshots)
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith("image/") || file.type === "application/pdf") {
          e.preventDefault();
          setJustPasted(true);
          setTimeout(() => setJustPasted(false), 2000);
          onFileSelected(file);
          return;
        }
      }

      // Check items list for image blob
      if (e.clipboardData && e.clipboardData.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.indexOf("image") !== -1) {
            const blob = item.getAsFile();
            if (blob) {
              e.preventDefault();
              const pastedFile = new File([blob], `clipboard_screenshot_${Date.now()}.png`, {
                type: blob.type || "image/png",
              });
              setJustPasted(true);
              setTimeout(() => setJustPasted(false), 2000);
              onFileSelected(pastedFile);
              break;
            }
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isProcessing, onFileSelected]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      e.target.value = "";
      onFileSelected(file);
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between space-y-2 select-none overflow-hidden">
      {/* Upload Drop Card - Resend Black Velvet with Violet Neon */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative w-full flex-1 min-h-0 border border-[#292d30] rounded-[16px] px-6 py-4 flex flex-col items-center justify-center text-center transition-all duration-150 cursor-pointer bg-[#000000] group shadow-none
          ${
            isDragOver
              ? "border-[#9281f7] bg-[#9281f7]/10 ring-1 ring-[#9281f7] scale-[1.001]"
              : "hover:border-[#9281f7]/80 hover:bg-[#08080a]"
          }
          ${isProcessing ? "pointer-events-none opacity-60" : ""}
          ${justPasted ? "ring-2 ring-[#3ad389] border-[#3ad389]" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.tiff,image/*,application/pdf"
          onChange={handleFileInput}
          className="hidden"
          disabled={isProcessing}
        />

        {/* Scan line active effect - Violet Neon */}
        {isProcessing && (
          <div className="absolute inset-x-0 h-0.5 bg-[#9281f7] animate-scan-line shadow-[0_0_12px_#9281f7]" />
        )}

        <div className="flex flex-col items-center justify-center space-y-3 max-w-xl">
          <div
            className={`w-12 h-12 rounded-[16px] bg-[#0b0e14] border transition-all text-[#9281f7] flex items-center justify-center group-hover:scale-105 shrink-0 shadow-[0_0_12px_rgba(146,129,247,0.12)] ${
              isDragOver ? "border-[#9281f7] text-[#baa7ff]" : "border-[#292d30]"
            }`}
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#9281f7]" />
            ) : justPasted ? (
              <Check className="w-5 h-5 text-[#3ad389]" />
            ) : (
              <UploadCloud className="w-5 h-5 text-[#9281f7]" />
            )}
          </div>

          <div className="space-y-1">
            <h3 className="font-sans text-base sm:text-lg font-medium text-white leading-tight">
              {isProcessing
                ? "Analyzing Document Architecture..."
                : isDragOver
                ? "Release Document to Begin Extraction"
                : "Drop Document Here or Click Browse"}
            </h3>
            <p className="text-xs text-[#a1a4a5]">
              PDF, JPG, PNG, WEBP, TIFF • Multi-page invoices, receipts, credentials & reports
            </p>
          </div>

          <div className="pt-1 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={isProcessing}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              leftIcon={<UploadCloud className="w-4 h-4" />}
              className="bg-transparent border border-[#9281f7] text-white hover:bg-[#9281f7] hover:text-[#000000] rounded-[6px] px-4 py-2 text-xs font-mono font-medium transition-all duration-150 shadow-[0_0_12px_rgba(146,129,247,0.2)]"
            >
              Browse & Upload File
            </Button>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#000000] border border-[#292d30] text-xs font-mono text-[#a1a4a5]">
              <Clipboard className="w-3.5 h-3.5 text-[#9281f7]" />
              <span>or press <strong className="text-white">Ctrl+V / ⌘V</strong> to paste</span>
            </span>
          </div>
        </div>
      </div>

      {/* Demo Cases / Specimen Archive (when !isUploadedDoc) or Uploaded Status Banner (when isUploadedDoc) */}
      {!isUploadedDoc ? (
        <div className="px-3 py-2 border border-[#292d30] rounded-[16px] bg-[#000000] space-y-1.5 shrink-0">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-medium text-[#f0f0f0] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#9281f7]" />
              Demo Specimen Previews:
            </span>
            <span className="text-[11px] text-[#6e727a] hidden sm:inline">
              Select any demo case to inspect structured intelligence
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
            {SAMPLE_DOCUMENTS.map((sample) => {
              const isActive = activeSampleId === sample.id;
              return (
                <button
                  key={sample.id}
                  type="button"
                  disabled={isProcessing}
                  onClick={() => onSampleSelected && onSampleSelected(sample)}
                  className={`px-2 py-1.5 rounded-[6px] border transition-all duration-150 text-left font-mono text-xs flex items-center justify-between gap-1.5 disabled:opacity-40 cursor-pointer ${
                    isActive
                      ? "border-[#9281f7] bg-[#9281f7]/15 text-[#9281f7] font-semibold ring-1 ring-[#9281f7]"
                      : "border-[#292d30] bg-[#000000] text-[#a1a4a5] hover:border-[#9281f7]/60 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={isActive ? "text-[#9281f7]" : "text-[#6e727a]"}>
                      {getSpecimenIcon(sample.docType)}
                    </span>
                    <span className="truncate text-[11px]">{sample.title.split("(")[0].trim()}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 rounded-[16px] bg-[#000000] border border-[#292d30] text-xs font-mono select-none shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#3ad389] animate-pulse shadow-[0_0_6px_#3ad389]" />
            <span className="text-[#a1a4a5] uppercase text-[10px]">Active Upload:</span>
            <span className="font-medium text-white truncate max-w-sm">{uploadedFileName}</span>
          </div>

          {onResetDemo && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={onResetDemo}
              className="text-xs text-[#9281f7] hover:underline font-mono flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Switch Back to Demo Cases</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
