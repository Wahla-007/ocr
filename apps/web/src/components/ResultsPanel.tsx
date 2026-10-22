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

// Recursively prune keys with null, undefined, or empty values across all document types
function pruneMissingFields(value: any): any {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  if (Array.isArray(value)) {
    const cleaned = value
      .map(pruneMissingFields)
      .filter((item) => item !== undefined);
    return cleaned;
  }
  if (typeof value === "object") {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const cleaned = pruneMissingFields(v);
      if (cleaned !== undefined) {
        if (typeof cleaned === "object" && !Array.isArray(cleaned) && Object.keys(cleaned).length === 0) {
          continue;
        }
        res[k] = cleaned;
      }
    }
    return Object.keys(res).length > 0 ? res : undefined;
  }
  return value;
}

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
  const passData: StructuredIdentity | undefined = fieldsObj?.passport;
  const identityData = dlData || idData || passData;
  const receiptData: StructuredReceipt | undefined = fieldsObj?.receipt;
  const contractData: StructuredContract | undefined = fieldsObj?.contract;
  const docData: StructuredGenericDocument | undefined = fieldsObj?.document;

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

  // Build clean dynamic fields dictionary: strictly only include fields whose content is present in the document
  const extractedFieldsMap = useMemo(() => {
    const map: Record<string, any> = {};

    // Helper to flatten nested objects and preserve only clean primitive scalar values
    const addClean = (key: string, val: any) => {
      if (val === null || val === undefined) return;
      if (typeof val === "string" && val.trim() === "") return;
      // Skip redundant or noisy container keys
      if (["id_card", "driving_license", "passport", "raw_fields", "custom_extraction"].includes(key)) {
        if (typeof val === "object" && val !== null) {
          for (const [subKey, subVal] of Object.entries(val)) {
            addClean(subKey, subVal);
          }
        }
        return;
      }
      if (key === "name" && typeof val === "object" && val !== null) {
        if (val.full) addClean("full_name", val.full);
        return;
      }
      if (key === "address" && typeof val === "object" && val !== null) {
        if (val.line1) addClean("address", val.line1);
        return;
      }
      if (typeof val === "object" && !Array.isArray(val) && val !== null) {
        for (const [subKey, subVal] of Object.entries(val)) {
          addClean(subKey, subVal);
        }
        return;
      }
      if (map[key] === undefined) {
        map[key] = val;
      }
    };

    // 1. Array of ExtractedField from backend API
    if (Array.isArray(result.fields)) {
      for (const f of result.fields) {
        addClean(f.key, f.value);
      }
    } else if (fieldsObj && typeof fieldsObj === "object") {
      const cleaned = pruneMissingFields(fieldsObj);
      if (cleaned && typeof cleaned === "object") {
        for (const [k, v] of Object.entries(cleaned)) {
          addClean(k, v);
        }
      }
    }

    // 2. Extra discovered fields
    if (result.extra_fields && Array.isArray(result.extra_fields)) {
      for (const ef of result.extra_fields) {
        addClean(ef.key, ef.value);
      }
    }

    // 3. Direct top-level fields on result (only for relevant document types)
    const isFinancial = docType === "invoice" || docType === "receipt" || docType === "bank_statement";
    if (isFinancial) {
      const topCandidates: Record<string, any> = {
        invoice_number: result.invoice_number,
        vendor_name: result.vendor_name || result.brand_name,
        customer_name: result.customer_name,
        issue_date: result.issue_date,
        due_date: result.due_date,
        subtotal: result.subtotal,
        tax_amount: result.tax_amount,
        total_amount: result.total_amount,
        currency: (result.total_amount !== undefined && result.total_amount !== null) ? result.currency : undefined,
      };
      for (const [k, v] of Object.entries(topCandidates)) {
        addClean(k, v);
      }
    } else {
      if (result.issue_date) addClean("issue_date", result.issue_date);
      if (result.date_of_birth) addClean("date_of_birth", result.date_of_birth);
      if (result.expiry_date) addClean("expiry_date", result.expiry_date);
      if (result.license_class) addClean("license_class", result.license_class);
      if (result.id_number) addClean("id_number", result.id_number);
      if (result.address) addClean("address", result.address);
      if (result.issuing_authority) addClean("issuing_authority", result.issuing_authority);
    }

    // Ensure no raw JSON container keys remain in the table
    delete map["name"];
    delete map["id_card"];
    delete map["driving_license"];
    delete map["passport"];
    delete map["raw_fields"];

    // For identity documents, consolidate document_number and id_number into id_number
    if (docType === "id_card" || docType === "driving_license" || docType === "passport") {
      if (map["id_number"] || map["document_number"] || map["passport_number"]) {
        map["id_number"] = map["id_number"] || map["passport_number"] || map["document_number"];
        delete map["document_number"];
      }
      // HARD RULE: For all identification documents (ID card, CNIC, driver license, permit),
      // the NAME field is mandatory and must NEVER be skipped.
      if (!map["full_name"]) {
        const fallbackName =
          (fieldsObj as any)?.full_name ||
          (fieldsObj as any)?.name?.full ||
          result.full_name ||
          result.customer_name;
        if (fallbackName) {
          map["full_name"] = fallbackName;
        }
      }

      // Gender field (supports Sex, Sexe, Gender, M/F)
      if (!map["gender"]) {
        const fallbackGender =
          (fieldsObj as any)?.gender ||
          (fieldsObj as any)?.sex ||
          (fieldsObj as any)?.sexe ||
          result.gender;
        if (fallbackGender) {
          map["gender"] = fallbackGender;
        }
      }

      // Address field
      if (!map["address"]) {
        const fallbackAddress =
          (fieldsObj as any)?.address?.line1 ||
          (fieldsObj as any)?.address ||
          result.address;
        if (fallbackAddress) {
          map["address"] =
            typeof fallbackAddress === "object"
              ? fallbackAddress.line1 ||
                Object.values(fallbackAddress).filter((v) => v && typeof v === "string").join(", ")
              : fallbackAddress;
        }
      }

      // License categories / type
      if (!map["license_class"]) {
        const fallbackClass =
          (fieldsObj as any)?.license_class ||
          (fieldsObj as any)?.driving_license?.license_class ||
          result.license_class;
        if (fallbackClass) {
          map["license_class"] = fallbackClass;
        }
      }

      // Issuing authority
      if (!map["issuing_authority"]) {
        const fallbackAuth =
          (fieldsObj as any)?.issuing_authority ||
          (fieldsObj as any)?.driving_license?.issuing_authority ||
          result.issuing_authority;
        if (fallbackAuth) {
          map["issuing_authority"] = fallbackAuth;
        }
      }
    }

    // Ensure address is formatted as clean string if present
    if (map["address"] && typeof map["address"] === "object") {
      const a = map["address"];
      map["address"] =
        a.line1 || Object.values(a).filter((v) => v && typeof v === "string").join(", ");
    }

    return map;
  }, [result, fieldsObj, docType]);

  const docNumber =
    extractedFieldsMap.id_number ||
    extractedFieldsMap.document_number ||
    extractedFieldsMap.invoice_number ||
    extractedFieldsMap.receipt_number ||
    result.id_number ||
    result.document_number ||
    result.invoice_number ||
    null;

  // Canonical JSON output: only include fields with actual content present
  const fullJsonPayload = useMemo(() => {
    const rawPayload: Record<string, any> = {
      id: result.id || `ocr_${Math.random().toString(36).substring(2, 14)}`,
      pages: result.pages || result.page_count || 1,
      document_type: docType,
      detected_type: docType,
      fields: extractedFieldsMap,
      text: result.text || plainTextContent,
      markdown: result.markdown || markdownContent,
    };

    if (result.blocks && result.blocks.length > 0) {
      rawPayload.blocks = result.blocks;
    }
    if (result.tables && result.tables.length > 0) {
      rawPayload.tables = result.tables;
    }
    if (result.usage) {
      rawPayload.usage = result.usage;
    }
    if (result.validation) {
      const cleanedVal = pruneMissingFields(result.validation);
      if (cleanedVal) rawPayload.validation = cleanedVal;
    }
    if (result.warnings && result.warnings.length > 0) {
      rawPayload.warnings = result.warnings;
    }

    return pruneMissingFields(rawPayload) || rawPayload;
  }, [result, docType, extractedFieldsMap, plainTextContent, markdownContent]);

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
            {/* SECTION 1: DOCUMENT IDENTITY */}
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
                  <span className="text-[10px] font-mono text-slate-500 block uppercase">Detected Type</span>
                  <span className="font-mono text-emerald-400 font-semibold uppercase">{docType}</span>
                </div>
                {docNumber && (
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">
                      {docType === "passport" ? "Passport Number" : docType === "id_card" ? "ID Card Number" : docType === "driving_license" ? "License Number" : "Identifier"}
                    </span>
                    <span className="font-mono text-slate-200 font-semibold">{docNumber}</span>
                  </div>
                )}
                {docType === "id_card" || docType === "driving_license" || docType === "passport" ? (
                  <>
                    {(extractedFieldsMap.full_name || result.full_name) && (
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 block uppercase">
                          {docType === "passport" ? "Passport Holder" : "Name / Cardholder"}
                        </span>
                        <span className="font-mono text-slate-200 font-semibold">{extractedFieldsMap.full_name || result.full_name}</span>
                      </div>
                    )}
                    {(extractedFieldsMap.father_name || (fieldsObj as any)?.father_name) && (
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 block uppercase">Father Name</span>
                        <span className="font-mono text-slate-300">{extractedFieldsMap.father_name || (fieldsObj as any)?.father_name}</span>
                      </div>
                    )}
                    {(extractedFieldsMap.date_of_birth || result.date_of_birth) && (
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 block uppercase">Date of Birth</span>
                        <span className="font-mono text-slate-300">{extractedFieldsMap.date_of_birth || result.date_of_birth}</span>
                      </div>
                    )}
                    {(extractedFieldsMap.expiry_date || result.expiry_date) && (
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 block uppercase">Expiry Date</span>
                        <span className="font-mono text-slate-300">{extractedFieldsMap.expiry_date || result.expiry_date}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {(extractedFieldsMap.issue_date || result.issue_date) && (
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 block uppercase">Issue Date</span>
                        <span className="font-mono text-slate-300">{extractedFieldsMap.issue_date || result.issue_date}</span>
                      </div>
                    )}
                    {(extractedFieldsMap.due_date || result.due_date) && (
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 block uppercase">Due Date</span>
                        <span className="font-mono text-slate-300">{extractedFieldsMap.due_date || result.due_date}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* SECTION 2: UNIVERSAL EXTRACTED DOCUMENT FIELDS (CONTENT-DRIVEN) */}
            {Object.keys(extractedFieldsMap).length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase tracking-wider block">
                    Extracted Fields ({Object.keys(extractedFieldsMap).length})
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    Active Content
                  </span>
                </div>

                <div className="rounded-lg border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-1.5 px-2.5 font-normal">Field</th>
                        <th className="py-1.5 px-2.5 font-normal">Extracted Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {Object.entries(extractedFieldsMap).map(([key, val], idx) => {
                        const isSelected = selectedFieldKey === key;
                        const isHovered = hoveredFieldKey === key;
                        const labelText =
                          (key === "id_number" || key === "document_number") && docType === "driving_license"
                            ? "License Number"
                            : key === "id_number" || (key === "document_number" && docType === "id_card")
                            ? "ID Card Number"
                            : key === "driving_license"
                            ? "License Number"
                            : key === "license_class"
                            ? "License Categories / Type"
                            : key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                        const displayVal =
                          val === null || val === undefined
                            ? ""
                            : typeof val === "boolean"
                            ? val
                              ? "Yes"
                              : "No"
                            : typeof val === "object"
                            ? Object.values(val).filter((v) => v !== null && v !== undefined && String(v).trim() !== "").join(", ")
                            : String(val);

                        return (
                          <tr
                            key={idx}
                            onClick={() => onSelectField(isSelected ? null : key)}
                            onMouseEnter={() => onHoverField(key)}
                            onMouseLeave={() => onHoverField(null)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-emerald-500/15 text-emerald-300 font-semibold"
                                : isHovered
                                ? "bg-slate-900/80 text-white"
                                : "hover:bg-slate-900/40"
                            }`}
                          >
                            <td className="py-1.5 px-2.5 text-slate-400 max-w-[140px]">
                              {labelText}
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-200 break-words font-medium">
                              {displayVal}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SECTION 3: PARTIES & ENTITIES (ONLY IF PRESENT) */}
            {(extractedFieldsMap.vendor_name || extractedFieldsMap.customer_name || invData?.supplier?.name || invData?.buyer?.name) && (
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase tracking-wider block">
                  Parties & Location
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {(extractedFieldsMap.vendor_name || invData?.supplier?.name) && (
                    <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1">
                      <span className="text-[10px] font-mono text-slate-500 block uppercase">Vendor / Issuer</span>
                      <p className="font-semibold text-slate-200">
                        {extractedFieldsMap.vendor_name || invData?.supplier?.name}
                      </p>
                      {invData?.supplier?.address && (
                        <p className="text-[11px] text-slate-400">{invData.supplier.address}</p>
                      )}
                    </div>
                  )}

                  {(extractedFieldsMap.customer_name || invData?.buyer?.name) && (
                    <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1">
                      <span className="text-[10px] font-mono text-slate-500 block uppercase">Billed To / Recipient</span>
                      <p className="font-semibold text-slate-200">
                        {extractedFieldsMap.customer_name || invData?.buyer?.name}
                      </p>
                      {invData?.buyer?.address && (
                        <p className="text-[11px] text-slate-400">{invData.buyer.address}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 4: FINANCIAL AMOUNTS (ONLY IF PRESENT) */}
            {(extractedFieldsMap.total_amount !== undefined || extractedFieldsMap.subtotal !== undefined || extractedFieldsMap.tax_amount !== undefined) && (
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase tracking-wider block">
                  Financial Amounts
                </span>

                <div className="grid grid-cols-3 gap-2.5">
                  {extractedFieldsMap.subtotal !== undefined && (
                    <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Subtotal</span>
                      <span className="font-mono text-sm font-semibold text-slate-200">
                        ${Number(extractedFieldsMap.subtotal).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {extractedFieldsMap.tax_amount !== undefined && (
                    <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Tax</span>
                      <span className="font-mono text-sm font-semibold text-slate-200">
                        ${Number(extractedFieldsMap.tax_amount).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {extractedFieldsMap.total_amount !== undefined && (
                    <div className="p-2.5 rounded-lg bg-slate-900/90 border border-emerald-900/50">
                      <span className="text-[10px] font-mono text-emerald-500 uppercase block">Total</span>
                      <span className="font-mono text-sm font-bold text-white">
                        ${Number(extractedFieldsMap.total_amount).toFixed(2)} {extractedFieldsMap.currency ? `(${extractedFieldsMap.currency})` : ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 5: LINE ITEMS (ONLY IF PRESENT) */}
            {(invData?.line_items && invData.line_items.length > 0) && (
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase tracking-wider block">
                  Line Items ({invData.line_items.length})
                </span>
                <div className="rounded-lg border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-1.5 px-2.5 font-normal">Item</th>
                        <th className="py-1.5 px-2.5 text-center font-normal">Qty</th>
                        <th className="py-1.5 px-2.5 text-right font-normal">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {invData.line_items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          <td className="py-1.5 px-2.5 truncate max-w-[180px]">{it.description}</td>
                          <td className="py-1.5 px-2.5 text-center text-slate-400">{it.quantity}</td>
                          <td className="py-1.5 px-2.5 text-right font-semibold text-slate-200">
                            ${Number(it.amount).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
