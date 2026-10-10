"use client";

import React, { useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers,
} from "lucide-react";
import { ExtractionResult, ExtractedField, ParsedBlock } from "../lib/types";

interface DocumentViewerProps {
  fileName: string;
  result: ExtractionResult | null;
  selectedFieldKey: string | null;
  onSelectField: (key: string | null) => void;
  hoveredFieldKey: string | null;
  onHoverField: (key: string | null) => void;
}

export function DocumentViewer({
  fileName,
  result,
  selectedFieldKey,
  onSelectField,
  hoveredFieldKey,
  onHoverField,
}: DocumentViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [showBboxes, setShowBboxes] = useState(true);
  const [showAllOcrBlocks, setShowAllOcrBlocks] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredBlockIndex, setHoveredBlockIndex] = useState<number | null>(null);

  const totalPages = result?.page_count || 1;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.15, 2.0));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.15, 0.6));
  const handleResetZoom = () => setZoom(1);

  // Filter fields on current page that have bboxes
  const fieldList = Array.isArray(result?.fields)
    ? result.fields
    : (result?.raw_fields || []);
  const pageFields =
    fieldList.filter(
      (f) => f.bbox && (f.page === undefined || f.page === currentPage)
    ) || [];

  // Filter OCR raw blocks on current page
  const pageBlocks =
    result?.blocks?.filter(
      (b) => b.bbox && (b.page === undefined || b.page === currentPage)
    ) || [];

  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number } | null>(null);

  const pageSize =
    result?.page_sizes?.find((p) => p.page === currentPage) ||
    result?.page_sizes?.[0];
  const baseWidth = naturalDimensions?.width || pageSize?.width || 595;
  const baseHeight = naturalDimensions?.height || pageSize?.height || 842;
  const aspectRatio = baseWidth / Math.max(1, baseHeight);

  const hasPreviewImage = Boolean(result?.preview_image);

  return (
    <div className="flex flex-col h-auto bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Viewer Header / Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-950/60 text-xs">
        <div className="flex items-center gap-2 truncate">
          <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-white truncate max-w-[200px] sm:max-w-[280px]">
            {fileName || "Document Preview"}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 shrink-0">
            {result?.doc_type ? result.doc_type.toUpperCase() : "RAW"}
          </span>
          {hasPreviewImage && (
            <span className="hidden sm:inline px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
              REAL OCR CANVAS
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Page navigation */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 mr-1 text-slate-300">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage <= 1}
                className="disabled:opacity-30 hover:text-white"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono px-1">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="disabled:opacity-30 hover:text-white"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Toggle All OCR Blocks vs Fields only */}
          {pageBlocks.length > 0 && (
            <button
              onClick={() => setShowAllOcrBlocks((b) => !b)}
              className={`p-1.5 rounded-lg border text-[11px] flex items-center gap-1 transition-colors ${
                showAllOcrBlocks
                  ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
              title={showAllOcrBlocks ? "Hide OCR Line Boxes" : "Show All OCR Line Boxes"}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden md:inline font-mono text-[10px]">OCR Lines</span>
            </button>
          )}

          {/* Bbox toggle */}
          <button
            onClick={() => setShowBboxes((b) => !b)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showBboxes
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
            title={showBboxes ? "Hide Bounding Boxes" : "Show Bounding Boxes"}
          >
            {showBboxes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          {/* Zoom Controls */}
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-slate-400 w-9 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="overflow-auto p-3 sm:p-4 flex flex-col items-center justify-start bg-slate-950/40 select-none">
        <div
          className="transition-transform duration-150 origin-top max-w-full w-full flex justify-center"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Document Sheet Canvas */}
          <div
            className={`relative rounded-lg shadow-xl overflow-hidden transition-all duration-150 ${
              hasPreviewImage
                ? "bg-transparent border border-slate-700/50"
                : "bg-transparent border-0"
            }`}
            style={{
              width: "100%",
              maxWidth: hasPreviewImage ? `${Math.min(baseWidth, 640)}px` : "620px",
              height: "auto",
              padding: "0px",
            }}
          >
            {/* Visual Document Content Representation */}
            {hasPreviewImage && result?.preview_image ? (
              <div className="relative w-full block">
                <img
                  src={result.preview_image}
                  alt={fileName}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) {
                      setNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                    }
                  }}
                  className="w-full h-auto block select-none pointer-events-none rounded-lg"
                />
              </div>
            ) : (
              renderDocumentPreview(fileName, result, currentPage)
            )}

            {/* All OCR Text Line Bboxes (Cyan Overlay) */}
            {showBboxes &&
              showAllOcrBlocks &&
              pageBlocks.map((block, idx) => {
                const bbox = block.bbox!;
                const isHovered = hoveredBlockIndex === idx;

                const leftPct = (bbox.x / baseWidth) * 100;
                const topPct = (bbox.y / baseHeight) * 100;
                const widthPct = (bbox.width / baseWidth) * 100;
                const heightPct = (bbox.height / baseHeight) * 100;

                return (
                  <div
                    key={`ocr-block-${idx}`}
                    onMouseEnter={() => setHoveredBlockIndex(idx)}
                    onMouseLeave={() => setHoveredBlockIndex(null)}
                    style={{
                      left: hasPreviewImage ? `${leftPct}%` : `${bbox.x}px`,
                      top: hasPreviewImage ? `${topPct}%` : `${bbox.y}px`,
                      width: hasPreviewImage ? `${widthPct}%` : `${bbox.width}px`,
                      height: hasPreviewImage ? `${heightPct}%` : `${bbox.height}px`,
                    }}
                    className={`absolute cursor-pointer transition-all rounded-[2px] border pointer-events-auto z-10 ${
                      isHovered
                        ? "border-cyan-400 bg-cyan-400/25 ring-2 ring-cyan-300 z-30"
                        : "border-sky-500/40 bg-sky-500/10 hover:border-cyan-400 hover:bg-cyan-400/20"
                    }`}
                  >
                    {/* Tooltip with recognized OCR text */}
                    {isHovered && (
                      <div className="absolute -top-7 left-0 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-cyan-300 border border-cyan-500/50 whitespace-nowrap shadow-xl z-40 pointer-events-none">
                        "{block.text}" ({Math.round(block.confidence * 100)}%)
                      </div>
                    )}
                  </div>
                );
              })}

            {/* Semantic Field Bounding Box Overlays (Emerald Highlight) */}
            {showBboxes &&
              pageFields.map((field) => {
                const bbox = field.bbox!;
                const isSelected = selectedFieldKey === field.key;
                const isHovered = hoveredFieldKey === field.key;
                const isActive = isSelected || isHovered;

                const leftPct = (bbox.x / baseWidth) * 100;
                const topPct = (bbox.y / baseHeight) * 100;
                const widthPct = (bbox.width / baseWidth) * 100;
                const heightPct = (bbox.height / baseHeight) * 100;

                return (
                  <div
                    key={`field-${field.key}`}
                    onClick={() => onSelectField(field.key)}
                    onMouseEnter={() => onHoverField(field.key)}
                    onMouseLeave={() => onHoverField(null)}
                    style={{
                      left: hasPreviewImage ? `${leftPct}%` : `${bbox.x}px`,
                      top: hasPreviewImage ? `${topPct}%` : `${bbox.y}px`,
                      width: hasPreviewImage ? `${widthPct}%` : `${bbox.width}px`,
                      height: hasPreviewImage ? `${heightPct}%` : `${bbox.height}px`,
                    }}
                    className={`absolute cursor-pointer transition-all rounded-[3px] border z-20 ${
                      isActive
                        ? "border-emerald-500 bg-emerald-500/30 ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/40 scale-[1.02] z-30"
                        : "border-emerald-500/70 bg-emerald-500/15 hover:border-emerald-400 hover:bg-emerald-500/25"
                    }`}
                  >
                    {/* Bbox Badge Tooltip */}
                    <div
                      className={`absolute -top-6 left-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold whitespace-nowrap shadow-md pointer-events-none transition-opacity ${
                        isActive
                          ? "bg-slate-950 text-emerald-400 border border-emerald-500/40 opacity-100 z-30"
                          : "opacity-0"
                      }`}
                    >
                      {field.label || field.key}: {String(field.value)} (
                      {Math.round(field.confidence * 100)}%)
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

function renderDocumentPreview(
  fileName: string,
  result: ExtractionResult | null,
  page: number
) {
  const docType = (result?.document_type || result?.detected_type || result?.doc_type || "document").toUpperCase();
  const rawText = result?.text || result?.raw_text || result?.markdown || "";
  const lines = rawText.split("\n").filter((l) => l.trim().length > 0);

  return (
    <div className="bg-[#0b0f17] text-slate-200 p-5 sm:p-6 rounded-xl font-mono text-xs flex flex-col justify-between shadow-xl border border-slate-800/90 max-w-2xl mx-auto min-h-[380px]">
      <div className="space-y-4">
        {/* Document Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-slate-800 text-slate-300 border border-slate-700/60">
              {docType}
            </span>
            <span className="text-[11px] text-slate-400 font-sans truncate max-w-[240px]">
              {fileName || "Document Stream"}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            PAGE {page}
          </span>
        </div>

        {/* Real Document Content Stream */}
        {lines.length > 0 ? (
          <div className="space-y-1 py-2 font-mono text-xs leading-relaxed overflow-x-auto text-slate-300">
            {lines.map((line, idx) => (
              <div key={idx} className="flex gap-3 hover:bg-slate-900/60 px-1.5 py-0.5 rounded">
                <span className="text-slate-600 select-none text-[10px] w-6 text-right shrink-0 pt-0.5">
                  {idx + 1}
                </span>
                <span className="break-all whitespace-pre-wrap">{line}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500 space-y-2">
            <FileText className="w-8 h-8 text-slate-600 stroke-1" />
            <p className="text-xs">No text detected on this page</p>
          </div>
        )}
      </div>

      {/* Footer Meta */}
      <div className="pt-4 border-t border-slate-800/70 flex items-center justify-between text-[10px] text-slate-500">
        <span>Parsed via OpenOCR engine</span>
        <span>{lines.length} lines detected</span>
      </div>
    </div>
  );
}

