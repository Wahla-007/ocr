"use client";

import React, { useState } from "react";
import {
  FileText,
  Activity,
  Key,
  Database,
  ExternalLink,
  Settings,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { DEFAULT_API_KEY, DEFAULT_API_URL } from "../lib/api";

interface HeaderProps {
  isBackendConnected: boolean;
  apiUrl: string;
  setApiUrl: (url: string) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  creditsBalance: number;
  onGoToUpload?: () => void;
  onOpenDeveloperModal?: (tab?: "quickstart" | "keys" | "pricing" | "endpoints") => void;
}

export function Header({
  isBackendConnected,
  apiUrl,
  setApiUrl,
  apiKey,
  setApiKey,
  creditsBalance,
  onGoToUpload,
  onOpenDeveloperModal,
}: HeaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [tempUrl, setTempUrl] = useState(apiUrl);
  const [tempKey, setTempKey] = useState(apiKey);

  const handleSave = () => {
    setApiUrl(tempUrl);
    setApiKey(tempKey);
    setShowSettings(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-8">
            <button
              onClick={onGoToUpload}
              className="flex items-center gap-2.5 text-left hover:opacity-85 transition-opacity cursor-pointer"
            >
              <div className="h-7 w-7 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20 font-black text-xs font-mono">
                [ ]
              </div>
              <span className="font-extrabold text-base tracking-widest text-white uppercase font-mono">
                OCR
              </span>
            </button>

            <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
              <button
                onClick={onGoToUpload}
                className="hover:text-white transition-colors flex items-center gap-1.5 text-emerald-400 font-semibold cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>OCR</span>
              </button>
              <button
                onClick={() => onOpenDeveloperModal?.("quickstart")}
                className="hover:text-white transition-colors cursor-pointer"
              >
                API Doc
              </button>
              <button
                onClick={() => onOpenDeveloperModal?.("pricing")}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Pricing ($0.001)
              </button>
              <button
                onClick={() => onOpenDeveloperModal?.("endpoints")}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Self-hosted
              </button>
            </nav>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            {/* Developer API Quick Action */}
            <button
              onClick={() => onOpenDeveloperModal?.("quickstart")}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
            >
              <Key className="w-3 h-3" />
              <span>API ($0.001)</span>
            </button>

            {/* Live Backend Connection Indicator */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                isBackendConnected
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-400"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isBackendConnected ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <span className="hidden sm:inline">
                {isBackendConnected ? "Live" : "Sandbox"}
              </span>
            </div>

            {/* Credit Ledger Pill */}
            <button
              onClick={() => onOpenDeveloperModal?.("keys")}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors cursor-pointer"
              title="Click to view API usage, credits, and pricing"
            >
              <span className="text-emerald-400 font-bold">{creditsBalance}</span>
              <span className="text-slate-500">credits</span>
            </button>

            {/* Settings Icon */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="API Configuration"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {/* Auth Buttons */}
            <button className="text-xs font-medium text-slate-300 hover:text-white px-2 py-1 transition-colors hidden sm:block">
              Sign in
            </button>
            <button className="text-xs font-semibold bg-emerald-400 hover:bg-emerald-300 text-slate-950 px-3.5 py-1.5 rounded-lg shadow-sm shadow-emerald-500/20 transition-all font-sans">
              Start free
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-white">Platform Settings</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Backend API Base URL
                </label>
                <input
                  type="text"
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  placeholder={DEFAULT_API_URL}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Local FastAPI server URL (e.g. http://localhost:8000)
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  API Key
                </label>
                <input
                  type="password"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  placeholder={DEFAULT_API_KEY}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Bearer token for authentication
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
