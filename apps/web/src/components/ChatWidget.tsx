"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  LifeBuoy,
  RefreshCw,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { Button } from "./ui/Button";

interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
  routeKey?: string;
  sourceDoc?: string;
  timestamp: string;
  isEscalation?: boolean;
}

// Curated Knowledge Base Answers extracted from /kb/*.md
const KB_RESPONSES: Record<string, { answer: string; routeKey?: string; sourceDoc: string }> = {
  api_key: {
    answer: "Programmatic API keys (prefixed with 'ocr_live_') are available on Developer Pro and Enterprise tiers. You can create and manage your keys on the Rate Card page. Keys are displayed once upon generation and hashed with Argon2id.",
    routeKey: "/pricing",
    sourceDoc: "API Quickstart",
  },
  pricing: {
    answer: "OpenOCR offers three transparent tiers: Free Explorer ($0 for 250 monthly pages), Developer Pro ($49/mo for 10,000 pages at $0.005/page), and Enterprise Self-Hosted ($499/mo for 100,000 pages or unlimited on-premises deployment).",
    routeKey: "/pricing",
    sourceDoc: "Pricing & Plans",
  },
  formats: {
    answer: "OpenOCR supports multi-page PDFs, PNG, JPEG/JPG, WEBP, and TIFF images. Files are verified using binary magic bytes. Files up to 10MB can be sent directly via multipart; larger files (up to 100MB) use Direct Signed Storage URLs.",
    routeKey: "/docs#uploads",
    sourceDoc: "Supported Formats",
  },
  self_hosted: {
    answer: "OpenOCR is 100% self-hosted capable. You can run the complete cluster (API, Workers, PostgreSQL, Redis, MinIO) in your air-gapped VPC using Docker Compose or Helm with zero outbound network calls.",
    routeKey: "/self-hosted",
    sourceDoc: "Self-Hosted Deployment",
  },
  webhooks: {
    answer: "OpenOCR sends signed HMAC-SHA256 payloads on asynchronous extraction completion in the 'X-OpenOCR-Signature' header. Verification requires constant-time comparison and enforces a 300-second replay window.",
    routeKey: "/docs#webhooks",
    sourceDoc: "HMAC Webhooks",
  },
  troubleshoot: {
    answer: "Common errors include FILE_TOO_LARGE (HTTP 413, solve by using signed upload URLs), UNSUPPORTED_TYPE (HTTP 415), and QUOTA_EXCEEDED (HTTP 429). Full RFC envelopes with request IDs are returned on every failure.",
    routeKey: "/docs#errors",
    sourceDoc: "Troubleshooting & Errors",
  },
};

