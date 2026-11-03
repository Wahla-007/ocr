"use client";

import React, { useState, useEffect } from "react";
import {
  Loader2,
  Sparkles,
  Check,
  FileText,
  Scan,
  Layers,
  Table as TableIcon,
  ShieldCheck,
  Cpu,
} from "lucide-react";

interface DocumentProcessingLoaderProps {
  fileName: string;
}

const STAGES = [
  {
    step: 1,
    title: "Geometry Normalization",
    desc: "DPI scaling, perspective deskew & contrast leveling",
    icon: Scan,
  },
  {
    step: 2,
    title: "Multimodal Vision Analysis",
    desc: "Deep visual token recognition with Gemini 2.5 Flash",
    icon: Cpu,
  },
  {
    step: 3,
    title: "Cellular Layout & Matrix Structuring",
    desc: "Table grid detection, row-column bounds & line grouping",
    icon: TableIcon,
  },
  {
    step: 4,
    title: "Schema Synthesis & Dynamic Pruning",
    desc: "Strict field extraction with empty field omission",
    icon: Sparkles,
  },
];

export function DocumentProcessingLoader({ fileName }: DocumentProcessingLoaderProps) {
  const [activeStage, setActiveStage] = useState(1);
  const [progressPercent, setProgressPercent] = useState(15);

  useEffect(() => {
    // Smooth progress simulation
    const timer1 = setTimeout(() => {
      setActiveStage(2);
      setProgressPercent(42);
    }, 400);

    const timer2 = setTimeout(() => {
      setActiveStage(3);
      setProgressPercent(72);
    }, 1100);

    const timer3 = setTimeout(() => {
      setActiveStage(4);
      setProgressPercent(94);
    }, 1900);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="w-full h-full min-h-0 flex flex-col items-center justify-center border border-zinc-200 dark:border-[#292d30] rounded-[16px] bg-white dark:bg-[#000000] shadow-none p-4 sm:p-5 relative overflow-hidden select-none">
      {/* Subtle Void Background */}
      <div className="absolute inset-0 bg-zinc-50/50 dark:bg-[#000000] pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center space-y-3 sm:space-y-4 text-center my-auto">
        {/* Animated Document Blueprint with Scanning Laser */}
        <div className="relative w-28 h-36 sm:w-32 sm:h-40 rounded-[6px] bg-zinc-100 dark:bg-[#08080a] border border-zinc-200 dark:border-[#292d30] shadow-none p-3 flex flex-col justify-between overflow-hidden">
          {/* Laser Scanning Beam - Iris Violet */}
          <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#9281f7] to-transparent animate-scan-line shadow-[0_0_12px_#9281f7] z-20 pointer-events-none" />

          {/* Skeleton Document Header */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="w-8 h-2 rounded-[2px] bg-zinc-300 dark:bg-[#292d30] animate-pulse" />
              <div className="w-6 h-1.5 rounded-[2px] bg-[#9281f7]/40 animate-pulse" />
            </div>
            <div className="w-16 h-1.5 rounded-[2px] bg-zinc-200 dark:bg-[#1a1c1e] animate-pulse" />
          </div>

          {/* Skeleton Field Grid */}
          <div className="grid grid-cols-2 gap-1.5 my-auto">
            <div className="p-1 rounded-[4px] border border-zinc-200 dark:border-[#292d30] bg-white dark:bg-[#000000] space-y-0.5">
              <div className="w-8 h-1 rounded-[2px] bg-purple-500/50 dark:bg-[#9281f7]/50 animate-pulse" />
              <div className="w-10 h-1.5 rounded-[2px] bg-zinc-300 dark:bg-[#292d30] animate-pulse" />
            </div>
            <div className="p-1 rounded-[4px] border border-zinc-200 dark:border-[#292d30] bg-white dark:bg-[#000000] space-y-0.5">
              <div className="w-8 h-1 rounded-[2px] bg-purple-500/50 dark:bg-[#9281f7]/50 animate-pulse" />
              <div className="w-10 h-1.5 rounded-[2px] bg-zinc-300 dark:bg-[#292d30] animate-pulse" />
            </div>
          </div>

          {/* Skeleton Table Lines */}
          <div className="space-y-1 border-t border-zinc-200 dark:border-[#292d30] pt-1.5">
            <div className="w-full h-1 rounded-[2px] bg-zinc-200 dark:bg-[#1a1c1e] animate-pulse" />
            <div className="w-4/5 h-1 rounded-[2px] bg-zinc-200 dark:bg-[#1a1c1e] animate-pulse" />
          </div>

          {/* Registration ticks */}
          <span className="absolute top-1 left-1.5 text-[8px] text-zinc-400 dark:text-[#6e727a] font-mono">+</span>
          <span className="absolute top-1 right-1.5 text-[8px] text-zinc-400 dark:text-[#6e727a] font-mono">+</span>
          <span className="absolute bottom-1 left-1.5 text-[8px] text-zinc-400 dark:text-[#6e727a] font-mono">+</span>
          <span className="absolute bottom-1 right-1.5 text-[8px] text-zinc-400 dark:text-[#6e727a] font-mono">+</span>
        </div>

        {/* Status Headings */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] bg-purple-50 dark:bg-[#9281f7]/10 border border-purple-200 dark:border-[#9281f7]/30 text-purple-700 dark:text-[#9281f7] font-mono text-[11px] font-medium tracking-wide">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Analyzing Document Architecture</span>
          </div>

          <h2 className="text-base sm:text-lg font-sans font-medium text-zinc-900 dark:text-white tracking-tight">
            Extracting Structured Intelligence
          </h2>

          <p className="text-xs text-zinc-500 dark:text-[#a1a4a5] font-mono truncate max-w-md">
            target: <span className="text-zinc-900 dark:text-[#f0f0f0]">{fileName || "uploaded_document"}</span>
          </p>
        </div>

        {/* Smooth Animated Progress Bar */}
        <div className="w-full max-w-md space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-[#a1a4a5]">
            <span>Pipeline Progression</span>
            <span className="tabular-nums font-mono text-purple-600 dark:text-[#9281f7] font-semibold">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-[#0b0e14] overflow-hidden p-0.5 border border-zinc-200 dark:border-[#292d30]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-600 via-purple-500 to-[#9281f7] dark:from-[#9281f7] dark:to-[#baa7ff] transition-all duration-500 ease-out shadow-[0_0_8px_#9281f7]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Multi-Stage Stepper Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full pt-1">
          {STAGES.map((s) => {
            const isDone = activeStage > s.step;
            const isCurrent = activeStage === s.step;
            const Icon = s.icon;

            return (
              <div
                key={s.step}
                className={`p-3 rounded-[6px] border transition-all duration-300 text-left font-mono ${
                  isDone
                    ? "border-[#3ad389]/40 bg-[#3ad389]/10 text-[#3ad389]"
                    : isCurrent
                    ? "border-purple-600 dark:border-[#9281f7] bg-purple-50 dark:bg-[#9281f7]/10 text-purple-700 dark:text-[#9281f7] ring-1 ring-purple-600 dark:ring-[#9281f7]"
                    : "border-zinc-200 dark:border-[#292d30] bg-zinc-50 dark:bg-[#000000] text-zinc-400 dark:text-[#6e727a] opacity-70"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] font-bold">0{s.step}</span>
                  </div>
                  {isDone ? (
                    <Check className="w-3.5 h-3.5 text-[#3ad389]" />
                  ) : isCurrent ? (
                    <Loader2 className="w-3 h-3 animate-spin text-purple-600 dark:text-[#9281f7]" />
                  ) : null}
                </div>
                <div className="text-[11px] font-medium text-zinc-900 dark:text-white truncate">
                  {s.title}
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-[#a1a4a5] truncate mt-0.5">
                  {s.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Security & Integrity Note */}
        <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-zinc-500 dark:text-[#6e727a] pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#3ad389] shrink-0" />
          <span>Zero-Knowledge Processing • In-Memory Architecture • Confidential Verification</span>
        </div>
      </div>
    </div>
  );
}

