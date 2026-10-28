"use client";

import React, { useState, useEffect } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Layers,
  Shield,
  FileText,
  Sliders,
} from "lucide-react";
import { ExtractionResult, ExtractedField, ParsedBlock } from "../lib/types";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";

interface DocumentViewerProps {
  fileName: string;
  result: ExtractionResult | null;
  selectedFieldKey: string | null;
  onSelectField: (key: string | null) => void;
  hoveredFieldKey: string | null;
  onHoverField: (key: string | null) => void;
  uploadedPreviewUrl?: string | null;
}

export function DocumentViewer({
  fileName,
  result,
  selectedFieldKey,
  onSelectField,
  hoveredFieldKey,
  onHoverField,
  uploadedPreviewUrl,
}: DocumentViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [showFieldBboxes, setShowFieldBboxes] = useState(true);
  const [showTableBboxes, setShowTableBboxes] = useState(true);
  const [showTextBlocks, setShowTextBlocks] = useState(false);
  const [privacyBlur, setPrivacyBlur] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = result?.page_count || 1;

  // Zoom handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.15, 2.2));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.15, 0.6));
  const handleResetZoom = () => setZoom(1);

  // Filter fields on current page
  const fieldList = Array.isArray(result?.fields)
    ? result.fields
    : (result?.raw_fields || []);

  const pageFields = fieldList.filter(
    (f) => f.bbox && (f.page === undefined || f.page === currentPage)
  );

  const pageBlocks = (result?.blocks || []).filter(
    (b) => b.bbox && (b.page === undefined || b.page === currentPage)
  );

  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
    setImgFailed(false);
  }, [result?.id, fileName]);

  const previewSource = !imgFailed && (result?.preview_image || uploadedPreviewUrl);

  // Polymorphic Specimen Canvas Renderers matching each specimen in the archive
  const renderSpecimenCanvas = () => {
    const rawType = (
      result?.doc_type ||
      result?.document_type ||
      (fileName.toLowerCase().includes("receipt") ? "receipt" : "") ||
      (fileName.toLowerCase().includes("license") ? "driving_license" : "") ||
      (fileName.toLowerCase().includes("contract") || fileName.toLowerCase().includes("nda") ? "contract" : "") ||
      (fileName.toLowerCase().includes("report") ? "document" : "") ||
      "invoice"
    ).toLowerCase();

    // 1. THERMAL STORE RECEIPT SPECIMEN
    if (rawType === "receipt") {
      return (
        <div
          className="w-[520px] h-[680px] bg-[#FAF9F5] text-zinc-900 p-8 flex flex-col justify-between font-mono border border-zinc-300 shadow-sm relative overflow-hidden"
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          {/* Thermal Receipt jagged edge indicator */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[repeating-linear-gradient(45deg,#FAF9F5,#FAF9F5_5px,#E4E4E7_5px,#E4E4E7_10px)] border-b border-zinc-300" />

          <div className="space-y-4 pt-2">
            {/* Store Header matching bbox: x:50, y:40, w:320, h:40 */}
            <div className="text-center pb-2 border-b border-dashed border-zinc-400">
              <h1 className="text-xl font-bold tracking-wider text-zinc-950 uppercase">SUPERMARKET METRO</h1>
              <p className="text-[11px] text-zinc-600 mt-0.5">Store #849 — 100 Market St, San Francisco, CA</p>
            </div>

            {/* Date & Cashier matching bbox: x:50, y:110 and y:145 */}
            <div className="space-y-1 text-xs text-zinc-700 pb-2 border-b border-dashed border-zinc-400">
              <div className="flex justify-between">
                <span>DATE: 2026-10-06 14:32:01</span>
                <span>REG #04</span>
              </div>
              <div className="flex justify-between">
                <span>CASHIER: Alex M.</span>
                <span>TRANS #84920</span>
              </div>
            </div>

            {/* Receipt Line Items */}
            <div className="text-xs space-y-1.5 pt-1 text-zinc-800">
              <div className="flex justify-between">
                <span>Organic Whole Milk 1 Gal</span>
                <span className="font-bold">$4.99</span>
              </div>
              <div className="flex justify-between">
                <span>Fresh Sourdough Bread</span>
                <span className="font-bold">$3.50</span>
              </div>
              <div className="flex justify-between">
                <span>Dark Roast Coffee Beans</span>
                <span className="font-bold">$14.99</span>
              </div>
              <div className="flex justify-between">
                <span>Greek Yogurt 32oz</span>
                <span className="font-bold">$5.49</span>
              </div>
              <div className="flex justify-between">
                <span>Avocados (Bag of 4)</span>
                <span className="font-bold">$4.29</span>
              </div>
            </div>

            {/* Subtotal, Tax, Total matching bbox: x:50, y:440, 475, 520 */}
            <div className="border-t border-dashed border-zinc-400 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-700">
                <span>SUBTOTAL</span>
                <span className="font-bold">$33.26</span>
              </div>
              <div className="flex justify-between text-zinc-700">
                <span>SALES TAX (8.5%)</span>
                <span className="font-bold">$2.83</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold border-t border-zinc-900 pt-2 text-zinc-950">
                <span>TOTAL PAID</span>
                <span className="text-base">$36.09 USD</span>
              </div>
            </div>
          </div>

          {/* Payment & Barcode Footer */}
          <div className="border-t border-dashed border-zinc-400 pt-3 text-center space-y-2">
            <p className="text-[11px] text-zinc-600">
              METHOD: CREDIT CARD (VISA ****8492) • AUTH: 8492026
            </p>
            <div className="flex justify-center items-center gap-0.5 h-7 py-1 opacity-80">
              {[3, 1, 4, 1, 2, 5, 2, 1, 4, 2, 3, 1, 5, 2, 3, 1, 2, 4, 1, 3, 2, 4, 1].map((w, i) => (
                <div key={i} className="h-full bg-zinc-900" style={{ width: `${w * 1.5}px` }} />
              ))}
            </div>
            <p className="text-[10px] tracking-widest text-zinc-500">REC-849-2026</p>
          </div>
        </div>
      );
    }

    // 2. DRIVER LICENSE / STATE CREDENTIAL SPECIMEN
    if (rawType === "driving_license" || rawType === "id_card") {
      return (
        <div
          className="w-[520px] h-[680px] bg-[#F7F6F2] text-zinc-900 p-6 flex flex-col justify-between font-sans border border-zinc-300 shadow-sm relative overflow-hidden"
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          {/* Archival Specimen Docket Header */}
          <div className="border-b border-zinc-300 pb-2 flex justify-between items-center text-[11px] font-mono text-zinc-500">
            <span>STATE CREDENTIAL AUDIT SPECIMEN</span>
            <span>STANDARD REAL ID FORMAT</span>
          </div>

          {/* Central Laminated ID Card Simulation */}
          <div className="my-auto border-2 border-zinc-800 rounded-lg p-5 bg-gradient-to-br from-blue-50/50 via-white to-amber-50/40 shadow-md relative overflow-hidden">
            {/* Guilloche Security Background Watermark */}
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:8px_8px]" />

            {/* State Top Banner */}
            <div className="flex justify-between items-start border-b-2 border-blue-900 pb-2 mb-3">
              <div>
                <h2 className="text-lg font-bold font-serif tracking-wider text-blue-950 uppercase leading-none">
                  STATE OF OREGON
                </h2>
                <p className="text-[10px] font-mono text-blue-800 tracking-wider uppercase mt-0.5">
                  DRIVER LICENSE • CLASS C
                </p>
              </div>
              <div className="w-6 h-6 rounded-full border border-amber-500 bg-amber-100 flex items-center justify-center text-[10px] text-amber-800 font-bold">
                ★
              </div>
            </div>

            {/* Photo & Biometric Quadrant (Right) + Fields (Left) */}
            <div className="flex gap-4">
              {/* Fields Column matching bboxes: x:60, y:110, 160, 210, 260, 310 */}
              <div className="flex-1 space-y-2 text-xs">
                <div>
                  <p className="text-[9px] font-mono text-zinc-500 uppercase font-bold">1. Name</p>
                  <p className="text-sm font-bold text-zinc-950">DOE, JANE</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-zinc-500 uppercase font-bold">4d. License Number</p>
                  <p className="font-mono text-xs font-bold text-blue-900 tracking-wider">DL-98472918</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[9px] font-mono text-zinc-500 uppercase font-bold">3. Date of Birth</p>
                    <p className="font-mono text-xs font-bold text-zinc-900">1990-05-14</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono text-zinc-500 uppercase font-bold">16. Sex</p>
                    <p className="font-mono text-xs font-bold text-zinc-900">F</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[9px] font-mono text-zinc-500 uppercase font-bold">4a. Issue Date</p>
                    <p className="font-mono text-[11px] text-zinc-700">2020-05-14</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono text-zinc-500 uppercase font-bold">4b. Expire Date</p>
                    <p className="font-mono text-[11px] font-bold text-red-700">2030-05-14</p>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-zinc-500 uppercase font-bold">8. Address</p>
                  <p className="text-[11px] text-zinc-800">742 Evergreen Terrace, Springfield, OR 97477</p>
                </div>
              </div>

              {/* Photo Box */}
              <div className="w-24 shrink-0 flex flex-col items-center">
                <div className="w-24 h-28 border border-zinc-400 bg-zinc-200 rounded-sm flex flex-col items-center justify-center text-zinc-400 relative overflow-hidden">
                  <div className="w-12 h-12 rounded-full bg-zinc-300 mb-1" />
                  <div className="w-16 h-8 rounded-t-full bg-zinc-300" />
                  <div className="absolute inset-0 border-2 border-amber-500/30 pointer-events-none" />
                </div>
                <span className="text-[8px] font-mono text-zinc-400 uppercase mt-1">BIOMETRIC PHOTO</span>
              </div>
            </div>

            {/* Bottom Optical PDF417 Strip */}
            <div className="mt-3 pt-2 border-t border-zinc-300 flex justify-between items-center text-[9px] font-mono text-zinc-500">
              <span>USA • DEPT OF MOTOR VEHICLES</span>
              <span className="tracking-widest">||| ||||||| ||| |||||||| ||||</span>
            </div>
          </div>

          <div className="border-t border-zinc-300 pt-2 text-[10px] font-mono text-zinc-500 flex justify-between">
            <span>SPECIMEN ID: ocr_dl_98472918</span>
            <span>VERIFIED: REAL ID SECURITY STANDARD</span>
          </div>
        </div>
      );
    }

    // 3. CONFIDENTIAL NON-DISCLOSURE AGREEMENT (CONTRACT) SPECIMEN
    if (rawType === "contract") {
      return (
        <div
          className="w-[520px] h-[680px] bg-[#FCFBF8] text-zinc-900 p-8 flex flex-col justify-between font-serif border border-zinc-300 shadow-sm relative overflow-hidden"
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          <div className="space-y-4">
            {/* Title matching bbox: x:50, y:60, w:480, h:36 */}
            <div className="text-center border-b-2 border-zinc-900 pb-3">
              <h1 className="text-lg font-bold tracking-wider text-zinc-950 uppercase">
                CONFIDENTIAL NON-DISCLOSURE AGREEMENT
              </h1>
              <p className="text-xs text-zinc-600 italic mt-0.5">
                Effective Date: October 6, 2026
              </p>
            </div>

            {/* Parties matching bboxes: x:70, y:155 and x:70, y:190 */}
            <div className="text-xs font-sans space-y-2 bg-zinc-50 p-3 border border-zinc-200 rounded-sm">
              <p className="text-[11px] font-serif text-zinc-600 italic">
                This Agreement is entered into between:
              </p>
              <div>
                <p className="font-mono text-[10px] text-zinc-500 uppercase font-bold">Disclosing Party (Party A):</p>
                <p className="font-bold text-zinc-900">Global Dynamics LLC</p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-zinc-500 uppercase font-bold">Receiving Party (Party B):</p>
                <p className="font-bold text-zinc-900">Apex Technologies Inc.</p>
              </div>
            </div>

            {/* Scope / Subject matching bbox: x:50, y:270, w:490, h:32 */}
            <div className="text-xs space-y-2 text-zinc-800 leading-relaxed pt-1">
              <p>
                <strong className="font-sans font-bold">1. Scope of Confidential Information:</strong> The receiving party agrees to safeguard all proprietary algorithms, system source code, and commercial specifications.
              </p>
              <p>
                <strong className="font-sans font-bold">2. Obligations:</strong> The Receiving Party shall hold and maintain the Confidential Information in strictest confidence for the sole benefit of the Disclosing Party.
              </p>
              <p>
                <strong className="font-sans font-bold">3. Term:</strong> This Agreement shall remain in effect for a period of five (5) years terminating on October 6, 2031.
              </p>
            </div>
          </div>

          {/* Signatures & Corporate Seal */}
          <div className="border-t-2 border-zinc-900 pt-4 flex justify-between items-end">
            <div className="space-y-1 text-xs font-sans">
              <div className="w-36 border-b border-zinc-700 pb-1">
                <span className="font-serif italic text-zinc-600 text-sm">Authorized Signature</span>
              </div>
              <p className="font-bold text-zinc-900">Global Dynamics LLC</p>
              <p className="text-[10px] font-mono text-zinc-500">Date: 2026-10-06</p>
            </div>

            <div className="w-16 h-16 rounded-full border-2 border-red-800/80 flex items-center justify-center text-center p-1 text-red-800 text-[8px] font-mono uppercase tracking-tighter rotate-[-12deg]">
              LEGAL EXECUTION SEAL
            </div>

            <div className="space-y-1 text-xs font-sans text-right">
              <div className="w-36 border-b border-zinc-700 pb-1">
                <span className="font-serif italic text-zinc-600 text-sm">Authorized Signature</span>
              </div>
              <p className="font-bold text-zinc-900">Apex Technologies Inc.</p>
              <p className="text-[10px] font-mono text-zinc-500">Date: 2026-10-06</p>
            </div>
          </div>
        </div>
      );
    }

    // 4. MULTI-PAGE CORPORATE REPORT SPECIMEN
    if (rawType === "document") {
      return (
        <div
          className="w-[520px] h-[680px] bg-white text-zinc-900 p-8 flex flex-col justify-between font-sans border border-zinc-300 shadow-sm relative overflow-hidden"
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight font-serif text-zinc-950">
                  QUARTERLY BUSINESS REVIEW
                </h1>
                <p className="text-xs font-mono text-zinc-500 mt-0.5">APEX ANALYTICS GROUP • Q3 2026</p>
              </div>
              <div className="text-right font-mono text-xs">
                <p className="font-bold">PAGE {currentPage} OF 3</p>
                <p className="text-zinc-500">DOC-2026-001</p>
              </div>
            </div>

            {currentPage === 1 && (
              <div className="space-y-4 text-xs">
                <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-sm">
                  <h3 className="font-bold text-zinc-900 mb-1">Executive Summary</h3>
                  <p className="text-zinc-600 leading-relaxed">
                    Operational evaluation for the third quarter reveals marked improvements in document throughput and automated processing accuracy.
                  </p>
                </div>

                <div className="p-4 border border-zinc-800 bg-zinc-900 text-white rounded-sm">
                  <p className="text-[10px] font-mono text-zinc-400 uppercase">Throughput Growth</p>
                  <p className="text-2xl font-bold font-mono text-[var(--signal)] mt-0.5">+35% YOY</p>
                  <p className="text-[11px] text-zinc-300 mt-1">Surpassing target throughput benchmark by 12%.</p>
                </div>
              </div>
            )}

            {currentPage === 2 && (
              <div className="space-y-4 text-xs">
                <h3 className="font-bold text-zinc-900">Financial Performance Target vs Actual</h3>
                <div className="border border-zinc-800 text-xs">
                  <div className="grid grid-cols-3 bg-zinc-100 font-mono font-bold p-2 border-b border-zinc-800">
                    <span>Metric</span>
                    <span className="text-right">Target</span>
                    <span className="text-right">Actual</span>
                  </div>
                  <div className="divide-y divide-zinc-200 font-mono">
                    <div className="grid grid-cols-3 p-2">
                      <span className="font-sans">Revenue</span>
                      <span className="text-right">$1.2M</span>
                      <span className="text-right font-bold text-zinc-900">$1.45M</span>
                    </div>
                    <div className="grid grid-cols-3 p-2">
                      <span className="font-sans">Gross Margin</span>
                      <span className="text-right">75%</span>
                      <span className="text-right font-bold text-zinc-900">79%</span>
                    </div>
                    <div className="grid grid-cols-3 p-2">
                      <span className="font-sans">Active Accounts</span>
                      <span className="text-right">1,200</span>
                      <span className="text-right font-bold text-zinc-900">1,480</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentPage === 3 && (
              <div className="space-y-4 text-xs">
                <h3 className="font-bold text-zinc-900">Compliance & Executive Certification</h3>
                <p className="text-zinc-600 leading-relaxed">
                  The undersigned executive certifies that this Quarterly Business Review report accurately reflects the operational posture and audit controls in place.
                </p>
                <div className="mt-8 pt-8 border-t border-zinc-300 space-y-1">
                  <p className="font-serif italic text-sm text-zinc-700">Chief Operating Officer</p>
                  <p className="font-bold text-zinc-900">Apex Analytics Group</p>
                  <p className="font-mono text-[10px] text-zinc-500">Certified: 2026-10-01</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t-2 border-zinc-900 pt-3 flex justify-between items-center font-mono text-[11px] text-zinc-500">
            <span>CONFIDENTIAL & PROPRIETARY</span>
            <span>AUDIT TRAIL VERIFIED</span>
          </div>
        </div>
      );
    }

    // 5. DEFAULT: NORTHSTAR STUDIO INVOICE (NS-1042)
    return (
      <div
        className="w-[520px] h-[680px] bg-white text-zinc-900 p-8 flex flex-col justify-between font-serif border border-zinc-300 shadow-sm relative overflow-hidden"
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        <div className="space-y-6">
          {/* Header matching bboxes: x:50, y:50, w:200, h:35 and x:380, y:70, w:140, h:28 */}
          <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-serif">NORTHSTAR STUDIO</h1>
              <p className="text-xs font-sans text-zinc-500 mt-0.5">42 Cedar Avenue, Portland, OR 97205</p>
            </div>
            <div className="text-right font-mono text-xs">
              <p className="font-bold text-sm text-zinc-950">NS-1042</p>
              <p className="text-zinc-500">ISSUE: 2026-10-01</p>
              <p className="text-zinc-500">DUE: 2026-10-31</p>
            </div>
          </div>

          {/* Billed To matching bbox: x:50, y:160, w:180, h:28 */}
          <div className="grid grid-cols-2 gap-4 text-xs font-sans">
            <div>
              <p className="font-mono text-[10px] text-zinc-500 uppercase font-semibold">Billed To:</p>
              <p className="font-bold text-zinc-900">Maple & Finch</p>
              <p className="text-zinc-600">Portland, Oregon</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[10px] text-zinc-500 uppercase font-semibold">Payment Terms:</p>
              <p className="font-bold text-zinc-900">Net 30 Days</p>
              <p className="text-zinc-600">USD Direct Deposit</p>
            </div>
          </div>

          {/* Table matching bbox: x:50, y:220, w:480, h:200 */}
          <div className="border border-zinc-800 text-xs font-sans mt-4">
            <div className="grid grid-cols-4 bg-zinc-100 font-mono font-bold p-1.5 border-b border-zinc-800 text-[11px]">
              <span>Description</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Rate</span>
              <span className="text-right">Total</span>
            </div>
            <div className="divide-y divide-zinc-200">
              <div className="grid grid-cols-4 p-1.5">
                <span>Discovery & brand workshop</span>
                <span className="text-center font-mono">8 hrs</span>
                <span className="text-right font-mono">$125.00</span>
                <span className="text-right font-mono font-bold">$1,000.00</span>
              </div>
              <div className="grid grid-cols-4 p-1.5">
                <span>Digital design & implementation</span>
                <span className="text-center font-mono">6 hrs</span>
                <span className="text-right font-mono">$95.00</span>
                <span className="text-right font-mono font-bold">$570.00</span>
              </div>
              <div className="grid grid-cols-4 p-1.5">
                <span>Review & studio handoff</span>
                <span className="text-center font-mono">2 hrs</span>
                <span className="text-right font-mono">$150.00</span>
                <span className="text-right font-mono font-bold">$300.00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Totals matching bbox: x:360, y:440, w:160, h:45 */}
        <div className="border-t-2 border-zinc-900 pt-4 flex justify-between items-center font-mono text-xs">
          <span>SUBTOTAL: $1,870.00 | TAX (0%): $0.00</span>
          <span className="text-base font-bold text-zinc-950">TOTAL: $1,870.00 USD</span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col h-full border border-[var(--line-strong)] rounded-sm bg-[var(--surface-base)] overflow-hidden shadow-card relative registration-mark registration-mark-tl registration-mark-tr registration-mark-bl registration-mark-br">
      {/* Top Light Table Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-[var(--line-hairline)] bg-[var(--surface-subtle)] text-xs font-mono select-none">
        {/* Document Identifier */}
        <div className="flex items-center gap-2 max-w-[240px] sm:max-w-xs truncate">
          <FileText className="w-4 h-4 text-[var(--signal)] shrink-0" />
          <span className="font-semibold text-[var(--ink-primary)] truncate">
            {fileName || "inspection_specimen.pdf"}
          </span>
          {result?.doc_type && (
            <Badge variant="signal" className="text-[10px]">
              {result.doc_type.toUpperCase()}
            </Badge>
          )}
        </div>

        {/* Tracing Layer & View Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Layer Toggles */}
          <div className="hidden sm:flex items-center gap-1 pr-2 border-r border-[var(--line-hairline)]">
            <button
              type="button"
              onClick={() => setShowFieldBboxes(!showFieldBboxes)}
              className={`px-2 py-0.5 rounded-sm text-[11px] border transition-colors ${
                showFieldBboxes
                  ? "bg-[var(--signal-subtle)] border-[var(--signal)] text-[var(--signal)] font-bold"
                  : "bg-[var(--surface-base)] border-[var(--line-hairline)] text-[var(--ink-muted)]"
              }`}
              title="Toggle Field Bounding Boxes"
            >
              Fields
            </button>
            <button
              type="button"
              onClick={() => setShowTextBlocks(!showTextBlocks)}
              className={`px-2 py-0.5 rounded-sm text-[11px] border transition-colors ${
                showTextBlocks
                  ? "bg-[var(--surface-raised)] border-[var(--line-strong)] text-[var(--ink-primary)] font-bold"
                  : "bg-[var(--surface-base)] border-[var(--line-hairline)] text-[var(--ink-muted)]"
              }`}
              title="Toggle Raw Text Blocks"
            >
              Blocks
            </button>
          </div>

          {/* Privacy Blur Toggle */}
          <button
            type="button"
            onClick={() => setPrivacyBlur(!privacyBlur)}
            className={`p-1.5 rounded-sm border transition-colors ${
              privacyBlur
                ? "bg-[var(--semantic-warning-subtle)] border-[var(--semantic-warning)] text-[var(--semantic-warning)]"
                : "border-[var(--line-hairline)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
            }`}
            title={privacyBlur ? "Disable Privacy Blur" : "Enable Privacy Blur (Screen-share protection)"}
            aria-label="Toggle Privacy Blur"
          >
            {privacyBlur ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>

          {/* Multi-Page Navigation */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[var(--surface-base)] border border-[var(--line-hairline)] rounded-sm">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="disabled:opacity-30 hover:text-[var(--signal)]"
                aria-label="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="tabular-nums text-[11px]">
                {currentPage}/{totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="disabled:opacity-30 hover:text-[var(--signal)]"
                aria-label="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 rounded-sm border border-[var(--line-hairline)] hover:bg-[var(--surface-raised)] text-[var(--ink-secondary)]"
              title="Zoom Out (-15%)"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="tabular-nums text-[11px] w-9 text-center font-bold">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 rounded-sm border border-[var(--line-hairline)] hover:bg-[var(--surface-raised)] text-[var(--ink-secondary)]"
              title="Zoom In (+15%)"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1.5 rounded-sm border border-[var(--line-hairline)] hover:bg-[var(--surface-raised)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              title="Reset Zoom to 100%"
              aria-label="Reset zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Light Table Viewport */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center light-table-grid min-h-[460px]">
        <div
          className="relative transition-transform duration-100 ease-out origin-top border border-[var(--line-strong)] bg-white shadow-inspection rounded-sm overflow-hidden"
          style={{
            transform: `scale(${zoom})`,
            maxWidth: "100%",
            filter: privacyBlur ? "blur(8px)" : "none",
          }}
        >
          {previewSource ? (
            <img
              src={previewSource}
              alt={fileName || "Document preview specimen"}
              onError={() => setImgFailed(true)}
              className="block max-w-full h-auto select-none pointer-events-none"
              style={{ maxHeight: "720px" }}
            />
          ) : (
            renderSpecimenCanvas()
          )}

          {/* Tracing-Paper Overlays: Detected Bounding Boxes */}
          {showFieldBboxes && (
            <div className="absolute inset-0 pointer-events-auto">
              {pageFields.map((field, idx) => {
                if (!field.bbox) return null;
                const { x, y, width, height } = field.bbox;
                const isSelected = selectedFieldKey === field.key;
                const isHovered = hoveredFieldKey === field.key;
                const isLowConfidence = field.confidence < 0.85;

                return (
                  <div
                    key={`${field.key}-${idx}`}
                    onClick={() => onSelectField(field.key)}
                    onMouseEnter={() => onHoverField(field.key)}
                    onMouseLeave={() => onHoverField(null)}
                    style={{
                      left: `${x}px`,
                      top: `${y}px`,
                      width: `${width}px`,
                      height: `${height}px`,
                    }}
                    className={`absolute cursor-pointer transition-all duration-150 border rounded-sm flex items-start justify-end p-0.5 select-none
                      ${
                        isSelected
                          ? "border-[var(--signal)] bg-[var(--signal)]/25 ring-2 ring-[var(--signal)] z-30"
                          : isHovered
                          ? "border-[var(--signal)] bg-[var(--signal)]/15 z-20"
                          : "border-[var(--signal)]/70 bg-[var(--signal)]/5 hover:border-[var(--signal)] z-10"
                      }
                      ${isLowConfidence ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(200,90,50,0.15)_3px,rgba(200,90,50,0.15)_6px)]" : ""}
                    `}
                    title={`${field.label}: ${field.value} (${Math.round(field.confidence * 100)}% confidence)`}
                  >
                    <span className="bg-[var(--signal)] text-white text-[9px] font-mono px-1 py-0.2 rounded-sm opacity-90 font-bold leading-none shadow-subtle">
                      {Math.round(field.confidence * 100)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Raw Text Blocks Overlay */}
          {showTextBlocks && (
            <div className="absolute inset-0 pointer-events-none">
              {pageBlocks.map((block, idx) => {
                if (!block.bbox) return null;
                const { x, y, width, height } = block.bbox;
                return (
                  <div
                    key={`block-${idx}`}
                    style={{
                      left: `${x}px`,
                      top: `${y}px`,
                      width: `${width}px`,
                      height: `${height}px`,
                    }}
                    className="absolute border border-[var(--ink-muted)]/40 bg-[var(--surface-raised)]/20 pointer-events-none"
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Accessible Semantic Region Ledger (WCAG 2.2 AA Alternative to Visual Canvas) */}
      <div className="border-t border-[var(--line-strong)] bg-[var(--surface-subtle)] p-3 select-none">
        <div className="flex items-center justify-between pb-1.5">
          <span className="font-mono text-[11px] font-bold text-[var(--ink-secondary)] uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[var(--signal)]" />
            Detected Region Ledger (Accessible Keyboard Navigation)
          </span>
          <span className="text-[11px] font-mono text-[var(--ink-muted)]">
            {pageFields.length} Regions on Page {currentPage}
          </span>
        </div>

        <ol
          className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none"
          role="list"
          aria-label="Detected document regions list"
        >
          {pageFields.map((field) => {
            const isSelected = selectedFieldKey === field.key;
            const isHovered = hoveredFieldKey === field.key;
            return (
              <li
                key={field.key}
                role="listitem"
                tabIndex={0}
                onClick={() => onSelectField(field.key)}
                onFocus={() => {
                  onSelectField(field.key);
                  onHoverField(field.key);
                }}
                onBlur={() => onHoverField(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectField(field.key);
                  }
                }}
                className={`shrink-0 px-2.5 py-1 rounded-sm border text-xs font-mono transition-all cursor-pointer select-none flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] ${
                  isSelected
                    ? "bg-[var(--signal)] text-white border-[var(--signal)] font-bold shadow-subtle"
                    : isHovered
                    ? "bg-[var(--surface-raised)] text-[var(--ink-primary)] border-[var(--signal)]"
                    : "bg-[var(--surface-base)] text-[var(--ink-secondary)] border-[var(--line-hairline)] hover:border-[var(--line-strong)]"
                }`}
              >
                <span>{field.label}:</span>
                <span className="tabular-nums opacity-90">[{Math.round(field.confidence * 100)}%]</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
