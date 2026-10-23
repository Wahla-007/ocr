"use client";

import React from "react";
import { X, Check, Zap, ArrowRight, ShieldCheck, Cpu } from "lucide-react";
import { PRO_DEMO_KEY } from "../lib/keys";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
  itemsProcessed?: number;
  onSwitchToProKey?: (proKey: string) => void;
}

export function UpgradeModal({
  isOpen,
  onClose,
  reason = "Free tier allows max 5 documents and 2 pages per document.",
  itemsProcessed = 5,
  onSwitchToProKey,
}: UpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-zinc-900 dark:text-zinc-100">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Zap className="w-3.5 h-3.5" />
              <span>Pro Plan Required</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">Upgrade to OpenOCR Pro</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reason notice */}
        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
          <p className="font-semibold text-zinc-900 dark:text-zinc-200 mb-0.5">Free Plan Limit Reached</p>
          <p>{reason}</p>
        </div>

        {/* Plan comparison card */}
        <div className="rounded-xl border-2 border-zinc-900 dark:border-zinc-100 p-5 space-y-4 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-baseline justify-between">
            <div>
              <h3 className="font-bold text-base">OpenOCR Pro Tier</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">For teams, production pipelines & batch jobs</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono">$9</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400"> / month</span>
            </div>
          </div>

          <ul className="space-y-2 text-xs">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span><strong>Unlimited</strong> lifetime documents (free is capped at 5)</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span><strong>Up to 500 pages</strong> per document (free is capped at 2)</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span><strong>300 requests/minute</strong> high-volume rate limit (vs 10/min)</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Priority CPU thread allocation & zero throttling</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Air-gapped self-hosted license token included</span>
            </li>
          </ul>
        </div>

        {/* Action buttons */}
        <div className="space-y-2.5 pt-1">
          {onSwitchToProKey && (
            <button
              onClick={() => {
                onSwitchToProKey(PRO_DEMO_KEY);
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Activate Pro Key Sandbox (`{PRO_DEMO_KEY.substring(0, 12)}...`)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 pt-2 px-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
              100% money-back guarantee
            </span>
            <span>Billing portal integrating shortly</span>
          </div>
        </div>
      </div>
    </div>
  );
}
