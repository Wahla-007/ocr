"use client";

import React, { useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  Zap,
  Clock,
  Layers,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { SampleDocument } from "../lib/types";

interface DropZoneProps {
  onFileSelected: (file: File) => void;
  onSampleSelected?: (sample: SampleDocument) => void;
  isProcessing: boolean;
  waitMode: boolean;
  setWaitMode: (wait: boolean) => void;
  selectedSampleId?: string;
  outputFormat: "json" | "markdown" | "text";
  setOutputFormat: (format: "json" | "markdown" | "text") => void;
}

export function DropZone({
  onFileSelected,
  onSampleSelected,
  isProcessing,
  waitMode,
  setWaitMode,
  selectedSampleId,
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
      {/* Drop Target Box */}
      <label
        htmlFor="openocr-file-upload-input"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all p-7 text-center block ${
          isDragOver
            ? "border-emerald-400 bg-emerald-500/10 shadow-xl shadow-emerald-500/10 scale-[1.01]"
            : "border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900/90"
        } ${isProcessing ? "opacity-75 pointer-events-none" : ""}`}
      >
        <input
          id="openocr-file-upload-input"
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          onChange={handleFileInput}
          className="hidden"
          disabled={isProcessing}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-white text-base">
                Processing Document...
              </span>
              <p className="text-xs text-slate-400">
                Extracting layout, text, tables, and structured fields
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <span className="font-semibold text-white text-base">
                  Drop any document here
                </span>
                <span className="text-slate-400 text-sm">or</span>
                <span className="text-emerald-400 font-semibold text-sm underline underline-offset-4">
                  browse files
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Zero-Selection Intelligence: PDF, PNG, JPG, or WEBP auto-detected. No categories required.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] text-slate-400">
              <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60">
                PDF (Digital & Scanned)
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60">
                Smartphone Receipts
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60">
                Identity Cards (Auto-rotated)
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60">
                Multi-page Reports
              </span>
            </div>
          </div>
        )}
      </label>

      {/* Control Bar: Format Selector & Execution Mode */}
      <div className="flex items-center justify-end gap-3 pt-1">
        {/* Right Controls: Format Selector & Execution Mode */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Format Selector: Plain Text, Markdown, JSON */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            <span className="text-[10px] text-slate-500 px-1 font-medium hidden sm:inline uppercase tracking-wider">Format:</span>
            <button
              onClick={() => setOutputFormat("text")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                outputFormat === "text"
                  ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Plain Text
            </button>
            <button
              onClick={() => setOutputFormat("markdown")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                outputFormat === "markdown"
                  ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Markdown
            </button>
            <button
              onClick={() => setOutputFormat("json")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                outputFormat === "json"
                  ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              JSON
            </button>
          </div>

          {/* Sync vs Async Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setWaitMode(true)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                waitMode
                  ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Sync</span>
            </button>
            <button
              onClick={() => setWaitMode(false)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                !waitMode
                  ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Async</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
