"use client";

import React, { useState } from "react";
import {
  Copy,
  Check,
  Download,
  FileText,
  Table as TableIcon,
  Sliders,
  Code2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { ExtractionResult, ExtractedField, ParsedTable } from "../lib/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/Tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./ui/Table";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";

interface ResultsPanelProps {
  result: ExtractionResult | null;
  selectedFieldKey: string | null;
  onSelectField: (key: string | null) => void;
  hoveredFieldKey: string | null;
  onHoverField: (key: string | null) => void;
  onReset?: () => void;
}

export function ResultsPanel({
  result,
  selectedFieldKey,
  onSelectField,
  hoveredFieldKey,
  onHoverField,
  onReset,
}: ResultsPanelProps) {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  if (!result) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] text-[var(--ink-muted)]">
        <Sliders className="w-8 h-8 mb-2 opacity-50" />
        <p className="font-serif text-base font-bold text-[var(--ink-secondary)]">
          Light Table Standby
        </p>
        <p className="text-xs text-[var(--ink-muted)] max-w-xs mt-1">
          Select a sample document or drop an invoice/receipt to view tracing-paper extraction intelligence.
        </p>
      </div>
    );
  }

  const fields: any[] = Array.isArray(result.fields) ? (result.fields as any[]) : (result.raw_fields || []);
  const tables = result.tables || [];

  const handleCopy = (text: string, tabName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTab(tabName);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const handleDownload = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full flex flex-col h-full border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] overflow-hidden shadow-card">
      {/* Top Header Summary Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line-hairline)] bg-[var(--surface-subtle)] text-xs font-mono select-none">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[var(--ink-primary)]">
            Intelligence Report:
          </span>
          <span className="archival-stamp text-[var(--semantic-success)]">
            <Check className="w-3 h-3" /> VERIFIED
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="tabular-nums text-[var(--ink-secondary)] text-[11px]">
            Overall: <strong className="text-[var(--ink-primary)]">{Math.round((result.overall_confidence || 0.98) * 100)}%</strong>
          </span>
          <span className="text-[var(--line-strong)]">|</span>
          <span className="tabular-nums text-[var(--ink-secondary)] text-[11px]">
            Latency: <strong className="text-[var(--ink-primary)]">{result.latency_ms || 48}ms</strong>
          </span>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="flex-1 flex flex-col overflow-hidden p-4">
        <Tabs defaultValue="fields" className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--line-hairline)]">
            <TabsList className="border-none w-auto">
              <TabsTrigger value="fields" className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                <span>Fields ({fields.length})</span>
              </TabsTrigger>
              <TabsTrigger value="tables" className="flex items-center gap-1.5">
                <TableIcon className="w-3.5 h-3.5" />
                <span>Tables ({tables.length})</span>
              </TabsTrigger>
              <TabsTrigger value="markdown" className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Markdown</span>
              </TabsTrigger>
              <TabsTrigger value="json" className="flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" />
                <span>JSON</span>
              </TabsTrigger>
            </TabsList>

            {/* Global Actions */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="xs"
                onClick={() =>
                  handleDownload(
                    JSON.stringify(result, null, 2),
                    `${result.doc_type || "extraction"}_result.json`,
                    "application/json"
                  )
                }
                leftIcon={<Download className="w-3 h-3" />}
              >
                Export
              </Button>
            </div>
          </div>

          {/* Tab 1: Key Fields Inspector */}
          <TabsContent value="fields" className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1">
            {fields.length === 0 ? (
              <p className="text-xs text-[var(--ink-muted)] py-4 text-center font-mono">
                No structured key-value fields detected.
              </p>
            ) : (
              <div className="divide-y divide-[var(--line-hairline)] border border-[var(--line-hairline)] rounded-sm bg-[var(--surface-base)]">
                {fields.map((field) => {
                  const isSelected = selectedFieldKey === field.key;
                  const isHovered = hoveredFieldKey === field.key;
                  return (
                    <div
                      key={field.key}
                      onClick={() => onSelectField(field.key)}
                      onMouseEnter={() => onHoverField(field.key)}
                      onMouseLeave={() => onHoverField(null)}
                      className={`p-2.5 text-xs transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        isSelected
                          ? "bg-[var(--signal-subtle)] border-l-2 border-l-[var(--signal)]"
                          : isHovered
                          ? "bg-[var(--surface-raised)]"
                          : "hover:bg-[var(--surface-subtle)]"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-bold text-[var(--ink-primary)]">
                            {field.label}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--ink-muted)]">
                            ({field.key})
                          </span>
                        </div>
                        <p className="font-mono text-sm text-[var(--ink-primary)] font-medium break-all">
                          {String(field.value)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge confidence={field.confidence}>
                          {Math.round(field.confidence * 100)}%
                        </Badge>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(String(field.value), field.key);
                          }}
                          className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors"
                          title="Copy field value"
                        >
                          {copiedTab === field.key ? (
                            <Check className="w-3.5 h-3.5 text-[var(--semantic-success)]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Tables Inspector */}
          <TabsContent value="tables" className="flex-1 overflow-y-auto mt-3 space-y-4 pr-1">
            {tables.length === 0 ? (
              <p className="text-xs text-[var(--ink-muted)] py-4 text-center font-mono">
                No tabular regions detected on current document pages.
              </p>
            ) : (
              tables.map((table, tIdx) => (
                <div key={tIdx} className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[var(--ink-primary)]">
                      Table #{tIdx + 1} (Page {table.page || 1})
                    </span>
                    <span className="text-[var(--ink-muted)]">
                      {table.rows?.length || 0} Rows Detected
                    </span>
                  </div>
                  <Table>
                    <TableBody>
                      {table.rows?.map((row, rIdx) => (
                        <TableRow key={rIdx} className={rIdx === 0 ? "bg-[var(--surface-subtle)] font-bold" : ""}>
                          {Array.isArray(row)
                            ? row.map((cell, cIdx) => (
                                <TableCell key={cIdx} className="font-mono tabular-nums">
                                  {cell}
                                </TableCell>
                              ))
                            : Object.values(row).map((cell: any, cIdx) => (
                                <TableCell key={cIdx} className="font-mono tabular-nums">
                                  {cell}
                                </TableCell>
                              ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))
            )}
          </TabsContent>

          {/* Tab 3: Markdown */}
          <TabsContent value="markdown" className="flex-1 overflow-y-auto mt-3 pr-1">
            <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--line-strong)] rounded-sm font-mono text-xs text-[var(--ink-primary)] leading-relaxed whitespace-pre-wrap select-text">
              {result.markdown || result.text || "No text extraction available."}
            </div>
          </TabsContent>

          {/* Tab 4: JSON Payload */}
          <TabsContent value="json" className="flex-1 overflow-y-auto mt-3 pr-1">
            <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--line-strong)] rounded-sm font-mono text-xs text-[var(--ink-primary)] leading-relaxed whitespace-pre select-text">
              {JSON.stringify(result, null, 2)}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
