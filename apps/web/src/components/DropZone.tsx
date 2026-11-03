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
    <div className="w-full h-full flex flex-col justify-between space-y-1 select-none overflow-hidden">
      {/* Upload Drop Card - Clean Resend Void Black & Graphite Hairline */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative w-full flex-1 min-h-0 border border-zinc-200 dark:border-[#292d30] rounded-[6px] px-6 py-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer bg-white dark:bg-[#000000] group
          ${isDragOver ? "border-purple-600 dark:border-[#9281f7] bg-purple-50/50 dark:bg-[#9281f7]/5" : "hover:border-purple-400 dark:hover:border-[#9281f7]/50"}
          ${isProcessing ? "pointer-events-none opacity-60" : ""}
          ${justPasted ? "border-[#3ad389]" : ""}
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
          <div className="absolute inset-x-0 h-0.5 bg-[#9281f7] animate-scan-line shadow-[0_0_8px_#9281f7]" />
        )}

        <div className="flex flex-col items-center justify-center space-y-3 max-w-md">
          {isProcessing ? (
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 dark:text-[#9281f7]" />
          ) : justPasted ? (
            <Check className="w-8 h-8 text-[#3ad389]" />
          ) : (
            <UploadCloud className="w-9 h-9 text-purple-600 dark:text-[#9281f7] group-hover:scale-110 transition-transform duration-200" />
          )}

          <div className="space-y-1">
            <h3 className="font-sans text-base sm:text-lg font-medium text-zinc-900 dark:text-white tracking-tight">
              {isProcessing
                ? "Extracting document..."
                : isDragOver
                ? "Release to extract"
                : "Drop document here or browse"}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-[#a1a4a5]">
              PDF, JPG, PNG, WEBP, TIFF • Multi-page &amp; tables supported
            </p>
          </div>

          <div className="pt-1 flex items-center justify-center gap-3.5">
            <button
              type="button"
              disabled={isProcessing}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="bg-transparent border border-zinc-300 dark:border-[#292d30] text-zinc-800 dark:text-white hover:border-zinc-900 dark:hover:border-white rounded-[6px] px-4 py-1.5 text-xs font-mono transition-colors"
            >
              Upload file
            </button>

            <span className="text-xs font-mono text-zinc-400 dark:text-[#6e727a]">
              or press <span className="text-zinc-600 dark:text-[#a1a4a5]">⌘V / Ctrl+V</span>
            </span>
          </div>
        </div>
      </div>

      {/* Demo Cases / Specimen Archive - Spaced Justifiably & Responsive */}
      {!isUploadedDoc ? (
        <div className="w-full px-2 py-1 text-xs font-mono shrink-0">
          <div className="w-full overflow-x-auto scrollbar-none py-0.5">
            <div className="w-full min-w-max sm:min-w-full flex items-center justify-between gap-1 sm:gap-2">
              <span className="text-zinc-500 dark:text-[#6e727a] uppercase text-[10px] tracking-wider font-mono font-medium shrink-0 mr-1 sm:mr-1.5 select-none">
                DEMO:
              </span>
              <div className="flex-1 flex items-center justify-between gap-1 sm:gap-2">
                {SAMPLE_DOCUMENTS.map((sample) => {
                  const isActive = activeSampleId === sample.id;
                  return (
                    <button
                      key={sample.id}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => onSampleSelected && onSampleSelected(sample)}
                      className={`flex-1 min-w-fit text-center py-1 px-1.5 sm:px-2 rounded-[4px] text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? "text-purple-600 dark:text-[#9281f7] font-semibold border-b-2 border-purple-600 dark:border-[#9281f7] bg-purple-500/10 dark:bg-[#9281f7]/10"
                          : "text-zinc-600 dark:text-[#a1a4a5] hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#111113]"
                      }`}
                    >
                      {sample.title.split("(")[0].trim()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-2 py-0.5 text-xs font-mono select-none shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3ad389]" />
            <span className="text-zinc-500 dark:text-[#a1a4a5] text-xs">Active:</span>
            <span className="text-zinc-900 dark:text-white truncate max-w-sm">{uploadedFileName}</span>
          </div>

          {onResetDemo && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={onResetDemo}
              className="text-xs text-purple-600 dark:text-[#9281f7] hover:underline font-mono"
            >
              Back to demo cases
            </button>
          )}
        </div>
      )}
    </div>
  );
}
