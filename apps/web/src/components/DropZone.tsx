"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, FileText, Check, Clock, Loader2, Sparkles, Sliders } from "lucide-react";
import { SAMPLE_DOCUMENTS } from "../lib/samples";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";

interface DropZoneProps {
  onFileSelected: (file: File) => void;
  onSampleSelected?: (sampleDoc: any) => void;
  isProcessing: boolean;
  outputFormat: "json" | "markdown" | "text";
  setOutputFormat: (format: "json" | "markdown" | "text") => void;
}

export function DropZone({
  onFileSelected,
  onSampleSelected,
  isProcessing,
  outputFormat,
  setOutputFormat,
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="w-full space-y-4">
      {/* Primary Drafting Drop Desk */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative w-full border-2 border-dashed rounded-sm p-6 sm:p-8 text-center transition-all cursor-pointer select-none bg-[var(--surface-base)] registration-mark registration-mark-tl registration-mark-tr registration-mark-bl registration-mark-br
          ${
            isDragOver
              ? "border-[var(--signal)] bg-[var(--signal-subtle)]"
              : "border-[var(--line-strong)] hover:border-[var(--signal)] hover:bg-[var(--surface-subtle)]"
          }
          ${isProcessing ? "pointer-events-none opacity-60" : ""}
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
          <div className="w-10 h-10 rounded-sm bg-[var(--surface-raised)] border border-[var(--line-strong)] text-[var(--ink-primary)] flex items-center justify-center mb-1 shadow-subtle">
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin text-[var(--signal)]" />
            ) : (
              <UploadCloud className="w-5 h-5 text-[var(--signal)]" />
            )}
          </div>

          <div className="space-y-0.5">
            <h3 className="font-serif text-base font-bold text-[var(--ink-primary)]">
              {isProcessing ? "Scanning Document under Light Table..." : "Lay Document on Light Table"}
            </h3>
            <p className="text-xs text-[var(--ink-secondary)]">
              Drop document file or <span className="text-[var(--signal)] underline font-medium">browse local files</span>
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 text-[11px] font-mono text-[var(--ink-muted)]">
            <span>PDF</span>
            <span>•</span>
            <span>PNG</span>
            <span>•</span>
            <span>JPG</span>
            <span>•</span>
            <span>WEBP</span>
            <span>•</span>
            <span>TIFF</span>
            <span>(Max 500 pages)</span>
          </div>
        </div>
      </div>

      {/* Quick Archival Sample Documents */}
      <div className="p-3 border border-[var(--line-hairline)] rounded-sm bg-[var(--surface-subtle)] space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-bold text-[var(--ink-secondary)] uppercase tracking-wider">
            Specimen Archive (Immediate Inspection):
          </span>
          <span className="text-[11px] text-[var(--ink-muted)]">Zero selection required</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SAMPLE_DOCUMENTS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              disabled={isProcessing}
              onClick={() => onSampleSelected && onSampleSelected(sample)}
              className="px-2.5 py-1.5 rounded-sm border border-[var(--line-strong)] bg-[var(--surface-base)] hover:border-[var(--signal)] hover:bg-[var(--surface-raised)] transition-colors text-left font-mono text-xs text-[var(--ink-primary)] flex flex-col justify-between disabled:opacity-40"
            >
              <span className="font-semibold truncate">{sample.title}</span>
              <span className="text-[10px] text-[var(--ink-muted)] capitalize">{sample.docType.replace("_", " ")}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
