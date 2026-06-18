import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Download, Eye, FileSearch, Plus, Trash2 } from "lucide-react";
import { ToolLayout } from "../components/Layout";
import { FileUpload } from "../components/Shared";
import { getToolByRoute } from "../data/tools";
import type { PdfPointRect } from "../../services/pdf/coordinateService";
import {
  detectSensitiveData,
  typeLabels,
} from "../../services/pdf/redactionDetectionService";
import type { SensitiveDetection } from "../../services/pdf/redactionDetectionService";
import {
  exportRedactedPdf,
} from "../../services/pdf/redactionExportService";
import type { RedactionExportMode } from "../../services/pdf/redactionExportService";
import { getLocalPdfDocument, LocalPdfPasswordError, renderPdfPageToDataUrl } from "../../services/pdf/pdfLoader";

interface RedactionToolProps {
  detectionOnly?: boolean;
}

type ManualRectDraft = PdfPointRect;

const PREVIEW_SCALE = 1.25;

type DragRect = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};


const bytesToPdfBlob = (bytes: Uint8Array) => {
  const data = new Uint8Array(bytes.length);
  data.set(bytes);
  return new Blob([data.buffer], { type: "application/pdf" });
};

const downloadBytes = (bytes: Uint8Array, filename: string) => {
  const blob = bytesToPdfBlob(bytes);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const emptyRect = (pageIndex: number): ManualRectDraft => ({
  pageIndex,
  x: 72,
  y: 72,
  width: 144,
  height: 36,
});

export const RedactionTool = ({ detectionOnly = false }: RedactionToolProps) => {
  const tool = getToolByRoute(detectionOnly ? "/privacy-scan" : "/redact");
  const [file, setFile] = useState<File | null>(null);
  const [pagePreview, setPagePreview] = useState("");
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [detections, setDetections] = useState<SensitiveDetection[]>([]);
  const [selectedDetectionIds, setSelectedDetectionIds] = useState<Record<string, true>>({});
  const [manualRects, setManualRects] = useState<ManualRectDraft[]>([]);
  const [exportMode, setExportMode] = useState<RedactionExportMode>("selected-pages-image-only");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewImageRef = useRef<HTMLImageElement | null>(null);
  const [previewImageSize, setPreviewImageSize] = useState({ width: 0, height: 0 });
  const [dragRect, setDragRect] = useState<DragRect | null>(null);
  const [exportedPreviewUrl, setExportedPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;

    let cancelled = false;
    const loadPdf = async () => {
      setProcessing(true);
      setError(null);
      setMessage("Opening PDF locally…");
      try {
        const pdf = await getLocalPdfDocument(file);
        const pages = pdf.numPages;
        await pdf.destroy();
        if (cancelled) return;
        setTotalPages(pages || 1);
        setCurrentPageIndex(0);
        setPagePreview(await renderPdfPageToDataUrl(file, 0, PREVIEW_SCALE));
        setMessage("Scanning for sensitive data…");
        const found = await detectSensitiveData(file);
        if (cancelled) return;
        setDetections(found);
        const autoSelected: Record<string, true> = {};
        found.forEach((detection) => {
          if (detection.autoSelectable) autoSelected[detection.id] = true;
        });
        setSelectedDetectionIds(autoSelected);
        setExportMode(found.some((detection) => detection.autoSelectable) ? "all-pages-image-only" : "selected-pages-image-only");
        setMessage(found.length === 0 ? "No coordinate-based sensitive data was detected." : `Detected ${found.length} possible sensitive item(s).`);
      } catch (caught) {
        if (cancelled) return;
        const nextError = caught instanceof LocalPdfPasswordError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Unable to process this PDF.";
        setError(nextError);
        setFile(null);
      } finally {
        if (!cancelled) setProcessing(false);
      }
    };

    loadPdf();
    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => () => {
    if (exportedPreviewUrl) URL.revokeObjectURL(exportedPreviewUrl);
  }, [exportedPreviewUrl]);


  useEffect(() => {
    if (!file) return;

    let cancelled = false;
    const renderPage = async () => {
      try {
        const preview = await renderPdfPageToDataUrl(file, currentPageIndex, PREVIEW_SCALE);
        if (!cancelled) setPagePreview(preview);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to render this page.");
      }
    };

    renderPage();
    return () => {
      cancelled = true;
    };
  }, [file, currentPageIndex]);

  const selectedDetectionRects = useMemo(
    () => detections.filter((detection) => selectedDetectionIds[detection.id]).map((detection) => detection.rect),
    [detections, selectedDetectionIds]
  );

  const exportRects = useMemo(
    () => [...selectedDetectionRects, ...manualRects],
    [selectedDetectionRects, manualRects]
  );

  const detectionSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    detections.forEach((detection) => {
      counts[detection.type] = (counts[detection.type] || 0) + 1;
    });
    return counts;
  }, [detections]);

  const selectAutoDetections = () => {
    const autoSelected: Record<string, true> = {};
    detections.forEach((detection) => {
      if (detection.autoSelectable) autoSelected[detection.id] = true;
    });
    setSelectedDetectionIds(autoSelected);
    setExportMode("all-pages-image-only");
  };

  const addManualRect = () => {
    setManualRects((prev) => [...prev, emptyRect(currentPageIndex)]);
  };

  const updateManualRect = (index: number, field: keyof PdfPointRect, value: number) => {
    setManualRects((prev) => prev.map((rect, rectIndex) => {
      if (rectIndex !== index) return rect;
      const nextValue = Number.isFinite(value) ? value : 0;
      return {
        ...rect,
        [field]: field === "pageIndex" ? Math.max(0, Math.min(totalPages - 1, Math.trunc(nextValue) - 1)) : Math.max(0, nextValue),
      };
    }));
  };


  const getPointerPosition = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(bounds.width, event.clientX - bounds.left)),
      y: Math.max(0, Math.min(bounds.height, event.clientY - bounds.top)),
      bounds,
    };
  };

  const handlePreviewPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (detectionOnly || !file) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const position = getPointerPosition(event);
    setDragRect({ startX: position.x, startY: position.y, currentX: position.x, currentY: position.y });
  };

  const handlePreviewPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRect) return;
    const position = getPointerPosition(event);
    setDragRect((prev) => prev ? { ...prev, currentX: position.x, currentY: position.y } : prev);
  };

  const handlePreviewPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRect || detectionOnly) return;
    const position = getPointerPosition(event);
    const left = Math.min(dragRect.startX, position.x);
    const right = Math.max(dragRect.startX, position.x);
    const top = Math.min(dragRect.startY, position.y);
    const bottom = Math.max(dragRect.startY, position.y);
    setDragRect(null);
    if (right - left < 4 || bottom - top < 4) return;
    const naturalWidth = previewImageSize.width || previewImageRef.current?.naturalWidth || position.bounds.width * PREVIEW_SCALE;
    const naturalHeight = previewImageSize.height || previewImageRef.current?.naturalHeight || position.bounds.height * PREVIEW_SCALE;
    const pageWidth = naturalWidth / PREVIEW_SCALE;
    const pageHeight = naturalHeight / PREVIEW_SCALE;
    const nextRect: PdfPointRect = {
      pageIndex: currentPageIndex,
      x: (left / position.bounds.width) * pageWidth,
      y: ((position.bounds.height - bottom) / position.bounds.height) * pageHeight,
      width: ((right - left) / position.bounds.width) * pageWidth,
      height: ((bottom - top) / position.bounds.height) * pageHeight,
    };
    setManualRects((prev) => [...prev, nextRect]);
    setMessage("Added a manual redaction rectangle from the preview.");
  };

  const pagePdfSize = useMemo(() => ({
    width: previewImageSize.width > 0 ? previewImageSize.width / PREVIEW_SCALE : 0,
    height: previewImageSize.height > 0 ? previewImageSize.height / PREVIEW_SCALE : 0,
  }), [previewImageSize]);

  const currentPageRects = useMemo(
    () => exportRects.filter((rect) => rect.pageIndex === currentPageIndex && pagePdfSize.width > 0 && pagePdfSize.height > 0),
    [currentPageIndex, exportRects, pagePdfSize.width, pagePdfSize.height]
  );

  const dragOverlayStyle = dragRect ? {
    left: `${Math.min(dragRect.startX, dragRect.currentX)}px`,
    top: `${Math.min(dragRect.startY, dragRect.currentY)}px`,
    width: `${Math.abs(dragRect.currentX - dragRect.startX)}px`,
    height: `${Math.abs(dragRect.currentY - dragRect.startY)}px`,
  } : undefined;
  const handleExport = async () => {
    if (!file || exportRects.length === 0 || detectionOnly) return;
    setProcessing(true);
    setError(null);
    if (exportedPreviewUrl) {
      URL.revokeObjectURL(exportedPreviewUrl);
      setExportedPreviewUrl(null);
    }
    setMessage("Rendering redacted PDF locally…");
    try {
      const result = await exportRedactedPdf(file, {
        rects: exportRects,
        mode: exportMode,
        scale: 2,
        imageFormat: "png",
      });
      const blob = bytesToPdfBlob(result.pdfBytes);
      const url = URL.createObjectURL(blob);
      setExportedPreviewUrl(url);
      downloadBytes(result.pdfBytes, `redacted_${file.name}`);
      setMessage(`Exported ${result.redactionCount} redaction(s); rasterized ${result.rasterizedPageCount} page(s).`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to export redacted PDF.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout
      title={detectionOnly ? "Privacy Scan" : "Redact PDF"}
      icon={tool?.icon || FileSearch}
      iconColorClass={tool?.colorClass || "bg-rose-600"}
      description={tool?.shortDesc || "Find sensitive data and permanently flatten redactions into a PDF"}
      isProcessing={processing}
      progressLabel={message || "Processing PDF locally…"}
      progressSubLabel="Encrypted PDFs are rejected; use Unlock PDF first."
    >
      {!file ? (
        <div className="space-y-4">
          {error && (
            <div className="max-w-2xl mx-auto rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex gap-2">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}
          <FileUpload onFilesSelected={(files) => setFile(files[0])} accept=".pdf" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">Detection summary</h3>
                  <p className="text-sm text-slate-500 mt-1">{message}</p>
                </div>
                <Eye className="text-slate-400" size={20} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {Object.entries(typeLabels).map(([type, label]) => (
                  <div key={type} className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="text-lg font-bold text-slate-800">{detectionSummary[type] || 0}</p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={selectAutoDetections}
                className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={detections.length === 0}
              >
                Select high-confidence detections
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-900">Detected items</h3>
              <div className="max-h-72 overflow-auto space-y-2 pr-1">
                {detections.length === 0 ? (
                  <p className="text-sm text-slate-500">No coordinate-backed matches found.</p>
                ) : detections.map((detection) => (
                  <label key={detection.id} className="flex gap-3 rounded-lg border border-slate-100 p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedDetectionIds[detection.id])}
                      onChange={(event) => setSelectedDetectionIds((prev) => {
                        const next = { ...prev };
                        if (event.target.checked) next[detection.id] = true;
                        else delete next[detection.id];
                        return next;
                      })}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-slate-800">{typeLabels[detection.type]} · page {detection.pageIndex + 1}</span>
                      <span className="block truncate text-slate-500">{detection.maskedText}</span>
                      <span className="text-xs text-slate-400">{detection.confidence}{detection.autoSelectable ? " · auto" : " · review"}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {!detectionOnly && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Manual rectangles</h3>
                  <button type="button" onClick={addManualRect} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-700">
                    <Plus size={14} /> Add
                  </button>
                </div>
                {manualRects.map((rect, index) => (
                  <div key={`${index}-${rect.pageIndex}`} className="rounded-lg border border-slate-100 p-3 space-y-2">
                    <div className="grid grid-cols-5 gap-2">
                      {(["pageIndex", "x", "y", "width", "height"] as Array<keyof PdfPointRect>).map((field) => (
                        <label key={field} className="text-[11px] font-semibold uppercase text-slate-400">
                          {field === "pageIndex" ? "Page" : field}
                          <input
                            type="number"
                            min={field === "pageIndex" ? 1 : 0}
                            value={field === "pageIndex" ? rect.pageIndex + 1 : Math.round(rect[field])}
                            onChange={(event) => updateManualRect(index, field, Number(event.target.value))}
                            className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-sm text-slate-700"
                          />
                        </label>
                      ))}
                    </div>
                    <button type="button" onClick={() => setManualRects((prev) => prev.filter((_, rectIndex) => rectIndex !== index))} className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))} disabled={currentPageIndex === 0} className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50">Previous</button>
              <span className="text-sm font-semibold text-slate-700">Page {currentPageIndex + 1} / {totalPages}</span>
              <button type="button" onClick={() => setCurrentPageIndex((prev) => Math.min(totalPages - 1, prev + 1))} disabled={currentPageIndex >= totalPages - 1} className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50">Next</button>
              {!detectionOnly && (
                <>
                  <select value={exportMode} onChange={(event) => setExportMode(event.target.value as RedactionExportMode)} className="ml-auto rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <option value="selected-pages-image-only">Selected pages image-only</option>
                    <option value="all-pages-image-only">All pages image-only</option>
                  </select>
                  <button type="button" onClick={handleExport} disabled={exportRects.length === 0 || processing} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                    <Download size={16} /> Export PDF
                  </button>
                </>
              )}
            </div>

            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
            <div className="min-h-[620px] overflow-auto rounded-2xl bg-slate-100 p-4 flex justify-center">
              {pagePreview ? (
                <div className="relative inline-block shadow-xl select-none">
                  <img
                    ref={previewImageRef}
                    src={pagePreview}
                    alt={`Page ${currentPageIndex + 1}`}
                    className="max-w-full"
                    draggable={false}
                    onLoad={(event) => setPreviewImageSize({
                      width: event.currentTarget.naturalWidth,
                      height: event.currentTarget.naturalHeight,
                    })}
                  />
                  <div
                    className={`absolute inset-0 ${detectionOnly ? "" : "cursor-crosshair"}`}
                    onPointerDown={handlePreviewPointerDown}
                    onPointerMove={handlePreviewPointerMove}
                    onPointerUp={handlePreviewPointerUp}
                    onPointerCancel={() => setDragRect(null)}
                  >
                    {currentPageRects.map((rect, index) => (
                      <div
                        key={`${rect.pageIndex}-${index}-${rect.x}-${rect.y}`}
                        className="absolute border-2 border-red-500 bg-red-500/35"
                        style={{
                          left: `${(rect.x / pagePdfSize.width) * 100}%`,
                          top: `${((pagePdfSize.height - rect.y - rect.height) / pagePdfSize.height) * 100}%`,
                          width: `${(rect.width / pagePdfSize.width) * 100}%`,
                          height: `${(rect.height / pagePdfSize.height) * 100}%`,
                        }}
                      />
                    ))}
                    {dragOverlayStyle && (
                      <div className="absolute border-2 border-blue-500 bg-blue-500/25" style={dragOverlayStyle} />
                    )}
                  </div>
                  <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
                    {detectionOnly ? "Detection preview only." : "Drag on the page to add a redaction rectangle."}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">Rendering preview…</div>
              )}
            </div>
            {exportedPreviewUrl && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 rounded-2xl bg-white p-4 border border-slate-200 shadow-sm">
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">Before</h3>
                  <img src={pagePreview} alt="Original page preview" className="w-full rounded-lg border border-slate-200" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">Exported redacted PDF</h3>
                  <iframe title="Redacted PDF preview" src={exportedPreviewUrl} className="h-[420px] w-full rounded-lg border border-slate-200" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </ToolLayout>
  );
};
