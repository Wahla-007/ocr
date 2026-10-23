"use client";

import React, { useState } from "react";
import {
  FileText,
  Key,
  Database,
  ExternalLink,
  Settings,
  X,
  Sun,
  Moon,
  Zap,
  CheckCircle2,
  Server,
  Layers,
} from "lucide-react";
import { DEFAULT_API_KEY, DEFAULT_API_URL } from "../lib/api";
import { useTheme } from "../lib/theme";

interface HeaderProps {
  isBackendConnected: boolean;
  apiUrl: string;
  setApiUrl: (url: string) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  creditsBalance: number;
  itemsProcessed?: number;
  maxItems?: number;
  plan?: string;
  onGoToUpload?: () => void;
  onOpenDeveloperModal?: (tab?: "quickstart" | "keys" | "pricing" | "endpoints") => void;
  onOpenUpgradeModal?: () => void;
}

export function Header({
  isBackendConnected,
  apiUrl,
  setApiUrl,
  apiKey,
  setApiKey,
  creditsBalance,
  itemsProcessed = 0,
  maxItems = 5,
  plan = "free",
  onGoToUpload,
  onOpenDeveloperModal,
  onOpenUpgradeModal,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [tempUrl, setTempUrl] = useState(apiUrl);
  const [tempKey, setTempKey] = useState(apiKey);

  const handleSave = () => {
    setApiUrl(tempUrl);
    setApiKey(tempKey);
    setShowSettings(false);
  };

  const isFreePlan = plan === "free" || !plan.includes("pro");

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md px-4 sm:px-6 py-2.5 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-6 sm:gap-8">
            <button
              onClick={onGoToUpload}
              className="flex items-center gap-2.5 text-left hover:opacity-80 transition-opacity cursor-pointer group"
            >
              <div className="h-6 w-6 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-mono font-bold text-xs">
                //
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-white font-sans">
                  OpenOCR
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900">
                  v1.2-research
                </span>
              </div>
            </button>

            <nav className="hidden md:flex items-center gap-5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              <button
                onClick={onGoToUpload}
                className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer text-zinc-900 dark:text-white font-semibold flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-zinc-500" />
                <span>Playground</span>
              </button>
              <button
                onClick={() => onOpenDeveloperModal?.("quickstart")}
                className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                API Reference
              </button>
              <button
                onClick={() => onOpenDeveloperModal?.("endpoints")}
                className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                <Server className="w-3 h-3 text-zinc-400" />
                <span>Self-Hosted</span>
              </button>
              <button
                onClick={() => onOpenDeveloperModal?.("pricing")}
                className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Pricing
              </button>
            </nav>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Plan / Free Meter Indicator */}
            {isFreePlan ? (
              <button
                onClick={onOpenUpgradeModal}
                className="flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-mono border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors cursor-pointer"
                title="Free trial limit: 5 items total, 2 pages per document. Click to upgrade."
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="text-zinc-700 dark:text-zinc-300">
                  Free: <strong className="text-zinc-900 dark:text-white">{itemsProcessed}/{maxItems}</strong>
                </span>
                <span className="text-[10px] font-sans font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded-full">
                  Upgrade
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="font-semibold uppercase text-[11px]">Pro Plan</span>
              </div>
            )}

            {/* Backend Status Dot */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono border ${
                isBackendConnected
                  ? "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                  : "border-amber-300 dark:border-amber-800/40 text-amber-600 dark:text-amber-400"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isBackendConnected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                }`}
              />
              <span>{isBackendConnected ? "CPU Online" : "Connecting"}</span>
            </div>

            {/* Dark / Light Mode Switcher */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Developer Settings Icon */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              title="Configure API Key and URL"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Upgrade CTA Button */}
            {isFreePlan && (
              <button
                onClick={onOpenUpgradeModal}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Go Pro ($9)</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-zinc-500" />
                <h3 className="font-semibold text-sm">API Configuration</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  API Endpoint Base URL
                </label>
                <input
                  type="text"
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  placeholder={DEFAULT_API_URL}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-500 font-mono text-xs"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Default: Same-origin Next.js API or local FastAPI server
                </p>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Active API Key
                </label>
                <input
                  type="text"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  placeholder={DEFAULT_API_KEY}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-500 font-mono text-xs"
                />
                <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1.5">
                  <span>Free Trial: `ocr_free_trial12345`</span>
                  <span>Pro: `ocr_live_pro123456789`</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setShowSettings(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
