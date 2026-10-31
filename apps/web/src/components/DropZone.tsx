"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  UploadCloud,
  FileText,
  Check,
  Clock,
  Loader2,
  Sparkles,
  Sliders,
  Clipboard,
  Receipt,
  CreditCard,
  FileSpreadsheet,
  Globe,
  FileCheck,
} from "lucide-react";
import { SAMPLE_DOCUMENTS } from "../lib/samples";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";

interface DropZoneProps {
  onFileSelected: (file: File) => void;
  onSampleSelected?: (sampleDoc: any) => void;
  isProcessing: boolean;
  outputFormat: "json" | "markdown" | "text";
  setOutputFormat: (format: "json" | "markdown" | "text") => void;
  activeSampleId?: string;
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
    <div className="w-full space-y-3">
      {/* Primary Drafting Drop Desk */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative w-full border-2 border-dashed rounded-sm p-5 sm:p-7 text-center transition-all cursor-pointer select-none bg-[var(--surface-base)] registration-mark registration-mark-tl registration-mark-tr registration-mark-bl registration-mark-br group
          ${
            isDragOver
              ? "border-[var(--signal)] bg-[var(--signal-subtle)] ring-2 ring-[var(--signal)]/40 scale-[1.002]"
              : "border-[var(--line-strong)] hover:border-[var(--signal)] hover:bg-[var(--surface-subtle)]"
          }
          ${isProcessing ? "pointer-events-none opacity-60" : ""}
          ${justPasted ? "ring-2 ring-[var(--semantic-success)]" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.tiff"
          onChange={handleFileInput}
          className="hidden"
          disabled={isProcessing}
        />

        {/* Scan line active effect */}
        {isProcessing && (
          <div className="absolute inset-x-0 h-0.5 bg-[var(--signal)] animate-scan-line shadow-[0_0_8px_var(--signal)]" />
        )}

        <div className="flex flex-col items-center justify-center space-y-2">
          <div
            className={`w-11 h-11 rounded-sm bg-[var(--surface-raised)] border transition-all text-[var(--ink-primary)] flex items-center justify-center mb-0.5 shadow-subtle group-hover:scale-105 ${
              isDragOver ? "border-[var(--signal)] text-[var(--signal)]" : "border-[var(--line-strong)]"
            }`}
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin text-[var(--signal)]" />
            ) : justPasted ? (
              <Check className="w-5 h-5 text-[var(--semantic-success)]" />
            ) : (
              <UploadCloud className="w-5 h-5 text-[var(--signal)] group-hover:translate-y-[-1px] transition-transform" />
            )}
          </div>

          <div className="space-y-1">
            <h3 className="font-serif text-base sm:text-lg font-bold text-[var(--ink-primary)]">
              {isProcessing
                ? "Scanning Document under Light Table..."
                : isDragOver
                ? "Release Document to Begin Scan"
                : "Lay Document on Light Table"}
            </h3>
            <p className="text-xs text-[var(--ink-secondary)]">
              Drop file here, <span className="text-[var(--signal)] underline font-medium">browse local files</span>, or paste screenshot
            </p>
          </div>

          {/* User-Centric Keyboard Paste Hint Badge */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-[var(--surface-subtle)] border border-[var(--line-hairline)] text-[10px] font-mono text-[var(--ink-muted)]">
              <Clipboard className="w-3 h-3 text-[var(--signal)]" />
              <span>Press <strong className="text-[var(--ink-primary)]">Ctrl+V / ⌘V</strong> to paste screenshot</span>
            </span>

            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--ink-muted)]">
              <span>PDF</span>
              <span>•</span>
              <span>PNG</span>
              <span>•</span>
              <span>JPG</span>
              <span>•</span>
              <span>WEBP</span>
              <span>(Up to 500 pages)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Archival Sample Documents (Specimen Archive) */}
      <div className="p-3 border border-[var(--line-hairline)] rounded-sm bg-[var(--surface-subtle)] space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-bold text-[var(--ink-secondary)] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[var(--signal)]" />
            Specimen Archive (Immediate Inspection):
          </span>
          <span className="text-[11px] text-[var(--ink-muted)] hidden sm:inline">
            7 specimens • Instant offline inspection
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-1.5 sm:gap-2">
          {SAMPLE_DOCUMENTS.map((sample) => {
            const isActive = activeSampleId === sample.id;
            return (
              <button
                key={sample.id}
                type="button"
                disabled={isProcessing}
                onClick={() => onSampleSelected && onSampleSelected(sample)}
                className={`px-2.5 py-2 rounded-sm border transition-all text-left font-mono text-xs flex flex-col justify-between gap-1 disabled:opacity-40 cursor-pointer min-h-[58px] ${
                  isActive
                    ? "border-[var(--signal)] bg-[var(--signal-subtle)] text-[var(--signal)] font-bold shadow-subtle ring-1 ring-[var(--signal)]"
                    : "border-[var(--line-strong)] bg-[var(--surface-base)] text-[var(--ink-primary)] hover:border-[var(--signal)] hover:bg-[var(--surface-raised)]"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={isActive ? "text-[var(--signal)]" : "text-[var(--ink-muted)]"}>
                    {getSpecimenIcon(sample.docType)}
                  </span>
                  <span className="font-semibold truncate text-[11px]">{sample.title.split("(")[0].trim()}</span>
                </div>
                <span
                  className={`text-[10px] capitalize truncate ${
                    isActive ? "text-[var(--signal)]/80" : "text-[var(--ink-muted)]"
                  }`}
                >
                  {sample.docType.replace("_", " ")}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
