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

  const previewSource =
    result?.preview_image ||
    uploadedPreviewUrl;

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
              className="block max-w-full h-auto select-none pointer-events-none"
              style={{ maxHeight: "720px" }}
            />
          ) : (
            /* Fallback Clean Specimen Canvas */
            <div
              className="w-[520px] h-[680px] bg-white text-zinc-900 p-8 flex flex-col justify-between font-serif border border-zinc-300"
              style={{ fontFeatureSettings: '"tnum"' }}
            >
              <div className="space-y-6">
                <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-4">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">COMMERCIAL INVOICE</h1>
                    <p className="text-xs font-mono text-zinc-500 mt-0.5">ACME LOGISTICS & ROBOTICS LTD.</p>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <p className="font-bold">INV-2026-4092</p>
                    <p className="text-zinc-500">DATE: 2026-10-24</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                  <div>
                    <p className="font-mono text-[10px] text-zinc-500 uppercase font-semibold">Billed To:</p>
                    <p className="font-bold">Atlas Defense Systems Inc.</p>
                    <p className="text-zinc-600">800 Technical Parkway, Suite 400</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[10px] text-zinc-500 uppercase font-semibold">Payment Terms:</p>
                    <p className="font-bold">Net 30 Days</p>
                    <p className="text-zinc-600">Due: 2026-11-24</p>
                  </div>
                </div>

                {/* Table Simulation */}
                <div className="border border-zinc-800 text-xs font-sans mt-4">
                  <div className="grid grid-cols-4 bg-zinc-100 font-mono font-bold p-1.5 border-b border-zinc-800 text-[11px]">
                    <span>Item</span>
                    <span className="text-center">Qty</span>
                    <span className="text-right">Rate</span>
                    <span className="text-right">Total</span>
                  </div>
                  <div className="divide-y divide-zinc-200">
                    <div className="grid grid-cols-4 p-1.5">
                      <span>Precision Optical Sensors</span>
                      <span className="text-center font-mono">10</span>
                      <span className="text-right font-mono">$450.00</span>
                      <span className="text-right font-mono font-bold">$4,500.00</span>
                    </div>
                    <div className="grid grid-cols-4 p-1.5">
                      <span>Linear Stepper Actuators</span>
                      <span className="text-center font-mono">4</span>
                      <span className="text-right font-mono">$300.00</span>
                      <span className="text-right font-mono font-bold">$1,200.00</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t-2 border-zinc-900 pt-4 flex justify-between items-center font-mono text-xs">
                <span>SUBTOTAL: $5,700.00 | TAX (8%): $456.00</span>
                <span className="text-base font-bold text-zinc-900">TOTAL: $6,156.00 USD</span>
              </div>
            </div>
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
