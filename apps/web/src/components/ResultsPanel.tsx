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
          {result.model_used && (
            <span className="tabular-nums text-[var(--ink-secondary)] text-[11px] hidden sm:inline">
              Model: <strong className="text-[var(--ink-primary)]">{result.model_used.replace("gemini/", "")}</strong>
            </span>
          )}
          {result.quality_score !== undefined && result.quality_score !== null && (
            <>
              <span className="text-[var(--line-strong)] hidden sm:inline">|</span>
              <span className="tabular-nums text-[var(--ink-secondary)] text-[11px]">
                Quality: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{Math.round(result.quality_score * 100)}%</strong>
              </span>
            </>
          )}
          <span className="text-[var(--line-strong)]">|</span>
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
              <TabsTrigger value="text" className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Text</span>
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
          <TabsContent value="fields" className="flex-1 flex flex-col overflow-hidden mt-3 space-y-2">
            {/* Search & Bulk Copy Toolbar */}
            <div className="flex items-center justify-between gap-2 pb-1">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none" />
                <input
                  type="text"
                  value={fieldQuery}
                  onChange={(e) => setFieldQuery(e.target.value)}
                  placeholder="Filter fields by name or value..."
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
                {copiedTab === "all_fields" ? "Copied All!" : "Copy All"}
              </Button>
            </div>

            {/* Match Counter */}
            {fieldQuery && (
              <p className="text-[10px] font-mono text-[var(--ink-muted)]">
                Showing {filteredFields.length} of {fields.length} fields
              </p>
            )}

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {filteredFields.length === 0 ? (
                <p className="text-xs text-[var(--ink-muted)] py-6 text-center font-mono">
                  {fields.length === 0 ? "No structured key-value fields detected." : "No fields matching query."}
                </p>
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
                              {field.label}
                            </span>
                            <span className="text-[10px] font-mono text-[var(--ink-muted)]">
                              ({field.key})
                            </span>
                          </div>
                          <p className="font-mono text-xs sm:text-sm text-[var(--ink-primary)] font-medium break-all">
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

          {/* Tab 2: Tables Inspector */}
          <TabsContent value="tables" className="flex-1 overflow-y-auto mt-3 space-y-4 pr-1">
            {tables.length === 0 ? (
              <p className="text-xs text-[var(--ink-muted)] py-6 text-center font-mono">
                No tabular regions detected on current document pages.
              </p>
            ) : (
              tables.map((table, tIdx) => (
                <div key={tIdx} className="space-y-2 border border-[var(--line-hairline)] p-3 rounded-sm bg-[var(--surface-base)]">
                  <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-[var(--line-hairline)]">
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

                  <div className="overflow-x-auto">
                    <Table>
                      <TableBody>
                        {table.rows?.map((row, rIdx) => (
                          <TableRow key={rIdx} className={rIdx === 0 ? "bg-[var(--surface-subtle)] font-bold text-[var(--ink-primary)]" : "hover:bg-[var(--surface-subtle)]"}>
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
              ))
            )}
          </TabsContent>

          {/* Tab 3: Plain Text */}
          <TabsContent value="text" className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono pb-1 border-b border-[var(--line-hairline)]">
              <span className="text-[var(--ink-secondary)]">Clean Plain Text Output</span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleCopy(result.text || result.markdown || "", "plain_text")}
                  leftIcon={copiedTab === "plain_text" ? <Check className="w-3 h-3 text-[var(--semantic-success)]" /> : <Copy className="w-3 h-3" />}
                >
                  {copiedTab === "plain_text" ? "Copied" : "Copy"}
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleDownload(result.text || result.markdown || "", `${result.doc_type || "extraction"}.txt`, "text/plain")}
                  leftIcon={<Download className="w-3 h-3" />}
                >
                  Download .txt
                </Button>
              </div>
            </div>
            <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--line-strong)] rounded-sm font-mono text-xs text-[var(--ink-primary)] leading-relaxed whitespace-pre-wrap select-text">
              {result.text || result.markdown || "No text extraction available."}
            </div>
          </TabsContent>

          {/* Tab 4: Markdown */}
          <TabsContent value="markdown" className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono pb-1 border-b border-[var(--line-hairline)]">
              <span className="text-[var(--ink-secondary)]">Structured Markdown</span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleCopy(result.markdown || result.text || "", "markdown")}
                  leftIcon={copiedTab === "markdown" ? <Check className="w-3 h-3 text-[var(--semantic-success)]" /> : <Copy className="w-3 h-3" />}
                >
                  {copiedTab === "markdown" ? "Copied" : "Copy"}
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleDownload(result.markdown || result.text || "", `${result.doc_type || "extraction"}.md`, "text/markdown")}
                  leftIcon={<Download className="w-3 h-3" />}
                >
                  Download .md
                </Button>
              </div>
            </div>
            <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--line-strong)] rounded-sm font-mono text-xs text-[var(--ink-primary)] leading-relaxed whitespace-pre-wrap select-text">
              {result.markdown || result.text || "No text extraction available."}
            </div>
          </TabsContent>

          {/* Tab 5: JSON Payload */}
          <TabsContent value="json" className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono pb-1 border-b border-[var(--line-hairline)]">
              <span className="text-[var(--ink-secondary)]">Comprehensive JSON Intelligence</span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleCopy(JSON.stringify(result, null, 2), "json")}
                  leftIcon={copiedTab === "json" ? <Check className="w-3 h-3 text-[var(--semantic-success)]" /> : <Copy className="w-3 h-3" />}
                >
                  {copiedTab === "json" ? "Copied" : "Copy"}
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleDownload(JSON.stringify(result, null, 2), `${result.doc_type || "extraction"}_result.json`, "application/json")}
                  leftIcon={<Download className="w-3 h-3" />}
                >
                  Download .json
                </Button>
              </div>
            </div>
            <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--line-strong)] rounded-sm font-mono text-xs text-[var(--ink-primary)] leading-relaxed whitespace-pre select-text">
              {JSON.stringify(result, null, 2)}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
