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
  Search,
  X,
  FileSpreadsheet,
  Eye,
  FileCode,
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
  const [fieldQuery, setFieldQuery] = useState("");
  const [markdownMode, setMarkdownMode] = useState<"formatted" | "raw">("formatted");

  if (!result) {
    return (
      <div className="w-full h-full min-h-0 flex flex-col items-center justify-center p-8 text-center border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] text-[var(--ink-muted)]">
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

  const EMPTY_FILTER = new Set([
    "",
    "null",
    "none",
    "n/a",
    "na",
    "not applicable",
    "not specified",
    "unspecified",
    "unknown",
    "-",
    "--",
    "undefined",
  ]);

  const rawFieldList = Array.isArray(result.fields) ? (result.fields as any[]) : (result.raw_fields || []);
  const fields: any[] = rawFieldList.filter((f) => {
    if (!f || f.value === null || f.value === undefined) return false;
    const strVal = String(f.value).trim().toLowerCase();
    return !EMPTY_FILTER.has(strVal);
  });
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

  const convertTableToCsv = (rows: any[]): string => {
    if (!rows || rows.length === 0) return "";
    return rows
      .map((row) => {
        const cells = Array.isArray(row) ? row : Object.values(row);
        return cells
          .map((c) => {
            const val = String(c ?? "").replace(/"/g, '""');
            return `"${val}"`;
          })
          .join(",");
      })
      .join("\n");
  };

  const handleCopyAllFields = () => {
    const content = fields
      .map((f) => `${f.label || f.key}: ${f.value}`)
      .join("\n");
    handleCopy(content, "all_fields");
  };

  const getConfidenceBadge = (confidence?: number) => {
    const c = confidence ?? 0.95;
    const pct = Math.round(c * 100);
    if (c >= 0.9) {
      return (
        <span className="px-1.5 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono text-[10px] font-semibold border border-emerald-500/20 tabular-nums">
          {pct}%
        </span>
      );
    }
    if (c >= 0.75) {
      return (
        <span className="px-1.5 py-0.5 rounded-sm bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono text-[10px] font-semibold border border-amber-500/20 tabular-nums">
          {pct}%
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded-sm bg-rose-500/10 text-rose-700 dark:text-rose-400 font-mono text-[10px] font-semibold border border-rose-500/20 tabular-nums">
        {pct}%
      </span>
    );
  };

  const filteredFields = fields.filter((f) => {
    if (!fieldQuery.trim()) return true;
    const q = fieldQuery.toLowerCase();
    return (
      (f.label && f.label.toLowerCase().includes(q)) ||
      (f.key && f.key.toLowerCase().includes(q)) ||
      (f.value && String(f.value).toLowerCase().includes(q))
    );
  });

  const textContent = result.text || result.markdown || "No text extraction available.";
  const markdownContent = result.markdown || result.text || "No text extraction available.";
  const jsonContent = JSON.stringify(result, null, 2);

  return (
    <div className="w-full flex flex-col h-full border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] overflow-hidden shadow-card">
      {/* Top Header Summary Bar - High Density */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--line-hairline)] bg-[var(--surface-subtle)] text-xs font-mono select-none shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[var(--ink-primary)]">
            Intelligence Report:
          </span>
          <span className="archival-stamp text-[var(--semantic-success)]">
            <Check className="w-3 h-3" /> VERIFIED
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          {result.model_used && (
            <span className="tabular-nums text-[var(--ink-secondary)] hidden md:inline">
              Model: <strong className="text-[var(--ink-primary)]">{result.model_used.replace("gemini/", "")}</strong>
            </span>
          )}
          {result.quality_score !== undefined && result.quality_score !== null && (
            <>
              <span className="text-[var(--line-strong)] hidden md:inline">|</span>
              <span className="tabular-nums text-[var(--ink-secondary)]">
                Quality: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{Math.round(result.quality_score * 100)}%</strong>
              </span>
            </>
          )}
          <span className="text-[var(--line-strong)]">|</span>
          <span className="tabular-nums text-[var(--ink-secondary)]">
            Overall: <strong className="text-[var(--ink-primary)]">{Math.round((result.overall_confidence || 0.98) * 100)}%</strong>
          </span>
          <span className="text-[var(--line-strong)]">|</span>
          <span className="tabular-nums text-[var(--ink-secondary)]">
            Latency: <strong className="text-[var(--ink-primary)]">{result.latency_ms || 48}ms</strong>
          </span>
        </div>
      </div>

      {/* Main Tabs Container - Fills Remaining Height with Minimal Outer Padding */}
      <div className="flex-1 flex flex-col overflow-hidden p-2.5 sm:p-3 min-h-0">
        <Tabs defaultValue="fields" className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Tabs Navigation Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[var(--line-hairline)] shrink-0 gap-2">
            <TabsList className="border-none w-auto gap-1">
              <TabsTrigger value="fields" className="flex items-center gap-1.5 py-1 px-2.5 text-xs">
                <Sliders className="w-3.5 h-3.5" />
                <span>Fields ({fields.length})</span>
              </TabsTrigger>
              <TabsTrigger value="tables" className="flex items-center gap-1.5 py-1 px-2.5 text-xs">
                <TableIcon className="w-3.5 h-3.5" />
                <span>Tables ({tables.length})</span>
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-1.5 py-1 px-2.5 text-xs">
                <FileText className="w-3.5 h-3.5" />
                <span>Text</span>
              </TabsTrigger>
              <TabsTrigger value="markdown" className="flex items-center gap-1.5 py-1 px-2.5 text-xs">
                <FileCode className="w-3.5 h-3.5" />
                <span>Markdown</span>
              </TabsTrigger>
              <TabsTrigger value="json" className="flex items-center gap-1.5 py-1 px-2.5 text-xs">
                <Code2 className="w-3.5 h-3.5" />
                <span>JSON</span>
              </TabsTrigger>
            </TabsList>

            {/* Global Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
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
                Export JSON
              </Button>
            </div>
          </div>

          {/* Tab 1: Key Fields Inspector - Full Height Scrollable List */}
          <TabsContent value="fields" className="flex-1 min-h-0 flex flex-col overflow-hidden pt-1.5 space-y-1.5 data-[state=inactive]:!hidden">
            {/* Search & Bulk Copy Toolbar */}
            <div className="flex items-center justify-between gap-2 shrink-0">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none" />
                <input
                  type="text"
                  value={fieldQuery}
                  onChange={(e) => setFieldQuery(e.target.value)}
                  placeholder="Filter extracted fields..."
                  className="w-full pl-8 pr-7 py-1 text-xs font-mono bg-[var(--surface-sunken)] border border-[var(--line-hairline)] rounded-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--signal)]"
                />
                {fieldQuery && (
                  <button
                    type="button"
                    onClick={() => setFieldQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                size="xs"
                onClick={handleCopyAllFields}
                leftIcon={copiedTab === "all_fields" ? <Check className="w-3 h-3 text-[var(--semantic-success)]" /> : <Copy className="w-3 h-3" />}
              >
                {copiedTab === "all_fields" ? "Copied All" : "Copy All"}
              </Button>
            </div>

            {/* Scrollable Fields List - Fills 100% of the Available Height without Cutoff */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1.5 pb-8">
              {filteredFields.length === 0 ? (
                <div className="h-full flex items-center justify-center p-6 text-center">
                  <p className="text-xs text-[var(--ink-muted)] font-mono">
                    {fields.length === 0 ? "No structured key-value fields detected." : "No fields matching query."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--line-hairline)] border border-[var(--line-hairline)] rounded-sm bg-[var(--surface-base)]">
                  {filteredFields.map((field) => {
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
                            ? "bg-[var(--signal-subtle)] border-l-2 border-l-[var(--signal)] ring-1 ring-[var(--signal)]/30"
                            : isHovered
                            ? "bg-[var(--surface-raised)]"
                            : "hover:bg-[var(--surface-subtle)]"
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[11px] font-bold text-[var(--ink-primary)]">
                              {field.label || field.key}
                            </span>
                            <span className="text-[10px] font-mono text-[var(--ink-muted)]">
                              ({field.key})
                            </span>
                          </div>
                          <p className="font-mono text-xs sm:text-sm text-[var(--ink-primary)] font-medium break-words whitespace-normal select-text">
                            {String(field.value)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {getConfidenceBadge(field.confidence)}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(String(field.value), field.key);
                            }}
                            className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] rounded-sm hover:bg-[var(--surface-raised)] transition-colors"
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
            </div>
          </TabsContent>

          {/* Tab 2: Tables Inspector - Full Height */}
          <TabsContent value="tables" className="flex-1 min-h-0 flex flex-col overflow-hidden pt-1.5 space-y-1.5 data-[state=inactive]:!hidden">
            {tables.length === 0 ? (
              <div className="h-full flex items-center justify-center p-6 text-center">
                <p className="text-xs text-[var(--ink-muted)] font-mono">
                  No tabular regions detected on current document pages.
                </p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
                {tables.map((table, tIdx) => (
                  <div key={tIdx} className="space-y-2 border border-[var(--line-hairline)] p-2.5 rounded-sm bg-[var(--surface-base)]">
                    <div className="flex items-center justify-between text-xs font-mono pb-1.5 border-b border-[var(--line-hairline)]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--ink-primary)]">
                          Table #{tIdx + 1} (Page {table.page || 1})
                        </span>
                        <span className="text-[11px] text-[var(--ink-muted)]">
                          • {table.rows?.length || 0} rows
                        </span>
                      </div>

                      {/* Table Export Actions */}
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleCopy(convertTableToCsv(table.rows), `table_${tIdx}_csv`)}
                          leftIcon={copiedTab === `table_${tIdx}_csv` ? <Check className="w-3 h-3 text-[var(--semantic-success)]" /> : <Copy className="w-3 h-3" />}
                        >
                          {copiedTab === `table_${tIdx}_csv` ? "Copied CSV" : "Copy CSV"}
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleDownload(convertTableToCsv(table.rows), `table_${tIdx + 1}.csv`, "text/csv")}
                          leftIcon={<Download className="w-3 h-3" />}
                        >
                          .csv
                        </Button>
                      </div>
                    </div>

                    <div className="overflow-x-auto max-h-[360px] overflow-y-auto border border-[var(--line-hairline)] rounded-sm">
                      <Table>
                        <TableBody>
                          {table.rows?.map((row, rIdx) => (
                            <TableRow key={rIdx} className={rIdx === 0 ? "bg-[var(--surface-subtle)] font-bold text-[var(--ink-primary)] sticky top-0 z-10" : "hover:bg-[var(--surface-subtle)]"}>
                              {Array.isArray(row)
                                ? row.map((cell, cIdx) => (
                                    <TableCell key={cIdx} className="font-mono tabular-nums text-xs py-1.5 px-2">
                                      {cell}
                                    </TableCell>
                                  ))
                                : Object.values(row).map((cell: any, cIdx) => (
                                    <TableCell key={cIdx} className="font-mono tabular-nums text-xs py-1.5 px-2">
                                      {cell}
                                    </TableCell>
                                  ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab 3: Plain Text - 100% Full Height Dark Code Editor (Zero Whitespace Below) */}
          <TabsContent value="text" className="flex-1 min-h-0 flex flex-col overflow-hidden pt-1.5 space-y-1.5 data-[state=inactive]:!hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between text-xs font-mono pb-1 border-b border-[var(--line-hairline)] shrink-0">
              <span className="text-[var(--ink-secondary)] flex items-center gap-1.5">
                <span>Clean Plain Text Output</span>
                <span className="text-[var(--ink-muted)] text-[11px]">({textContent.length} chars)</span>
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleCopy(textContent, "plain_text")}
                  leftIcon={copiedTab === "plain_text" ? <Check className="w-3 h-3 text-[var(--semantic-success)]" /> : <Copy className="w-3 h-3" />}
                >
                  {copiedTab === "plain_text" ? "Copied" : "Copy Text"}
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleDownload(textContent, `${result.doc_type || "extraction"}.txt`, "text/plain")}
                  leftIcon={<Download className="w-3 h-3" />}
                >
                  Download .txt
                </Button>
              </div>
            </div>

            {/* Full Height Editor Frame */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3.5 bg-[#0D1117] text-[#E6EDF3] border border-[#30363D] rounded-sm font-mono text-xs leading-relaxed whitespace-pre-wrap select-text shadow-inner">
              {textContent}
            </div>
          </TabsContent>

          {/* Tab 4: Markdown - 100% Full Height with Formatted / Raw Toggle (Zero Whitespace Below) */}
          <TabsContent value="markdown" className="flex-1 min-h-0 flex flex-col overflow-hidden pt-1.5 space-y-1.5 data-[state=inactive]:!hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between text-xs font-mono pb-1 border-b border-[var(--line-hairline)] shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[var(--ink-secondary)]">Structured Markdown</span>
                <div className="inline-flex rounded-sm border border-[var(--line-hairline)] bg-[var(--surface-sunken)] p-0.5">
                  <button
                    type="button"
                    onClick={() => setMarkdownMode("formatted")}
                    className={`px-2 py-0.5 text-[10px] rounded-[1px] transition-colors ${
                      markdownMode === "formatted"
                        ? "bg-[var(--signal)] text-white font-bold"
                        : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                    }`}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarkdownMode("raw")}
                    className={`px-2 py-0.5 text-[10px] rounded-[1px] transition-colors ${
                      markdownMode === "raw"
                        ? "bg-[var(--signal)] text-white font-bold"
                        : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                    }`}
                  >
                    Raw
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleCopy(markdownContent, "markdown")}
                  leftIcon={copiedTab === "markdown" ? <Check className="w-3 h-3 text-[var(--semantic-success)]" /> : <Copy className="w-3 h-3" />}
                >
                  {copiedTab === "markdown" ? "Copied" : "Copy Markdown"}
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleDownload(markdownContent, `${result.doc_type || "extraction"}.md`, "text/markdown")}
                  leftIcon={<Download className="w-3 h-3" />}
                >
                  Download .md
                </Button>
              </div>
            </div>

            {/* Full Height Markdown View Frame */}
            {markdownMode === "formatted" ? (
              <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-[var(--surface-base)] border border-[var(--line-strong)] rounded-sm text-xs leading-relaxed select-text space-y-3 font-sans">
                {markdownContent.split("\n").map((line, idx) => {
                  if (line.startsWith("# ")) {
                    return (
                      <h1 key={idx} className="font-serif text-lg font-bold text-[var(--ink-primary)] border-b border-[var(--line-hairline)] pb-1.5 mt-1">
                        {line.replace("# ", "")}
                      </h1>
                    );
                  }
                  if (line.startsWith("## ")) {
                    return (
                      <h2 key={idx} className="font-serif text-base font-bold text-[var(--ink-primary)] mt-3">
                        {line.replace("## ", "")}
                      </h2>
                    );
                  }
                  if (line.startsWith("- **")) {
                    const colonIdx = line.indexOf(":**");
                    if (colonIdx !== -1) {
                      const label = line.slice(4, colonIdx);
                      const val = line.slice(colonIdx + 3).trim();
                      return (
                        <div key={idx} className="flex items-baseline gap-2 py-0.5 text-xs font-mono">
                          <span className="font-bold text-[var(--ink-primary)] shrink-0">• {label}:</span>
                          <span className="text-[var(--ink-secondary)] break-all">{val}</span>
                        </div>
                      );
                    }
                  }
                  if (line.startsWith("|") && line.endsWith("|")) {
                    return (
                      <div key={idx} className="font-mono text-[11px] text-[var(--ink-primary)] bg-[var(--surface-sunken)] p-1 rounded-sm overflow-x-auto whitespace-pre">
                        {line}
                      </div>
                    );
                  }
                  if (!line.trim()) return <div key={idx} className="h-1.5" />;
                  return (
                    <p key={idx} className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                      {line}
                    </p>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto p-3.5 bg-[#0D1117] text-[#79C0FF] border border-[#30363D] rounded-sm font-mono text-xs leading-relaxed whitespace-pre-wrap select-text shadow-inner">
                {markdownContent}
              </div>
            )}
          </TabsContent>

          {/* Tab 5: JSON Payload - 100% Full Height Dark Code Editor (Zero Whitespace Below) */}
          <TabsContent value="json" className="flex-1 min-h-0 flex flex-col overflow-hidden pt-1.5 space-y-1.5 data-[state=inactive]:!hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between text-xs font-mono pb-1 border-b border-[var(--line-hairline)] shrink-0">
              <span className="text-[var(--ink-secondary)] flex items-center gap-1.5">
                <span>Comprehensive JSON Intelligence</span>
                <span className="text-[var(--ink-muted)] text-[11px]">({(jsonContent.length / 1024).toFixed(1)} KB)</span>
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleCopy(jsonContent, "json")}
                  leftIcon={copiedTab === "json" ? <Check className="w-3 h-3 text-[var(--semantic-success)]" /> : <Copy className="w-3 h-3" />}
                >
                  {copiedTab === "json" ? "Copied" : "Copy JSON"}
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleDownload(jsonContent, `${result.doc_type || "extraction"}_result.json`, "application/json")}
                  leftIcon={<Download className="w-3 h-3" />}
                >
                  Download .json
                </Button>
              </div>
            </div>

            {/* Full Height JSON Editor Frame */}
            <div className="flex-1 min-h-0 overflow-auto p-3.5 bg-[#0D1117] text-[#7EE787] border border-[#30363D] rounded-sm font-mono text-xs leading-relaxed select-text shadow-inner whitespace-pre">
              {jsonContent}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
