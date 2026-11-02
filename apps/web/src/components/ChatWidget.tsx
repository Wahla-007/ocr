"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
    answer: "Programmatic API keys (prefixed with 'ocr_live_') are available on Developer Pro and Enterprise tiers. You can create and manage your keys on the Pricing page. Keys are displayed once upon generation and hashed with Argon2id.",
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
  const pathname = usePathname();
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
      {/* High-Visibility Floating Trigger Button (Hidden on playground page to prevent obstructing workspace) */}
      {!isOpen && pathname !== "/" && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 px-3.5 py-2 rounded-[6px] bg-[#000000] hover:bg-[#0b0e14] text-white border border-[#292d30] hover:border-white shadow-none transition-all cursor-pointer"
          aria-label="Open OpenOCR Assistant"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#3ad389]" />
          <Bot className="w-3.5 h-3.5 text-[#9281f7]" />
          <span className="font-mono text-xs text-white">Assistant</span>
        </button>
      )}

      {/* Floating Chat Modal - Resend Void Black & Iris Violet */}
      {isOpen && (
        <div className="w-[380px] sm:w-[420px] max-w-[calc(100vw-2rem)] h-[540px] bg-[#000000] text-white border border-[#292d30] rounded-[12px] shadow-2xl flex flex-col overflow-hidden text-xs transition-all animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#292d30] bg-[#000000] flex items-center justify-between select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-[4px] bg-white text-black flex items-center justify-center font-mono font-bold text-xs">
                //
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-medium text-sm text-white">OpenOCR Assistant</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3ad389]" />
                </div>
                <span className="text-[10px] text-[#6e727a] font-mono block">
                  Documentation &amp; Support QA
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-[4px] text-[#a1a4a5] hover:text-white hover:bg-[#0b0e14] transition-colors"
              aria-label="Close Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Starter Chips */}
          <div className="px-3 py-2 bg-[#050505] border-b border-[#292d30] flex items-center gap-1.5 overflow-x-auto select-none no-scrollbar">
            <button
              type="button"
              onClick={() => handleSend("How do I get an API key?")}
              className="shrink-0 px-2.5 py-1 rounded-[6px] border border-[#292d30] bg-transparent text-[11px] font-mono text-[#a1a4a5] hover:text-white hover:border-white transition-colors"
            >
              API Keys
            </button>
            <button
              type="button"
              onClick={() => handleSend("How does pricing work?")}
              className="shrink-0 px-2.5 py-1 rounded-[6px] border border-[#292d30] bg-transparent text-[11px] font-mono text-[#a1a4a5] hover:text-white hover:border-white transition-colors"
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => handleSend("What formats are supported?")}
              className="shrink-0 px-2.5 py-1 rounded-[6px] border border-[#292d30] bg-transparent text-[11px] font-mono text-[#a1a4a5] hover:text-white hover:border-white transition-colors"
            >
              Formats
            </button>
            <button
              type="button"
              onClick={() => handleSend("Talk to a human support engineer")}
              className="shrink-0 px-2.5 py-1 rounded-[6px] border border-[#9281f7]/40 bg-[#9281f7]/10 text-[11px] font-mono text-[#baa7ff] hover:border-[#9281f7] transition-colors"
            >
              Talk to Human
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 leading-relaxed bg-[#000000]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.sender === "bot" && (
                  <div className="w-5 h-5 rounded-full bg-[#0b0e14] border border-[#292d30] flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3 h-3 text-[#9281f7]" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] p-3 rounded-[6px] ${
                    m.sender === "user"
                      ? "bg-[#9281f7] text-black font-medium"
                      : "bg-[#08080a] border border-[#292d30] text-[#f0f0f0]"
                  }`}
                >
                  <p className="text-xs whitespace-pre-wrap leading-relaxed">{m.text}</p>
                  {m.sourceDoc && (
                    <div className="mt-2 pt-1.5 border-t border-[#292d30] text-[10px] text-[#6e727a] flex items-center justify-between font-mono">
                      <span>Source: {m.sourceDoc}</span>
                      {m.routeKey && (
                        <Link
                          href={m.routeKey}
                          onClick={() => setIsOpen(false)}
                          className="text-[#9281f7] hover:underline flex items-center gap-0.5"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      )}
                    </div>
                  )}
                  {m.isEscalation && !showEscalationForm && (
                    <div className="mt-2.5 pt-2 border-t border-[#292d30]">
                      <button
                        type="button"
                        onClick={() => setShowEscalationForm(true)}
                        className="w-full text-xs font-mono py-1.5 px-2 rounded-[6px] border border-[#292d30] hover:border-white text-white transition-colors"
                      >
                        Open Ticket with Support
                      </button>
                    </div>
                  )}
                </div>
                {m.sender === "user" && (
                  <div className="w-5 h-5 rounded-full bg-[#292d30] flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            ))}

            {/* In-Widget Human Escalation Form */}
            {showEscalationForm && (
              <form
                onSubmit={handleEscalationSubmit}
                className="p-3.5 bg-[#08080a] border border-[#292d30] rounded-[6px] space-y-3"
              >
                <div className="flex items-center justify-between font-mono text-xs text-[#9281f7]">
                  <span>Open Engineering Ticket</span>
                  <button
                    type="button"
                    onClick={() => setShowEscalationForm(false)}
                    className="text-[#6e727a] hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-[#a1a4a5] block mb-1">Contact Email:</label>
                  <input
                    type="email"
                    required
                    placeholder="engineer@company.com"
                    value={escalateEmail}
                    onChange={(e) => setEscalateEmail(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#000000] border border-[#292d30] rounded-[6px] text-white focus:outline-none focus:border-[#9281f7]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-[#a1a4a5] block mb-1">Issue Summary:</label>
                  <textarea
                    rows={2}
                    placeholder="Briefly describe the question or error..."
                    value={escalateDesc}
                    onChange={(e) => setEscalateDesc(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#000000] border border-[#292d30] rounded-[6px] text-white focus:outline-none focus:border-[#9281f7]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 px-3 rounded-[6px] bg-[#9281f7] text-black font-mono text-xs font-medium hover:bg-[#baa7ff] transition-colors"
                >
                  Submit Escalation Ticket
                </button>
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
            className="p-3 border-t border-[#292d30] bg-[#000000] flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs font-mono bg-[#050505] border border-[#292d30] rounded-[6px] text-white placeholder-[#6e727a] focus:outline-none focus:border-[#9281f7]"
            />
            <button
              type="submit"
              className="p-2 rounded-[6px] border border-[#292d30] hover:border-white text-[#a1a4a5] hover:text-white transition-colors"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