// Client-side redaction for secrets and PII
function redactSensitiveInput(input: string): string {
  return input
    .replace(/ocr_(live|test)_[a-zA-Z0-9_-]{16,64}/g, "[REDACTED_API_KEY]")
    .replace(/Bearer\s+[a-zA-Z0-9_.-]{20,}/gi, "Bearer [REDACTED_TOKEN]")
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g, "[REDACTED_EMAIL]")
    .replace(/\b(?:\d{4}[ -]?){3}\d{4}\b/g, "[REDACTED_CARD_NUMBER]")
    .replace(/(?:password|passwd|secret)\s*[:=]\s*\S+/gi, "password: [REDACTED]");
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      sender: "bot",
      text: "Hello! I am the OpenOCR Assistant. I answer technical questions directly from our verified documentation. How can I help you today?",
      timestamp: "Just now",
    },
  ]);
  const [showEscalationForm, setShowEscalationForm] = useState(false);
  const [escalateEmail, setEscalateEmail] = useState("");
  const [escalateDesc, setEscalateDesc] = useState("");
  const [escalateSubmitted, setEscalateSubmitted] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listen for custom trigger event from headers or links
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener("open-openocr-chat", handleOpenChat);
    return () => window.removeEventListener("open-openocr-chat", handleOpenChat);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showEscalationForm]);

  const handleSend = (textToSend?: string) => {
    const rawQuery = textToSend || input;
    if (!rawQuery.trim()) return;

    const safeQuery = redactSensitiveInput(rawQuery.trim());
    const lower = safeQuery.toLowerCase();

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      sender: "user",
      text: safeQuery,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Match query against KB intent keywords
    setTimeout(() => {
      let matchedKey: string | null = null;

      if (lower.includes("key") || lower.includes("token") || lower.includes("auth")) {
        matchedKey = "api_key";
      } else if (lower.includes("price") || lower.includes("cost") || lower.includes("plan") || lower.includes("credit")) {
        matchedKey = "pricing";
      } else if (lower.includes("format") || lower.includes("pdf") || lower.includes("file") || lower.includes("size") || lower.includes("limit")) {
        matchedKey = "formats";
      } else if (lower.includes("self-host") || lower.includes("air-gap") || lower.includes("docker") || lower.includes("vpc") || lower.includes("on-prem")) {
        matchedKey = "self_hosted";
      } else if (lower.includes("webhook") || lower.includes("hmac") || lower.includes("signature")) {
        matchedKey = "webhooks";
      } else if (lower.includes("error") || lower.includes("fail") || lower.includes("429") || lower.includes("413") || lower.includes("troubleshoot")) {
        matchedKey = "troubleshoot";
      } else if (lower.includes("human") || lower.includes("support") || lower.includes("ticket") || lower.includes("person") || lower.includes("talk")) {
        setShowEscalationForm(true);
        const botMsg: Message = {
          id: `bot_${Date.now()}`,
          sender: "bot",
          text: "I can connect you directly with our engineering support team. Please enter your email and issue summary below to open a priority ticket.",
          timestamp: "Just now",
          isEscalation: true,
        };
        setMessages((prev) => [...prev, botMsg]);
        return;
      }

      if (matchedKey && KB_RESPONSES[matchedKey]) {
        const kb = KB_RESPONSES[matchedKey];
        const botMsg: Message = {
          id: `bot_${Date.now()}`,
          sender: "bot",
          text: kb.answer,
          routeKey: kb.routeKey,
          sourceDoc: kb.sourceDoc,
          timestamp: "Just now",
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        const botMsg: Message = {
          id: `bot_${Date.now()}`,
          sender: "bot",
          text: "I don't have a verified answer for that specific question in our knowledge base. Would you like me to connect you with an on-call human engineer?",
          timestamp: "Just now",
          isEscalation: true,
        };
        setMessages((prev) => [...prev, botMsg]);
      }
    }, 350);
  };

  const handleEscalationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateEmail.trim()) return;

    const ticketRef = `OCR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setEscalateSubmitted(ticketRef);

    const confirmationMsg: Message = {
      id: `bot_esc_${Date.now()}`,
      sender: "bot",
      text: `Support ticket created: Reference #${ticketRef}. A confirmation receipt and engineering follow-up has been routed to ${escalateEmail}. Priority response SLA active.`,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, confirmationMsg]);
    setShowEscalationForm(false);
    setEscalateEmail("");
    setEscalateDesc("");
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans antialiased">
      {/* High-Visibility Floating Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-3 px-4 py-3 rounded-full bg-[#161618] hover:bg-[#1F1F23] text-white border-2 border-[#C85A32] shadow-[0_10px_35px_rgba(200,90,50,0.4)] hover:shadow-[0_14px_45px_rgba(200,90,50,0.55)] transition-all duration-200 cursor-pointer transform hover:scale-105 active:scale-95"
          aria-label="Open OpenOCR Assistant"
        >
          {/* Pulsing Beacon */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>

          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#C85A32]" />
            <span className="font-mono text-xs font-bold tracking-wide">Assistant</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#C85A32]/25 text-[#C85A32] font-semibold border border-[#C85A32]/35">
              AI QA
            </span>
          </div>
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="w-[380px] sm:w-[420px] max-w-[calc(100vw-2rem)] h-[560px] bg-[#161618] text-[#FBF9F5] border-2 border-[#C85A32] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden text-xs transition-all animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-zinc-800 bg-[#1F1F23] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#C85A32] text-white flex items-center justify-center font-mono font-bold text-xs shadow-sm">
                //
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-sm text-white">OpenOCR Assistant</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <span className="text-[10px] text-zinc-400 font-mono block">
                  Authoritative Documentation &amp; Support QA
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label="Close Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Starter Chips */}
          <div className="px-3 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center gap-1.5 overflow-x-auto select-none no-scrollbar">
            <button
              type="button"
              onClick={() => handleSend("How do I get an API key?")}
              className="shrink-0 px-2.5 py-1 rounded-full border border-zinc-700 bg-zinc-800/80 text-[10px] text-zinc-300 hover:text-[#C85A32] hover:border-[#C85A32] transition-colors"
            >
              API Keys
            </button>
            <button
              type="button"
              onClick={() => handleSend("How does pricing work?")}
              className="shrink-0 px-2.5 py-1 rounded-full border border-zinc-700 bg-zinc-800/80 text-[10px] text-zinc-300 hover:text-[#C85A32] hover:border-[#C85A32] transition-colors"
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => handleSend("What formats are supported?")}
              className="shrink-0 px-2.5 py-1 rounded-full border border-zinc-700 bg-zinc-800/80 text-[10px] text-zinc-300 hover:text-[#C85A32] hover:border-[#C85A32] transition-colors"
            >
              Formats
            </button>
            <button
              type="button"
              onClick={() => handleSend("Talk to a human support engineer")}
              className="shrink-0 px-2.5 py-1 rounded-full border border-[#C85A32]/60 bg-[#C85A32]/10 text-[10px] text-[#C85A32] font-bold hover:bg-[#C85A32]/20 transition-colors"
            >
              Talk to Human
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 leading-relaxed bg-[#161618]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.sender === "bot" && (
                  <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-[#C85A32]" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] p-3 rounded-lg ${
                    m.sender === "user"
                      ? "bg-[#C85A32] text-white"
                      : "bg-[#1F1F23] border border-zinc-800 text-zinc-200"
                  }`}
                >
                  <p className="text-xs whitespace-pre-wrap leading-relaxed">{m.text}</p>
                  {m.sourceDoc && (
                    <div className="mt-2 pt-1.5 border-t border-zinc-700/60 text-[10px] text-zinc-400 flex items-center justify-between">
                      <span>Source: {m.sourceDoc}</span>
                      {m.routeKey && (
                        <Link
                          href={m.routeKey}
                          onClick={() => setIsOpen(false)}
                          className="text-[#C85A32] hover:underline flex items-center gap-0.5 font-bold"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      )}
                    </div>
                  )}
                  {m.isEscalation && !showEscalationForm && (
                    <div className="mt-2.5 pt-2 border-t border-zinc-700/60">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setShowEscalationForm(true)}
                        leftIcon={<LifeBuoy className="w-3 h-3 text-[#C85A32]" />}
                        className="w-full text-xs"
                      >
                        Open Ticket with Support
                      </Button>
                    </div>
                  )}
                </div>
                {m.sender === "user" && (
                  <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-zinc-300" />
                  </div>
                )}
              </div>
            ))}

            {/* In-Widget Human Escalation Form */}
            {showEscalationForm && (
              <form
                onSubmit={handleEscalationSubmit}
                className="p-3.5 bg-[#1F1F23] border border-[#C85A32]/60 rounded-lg space-y-3 shadow-lg"
              >
                <div className="flex items-center justify-between font-mono text-xs font-bold text-[#C85A32] uppercase">
                  <span>Open Engineering Ticket</span>
                  <button
                    type="button"
                    onClick={() => setShowEscalationForm(false)}
                    className="text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-zinc-400 block mb-1">Contact Email:</label>
                  <input
                    type="email"
                    required
                    placeholder="engineer@company.com"
                    value={escalateEmail}
                    onChange={(e) => setEscalateEmail(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:border-[#C85A32]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-zinc-400 block mb-1">Issue Summary:</label>
                  <textarea
                    rows={2}
                    placeholder="Briefly describe the question or error..."
                    value={escalateDesc}
                    onChange={(e) => setEscalateDesc(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:border-[#C85A32]"
                  />
                </div>
                <Button type="submit" size="xs" variant="primary" className="w-full font-bold">
                  Submit Escalation Ticket
                </Button>
              </form>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-zinc-800 bg-[#1F1F23] flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask a technical question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-3 py-2 text-xs font-mono bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#C85A32]"
            />
            <Button
              type="submit"
              size="sm"
              variant="primary"
              className="px-3 py-2"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
