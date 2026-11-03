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
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] border border-zinc-200 dark:border-[#292d30] bg-zinc-100 dark:bg-[#000000] text-xs font-mono text-zinc-700 dark:text-[#f0f0f0]">
          <span className="w-2 h-2 rounded-full bg-[#3ad389] shadow-[0_0_6px_#3ad389]" />
          <span>{pct}%</span>
        </span>
      );
    }
    if (c >= 0.75) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] border border-zinc-200 dark:border-[#292d30] bg-zinc-100 dark:bg-[#000000] text-xs font-mono text-zinc-700 dark:text-[#f0f0f0]">
          <span className="w-2 h-2 rounded-full bg-[#ffca16] shadow-[0_0_6px_#ffca16]" />
          <span>{pct}%</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] border border-zinc-200 dark:border-[#292d30] bg-zinc-100 dark:bg-[#000000] text-xs font-mono text-zinc-700 dark:text-[#f0f0f0]">
        <span className="w-2 h-2 rounded-full bg-[#ff9592] shadow-[0_0_6px_#ff9592]" />
        <span>{pct}%</span>
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
    <div className="w-full flex flex-col h-full border border-zinc-200 dark:border-[#292d30] rounded-[12px] bg-white dark:bg-[#000000] overflow-hidden shadow-none">
      {/* Top Header Summary Bar - Minimal & Clean */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 dark:border-[#292d30] bg-white dark:bg-[#000000] text-xs font-mono select-none shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-sans font-medium text-zinc-900 dark:text-white text-sm">
            Extracted Data
          </span>
          <span className="text-xs text-zinc-500 dark:text-[#a1a4a5] font-mono">
            ({fields.length} fields)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              handleDownload(
                JSON.stringify(result, null, 2),
                `${result.doc_type || "extraction"}_result.json`,
                "application/json"
              )
            }
            className="flex items-center gap-1.5 text-xs font-mono text-zinc-600 dark:text-[#a1a4a5] hover:text-zinc-900 dark:hover:text-white px-2.5 py-1 rounded-[6px] border border-zinc-200 dark:border-[#292d30] hover:border-zinc-400 dark:hover:border-white transition-colors"
          >
            <Download className="w-3 h-3" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Container - Calm & Spacious */}
      <div className="flex-1 flex flex-col overflow-hidden p-3 sm:p-4 min-h-0">
        <Tabs defaultValue="fields" className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Minimalist Tabs Navigation - Spaced Justifiably Across Full Width */}
          <div className="w-full border-b border-zinc-200 dark:border-[#292d30] shrink-0 overflow-x-auto scrollbar-none">
            <TabsList className="border-none w-full min-w-full grid grid-cols-5 bg-transparent p-0">
              <TabsTrigger
                value="fields"
                className="w-full text-center py-2 px-1 text-xs font-mono text-zinc-500 dark:text-[#a1a4a5] hover:text-zinc-900 dark:hover:text-white transition-colors border-b-2 border-transparent data-[state=active]:text-purple-600 dark:data-[state=active]:text-white data-[state=active]:border-purple-600 dark:data-[state=active]:border-[#9281f7] data-[state=active]:bg-transparent -mb-px whitespace-nowrap"
              >
                Fields ({fields.length})
              </TabsTrigger>
              <TabsTrigger
                value="tables"
                className="w-full text-center py-2 px-1 text-xs font-mono text-zinc-500 dark:text-[#a1a4a5] hover:text-zinc-900 dark:hover:text-white transition-colors border-b-2 border-transparent data-[state=active]:text-purple-600 dark:data-[state=active]:text-white data-[state=active]:border-purple-600 dark:data-[state=active]:border-[#9281f7] data-[state=active]:bg-transparent -mb-px whitespace-nowrap"
              >
                Tables ({tables.length})
              </TabsTrigger>
              <TabsTrigger
                value="text"
                className="w-full text-center py-2 px-1 text-xs font-mono text-zinc-500 dark:text-[#a1a4a5] hover:text-zinc-900 dark:hover:text-white transition-colors border-b-2 border-transparent data-[state=active]:text-purple-600 dark:data-[state=active]:text-white data-[state=active]:border-purple-600 dark:data-[state=active]:border-[#9281f7] data-[state=active]:bg-transparent -mb-px whitespace-nowrap"
              >
                Text
              </TabsTrigger>
              <TabsTrigger
                value="markdown"
                className="w-full text-center py-2 px-1 text-xs font-mono text-zinc-500 dark:text-[#a1a4a5] hover:text-zinc-900 dark:hover:text-white transition-colors border-b-2 border-transparent data-[state=active]:text-purple-600 dark:data-[state=active]:text-white data-[state=active]:border-purple-600 dark:data-[state=active]:border-[#9281f7] data-[state=active]:bg-transparent -mb-px whitespace-nowrap"
              >
                Markdown
              </TabsTrigger>
              <TabsTrigger
                value="json"
                className="w-full text-center py-2 px-1 text-xs font-mono text-zinc-500 dark:text-[#a1a4a5] hover:text-zinc-900 dark:hover:text-white transition-colors border-b-2 border-transparent data-[state=active]:text-purple-600 dark:data-[state=active]:text-white data-[state=active]:border-purple-600 dark:data-[state=active]:border-[#9281f7] data-[state=active]:bg-transparent -mb-px whitespace-nowrap"
              >
                JSON
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab 1: Key Fields - Borderless Spacious List */}
          <TabsContent value="fields" className="flex-1 min-h-0 flex flex-col overflow-hidden pt-2.5 space-y-2.5 data-[state=inactive]:!hidden">
            {/* Minimal Search & Bulk Copy Toolbar */}
            <div className="flex items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-[#6e727a] pointer-events-none" />
                <input
                  type="text"
                  value={fieldQuery}
                  onChange={(e) => setFieldQuery(e.target.value)}
                  placeholder="Filter fields..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs font-mono bg-zinc-50 dark:bg-[#050505] border border-zinc-200 dark:border-[#292d30] rounded-[6px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-[#6e727a] focus:outline-none focus:border-purple-600 dark:focus:border-[#9281f7] transition-all"
                />
                {fieldQuery && (
                  <button
                    type="button"
                    onClick={() => setFieldQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-[#a1a4a5] hover:text-zinc-900 dark:hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleCopyAllFields}
                className="text-xs font-mono text-zinc-500 dark:text-[#a1a4a5] hover:text-zinc-900 dark:hover:text-white px-2 py-1 transition-colors"
              >
                {copiedTab === "all_fields" ? "Copied" : "Copy all"}
              </button>
            </div>

            {/* Scrollable Fields List - Borderless Clean Rows */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-6 divide-y divide-zinc-200 dark:divide-[#292d30]/50">
              {filteredFields.length === 0 ? (
                <div className="h-full flex items-center justify-center p-8 text-center">
                  <p className="text-xs text-zinc-500 dark:text-[#a1a4a5] font-mono">
                    {fields.length === 0 ? "No structured fields detected." : "No fields matching query."}
                  </p>
                </div>
              ) : (
                filteredFields.map((field) => {
                  const isSelected = selectedFieldKey === field.key;
                  const isHovered = hoveredFieldKey === field.key;
                  return (
                    <div
                      key={field.key}
                      onClick={() => onSelectField(field.key)}
                      onMouseEnter={() => onHoverField(field.key)}
                      onMouseLeave={() => onHoverField(null)}
                      className={`py-3 px-2.5 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 group ${
                        isSelected
                          ? "bg-purple-50 dark:bg-[#9281f7]/10 border-l-2 border-l-purple-600 dark:border-l-[#9281f7]"
                          : isHovered
                          ? "bg-zinc-50 dark:bg-[#0b0e14]"
                          : "hover:bg-zinc-50/70 dark:hover:bg-[#08080a]"
                      }`}
                    >
                      {/* Left: Label and Key */}
                      <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3ad389] shrink-0" />
                        <span className="text-xs font-sans font-medium text-zinc-800 dark:text-[#f0f0f0]">
                          {field.label || field.key}
                        </span>
                        <span className="font-mono text-[11px] text-zinc-400 dark:text-[#6e727a]">
                          {field.key}
                        </span>
                      </div>

                      {/* Right: Value & Copy */}
                      <div className="flex items-center gap-3 justify-between sm:justify-end min-w-0 flex-1">
                        <span className="font-mono text-sm text-zinc-900 dark:text-white font-normal break-words select-text sm:text-right">
                          {String(field.value)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(String(field.value), field.key);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 dark:text-[#6e727a] hover:text-zinc-900 dark:hover:text-white transition-opacity shrink-0"
                          title="Copy value"
                        >
                          {copiedTab === field.key ? (
                            <Check className="w-3.5 h-3.5 text-[#3ad389]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Tab 2: Tables Inspector - Full Height */}
          <TabsContent value="tables" className="flex-1 min-h-0 flex flex-col overflow-hidden pt-3 space-y-3 data-[state=inactive]:!hidden">
            {tables.length === 0 ? (
              <div className="h-full flex items-center justify-center p-8 text-center">
                <p className="text-xs text-zinc-500 dark:text-[#a1a4a5] font-mono">
                  No tabular regions detected on current document pages.
                </p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
                {tables.map((table, tIdx) => (
                  <div key={tIdx} className="space-y-2.5 bg-white dark:bg-[#000000]">
                    <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-zinc-200 dark:border-[#292d30]">
                      <div className="flex items-center gap-2">
                        <span className="font-sans font-medium text-zinc-900 dark:text-white">
                          Table #{tIdx + 1}
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-[#a1a4a5]">
                          (Page {table.page || 1} • {table.rows?.length || 0} rows)
                        </span>
                      </div>

                      {/* Table Export Actions - Ghost Buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleCopy(convertTableToCsv(table.rows), `table_${tIdx}_csv`)}
                          leftIcon={copiedTab === `table_${tIdx}_csv` ? <Check className="w-3.5 h-3.5 text-[#3ad389]" /> : <Copy className="w-3.5 h-3.5" />}
                          className="bg-transparent border border-zinc-200 dark:border-[#292d30] text-zinc-700 dark:text-[#f0f0f0] hover:border-zinc-900 dark:hover:border-[#ffffff] hover:text-zinc-900 dark:hover:text-[#ffffff] rounded-[6px] px-2.5 py-1 text-xs transition-colors"
                        >
                          {copiedTab === `table_${tIdx}_csv` ? "Copied CSV" : "Copy CSV"}
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleDownload(convertTableToCsv(table.rows), `table_${tIdx + 1}.csv`, "text/csv")}
                          leftIcon={<Download className="w-3.5 h-3.5" />}
                          className="bg-transparent border border-zinc-200 dark:border-[#292d30] text-zinc-700 dark:text-[#f0f0f0] hover:border-zinc-900 dark:hover:border-[#ffffff] hover:text-zinc-900 dark:hover:text-[#ffffff] rounded-[6px] px-2.5 py-1 text-xs transition-colors"
                        >
                          .csv
                        </Button>
                      </div>
                    </div>

                    <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-zinc-200 dark:border-[#292d30] rounded-[6px]">
                      <Table>
                        <TableBody>
                          {table.rows?.map((row, rIdx) => (
                            <TableRow key={rIdx} className={rIdx === 0 ? "bg-zinc-100 dark:bg-[#0b0e14] font-medium text-zinc-900 dark:text-white sticky top-0 z-10 border-b border-zinc-200 dark:border-[#292d30]" : "border-b border-zinc-200/60 dark:border-[#292d30]/60 hover:bg-zinc-50 dark:hover:bg-[#0b0e14]/50"}>
                              {Array.isArray(row)
                                ? row.map((cell, cIdx) => (
                                    <TableCell key={cIdx} className="font-mono tabular-nums text-xs py-2 px-3 text-zinc-800 dark:text-[#f0f0f0]">
                                      {cell}
                                    </TableCell>
                                  ))
                                : Object.values(row).map((cell: any, cIdx) => (
                                    <TableCell key={cIdx} className="font-mono tabular-nums text-xs py-2 px-3 text-zinc-800 dark:text-[#f0f0f0]">
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

          {/* Tab 3: Plain Text - Resend Code Window */}
          <TabsContent value="text" className="flex-1 min-h-0 flex flex-col overflow-hidden pt-3 space-y-3 data-[state=inactive]:!hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-zinc-200 dark:border-[#292d30] shrink-0">
              <span className="text-zinc-500 dark:text-[#a1a4a5] flex items-center gap-2">
                <span className="text-zinc-900 dark:text-white font-sans font-medium">Plain Text</span>
                <span className="text-zinc-400 dark:text-[#6e727a] text-[11px]">({textContent.length} chars)</span>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleCopy(textContent, "plain_text")}
                  leftIcon={copiedTab === "plain_text" ? <Check className="w-3.5 h-3.5 text-[#3ad389]" /> : <Copy className="w-3.5 h-3.5" />}
                  className="bg-transparent border border-zinc-200 dark:border-[#292d30] text-zinc-700 dark:text-[#f0f0f0] hover:border-zinc-900 dark:hover:border-[#ffffff] hover:text-zinc-900 dark:hover:text-[#ffffff] rounded-[6px] px-3 py-1.5 transition-colors"
                >
                  {copiedTab === "plain_text" ? "Copied" : "Copy Text"}
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleDownload(textContent, `${result.doc_type || "extraction"}.txt`, "text/plain")}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  className="bg-transparent border border-zinc-200 dark:border-[#292d30] text-zinc-700 dark:text-[#f0f0f0] hover:border-zinc-900 dark:hover:border-[#ffffff] hover:text-zinc-900 dark:hover:text-[#ffffff] rounded-[6px] px-3 py-1.5 transition-colors"
                >
                  Download .txt
                </Button>
              </div>
            </div>

            {/* Seamless Code Surface */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-zinc-50 dark:bg-[#050505] text-zinc-800 dark:text-[#f0f0f0] border border-zinc-200 dark:border-[#292d30] rounded-[6px] font-mono text-xs leading-relaxed whitespace-pre-wrap select-text">
              {textContent}
            </div>
          </TabsContent>

          {/* Tab 4: Markdown - Resend Code Window with Preview / Raw Toggle */}
          <TabsContent value="markdown" className="flex-1 min-h-0 flex flex-col overflow-hidden pt-3 space-y-3 data-[state=inactive]:!hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-zinc-200 dark:border-[#292d30] shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-zinc-900 dark:text-white font-sans font-medium">Markdown</span>
                <div className="inline-flex rounded-[6px] border border-zinc-200 dark:border-[#292d30] bg-zinc-100 dark:bg-[#000000] p-0.5">
                  <button
                    type="button"
                    onClick={() => setMarkdownMode("formatted")}
                    className={`px-2.5 py-0.5 text-[11px] font-mono rounded-[4px] transition-colors ${
                      markdownMode === "formatted"
                        ? "bg-purple-600 text-white dark:bg-[#9281f7] dark:text-[#000000] font-semibold"
                        : "text-zinc-600 dark:text-[#a1a4a5] hover:text-zinc-900 dark:hover:text-[#ffffff]"
                    }`}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarkdownMode("raw")}
                    className={`px-2.5 py-0.5 text-[11px] font-mono rounded-[4px] transition-colors ${
                      markdownMode === "raw"
                        ? "bg-purple-600 text-white dark:bg-[#9281f7] dark:text-[#000000] font-semibold"
                        : "text-zinc-600 dark:text-[#a1a4a5] hover:text-zinc-900 dark:hover:text-[#ffffff]"
                    }`}
                  >
                    Raw
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleCopy(markdownContent, "markdown")}
                  leftIcon={copiedTab === "markdown" ? <Check className="w-3.5 h-3.5 text-[#3ad389]" /> : <Copy className="w-3.5 h-3.5" />}
                  className="bg-transparent border border-zinc-200 dark:border-[#292d30] text-zinc-700 dark:text-[#f0f0f0] hover:border-zinc-900 dark:hover:border-[#ffffff] hover:text-zinc-900 dark:hover:text-[#ffffff] rounded-[6px] px-3 py-1.5 transition-colors"
                >
                  {copiedTab === "markdown" ? "Copied" : "Copy Markdown"}
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleDownload(markdownContent, `${result.doc_type || "extraction"}.md`, "text/markdown")}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  className="bg-transparent border border-zinc-200 dark:border-[#292d30] text-zinc-700 dark:text-[#f0f0f0] hover:border-zinc-900 dark:hover:border-[#ffffff] hover:text-zinc-900 dark:hover:text-[#ffffff] rounded-[6px] px-3 py-1.5 transition-colors"
                >
                  Download .md
                </Button>
              </div>
            </div>

            {/* Markdown Frame */}
            {markdownMode === "formatted" ? (
              <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-zinc-50 dark:bg-[#050505] border border-zinc-200 dark:border-[#292d30] rounded-[6px] text-xs leading-relaxed select-text space-y-3 font-sans">
                {markdownContent.split("\n").map((line, idx) => {
                  if (line.startsWith("# ")) {
                    return (
                      <h1 key={idx} className="font-serif text-lg font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-[#292d30] pb-2 mt-1">
                        {line.replace("# ", "")}
                      </h1>
                    );
                  }
                  if (line.startsWith("## ")) {
                    return (
                      <h2 key={idx} className="font-serif text-base font-bold text-zinc-900 dark:text-white mt-3">
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
                          <span className="font-medium text-purple-600 dark:text-[#9281f7] shrink-0">• {label}:</span>
                          <span className="text-zinc-800 dark:text-[#f0f0f0] break-all">{val}</span>
                        </div>
                      );
                    }
                  }
                  if (line.startsWith("|") && line.endsWith("|")) {
                    return (
                      <div key={idx} className="font-mono text-[11px] text-zinc-800 dark:text-[#f0f0f0] bg-zinc-100 dark:bg-[#0b0e14] border border-zinc-200 dark:border-[#292d30] p-1.5 rounded-[6px] overflow-x-auto whitespace-pre">
                        {line}
                      </div>
                    );
                  }
                  if (!line.trim()) return <div key={idx} className="h-1.5" />;
                  return (
                    <p key={idx} className="text-xs text-zinc-600 dark:text-[#a1a4a5] leading-relaxed">
                      {line}
                    </p>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-zinc-50 dark:bg-[#050505] text-purple-700 dark:text-[#9281f7] border border-zinc-200 dark:border-[#292d30] rounded-[6px] font-mono text-xs leading-relaxed whitespace-pre-wrap select-text">
                {markdownContent}
              </div>
            )}
          </TabsContent>

          {/* Tab 5: JSON Payload - Resend Code Window */}
          <TabsContent value="json" className="flex-1 min-h-0 flex flex-col overflow-hidden pt-3 space-y-3 data-[state=inactive]:!hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-zinc-200 dark:border-[#292d30] shrink-0">
              <span className="text-zinc-500 dark:text-[#a1a4a5] flex items-center gap-2">
                <span className="text-zinc-900 dark:text-white font-sans font-medium">JSON Intelligence</span>
                <span className="text-zinc-400 dark:text-[#6e727a] text-[11px]">({(jsonContent.length / 1024).toFixed(1)} KB)</span>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleCopy(jsonContent, "json")}
                  leftIcon={copiedTab === "json" ? <Check className="w-3.5 h-3.5 text-[#3ad389]" /> : <Copy className="w-3.5 h-3.5" />}
                  className="bg-transparent border border-zinc-200 dark:border-[#292d30] text-zinc-700 dark:text-[#f0f0f0] hover:border-zinc-900 dark:hover:border-[#ffffff] hover:text-zinc-900 dark:hover:text-[#ffffff] rounded-[6px] px-3 py-1.5 transition-colors"
                >
                  {copiedTab === "json" ? "Copied" : "Copy JSON"}
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleDownload(jsonContent, `${result.doc_type || "extraction"}_result.json`, "application/json")}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  className="bg-transparent border border-zinc-200 dark:border-[#292d30] text-zinc-700 dark:text-[#f0f0f0] hover:border-zinc-900 dark:hover:border-[#ffffff] hover:text-zinc-900 dark:hover:text-[#ffffff] rounded-[6px] px-3 py-1.5 transition-colors"
                >
                  Download .json
                </Button>
              </div>
            </div>

            {/* Resend JSON Code Window */}
            <div className="flex-1 min-h-0 overflow-auto p-4 bg-zinc-50 dark:bg-[#050505] text-purple-700 dark:text-[#baa7ff] border border-zinc-200 dark:border-[#292d30] rounded-[6px] font-mono text-xs leading-relaxed select-text whitespace-pre">
              {jsonContent}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
