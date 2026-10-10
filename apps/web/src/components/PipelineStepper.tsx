"use client";

import React from "react";
import { CheckCircle2, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { PipelineProgress } from "../lib/types";

interface PipelineStepperProps {
  progress: PipelineProgress;
}

const STAGES = [
  { key: "uploading", label: "Direct S3 Upload" },
  { key: "normalizing", label: "Normalize & Deskew" },
  { key: "parsing", label: "Docling Layout & OCR" },
  { key: "classifying", label: "Neural Classify" },
  { key: "extracting", label: "Schema Extraction" },
];

export function PipelineStepper({ progress }: PipelineStepperProps) {
  if (progress.stage === "idle") return null;

  const currentIdx = STAGES.findIndex((s) => s.key === progress.stage);
  const isCompleted = progress.stage === "completed";
  const isError = progress.stage === "error";

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : isError ? (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          ) : (
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          )}
          <span className="font-semibold text-white text-sm">
            {isCompleted ? "Extraction Complete" : isError ? "Pipeline Failed" : "Processing Document..."}
          </span>
        </div>
        <span className="text-xs font-mono text-slate-400">
          {progress.elapsedMs > 0 ? `${progress.elapsedMs}ms` : ""}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            isError ? "bg-rose-500" : "bg-gradient-to-r from-emerald-500 to-cyan-400"
          }`}
          style={{ width: `${progress.progressPercent}%` }}
        />
      </div>

      {/* Stages Step Indicators */}
      <div className="grid grid-cols-5 gap-2 text-center">
        {STAGES.map((stage, idx) => {
          const isDone = isCompleted || (currentIdx !== -1 && idx < currentIdx);
          const isCurrent = currentIdx === idx && !isCompleted && !isError;

          return (
            <div key={stage.key} className="space-y-1">
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  isDone
                    ? "bg-emerald-500"
                    : isCurrent
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-slate-800"
                }`}
              />
              <span
                className={`block text-[11px] truncate transition-colors ${
                  isDone
                    ? "text-emerald-400 font-medium"
                    : isCurrent
                    ? "text-white font-semibold"
                    : "text-slate-500"
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-center text-slate-400 italic">
        {progress.message}
      </p>
    </div>
  );
}
