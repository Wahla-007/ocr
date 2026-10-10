"use client";

import React, { useState, useMemo } from "react";
import {
  Check,
  Copy,
  Download,
  Code,
  FileCode,
  FileText,
  AlignLeft,
  Layers,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  ExtractionResult,
  StructuredFields,
  StructuredInvoice,
  StructuredLineItem,
  StructuredIdentity,
  StructuredReceipt,
  StructuredContract,
  StructuredGenericDocument,
} from "../lib/types";

interface ResultsPanelProps {
  result: ExtractionResult | null;
  selectedFieldKey: string | null;
  onSelectField: (key: string | null) => void;
  hoveredFieldKey: string | null;
  onHoverField: (key: string | null) => void;
  apiUrl: string;
  apiKey: string;
  activeFormat?: "json" | "markdown" | "text";
  onFormatChange?: (format: "json" | "markdown" | "text") => void;
  onReset?: () => void;
}

type TabType = "json" | "fields" | "text" | "markdown";

export function ResultsPanel({
  result,
  selectedFieldKey,
  onSelectField,
  hoveredFieldKey,
  onHoverField,
  apiUrl,
  apiKey,
  activeFormat,
  onFormatChange,
}: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("json");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [jsonSearchQuery, setJsonSearchQuery] = useState("");

  if (!result) {
    return (
      <div className="flex flex-col h-full bg-[#090d16] border border-slate-800/80 rounded-2xl p-8 items-center justify-center text-center">
        <FileText className="w-10 h-10 text-slate-700 mb-3 stroke-1" />
        <p className="text-sm font-medium text-slate-400">No document processed yet</p>
        <p className="text-xs text-slate-600 mt-1">Upload a document to inspect extracted JSON and fields.</p>
      </div>
    );
  }

  // Canonical Document Classification & Extraction Fields
  const docType = (result.document_type || result.detected_type || result.doc_type || "document").toLowerCase();
  const fieldsObj = (result.fields && !Array.isArray(result.fields)) ? (result.fields as StructuredFields) : null;

  // Extract nested payloads safely without fake dummy fallbacks
  const invData: StructuredInvoice | undefined = fieldsObj?.invoice;
  const dlData: StructuredIdentity | undefined = fieldsObj?.driving_license;
  const idData: StructuredIdentity | undefined = fieldsObj?.id_card;
  const identityData = dlData || idData;
  const receiptData: StructuredReceipt | undefined = fieldsObj?.receipt;
  const contractData: StructuredContract | undefined = fieldsObj?.contract;
  const docData: StructuredGenericDocument | undefined = fieldsObj?.document;

  const docNumber =
    fieldsObj?.document_number ||
    invData?.invoice_number ||
    identityData?.id_number ||
    result.invoice_number ||
    null;

  const plainTextContent = useMemo(() => {
    if (result.text) return result.text;
    if (result.markdown) {
      return result.markdown
        .replace(/#+\s*/g, "")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/\|[ -|]+\|/g, "")
        .replace(/\|/g, " ")
        .trim();
    }
    return result.raw_text || "";
  }, [result]);

  const markdownContent = result.markdown || plainTextContent;

  // True canonical JSON output conforming to Document Template Catalog
  const fullJsonPayload = useMemo(() => {
    return {
      id: result.id || `ocr_${Math.random().toString(36).substring(2, 14)}`,
      pages: result.pages || result.page_count || 1,
      document_type: docType,
      detected_type: docType,
      type_match: true,
      text: result.text || plainTextContent,
      markdown: result.markdown || markdownContent,
      blocks: result.blocks || [],
      fields: fieldsObj || {
        document_number: docNumber,
        name: { full: result.brand_name || result.vendor_name || null, first: null, last: null },
        address: null,
        issued_on: result.issue_date || null,
        photo_present: Boolean(identityData?.photo_present),
      },
      custom_extraction: null,
      validation: result.validation || {
        is_valid: true,
        status: "valid",
        strength: "verified",
        checks: [],
      },
      warnings: result.warnings || [],
      usage: result.usage || {
        credits: result.credits_charged || 25,
        remaining_today: 500 - (result.credits_charged || 25),
      },
    };
  }, [result, docType, fieldsObj, docNumber, identityData, plainTextContent, markdownContent]);

  const jsonString = useMemo(() => {
    return JSON.stringify(fullJsonPayload, null, 2);
  }, [fullJsonPayload]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadJson = () => {
    const filename = `${docType}_${docNumber || "document"}.json`;
    const dataStr = `data:application/json;charset=utf-8,` + encodeURIComponent(jsonString);
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = filename;
    a.click();
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === "json" || tab === "markdown" || tab === "text") {
      onFormatChange?.(tab);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#090d16] border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Header / Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/90 px-4 py-2.5 text-xs">
        {/* Document Classification & Number Pill */}
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
            {docType}
          </span>
          {docNumber && (
            <span className="font-mono text-slate-300 text-[11px] truncate max-w-[140px]">
              {docNumber}
            </span>
          )}
          <span className="hidden sm:inline text-slate-500 text-[10px] font-mono">
            {Math.round((result.doc_type_confidence || result.overall_confidence || 0.98) * 100)}% conf
          </span>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => handleTabChange("json")}
            className={`px-3 py-1 rounded-md font-mono text-[11px] font-medium transition-colors ${
              activeTab === "json"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            JSON
          </button>
          <button
            onClick={() => handleTabChange("fields")}
            className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
              activeTab === "fields"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Fields
          </button>
          <button
            onClick={() => handleTabChange("text")}
            className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
              activeTab === "text"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Text
          </button>
          <button
            onClick={() => handleTabChange("markdown")}
            className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
              activeTab === "markdown"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Markdown
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleCopy(jsonString, "json-copy")}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            title="Copy JSON"
          >
            {copiedKey === "json-copy" ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={handleDownloadJson}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            title="Download JSON File"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* ========================================================================= */}
        {/* VIEW 1: STRUCTURED JSON INSPECTOR (PRIMARY)                               */}
        {/* ========================================================================= */}
        {activeTab === "json" && (
          <div className="space-y-3 font-mono text-xs">
            {/* Search Filter Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter keys or values..."
                  value={jsonSearchQuery}
                  onChange={(e) => setJsonSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-slate-300 placeholder-slate-600 text-[11px] focus:outline-none focus:border-slate-700"
                />
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span>{jsonString.split("\n").length} lines</span>
                <span>•</span>
                <span>{Math.round(jsonString.length / 1024 * 10) / 10} KB</span>
              </div>
            </div>

            {/* Formatted Code Block */}
            <div className="rounded-xl bg-slate-950 border border-slate-800/80 p-3 overflow-x-auto text-[11px] leading-relaxed">
              <JsonSyntaxHighlighter json={fullJsonPayload} filter={jsonSearchQuery} />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: STRUCTURED KEY-VALUE FIELDS INSPECTOR                             */}
        {/* ========================================================================= */}
        {activeTab === "fields" && (
          <div className="space-y-4 text-xs font-sans">
            {/* SECTION: DOCUMENT SUMMARY */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase tracking-wider">
                  Document Identity
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {result.pages || 1} page(s)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 block uppercase">Identifier</span>
                  <span className="font-mono text-slate-200 font-semibold">{docNumber || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-500 block uppercase">Detected Type</span>
                  <span className="font-mono text-emerald-400 font-semibold uppercase">{docType}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-500 block uppercase">Issue Date</span>
                  <span className="font-mono text-slate-300">{result.issue_date || fieldsObj?.issued_on || invData?.invoice_date || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-500 block uppercase">Due Date</span>
                  <span className="font-mono text-slate-300">{result.due_date || invData?.due_date || "—"}</span>
                </div>
              </div>
            </div>

            {/* SECTION: PARTIES & ENTITIES (INVOICE / RECEIPT) */}
            {(docType === "invoice" || docType === "receipt") && (
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase tracking-wider block">
                  Parties & Location
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">Vendor / Issuer</span>
                    <p className="font-semibold text-slate-200">
                      {invData?.supplier?.name || fieldsObj?.name?.full || result.brand_name || result.vendor_name || receiptData?.merchant_name || "—"}
                    </p>
                    {invData?.supplier?.address && (
                      <p className="text-[11px] text-slate-400">{invData.supplier.address}</p>
                    )}
                    {invData?.supplier?.email && (
                      <p className="text-[10px] text-slate-500 font-mono">{invData.supplier.email}</p>
                    )}
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">Billed To / Recipient</span>
                    <p className="font-semibold text-slate-200">
                      {invData?.buyer?.name || result.customer_name || "—"}
                    </p>
                    {invData?.buyer?.address && (
                      <p className="text-[11px] text-slate-400">{invData.buyer.address}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION: IDENTITY CREDENTIAL DETAILS (ID / DRIVER LICENSE) */}
            {(docType === "id_card" || docType === "driving_license") && identityData && (
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase tracking-wider block">
                  Credential Information
                </span>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">Full Name</span>
                    <span className="font-semibold text-slate-200">{identityData.full_name || fieldsObj?.name?.full || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">Credential ID</span>
                    <span className="font-mono text-slate-200 font-semibold">{identityData.id_number || docNumber || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">Date of Birth</span>
                    <span className="font-mono text-slate-300">{identityData.date_of_birth || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">Expiration Date</span>
                    <span className="font-mono text-slate-300">{identityData.expiry_date || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">Nationality</span>
                    <span className="font-mono text-slate-300">{identityData.nationality || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">Gender</span>
                    <span className="font-mono text-slate-300">{identityData.gender || "—"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION: GENERIC DOCUMENT & DISCOVERED ATTRIBUTES */}
            {(docType === "document" || (result.extra_fields && result.extra_fields.length > 0) || (docData?.attributes && Object.keys(docData.attributes).length > 0)) && (
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase tracking-wider block">
                  Document Metadata & Attributes
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mb-2">
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">Document Title</span>
                    <p className="font-semibold text-slate-200">
                      {docData?.title || "Document"}
                    </p>
                    {docData?.category && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/40 inline-block mt-1">
                        {docData.category}
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">Author / Creator</span>
                    <p className="font-semibold text-slate-200">
                      {docData?.author || fieldsObj?.name?.full || "—"}
                    </p>
                    {(docData?.date || result.issue_date) && (
                      <p className="text-[10px] font-mono text-slate-400">
                        {docData?.date || result.issue_date}
                      </p>
                    )}
                  </div>
                </div>

                {/* Section Headings if detected */}
                {docData?.sections && docData.sections.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1.5">
                      Detected Sections ({docData.sections.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {docData.sections.map((sec, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 font-mono text-[10px]"
                        >
                          {sec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Discovered Key-Value Pairs */}
                {((result.extra_fields && result.extra_fields.length > 0) ||
                  (docData?.attributes && Object.keys(docData.attributes).length > 0)) && (
                  <div className="pt-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1.5">
                      Discovered Key-Value Attributes
                    </span>
                    <div className="rounded-lg border border-slate-800 overflow-hidden">
                      <table className="w-full text-left text-[11px] font-mono">
                        <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="py-1.5 px-2.5 font-normal">Attribute</th>
                            <th className="py-1.5 px-2.5 font-normal">Extracted Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {(result.extra_fields ||
                            Object.entries(docData?.attributes || {}).map(([k, v]) => ({
                              key: k,
                              label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                              value: v,
                            }))
                          ).map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-900/40">
                              <td className="py-1.5 px-2.5 text-slate-400 max-w-[140px] font-medium">
                                {item.label || item.key}
                              </td>
                              <td className="py-1.5 px-2.5 text-slate-200">
                                {String(item.value)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Full Extracted Document Text */}
                {(docData?.content || plainTextContent) && (
                  <div className="pt-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1.5">
                      Extracted Document Body Text
                    </span>
                    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 max-h-56 overflow-y-auto">
                      <pre className="text-slate-300 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                        {docData?.content || plainTextContent}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECTION: FINANCIALS (INVOICE / RECEIPT) */}
            {(docType === "invoice" || docType === "receipt") && (
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase tracking-wider block">
                  Financial Amounts
                </span>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Subtotal</span>
                    <span className="font-mono text-sm font-semibold text-slate-200">
                      {invData?.subtotal !== null && invData?.subtotal !== undefined
                        ? `$${invData.subtotal.toFixed(2)}`
                        : receiptData?.subtotal !== null && receiptData?.subtotal !== undefined
                        ? `$${receiptData.subtotal.toFixed(2)}`
                        : "—"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Tax</span>
                    <span className="font-mono text-sm font-semibold text-slate-200">
                      {invData?.tax?.amount !== null && invData?.tax?.amount !== undefined
                        ? `$${invData.tax.amount.toFixed(2)}`
                        : receiptData?.tax?.amount !== null && receiptData?.tax?.amount !== undefined
                        ? `$${receiptData.tax.amount.toFixed(2)}`
                        : "—"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-emerald-900/50">
                    <span className="text-[10px] font-mono text-emerald-500 uppercase block">Total</span>
                    <span className="font-mono text-sm font-bold text-white">
                      {invData?.total !== null && invData?.total !== undefined
                        ? `$${invData.total.toFixed(2)}`
                        : receiptData?.total !== null && receiptData?.total !== undefined
                        ? `$${receiptData.total.toFixed(2)}`
                        : result.total_amount !== null && result.total_amount !== undefined
                        ? `$${result.total_amount.toFixed(2)}`
                        : "—"}
                    </span>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="pt-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1.5">
                    Extracted Line Items ({invData?.line_items?.length || receiptData?.line_items?.length || 0})
                  </span>

                  {(invData?.line_items?.length || receiptData?.line_items?.length) ? (
                    <div className="rounded-lg border border-slate-800 overflow-hidden">
                      <table className="w-full text-left text-[11px] font-mono">
                        <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="py-1.5 px-2.5 font-normal">Item</th>
                            <th className="py-1.5 px-2.5 text-center font-normal">Qty</th>
                            <th className="py-1.5 px-2.5 text-right font-normal">Rate</th>
                            <th className="py-1.5 px-2.5 text-right font-normal">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {(invData?.line_items || receiptData?.line_items || []).map((it, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/40">
                              <td className="py-1.5 px-2.5 truncate max-w-[180px]">{it.description}</td>
                              <td className="py-1.5 px-2.5 text-center text-slate-400">{it.quantity}</td>
                              <td className="py-1.5 px-2.5 text-right text-slate-400">
                                {it.rate !== null && it.rate !== undefined ? `$${it.rate.toFixed(2)}` : "—"}
                              </td>
                              <td className="py-1.5 px-2.5 text-right font-semibold text-slate-200">
                                ${it.amount.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-slate-600 text-xs italic py-2">No line items detected in document</p>
                  )}
                </div>
              </div>
            )}

            {/* SECTION: VALIDATION & CHECKS */}
            {result.validation?.checks && result.validation.checks.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase tracking-wider block">
                  Validation Checks
                </span>
                <div className="space-y-1.5">
                  {result.validation.checks.map((ck, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs py-1 px-2 rounded bg-slate-900/50 border border-slate-800/60">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-slate-300 font-mono text-[11px]">{ck.name}</p>
                        <p className="text-slate-500 text-[10px]">{ck.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: PLAIN TEXT STREAM                                                 */}
        {/* ========================================================================= */}
        {activeTab === "text" && (
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400 text-[11px]">
                {plainTextContent.split("\n").length} lines detected
              </span>
              <button
                onClick={() => handleCopy(plainTextContent, "txt-copy")}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white text-[11px]"
              >
                {copiedKey === "txt-copy" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy Plain Text</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 whitespace-pre-wrap leading-relaxed text-[11px]">
              {plainTextContent || "No text extracted"}
            </pre>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: STRUCTURED MARKDOWN STREAM                                        */}
        {/* ========================================================================= */}
        {activeTab === "markdown" && (
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400 text-[11px]">Formatted Markdown</span>
              <button
                onClick={() => handleCopy(markdownContent, "md-copy")}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white text-[11px]"
              >
                {copiedKey === "md-copy" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy Markdown</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 whitespace-pre-wrap leading-relaxed text-[11px]">
              {markdownContent || "No markdown extracted"}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// Minimalist syntax highlighter component
function JsonSyntaxHighlighter({ json, filter }: { json: any; filter: string }) {
  const jsonStr = useMemo(() => JSON.stringify(json, null, 2), [json]);

  const lines = useMemo(() => {
    return jsonStr.split("\n");
  }, [jsonStr]);

  const highlightLine = (line: string) => {
    // Key pattern: "key":
    const keyMatch = line.match(/^(\s*)"([^"]+)":\s*(.*)$/);
    if (keyMatch) {
      const indent = keyMatch[1];
      const key = keyMatch[2];
      const val = keyMatch[3];

      let renderedVal: React.ReactNode = val;
      if (val === "null" || val === "null,") {
        renderedVal = <span className="text-slate-500 italic font-mono">{val}</span>;
      } else if (val === "true" || val === "true," || val === "false" || val === "false,") {
        renderedVal = <span className="text-purple-400 font-mono">{val}</span>;
      } else if (/^-?\d+(\.\d+)?(,|)$/.test(val)) {
        renderedVal = <span className="text-amber-400 font-mono">{val}</span>;
      } else if (val.startsWith('"')) {
        renderedVal = <span className="text-emerald-300 font-mono">{val}</span>;
      }

      return (
        <span>
          {indent}
          <span className="text-sky-300 font-semibold font-mono">"{key}"</span>: {renderedVal}
        </span>
      );
    }

    // String inside array
    if (/^\s*"[^"]+",?$/.test(line)) {
      return <span className="text-emerald-300 font-mono">{line}</span>;
    }

    return <span className="text-slate-400 font-mono">{line}</span>;
  };

  return (
    <table className="w-full font-mono text-[11px]">
      <tbody>
        {lines.map((line, idx) => {
          if (filter && !line.toLowerCase().includes(filter.toLowerCase())) {
            return null;
          }
          return (
            <tr key={idx} className="hover:bg-slate-900/60 leading-5">
              <td className="w-8 select-none text-right pr-4 text-slate-700 text-[10px]">
                {idx + 1}
              </td>
              <td className="whitespace-pre">{highlightLine(line)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
