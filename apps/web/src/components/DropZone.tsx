"use client";

import React, { useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  Zap,
  Clock,
  Loader2,
  FileCode,
  FileSpreadsheet,
} from "lucide-react";

interface DropZoneProps {
  onFileSelected: (file: File) => void;
  isProcessing: boolean;
  waitMode: boolean;
  setWaitMode: (wait: boolean) => void;
  outputFormat: "json" | "markdown" | "text";
  setOutputFormat: (format: "json" | "markdown" | "text") => void;
}

export function DropZone({
  onFileSelected,
  isProcessing,
  waitMode,
  setWaitMode,
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
        className={`relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all p-8 sm:p-12 text-center block ${
          isDragOver
            ? "border-zinc-900 dark:border-zinc-200 bg-zinc-100/70 dark:bg-zinc-800/60 scale-[1.005]"
            : "border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/60 shadow-sm"
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
            <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                Analyzing Document...
              </span>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Executing pure CPU ONNX model & extracting spatial layout
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-3.5">
            <div className="h-11 w-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center text-zinc-700 dark:text-zinc-300 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-sm">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Drop your document here
                </span>
                <span className="text-zinc-400">or</span>
                <span className="font-semibold text-zinc-900 dark:text-white underline underline-offset-4 hover:text-zinc-600">
                  browse files
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                Invoices, receipts, identity documents, bills, and reports. PDF, PNG, JPG, or WEBP.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 font-mono">
                PDF
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 font-mono">
                PNG
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 font-mono">
                JPG
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 font-mono">
                WEBP
              </span>
            </div>
          </div>
        )}
      </label>

      {/* Control Bar: Format Selector & Execution Mode */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
        <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
          <span>Free Tier: Max 2 pages/doc · 5 documents lifetime</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Format Selector: Plain Text, Markdown, JSON */}
          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setOutputFormat("json")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                outputFormat === "json"
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              JSON
            </button>
            <button
              onClick={() => setOutputFormat("markdown")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                outputFormat === "markdown"
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Markdown
            </button>
            <button
              onClick={() => setOutputFormat("text")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                outputFormat === "text"
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Text
            </button>
          </div>

          {/* Sync vs Async Mode Toggle */}
          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setWaitMode(true)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                waitMode
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Sync</span>
            </button>
            <button
              onClick={() => setWaitMode(false)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                !waitMode
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
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
