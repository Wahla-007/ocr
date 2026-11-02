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
        className={`relative w-full flex-1 min-h-0 border border-[#292d30] rounded-[6px] px-6 py-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer bg-[#000000] group
          ${isDragOver ? "border-[#9281f7] bg-[#9281f7]/5" : "hover:border-[#9281f7]/50"}
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

        <div className="flex flex-col items-center justify-center space-y-2 max-w-sm">
          {isProcessing ? (
            <Loader2 className="w-6 h-6 animate-spin text-[#9281f7]" />
          ) : justPasted ? (
            <Check className="w-6 h-6 text-[#3ad389]" />
          ) : (
            <UploadCloud className="w-6 h-6 text-[#9281f7] group-hover:scale-105 transition-transform" />
          )}

          <div className="space-y-0.5">
            <h3 className="font-sans text-sm sm:text-base font-medium text-white">
              {isProcessing
                ? "Extracting document..."
                : isDragOver
                ? "Release to extract"
                : "Drop document here or browse"}
            </h3>
            <p className="text-xs text-[#a1a4a5]">
              PDF, JPG, PNG, WEBP, TIFF
            </p>
          </div>

          <div className="pt-0.5 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={isProcessing}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="bg-transparent border border-[#292d30] text-white hover:border-white rounded-[6px] px-3.5 py-1 text-xs font-mono transition-colors"
            >
              Upload file
            </button>

            <span className="text-xs font-mono text-[#6e727a]">
              or press <span className="text-[#a1a4a5]">⌘V / Ctrl+V</span>
            </span>
          </div>
        </div>
      </div>

      {/* Demo Cases / Specimen Archive - Border-free Minimal Inline Row */}
      {!isUploadedDoc ? (
        <div className="flex items-center justify-between px-2 py-0.5 text-xs font-mono shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[#6e727a] uppercase text-[10px] tracking-wider">Demo:</span>
            {SAMPLE_DOCUMENTS.map((sample) => {
              const isActive = activeSampleId === sample.id;
              return (
                <button
                  key={sample.id}
                  type="button"
                  disabled={isProcessing}
                  onClick={() => onSampleSelected && onSampleSelected(sample)}
                  className={`text-xs transition-colors cursor-pointer ${
                    isActive
                      ? "text-[#9281f7] font-semibold border-b border-[#9281f7]"
                      : "text-[#a1a4a5] hover:text-white"
                  }`}
                >
                  {sample.title.split("(")[0].trim()}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-2 py-0.5 text-xs font-mono select-none shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3ad389]" />
            <span className="text-[#a1a4a5] text-xs">Active:</span>
            <span className="text-white truncate max-w-sm">{uploadedFileName}</span>
          </div>

          {onResetDemo && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={onResetDemo}
              className="text-xs text-[#9281f7] hover:underline font-mono"
            >
              Back to demo cases
            </button>
          )}
        </div>
      )}
    </div>
  );
}
