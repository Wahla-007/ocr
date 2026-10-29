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

  // Polymorphic Specimen Canvas Renderers matching each specimen in the archive with pixel-perfect coordinate alignment
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
          className="w-[540px] h-[680px] bg-[#FAF9F5] text-zinc-900 border border-zinc-300 shadow-sm relative overflow-hidden font-mono select-none"
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          {/* Jagged thermal tear indicator at top */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-[repeating-linear-gradient(45deg,#FAF9F5,#FAF9F5_4px,#E4E4E7_4px,#E4E4E7_8px)] border-b border-zinc-300" />

          {/* Registration ticks */}
          <span className="absolute top-3 left-4 text-[10px] text-zinc-400 font-mono">+</span>
          <span className="absolute top-3 right-4 text-[10px] text-zinc-400 font-mono">+</span>

          {/* Store Header matching bbox: x:50, y:40, w:320, h:40 */}
          <div style={{ left: 50, top: 40, width: 320, height: 40 }} className="absolute flex flex-col justify-center">
            <h1 className="font-mono font-bold text-lg tracking-wider text-zinc-950 uppercase leading-none">SUPERMARKET METRO</h1>
            <p className="font-mono text-[10px] text-zinc-600 mt-1">Store #849 — 100 Market St, San Francisco, CA</p>
          </div>

          <div style={{ left: 50, top: 92, width: 380 }} className="absolute border-b border-dashed border-zinc-400" />

          {/* Date & Cashier matching bbox: x:50, y:110 and y:145 */}
          <div style={{ left: 50, top: 110, width: 280, height: 28 }} className="absolute flex items-center font-mono text-xs text-zinc-800">
            <span>DATE: 2026-10-06 14:32:01 • REG #04</span>
          </div>

          <div style={{ left: 50, top: 145, width: 190, height: 26 }} className="absolute flex items-center font-mono text-xs text-zinc-800">
            <span>CASHIER: Alex M. • POS-04</span>
          </div>

          <div style={{ left: 50, top: 180, width: 380 }} className="absolute border-b border-dashed border-zinc-400" />

          {/* Receipt Line Items */}
          <div style={{ left: 50, top: 195, width: 380 }} className="absolute text-xs space-y-2 font-mono text-zinc-800">
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

          <div style={{ left: 50, top: 380, width: 380 }} className="absolute border-b border-dashed border-zinc-400" />

          {/* Subtotal, Tax, Total matching bbox: x:50, y:440, 475, 520 */}
          <div style={{ left: 50, top: 440, width: 330, height: 30 }} className="absolute flex items-center justify-between font-mono text-xs text-zinc-800">
            <span>SUBTOTAL</span>
            <span className="font-bold">$33.26</span>
          </div>

          <div style={{ left: 50, top: 475, width: 330, height: 30 }} className="absolute flex items-center justify-between font-mono text-xs text-zinc-800">
            <span>SALES TAX (8.5%)</span>
            <span className="font-bold">$2.83</span>
          </div>

          <div style={{ left: 50, top: 520, width: 330, height: 38 }} className="absolute flex items-center justify-between font-mono text-sm font-bold text-zinc-950 border-t-2 border-zinc-900">
            <span>TOTAL PAID</span>
            <span className="text-base">$36.09 USD</span>
          </div>

          {/* Payment & Barcode Footer */}
          <div style={{ left: 50, top: 575, width: 380 }} className="absolute text-center space-y-1">
            <p className="text-[10px] text-zinc-600 font-mono">
              METHOD: CREDIT CARD (VISA ****8492) • AUTH: 8492026
            </p>
            <div className="flex justify-center items-center gap-0.5 h-6 py-0.5 opacity-80">
              {[3, 1, 4, 1, 2, 5, 2, 1, 4, 2, 3, 1, 5, 2, 3, 1, 2, 4, 1, 3, 2, 4, 1].map((w, i) => (
                <div key={i} className="h-full bg-zinc-900" style={{ width: `${w * 1.5}px` }} />
              ))}
            </div>
            <p className="text-[9px] tracking-widest text-zinc-500 font-mono">REC-849-2026</p>
          </div>
        </div>
      );
    }

    // 2. DRIVER LICENSE / STATE CREDENTIAL SPECIMEN
    if (rawType === "driving_license" || rawType === "id_card") {
      return (
        <div
          className="w-[540px] h-[680px] bg-[#F7F6F2] text-zinc-900 border border-zinc-300 shadow-sm relative overflow-hidden font-sans select-none"
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          {/* Archival Specimen Docket Header */}
          <div style={{ left: 40, top: 20, width: 460 }} className="absolute border-b border-zinc-300 pb-1 flex justify-between items-center text-[10px] font-mono text-zinc-500">
            <span>STATE CREDENTIAL AUDIT SPECIMEN</span>
            <span>STANDARD REAL ID FORMAT</span>
          </div>

          {/* Central ID Card Container */}
          <div style={{ left: 40, top: 50, width: 460, height: 430 }} className="absolute border-2 border-zinc-800 rounded-lg bg-gradient-to-br from-blue-50/60 via-white to-amber-50/50 shadow-md overflow-hidden">
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:8px_8px]" />

            {/* State Top Banner */}
            <div className="px-5 pt-3 pb-2 border-b-2 border-blue-900 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold font-serif tracking-wider text-blue-950 uppercase leading-none">
                  STATE OF OREGON
                </h2>
                <p className="text-[9px] font-mono text-blue-800 tracking-wider uppercase mt-0.5">
                  DRIVER LICENSE • CLASS C
                </p>
              </div>
              <div className="w-5 h-5 rounded-full border border-amber-500 bg-amber-100 flex items-center justify-center text-[10px] text-amber-800 font-bold">
                ★
              </div>
            </div>
          </div>

          {/* Fields positioned with EXACT coordinate matching to bboxes */}
          {/* Name: x:60, y:110, w:320, h:40 */}
          <div style={{ left: 60, top: 110, width: 320, height: 40 }} className="absolute flex flex-col justify-center">
            <span className="text-[9px] font-mono text-zinc-500 uppercase font-bold">1. LN: DOE  2. FN: JANE</span>
            <span className="text-sm font-bold text-zinc-950 leading-tight">DOE, JANE</span>
          </div>

          {/* Photo Box: left: 390, top: 110, width: 95, height: 130 */}
          <div style={{ left: 390, top: 110, width: 95, height: 130 }} className="absolute border border-zinc-400 bg-zinc-200 rounded-sm flex flex-col items-center justify-center text-zinc-400 shadow-inner">
            <div className="w-10 h-10 rounded-full bg-zinc-300 mb-1" />
            <div className="w-14 h-7 rounded-t-full bg-zinc-300" />
            <span className="text-[7px] font-mono text-zinc-500 uppercase mt-1">BIOMETRIC</span>
          </div>

          {/* License Number: x:60, y:160, w:320, h:40 */}
          <div style={{ left: 60, top: 160, width: 320, height: 40 }} className="absolute flex flex-col justify-center">
            <span className="text-[9px] font-mono text-zinc-500 uppercase font-bold">{rawType === "id_card" ? "4d. IDENTITY NUMBER" : "4d. LICENSE NUMBER"}</span>
            <span className="font-mono text-sm font-bold text-blue-900 tracking-wider">{rawType === "id_card" ? "ID-98472918" : "DL-98472918"}</span>
          </div>

          {/* Date of Birth: x:60, y:210, w:300, h:38 */}
          <div style={{ left: 60, top: 210, width: 300, height: 38 }} className="absolute flex flex-col justify-center">
            <span className="text-[9px] font-mono text-zinc-500 uppercase font-bold">3. DATE OF BIRTH</span>
            <span className="font-mono text-xs font-bold text-zinc-900">1990-05-14</span>
          </div>

          {/* License Class (for DL) or Expiration (for ID): x:60, y:260, w:300, h:38 */}
          <div style={{ left: 60, top: 260, width: 300, height: 38 }} className="absolute flex flex-col justify-center">
            {rawType === "id_card" ? (
              <>
                <span className="text-[9px] font-mono text-zinc-500 uppercase font-bold">4b. EXPIRATION DATE</span>
                <span className="font-mono text-xs font-bold text-red-700">2030-05-14</span>
              </>
            ) : (
              <>
                <span className="text-[9px] font-mono text-zinc-500 uppercase font-bold">9. CLASS</span>
                <span className="font-mono text-xs font-bold text-zinc-900">CLASS C — OPERATOR</span>
              </>
            )}
          </div>

          {/* Expiration (for DL) or Nationality (for ID): x:60, y:310, w:300, h:38 */}
          <div style={{ left: 60, top: 310, width: 300, height: 38 }} className="absolute flex flex-col justify-center">
            {rawType === "id_card" ? (
              <>
                <span className="text-[9px] font-mono text-zinc-500 uppercase font-bold">15. NATIONALITY</span>
                <span className="font-mono text-xs font-bold text-zinc-900">USA</span>
              </>
            ) : (
              <>
                <span className="text-[9px] font-mono text-zinc-500 uppercase font-bold">4b. EXPIRATION DATE</span>
                <span className="font-mono text-xs font-bold text-red-700">2030-05-14 • 4a. ISS: 2020-05-14</span>
              </>
            )}
          </div>

          {/* Address */}
          <div style={{ left: 60, top: 355, width: 420, height: 30 }} className="absolute flex flex-col justify-center">
            <span className="text-[9px] font-mono text-zinc-500 uppercase font-bold">8. RESIDENCE ADDRESS</span>
            <span className="text-xs text-zinc-800">742 Evergreen Terrace, Springfield, OR 97477</span>
          </div>

          {/* Barcode strip */}
          <div style={{ left: 60, top: 410, width: 420 }} className="absolute pt-2 border-t border-zinc-300 flex justify-between items-center text-[8px] font-mono text-zinc-500">
            <span>USA • DEPT OF MOTOR VEHICLES</span>
            <span className="tracking-widest">||| ||||||| ||| |||||||| |||| |||||| ||||||||</span>
          </div>

          {/* Footer note */}
          <div style={{ left: 40, top: 500, width: 460 }} className="absolute border-t border-zinc-300 pt-2 text-[10px] font-mono text-zinc-500 flex justify-between">
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
          className="w-[540px] h-[680px] bg-[#FCFBF8] text-zinc-900 border border-zinc-300 shadow-sm relative overflow-hidden font-serif select-none"
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          {/* Archival Specimen Docket Header */}
          <div style={{ left: 40, top: 20, width: 460 }} className="absolute border-b border-zinc-300 pb-1 flex justify-between items-center text-[10px] font-mono text-zinc-500">
            <span>LEGAL DOCKET ARCHIVE SPECIMEN</span>
            <span>AGREEMENT REF: NDA-2026-088</span>
          </div>

          {/* Title matching bbox: x:50, y:60, w:440, h:36 */}
          <div style={{ left: 50, top: 60, width: 440, height: 36 }} className="absolute flex items-center justify-center text-center">
            <h1 className="text-base font-bold tracking-wider text-zinc-950 uppercase leading-none">
              CONFIDENTIAL NON-DISCLOSURE AGREEMENT
            </h1>
          </div>

          <div style={{ left: 50, top: 102, width: 440 }} className="absolute border-b-2 border-zinc-900" />

          {/* Effective Date matching bbox: x:50, y:120, w:440, h:28 */}
          <div style={{ left: 50, top: 120, width: 440, height: 28 }} className="absolute flex items-center justify-center font-serif text-xs italic text-zinc-700">
            <span>Effective Date: October 6, 2026</span>
          </div>

          {/* Party A matching bbox: x:70, y:155, w:340, h:28 */}
          <div style={{ left: 70, top: 155, width: 340, height: 28 }} className="absolute flex items-center text-xs font-sans">
            <span className="font-mono text-[10px] text-zinc-500 uppercase font-bold mr-1.5">Party A (Disclosing):</span>
            <span className="font-bold text-zinc-900">Global Dynamics LLC</span>
          </div>

          {/* Party B matching bbox: x:70, y:190, w:350, h:28 */}
          <div style={{ left: 70, top: 190, width: 350, height: 28 }} className="absolute flex items-center text-xs font-sans">
            <span className="font-mono text-[10px] text-zinc-500 uppercase font-bold mr-1.5">Party B (Receiving):</span>
            <span className="font-bold text-zinc-900">Apex Technologies Inc.</span>
          </div>

          <div style={{ left: 50, top: 228, width: 440 }} className="absolute border-b border-zinc-200" />

          {/* Scope / Subject matching bbox: x:50, y:270, w:440, h:32 */}
          <div style={{ left: 50, top: 270, width: 440, height: 32 }} className="absolute flex items-center text-xs text-zinc-800 leading-snug">
            <span><strong className="font-sans font-bold">1. Scope:</strong> Proprietary algorithms and confidential source code.</span>
          </div>

          {/* Clauses 2 & 3 */}
          <div style={{ left: 50, top: 315, width: 440 }} className="absolute text-xs space-y-2 text-zinc-700 leading-relaxed">
            <p>
              <strong className="font-sans font-bold">2. Non-Disclosure Obligations:</strong> The Receiving Party shall hold and maintain the Confidential Information in strictest confidence for the benefit of the Disclosing Party.
            </p>
            <p>
              <strong className="font-sans font-bold">3. Term:</strong> This Agreement shall remain in effect for five (5) years terminating October 6, 2031.
            </p>
          </div>

          {/* Execution Signatures & Stamp */}
          <div style={{ left: 50, top: 480, width: 440 }} className="absolute border-t-2 border-zinc-900 pt-4 flex justify-between items-end">
            <div className="space-y-1 text-xs font-sans">
              <div className="w-32 border-b border-zinc-700 pb-1">
                <span className="font-serif italic text-zinc-600 text-xs">Auth. Officer</span>
              </div>
              <p className="font-bold text-zinc-900">Global Dynamics LLC</p>
              <p className="text-[9px] font-mono text-zinc-500">Date: 2026-10-06</p>
            </div>

            <div className="w-16 h-16 rounded-full border-2 border-red-800/80 flex items-center justify-center text-center p-1 text-red-800 text-[8px] font-mono uppercase tracking-tighter rotate-[-12deg]">
              LEGAL EXECUTION SEAL
            </div>

            <div className="space-y-1 text-xs font-sans text-right">
              <div className="w-32 border-b border-zinc-700 pb-1">
                <span className="font-serif italic text-zinc-600 text-xs">Auth. Officer</span>
              </div>
              <p className="font-bold text-zinc-900">Apex Technologies Inc.</p>
              <p className="text-[9px] font-mono text-zinc-500">Date: 2026-10-06</p>
            </div>
          </div>
        </div>
      );
    }

    // 4. MULTI-PAGE CORPORATE REPORT SPECIMEN
    if (rawType === "document") {
      return (
        <div
          className="w-[540px] h-[680px] bg-white text-zinc-900 border border-zinc-300 shadow-sm relative overflow-hidden font-sans select-none"
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          {/* Header Bar */}
          <div style={{ left: 50, top: 25, width: 440 }} className="absolute flex justify-between items-center border-b border-zinc-300 pb-2 text-[10px] font-mono text-zinc-500">
            <span>DOC-2026-001 • AUDIT REPORT</span>
            <span>PAGE {currentPage} OF 3</span>
          </div>

          {currentPage === 1 && (
            <>
              {/* Title matching bbox: x:70, y:70, w:400, h:38 */}
              <div style={{ left: 70, top: 70, width: 400, height: 38 }} className="absolute flex flex-col justify-center">
                <h1 className="text-lg font-serif font-bold text-zinc-950 leading-tight">QUARTERLY BUSINESS REVIEW — Q3 2026</h1>
                <p className="text-[10px] font-mono text-zinc-500 mt-0.5">APEX ANALYTICS GROUP • OPERATIONAL POSTURE</p>
              </div>

              {/* Narrative Box */}
              <div style={{ left: 70, top: 120, width: 400 }} className="absolute bg-zinc-50 p-3 border border-zinc-200 rounded-sm text-xs text-zinc-600 leading-relaxed">
                <h3 className="font-bold text-zinc-900 text-xs mb-1">Executive Summary</h3>
                <p>Operational evaluation for the third quarter reveals marked improvements in document throughput and automated processing accuracy.</p>
              </div>

              {/* Throughput metric matching bbox: x:70, y:170, w:400, h:32 */}
              <div style={{ left: 70, top: 170, width: 400, height: 32 }} className="absolute flex items-center justify-between font-mono text-xs font-bold text-zinc-900 border-b border-zinc-300 pb-1">
                <span>Throughput Growth:</span>
                <span className="text-sm font-bold text-[#C85A32]">+35% YOY</span>
              </div>

              <div style={{ left: 70, top: 220, width: 400 }} className="absolute p-4 border border-zinc-800 bg-zinc-900 text-white rounded-sm text-xs">
                <p className="text-[10px] font-mono text-zinc-400 uppercase">Quarterly Processing Benchmark</p>
                <p className="text-xl font-bold font-mono text-[#C85A32] mt-0.5">Surpassing Benchmark by 12%</p>
                <p className="text-[11px] text-zinc-300 mt-1">Audit integrity verified across 4,800 sample batches.</p>
              </div>
            </>
          )}

          {currentPage === 2 && (
            <>
              {/* Page 2 Title */}
              <div style={{ left: 70, top: 45, width: 400 }} className="absolute">
                <h2 className="text-sm font-bold text-zinc-900">Financial Performance: Target vs Actual</h2>
                <p className="text-[10px] font-mono text-zinc-500">Q3 2026 CONSOLIDATED BALANCE</p>
              </div>

              {/* Table at left: 70, top: 90, width: 400, height: 160 */}
              <div style={{ left: 70, top: 90, width: 400, height: 160 }} className="absolute border border-zinc-800 text-xs">
                <div className="grid grid-cols-3 bg-zinc-100 font-mono font-bold p-1.5 border-b border-zinc-800 text-[11px]">
                  <span>Metric</span>
                  <span className="text-right">Target</span>
                  <span className="text-right">Actual</span>
                </div>
                <div className="divide-y divide-zinc-200 font-mono text-xs">
                  {/* Row 1 matching bbox: x:70, y:125, w:400, h:28 */}
                  <div style={{ height: 28 }} className="grid grid-cols-3 px-1.5 items-center">
                    <span className="font-sans">Revenue</span>
                    <span className="text-right">$1.2M</span>
                    <span className="text-right font-bold text-zinc-900">$1.45M</span>
                  </div>
                  {/* Row 2 matching bbox: x:70, y:155, w:400, h:28 */}
                  <div style={{ height: 28 }} className="grid grid-cols-3 px-1.5 items-center">
                    <span className="font-sans">Gross Margin</span>
                    <span className="text-right">75%</span>
                    <span className="text-right font-bold text-zinc-900">79%</span>
                  </div>
                  <div style={{ height: 28 }} className="grid grid-cols-3 px-1.5 items-center">
                    <span className="font-sans">Active Accounts</span>
                    <span className="text-right">1,200</span>
                    <span className="text-right font-bold text-zinc-900">1,480</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {currentPage === 3 && (
            <>
              {/* Page 3 Compliance */}
              <div style={{ left: 70, top: 60, width: 400 }} className="absolute space-y-3 text-xs">
                <h3 className="font-bold text-zinc-900 text-sm">Compliance & Executive Certification</h3>
                <p className="text-zinc-600 leading-relaxed">
                  The undersigned executive certifies that this Quarterly Business Review report accurately reflects the operational posture and audit controls in place.
                </p>
              </div>

              {/* Certified By matching bbox: x:70, y:130, w:400, h:30 */}
              <div style={{ left: 70, top: 130, width: 400, height: 30 }} className="absolute flex items-center justify-between border-b border-zinc-400 pb-1 text-xs">
                <span className="font-serif italic text-zinc-700">Chief Operating Officer</span>
                <span className="font-mono text-[10px] text-zinc-500">Certified: 2026-10-01</span>
              </div>

              <div style={{ left: 70, top: 175, width: 400 }} className="absolute text-xs text-zinc-800">
                <p className="font-bold">Apex Analytics Group</p>
                <p className="text-[10px] font-mono text-zinc-500">Ledger checksum verified: 0x84fa92e1</p>
              </div>
            </>
          )}

          <div style={{ left: 50, top: 620, width: 440 }} className="absolute border-t-2 border-zinc-900 pt-2 flex justify-between items-center font-mono text-[10px] text-zinc-500">
            <span>CONFIDENTIAL & PROPRIETARY</span>
            <span>AUDIT TRAIL VERIFIED</span>
          </div>
        </div>
      );
    }

    // 5. DEFAULT: NORTHSTAR STUDIO INVOICE (NS-1042)
    return (
      <div
        className="w-[540px] h-[680px] bg-white text-zinc-900 border border-zinc-300 shadow-sm relative overflow-hidden font-serif select-none"
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {/* Header: supplier_name matching bbox: x:50, y:50, w:200, h:35 */}
        <div style={{ left: 50, top: 50, width: 200, height: 35 }} className="absolute flex flex-col justify-center">
          <h1 className="font-serif font-bold text-lg leading-none text-zinc-950 tracking-tight">NORTHSTAR STUDIO</h1>
          <p className="text-[10px] font-sans text-zinc-500 mt-1">42 Cedar Ave, Portland, OR 97205</p>
        </div>

        {/* Invoice Number: invoice_number matching bbox: x:380, y:70, w:140, h:28 */}
        <div style={{ left: 380, top: 70, width: 140, height: 28 }} className="absolute flex items-center justify-end font-mono">
          <span className="font-bold text-sm text-zinc-950">NS-1042</span>
        </div>

        {/* Header divider rule */}
        <div style={{ left: 50, top: 98, width: 470 }} className="absolute border-b-2 border-zinc-900" />

        {/* Issue Date matching bbox: x:380, y:110, w:140, h:24 */}
        <div style={{ left: 380, top: 110, width: 140, height: 24 }} className="absolute flex items-center justify-end font-mono text-xs text-zinc-800">
          <span>ISSUE: 2026-10-01</span>
        </div>

        {/* Due Date matching bbox: x:380, y:140, w:140, h:24 */}
        <div style={{ left: 380, top: 140, width: 140, height: 24 }} className="absolute flex items-center justify-end font-mono text-xs text-zinc-800">
          <span>DUE: 2026-10-31</span>
        </div>

        {/* Billed To label */}
        <div style={{ left: 50, top: 142 }} className="absolute font-mono text-[10px] text-zinc-500 uppercase font-semibold">
          BILLED TO:
        </div>

        {/* Buyer Name: buyer_name matching bbox: x:50, y:160, w:180, h:28 */}
        <div style={{ left: 50, top: 160, width: 180, height: 28 }} className="absolute flex flex-col justify-center font-sans">
          <span className="font-bold text-xs text-zinc-900 leading-none">Maple & Finch</span>
          <span className="text-[11px] text-zinc-600">Portland, Oregon</span>
        </div>

        {/* Payment Terms on the right */}
        <div style={{ left: 360, top: 175, width: 160 }} className="absolute flex flex-col items-end text-right font-sans text-xs">
          <span className="font-mono text-[9px] text-zinc-400 uppercase font-bold">PAYMENT TERMS:</span>
          <span className="font-bold text-zinc-800">Net 30 Days</span>
          <span className="text-[10px] text-zinc-500">USD Direct Deposit</span>
        </div>

        {/* Table matching bbox: x:50, y:220, w:470, h:200 */}
        <div style={{ left: 50, top: 220, width: 470, height: 200 }} className="absolute border border-zinc-800 text-xs font-sans overflow-hidden">
          <div className="grid grid-cols-4 bg-zinc-100 font-mono font-bold p-1.5 border-b border-zinc-800 text-[11px]">
            <span>Description</span>
            <span className="text-center">Qty</span>
            <span className="text-right">Rate</span>
            <span className="text-right">Total</span>
          </div>
          <div className="divide-y divide-zinc-200">
            <div className="grid grid-cols-4 p-2 items-center">
              <span>Discovery & brand workshop</span>
              <span className="text-center font-mono">8 hrs</span>
              <span className="text-right font-mono">$125.00</span>
              <span className="text-right font-mono font-bold">$1,000.00</span>
            </div>
            <div className="grid grid-cols-4 p-2 items-center">
              <span>Digital design & implementation</span>
              <span className="text-center font-mono">6 hrs</span>
              <span className="text-right font-mono">$95.00</span>
              <span className="text-right font-mono font-bold">$570.00</span>
            </div>
            <div className="grid grid-cols-4 p-2 items-center">
              <span>Review & studio handoff</span>
              <span className="text-center font-mono">2 hrs</span>
              <span className="text-right font-mono">$150.00</span>
              <span className="text-right font-mono font-bold">$300.00</span>
            </div>
          </div>
        </div>

        {/* Totals section */}
        <div style={{ left: 50, top: 440, width: 280 }} className="absolute font-mono text-xs text-zinc-600 flex items-center h-[45px]">
          <span>SUBTOTAL: $1,870.00 | TAX (0%): $0.00</span>
        </div>

        {/* Total Amount matching bbox: x:360, y:440, w:160, h:45 */}
        <div style={{ left: 360, top: 440, width: 160, height: 45 }} className="absolute flex flex-col items-end justify-center font-mono">
          <span className="text-[10px] text-zinc-500 uppercase font-bold">TOTAL DUE</span>
          <span className="text-base font-bold text-zinc-950">$1,870.00 USD</span>
        </div>

        {/* Bottom divider and footer */}
        <div style={{ left: 50, top: 510, width: 470 }} className="absolute border-t border-zinc-300 pt-3 flex justify-between items-center font-mono text-[10px] text-zinc-500">
          <span>PROJECT: AUTUMN BRAND LAUNCH</span>
          <span>DOCUMENT CHECKSUM: 0x6D5231</span>
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
              onClick={() => setShowTableBboxes(!showTableBboxes)}
              className={`px-2 py-0.5 rounded-sm text-[11px] border transition-colors ${
                showTableBboxes
                  ? "bg-blue-50 border-blue-600 text-blue-700 font-bold"
                  : "bg-[var(--surface-base)] border-[var(--line-hairline)] text-[var(--ink-muted)]"
              }`}
              title="Toggle Table Bounding Boxes"
            >
              Tables
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

          {/* Tracing-Paper Overlays: Detected Bounding Boxes (Bold High-Contrast Terracotta) */}
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
                    className={`absolute cursor-pointer transition-all duration-150 rounded-sm select-none
                      ${
                        isSelected
                          ? "border-2 border-[#B24E2A] bg-[#C85A32]/35 ring-3 ring-[#C85A32] shadow-[0_0_12px_rgba(200,90,50,0.5)] z-30"
                          : isHovered
                          ? "border-2 border-[#C85A32] bg-[#C85A32]/25 ring-2 ring-[#C85A32]/60 shadow-[0_0_8px_rgba(200,90,50,0.3)] z-20"
                          : "border-2 border-[#C85A32] bg-[#C85A32]/12 hover:border-[#B24E2A] hover:bg-[#C85A32]/25 shadow-[0_0_0_1px_rgba(200,90,50,0.2)] z-10"
                      }
                      ${isLowConfidence ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(200,90,50,0.2)_3px,rgba(200,90,50,0.2)_6px)]" : ""}
                    `}
                    title={`${field.label}: ${field.value}`}
                  />
                );
              })}
            </div>
          )}

          {/* Table Bounding Boxes Overlay */}
          {showTableBboxes && (
            <div className="absolute inset-0 pointer-events-none">
              {(result?.tables || []).filter(t => t.bbox && (t.page === undefined || t.page === currentPage)).map((table, idx) => {
                if (!table.bbox) return null;
                const { x, y, width, height } = table.bbox;
                return (
                  <div
                    key={`tbl-${idx}`}
                    style={{
                      left: `${x}px`,
                      top: `${y}px`,
                      width: `${width}px`,
                      height: `${height}px`,
                    }}
                    className="absolute border-2 border-dashed border-[#1D5E99] bg-[#1D5E99]/5 rounded-sm pointer-events-none z-10"
                  >
                    <span className="bg-[#1D5E99] text-white text-[9px] font-mono px-1 py-0.5 rounded-sm font-bold float-right shadow-sm">
                      TABLE
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
                <span className="font-medium text-[var(--ink-primary)] truncate max-w-[140px]">{String(field.value)}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
