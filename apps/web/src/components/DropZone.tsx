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
    <div className="w-full h-full flex flex-col justify-between space-y-1.5 select-none overflow-hidden">
      {/* Upload Drop Card - Covers approximately 1/3 of the page */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative w-full flex-1 min-h-0 border-2 border-dashed rounded-sm px-4 py-3 flex flex-col items-center justify-center text-center transition-all cursor-pointer bg-[var(--surface-base)] registration-mark registration-mark-tl registration-mark-tr registration-mark-bl registration-mark-br group shadow-subtle
          ${
            isDragOver
              ? "border-[var(--signal)] bg-[var(--signal-subtle)] ring-2 ring-[var(--signal)]/40 scale-[1.001]"
              : "border-[var(--line-strong)] hover:border-[var(--signal)] hover:bg-[var(--surface-subtle)]"
          }
          ${isProcessing ? "pointer-events-none opacity-60" : ""}
          ${justPasted ? "ring-2 ring-[var(--semantic-success)]" : ""}
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

        {/* Scan line active effect */}
        {isProcessing && (
          <div className="absolute inset-x-0 h-0.5 bg-[var(--signal)] animate-scan-line shadow-[0_0_8px_var(--signal)]" />
        )}

        <div className="flex flex-col items-center justify-center space-y-1.5 max-w-xl">
          <div
            className={`w-9 h-9 rounded-sm bg-[var(--surface-raised)] border transition-all text-[var(--ink-primary)] flex items-center justify-center shadow-subtle group-hover:scale-105 shrink-0 ${
              isDragOver ? "border-[var(--signal)] text-[var(--signal)]" : "border-[var(--line-strong)]"
            }`}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin text-[var(--signal)]" />
            ) : justPasted ? (
              <Check className="w-4 h-4 text-[var(--semantic-success)]" />
            ) : (
              <UploadCloud className="w-4 h-4 text-[var(--signal)]" />
            )}
          </div>

          <div className="space-y-0.5">
            <h3 className="font-serif text-sm sm:text-base font-bold text-[var(--ink-primary)] leading-tight">
              {isProcessing
                ? "Scanning Document under Light Table..."
                : isDragOver
                ? "Release Document to Begin Extraction"
                : "Lay Document on Light Table — Drop File or Click Browse"}
            </h3>
            <p className="text-[11px] text-[var(--ink-secondary)]">
              PDF, JPG, PNG, WEBP, TIFF • Multi-page invoices, receipts, credentials & reports
            </p>
          </div>

          <div className="pt-0.5 flex flex-wrap items-center justify-center gap-2">
            <Button
              variant="primary"
              size="xs"
              type="button"
              disabled={isProcessing}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
            >
              Browse & Upload File
            </Button>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-[var(--surface-subtle)] border border-[var(--line-hairline)] text-[10px] font-mono text-[var(--ink-muted)]">
              <Clipboard className="w-3 h-3 text-[var(--signal)]" />
              <span>or press <strong className="text-[var(--ink-primary)]">Ctrl+V / ⌘V</strong> to paste</span>
            </span>
          </div>
        </div>
      </div>

      {/* Demo Cases / Specimen Archive (when !isUploadedDoc) or Uploaded Status Banner (when isUploadedDoc) */}
      {!isUploadedDoc ? (
        <div className="px-2.5 py-1 border border-[var(--line-hairline)] rounded-sm bg-[var(--surface-subtle)] space-y-0.5 shadow-subtle shrink-0">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="font-bold text-[var(--ink-secondary)] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[var(--signal)]" />
              Demo Cases (Test Specimen Previews):
            </span>
            <span className="text-[9px] text-[var(--ink-muted)] hidden sm:inline">
              Select any demo case to inspect test layout & schemas
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1">
            {SAMPLE_DOCUMENTS.map((sample) => {
              const isActive = activeSampleId === sample.id;
              return (
                <button
                  key={sample.id}
                  type="button"
                  disabled={isProcessing}
                  onClick={() => onSampleSelected && onSampleSelected(sample)}
                  className={`px-1.5 py-1 rounded-sm border transition-all text-left font-mono text-xs flex items-center justify-between gap-1 disabled:opacity-40 cursor-pointer ${
                    isActive
                      ? "border-[var(--signal)] bg-[var(--signal-subtle)] text-[var(--signal)] font-bold shadow-subtle ring-1 ring-[var(--signal)]"
                      : "border-[var(--line-strong)] bg-[var(--surface-base)] text-[var(--ink-primary)] hover:border-[var(--signal)] hover:bg-[var(--surface-raised)]"
                  }`}
                >
                  <div className="flex items-center gap-1 min-w-0">
                    <span className={isActive ? "text-[var(--signal)]" : "text-[var(--ink-muted)]"}>
                      {getSpecimenIcon(sample.docType)}
                    </span>
                    <span className="font-medium truncate text-[10px]">{sample.title.split("(")[0].trim()}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1 rounded-sm bg-[var(--surface-subtle)] border border-[var(--line-strong)] text-xs font-mono select-none shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--semantic-success)] animate-pulse" />
            <span className="text-[var(--ink-muted)] uppercase text-[10px]">Active Upload:</span>
            <span className="font-bold text-[var(--ink-primary)] truncate max-w-xs">{uploadedFileName}</span>
          </div>

          {onResetDemo && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={onResetDemo}
              className="text-[10px] text-[var(--signal)] hover:underline font-bold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Switch Back to Demo Cases</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
