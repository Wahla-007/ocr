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
    answer: "Programmatic API keys (with 'ocr_live_' prefix) are available on Developer Pro and Enterprise tiers. You can create and manage your keys on the Rate Card page. Keys are displayed once at creation and hashed using Argon2id.",
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
      text: "Hello, I am the OpenOCR Assistant. I answer questions directly from our verified technical documentation. How can I help you today?",
      timestamp: "Just now",
    },
  ]);
  const [showEscalationForm, setShowEscalationForm] = useState(false);
  const [escalateEmail, setEscalateEmail] = useState("");
  const [escalateDesc, setEscalateDesc] = useState("");
  const [escalateSubmitted, setEscalateSubmitted] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
          text: "I can connect you directly with our engineering support team. Please enter your email and issue details below to open a ticket.",
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
          text: "I don't have a verified answer for that specific query in our knowledge base. Would you like me to connect you with an on-call human engineer?",
          timestamp: "Just now",
          isEscalation: true,
        };
        setMessages((prev) => [...prev, botMsg]);
      }
    }, 400);
  };

  const handleEscalationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateEmail.trim()) return;

    const ticketRef = `OCR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setEscalateSubmitted(ticketRef);

    const confirmationMsg: Message = {
      id: `bot_esc_${Date.now()}`,
      sender: "bot",
      text: `Support ticket created: Reference #${ticketRef}. A confirmation and response has been routed to ${escalateEmail}. Priority response SLA active.`,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, confirmationMsg]);
    setShowEscalationForm(false);
    setEscalateEmail("");
    setEscalateDesc("");
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[var(--ink-primary)] text-[var(--surface-base)] shadow-2xl hover:opacity-90 transition-all font-mono text-xs font-bold border border-[var(--line-strong)]"
          aria-label="Open OpenOCR Assistant"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <MessageSquare className="w-4 h-4 text-[var(--signal)]" />
          <span>OpenOCR Assistant</span>
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="w-96 max-w-[calc(100vw-2rem)] h-[520px] bg-[var(--surface-base)] border border-[var(--line-strong)] rounded-lg shadow-2xl flex flex-col overflow-hidden text-xs transition-all">
          {/* Header */}
          <div className="p-3.5 border-b border-[var(--line-hairline)] bg-[var(--surface-sunken)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[var(--signal)] text-white flex items-center justify-center font-mono font-bold text-[10px]">
                //
              </div>
              <div>
                <span className="font-mono font-bold text-[var(--ink-primary)] block">OpenOCR Assistant</span>
                <span className="text-[10px] text-[var(--ink-muted)] flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Documentation & Support QA
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subtle)]"
              aria-label="Close Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Starter Chips */}
          <div className="px-3 py-2 bg-[var(--surface-subtle)] border-b border-[var(--line-hairline)] flex items-center gap-1.5 overflow-x-auto select-none no-scrollbar">
            <button
              type="button"
              onClick={() => handleSend("How do I get an API key?")}
              className="shrink-0 px-2 py-0.5 rounded-full border border-[var(--line-hairline)] bg-[var(--surface-base)] text-[10px] text-[var(--ink-secondary)] hover:text-[var(--signal)] hover:border-[var(--signal)] transition-colors"
            >
              API Keys
            </button>
            <button
              type="button"
              onClick={() => handleSend("How does pricing work?")}
              className="shrink-0 px-2 py-0.5 rounded-full border border-[var(--line-hairline)] bg-[var(--surface-base)] text-[10px] text-[var(--ink-secondary)] hover:text-[var(--signal)] hover:border-[var(--signal)] transition-colors"
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => handleSend("What formats are supported?")}
              className="shrink-0 px-2 py-0.5 rounded-full border border-[var(--line-hairline)] bg-[var(--surface-base)] text-[10px] text-[var(--ink-secondary)] hover:text-[var(--signal)] hover:border-[var(--signal)] transition-colors"
            >
              Formats
            </button>
            <button
              type="button"
              onClick={() => handleSend("Talk to a human support engineer")}
              className="shrink-0 px-2 py-0.5 rounded-full border border-[var(--line-hairline)] bg-[var(--surface-base)] text-[10px] text-[var(--signal)] font-bold transition-colors"
            >
              Talk to Human
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 leading-relaxed">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.sender === "bot" && (
                  <div className="w-6 h-6 rounded-full bg-[var(--surface-subtle)] border border-[var(--line-hairline)] flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-[var(--signal)]" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] p-2.5 rounded-sm ${
                    m.sender === "user"
                      ? "bg-[var(--signal)] text-white"
                      : "bg-[var(--surface-subtle)] border border-[var(--line-hairline)] text-[var(--ink-primary)]"
                  }`}
                >
                  <p className="text-[11px] whitespace-pre-wrap">{m.text}</p>
                  {m.sourceDoc && (
                    <div className="mt-1.5 pt-1 border-t border-[var(--line-hairline)] text-[9px] text-[var(--ink-muted)] flex items-center justify-between">
                      <span>Source: {m.sourceDoc}</span>
                      {m.routeKey && (
                        <Link
                          href={m.routeKey}
                          onClick={() => setIsOpen(false)}
                          className="text-[var(--signal)] hover:underline flex items-center gap-0.5 font-bold"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      )}
                    </div>
                  )}
                  {m.isEscalation && !showEscalationForm && (
                    <div className="mt-2">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setShowEscalationForm(true)}
                        leftIcon={<LifeBuoy className="w-3 h-3 text-[var(--signal)]" />}
                      >
                        Open Ticket with Support
                      </Button>
                    </div>
                  )}
                </div>
                {m.sender === "user" && (
                  <div className="w-6 h-6 rounded-full bg-[var(--line-hairline)] flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-[var(--ink-secondary)]" />
                  </div>
                )}
              </div>
            ))}

            {/* In-Widget Human Escalation Form */}
            {showEscalationForm && (
              <form
                onSubmit={handleEscalationSubmit}
                className="p-3 bg-[var(--surface-sunken)] border border-[var(--signal)]/50 rounded-sm space-y-2.5"
              >
                <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[var(--signal)] uppercase">
                  <span>Open Engineering Ticket</span>
                  <button
                    type="button"
                    onClick={() => setShowEscalationForm(false)}
                    className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                  >
                    Cancel
                  </button>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-[var(--ink-muted)] block mb-0.5">Contact Email:</label>
                  <input
                    type="email"
                    required
                    placeholder="engineer@company.com"
                    value={escalateEmail}
                    onChange={(e) => setEscalateEmail(e.target.value)}
                    className="w-full px-2 py-1 text-xs font-mono bg-[var(--surface-base)] border border-[var(--line-hairline)] rounded-sm text-[var(--ink-primary)]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-[var(--ink-muted)] block mb-0.5">Issue Summary:</label>
                  <textarea
                    rows={2}
                    placeholder="Briefly describe the question or error..."
                    value={escalateDesc}
                    onChange={(e) => setEscalateDesc(e.target.value)}
                    className="w-full px-2 py-1 text-xs font-mono bg-[var(--surface-base)] border border-[var(--line-hairline)] rounded-sm text-[var(--ink-primary)]"
                  />
                </div>
                <Button type="submit" size="xs" variant="primary" className="w-full">
                  Submit Escalation
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
            className="p-2 border-t border-[var(--line-hairline)] bg-[var(--surface-base)] flex items-center gap-1.5"
          >
            <input
              type="text"
              placeholder="Ask a technical question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs font-mono bg-[var(--surface-sunken)] border border-[var(--line-hairline)] rounded-sm text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--signal)]"
            />
            <Button
              type="submit"
              size="sm"
              variant="primary"
              className="px-2.5 py-1.5"
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
