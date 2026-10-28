"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

export interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = "bash",
  filename,
  showLineNumbers = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.trim().split("\n");

  return (
    <div className="w-full rounded-sm border border-[var(--line-strong)] bg-[var(--surface-sunken)] overflow-hidden font-mono text-xs">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--line-hairline)] bg-[var(--surface-subtle)] text-[var(--ink-secondary)]">
        <span className="text-[11px] font-semibold uppercase tracking-wider">
          {filename || language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] hover:text-[var(--ink-primary)] p-1 rounded-sm transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[var(--semantic-success)]" />
              <span className="text-[var(--semantic-success)] font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body */}
      <div className="p-3 overflow-x-auto text-[var(--ink-primary)] leading-relaxed">
        {showLineNumbers ? (
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-[var(--surface-raised)]/50">
                  <td className="pr-4 select-none text-[var(--ink-muted)] text-right w-8">
                    {idx + 1}
                  </td>
                  <td className="whitespace-pre">{line}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <pre className="whitespace-pre font-mono">{code.trim()}</pre>
        )}
      </div>
    </div>
  );
};
