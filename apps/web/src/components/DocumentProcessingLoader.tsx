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
    <div className="w-full h-full min-h-0 flex flex-col items-center justify-center border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] shadow-card p-4 sm:p-5 relative overflow-hidden select-none">
      {/* Subtle Light Table Grid Background */}
      <div className="absolute inset-0 light-table-grid opacity-40 pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center space-y-3 sm:space-y-4 text-center my-auto">
        {/* Animated Document Blueprint with Scanning Laser */}
        <div className="relative w-28 h-36 sm:w-32 sm:h-40 rounded-sm bg-white dark:bg-zinc-900 border-2 border-[var(--line-strong)] shadow-xl p-3 flex flex-col justify-between overflow-hidden">
          {/* Laser Scanning Beam */}
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[var(--signal)] to-transparent animate-scan-line shadow-[0_0_12px_var(--signal)] z-20 pointer-events-none" />

          {/* Skeleton Document Header */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="w-8 h-2 rounded-sm bg-zinc-300 dark:bg-zinc-700 animate-pulse" />
              <div className="w-6 h-1.5 rounded-sm bg-[var(--signal)]/40 animate-pulse" />
            </div>
            <div className="w-16 h-1.5 rounded-sm bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          </div>

          {/* Skeleton Field Grid */}
          <div className="grid grid-cols-2 gap-1.5 my-auto">
            <div className="p-1 rounded-sm border border-dashed border-[var(--signal)]/40 bg-[var(--signal)]/5 space-y-0.5">
              <div className="w-8 h-1 rounded-sm bg-[var(--signal)]/50 animate-pulse" />
              <div className="w-10 h-1.5 rounded-sm bg-zinc-300 dark:bg-zinc-700 animate-pulse" />
            </div>
            <div className="p-1 rounded-sm border border-dashed border-[var(--signal)]/40 bg-[var(--signal)]/5 space-y-0.5">
              <div className="w-8 h-1 rounded-sm bg-[var(--signal)]/50 animate-pulse" />
              <div className="w-10 h-1.5 rounded-sm bg-zinc-300 dark:bg-zinc-700 animate-pulse" />
            </div>
          </div>

          {/* Skeleton Table Lines */}
          <div className="space-y-1 border-t border-zinc-200 dark:border-zinc-800 pt-1.5">
            <div className="w-full h-1 rounded-sm bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            <div className="w-4/5 h-1 rounded-sm bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          </div>

          {/* Registration ticks */}
          <span className="absolute top-1 left-1.5 text-[8px] text-zinc-400 font-mono">+</span>
          <span className="absolute top-1 right-1.5 text-[8px] text-zinc-400 font-mono">+</span>
          <span className="absolute bottom-1 left-1.5 text-[8px] text-zinc-400 font-mono">+</span>
          <span className="absolute bottom-1 right-1.5 text-[8px] text-zinc-400 font-mono">+</span>
        </div>

        {/* Status Headings */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--signal-subtle)] border border-[var(--signal)]/30 text-[var(--signal)] font-mono text-[11px] font-bold tracking-wide uppercase">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Analyzing Document Architecture</span>
          </div>

          <h2 className="text-base sm:text-lg font-serif font-bold text-[var(--ink-primary)] tracking-tight">
            Extracting Structured Intelligence
          </h2>

          <p className="text-xs text-[var(--ink-secondary)] font-mono truncate max-w-md">
            Analyzing: <span className="font-bold text-[var(--ink-primary)]">{fileName || "uploaded_document"}</span>
          </p>
        </div>

        {/* Smooth Animated Progress Bar */}
        <div className="w-full max-w-md space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--ink-muted)]">
            <span>Pipeline Progression</span>
            <span className="tabular-nums font-bold text-[var(--signal)]">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[var(--surface-sunken)] overflow-hidden p-0.5 border border-[var(--line-hairline)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--signal)] via-[#E07148] to-[var(--signal)] transition-all duration-500 ease-out shadow-[0_0_8px_var(--signal)]"
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
                className={`p-3 rounded-sm border transition-all duration-300 text-left font-mono ${
                  isDone
                    ? "border-[var(--semantic-success)] bg-[var(--semantic-success-subtle)] text-[var(--semantic-success)]"
                    : isCurrent
                    ? "border-[var(--signal)] bg-[var(--signal-subtle)] text-[var(--signal)] shadow-sm ring-1 ring-[var(--signal)]"
                    : "border-[var(--line-hairline)] bg-[var(--surface-subtle)] text-[var(--ink-muted)] opacity-60"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] font-bold">0{s.step}</span>
                  </div>
                  {isDone ? (
                    <Check className="w-3.5 h-3.5 text-[var(--semantic-success)]" />
                  ) : isCurrent ? (
                    <Loader2 className="w-3 h-3 animate-spin text-[var(--signal)]" />
                  ) : null}
                </div>
                <div className="text-[11px] font-semibold text-[var(--ink-primary)] truncate">
                  {s.title}
                </div>
                <p className="text-[10px] text-[var(--ink-muted)] truncate mt-0.5">
                  {s.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Security & Integrity Note */}
        <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-[var(--ink-muted)] pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--semantic-success)] shrink-0" />
          <span>Zero-Knowledge Processing • In-Memory Architecture • Confidential Verification</span>
        </div>
      </div>
    </div>
  );
}

