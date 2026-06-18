import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Download, ImagePlus, Stamp } from "lucide-react";
import { ToolLayout } from "../components/Layout";
import { FileUpload } from "../components/Shared";
import { getToolByRoute } from "../data/tools";
import type { PdfPointRect } from "../../services/pdf/coordinateService";
import { getLocalPdfDocument, LocalPdfPasswordError, renderPdfPageToDataUrl } from "../../services/pdf/pdfLoader";
import {
  getDefaultStampRect,
  getImageNaturalSize,
  readStampImageFile,
  stampPdf,
} from "../../services/pdf/stampService";
import type { StampImageMime, StampPageSelection } from "../../services/pdf/stampService";

const PREVIEW_SCALE = 1.25;


interface StampImageState {
  file: File;
  bytes: Uint8Array;
  mime: StampImageMime;
  previewUrl: string;
  naturalWidth: number;
  naturalHeight: number;
}

const downloadBytes = (bytes: Uint8Array, filename: string) => {
  const data = new Uint8Array(bytes.length);
  data.set(bytes);
  const blob = new Blob([data.buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const parseCustomPages = (value: string) => value
  .split(",")
  .map((part) => Number.parseInt(part.trim(), 10))
  .filter((pageNumber) => Number.isInteger(pageNumber));

export const StampTool = () => {
  const tool = getToolByRoute("/stamp");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [stampImage, setStampImage] = useState<StampImageState | null>(null);
  const [pagePreview, setPagePreview] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [placement, setPlacement] = useState<PdfPointRect>({ pageIndex: 0, x: 72, y: 72, width: 72, height: 72 });
  const [opacity, setOpacity] = useState(0.85);
  const [pageMode, setPageMode] = useState<StampPageSelection["mode"]>("first");
  const [customPages, setCustomPages] = useState("1");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewImageRef = useRef<HTMLImageElement | null>(null);
  const [previewImageSize, setPreviewImageSize] = useState({ width: 0, height: 0 });

  useEffect(() => () => {
    if (stampImage) URL.revokeObjectURL(stampImage.previewUrl);
  }, [stampImage]);

  useEffect(() => {
    if (!pdfFile) return;

    let cancelled = false;
    const loadPdf = async () => {
      setProcessing(true);
      setError(null);
      setMessage("Opening PDF locally…");
      try {
        const pdf = await getLocalPdfDocument(pdfFile);
        const firstPage = await pdf.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1 });
        const pages = pdf.numPages || 1;
        await pdf.destroy();
        if (cancelled) return;
        setTotalPages(pages);
        setCurrentPageIndex(0);
        setCustomPages("1");
        if (stampImage) {
          setPlacement(getDefaultStampRect(0, viewport.width, viewport.height, stampImage.naturalWidth, stampImage.naturalHeight));
        }
        setPagePreview(await renderPdfPageToDataUrl(pdfFile, 0, PREVIEW_SCALE));
        setMessage("PDF ready. Upload a PNG or JPEG stamp image.");
      } catch (caught) {
        if (cancelled) return;
        setError(caught instanceof LocalPdfPasswordError ? caught.message : caught instanceof Error ? caught.message : "Unable to open this PDF.");
        setPdfFile(null);
      } finally {
        if (!cancelled) setProcessing(false);
      }
    };

    loadPdf();
    return () => {
      cancelled = true;
    };
  }, [pdfFile, stampImage]);

  useEffect(() => {
    if (!pdfFile) return;
    let cancelled = false;
    const renderPage = async () => {
      try {
        const preview = await renderPdfPageToDataUrl(pdfFile, currentPageIndex, PREVIEW_SCALE);
        if (!cancelled) setPagePreview(preview);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to render this page.");
      }
    };
    renderPage();
    return () => {
      cancelled = true;
    };
  }, [pdfFile, currentPageIndex]);

  const selectedPages = useMemo<StampPageSelection>(() => {
    if (pageMode === "all") return { mode: "all" };
    if (pageMode === "custom") return { mode: "custom", pageNumbers: parseCustomPages(customPages) };
    return { mode: "first" };
  }, [pageMode, customPages]);

  const handleStampUpload = async (file: File) => {
    setError(null);
    try {
      const image = await readStampImageFile(file);
      const naturalSize = await getImageNaturalSize(file);
      if (stampImage) URL.revokeObjectURL(stampImage.previewUrl);
      const previewUrl = URL.createObjectURL(file);
      setStampImage({
        file,
        bytes: image.bytes,
        mime: image.mime,
        previewUrl,
        naturalWidth: naturalSize.width,
        naturalHeight: naturalSize.height,
      });
      const ratio = naturalSize.height > 0 ? naturalSize.height / naturalSize.width : 1;
      setPlacement((prev) => ({ ...prev, width: prev.width || 72, height: Math.max(1, (prev.width || 72) * ratio) }));
      setMessage("Stamp image ready. Set placement in PDF points.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load the stamp image.");
    }
  };

  const updatePlacement = (field: keyof PdfPointRect, value: number) => {
    setPlacement((prev) => {
      const nextValue = Number.isFinite(value) ? value : 0;
      if (field === "pageIndex") return { ...prev, pageIndex: Math.max(0, Math.min(totalPages - 1, Math.trunc(nextValue) - 1)) };
      if (field === "width" && stampImage) {
        const ratio = stampImage.naturalHeight > 0 ? stampImage.naturalHeight / stampImage.naturalWidth : 1;
        const width = Math.max(1, nextValue);
        return { ...prev, width, height: Math.max(1, width * ratio) };
      }
      return { ...prev, [field]: Math.max(field === "height" || field === "width" ? 1 : 0, nextValue) };
    });
  };

  const updatePlacementFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!stampImage || !previewImageRef.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(bounds.width, event.clientX - bounds.left));
    const y = Math.max(0, Math.min(bounds.height, event.clientY - bounds.top));
    const naturalWidth = previewImageSize.width || previewImageRef.current.naturalWidth || bounds.width * PREVIEW_SCALE;
    const naturalHeight = previewImageSize.height || previewImageRef.current.naturalHeight || bounds.height * PREVIEW_SCALE;
    const pageWidth = naturalWidth / PREVIEW_SCALE;
    const pageHeight = naturalHeight / PREVIEW_SCALE;
    const nextX = (x / bounds.width) * pageWidth - placement.width / 2;
    const nextY = ((bounds.height - y) / bounds.height) * pageHeight - placement.height / 2;
    setPlacement((prev) => ({
      ...prev,
      pageIndex: currentPageIndex,
      x: Math.max(0, nextX),
      y: Math.max(0, nextY),
    }));
  };


  const handleExport = async () => {
    if (!pdfFile || !stampImage) return;
    setProcessing(true);
    setError(null);
    setMessage("Applying stamp locally…");
    try {
      const result = await stampPdf(pdfFile, {
        imageBytes: stampImage.bytes,
        imageMime: stampImage.mime,
        placement: { rect: placement, opacity },
        pages: selectedPages,
      });
      downloadBytes(result.pdfBytes, `stamped_${pdfFile.name}`);
      setMessage(`Stamped ${result.stampedPageCount} page(s).`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to export stamped PDF.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout
      title="Stamp PDF"
      icon={tool?.icon || Stamp}
      iconColorClass={tool?.colorClass || "bg-emerald-600"}
      description={tool?.shortDesc || "Place a PNG or JPEG stamp image using PDF point coordinates"}
      isProcessing={processing}
      progressLabel={message || "Preparing local PDF stamp editor…"}
      progressSubLabel="Encrypted PDFs are rejected; use Unlock PDF first."
    >
      {!pdfFile ? (
        <div className="space-y-4">
          {error && (
            <div className="max-w-2xl mx-auto rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex gap-2">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}
          <FileUpload onFilesSelected={(files) => setPdfFile(files[0])} accept=".pdf" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-3">Stamp image</h3>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center hover:bg-slate-100">
                {stampImage ? (
                  <img src={stampImage.previewUrl} alt={stampImage.file.name} className="max-h-28 object-contain" />
                ) : (
                  <>
                    <ImagePlus className="text-slate-400" />
                    <span className="mt-2 text-sm font-semibold text-slate-600">Upload PNG or JPEG</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0];
                    if (nextFile) handleStampUpload(nextFile);
                  }}
                />
              </label>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-900">Placement</h3>
              <div className="grid grid-cols-2 gap-3">
                {(["pageIndex", "x", "y", "width", "height"] as Array<keyof PdfPointRect>).map((field) => (
                  <label key={field} className="text-xs font-semibold uppercase text-slate-400">
                    {field === "pageIndex" ? "Preview page" : `${field} (pt)`}
                    <input
                      type="number"
                      min={field === "pageIndex" ? 1 : field === "width" || field === "height" ? 1 : 0}
                      value={field === "pageIndex" ? placement.pageIndex + 1 : Math.round(placement[field])}
                      onChange={(event) => updatePlacement(field, Number(event.target.value))}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    />
                  </label>
                ))}
                <label className="text-xs font-semibold uppercase text-slate-400">
                  Opacity
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={opacity}
                    onChange={(event) => setOpacity(Math.max(0, Math.min(1, Number(event.target.value))))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                  />
                </label>
              </div>
              <p className="text-xs text-slate-500">Coordinates are PDF points from the bottom-left of each target page. Width preserves the uploaded image aspect ratio.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-900">Target pages</h3>
              <select value={pageMode} onChange={(event) => setPageMode(event.target.value as StampPageSelection["mode"])} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="first">First page only</option>
                <option value="all">All pages</option>
                <option value="custom">Custom pages</option>
              </select>
              {pageMode === "custom" && (
                <input
                  type="text"
                  value={customPages}
                  onChange={(event) => setCustomPages(event.target.value)}
                  placeholder="1, 3, 5"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              )}
              <button
                type="button"
                onClick={handleExport}
                disabled={!stampImage || processing}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                <Download size={16} /> Export stamped PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  setPdfFile(null);
                  setStampImage(null);
                  setPagePreview("");
                }}
                className="w-full text-sm font-semibold text-slate-500"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))} disabled={currentPageIndex === 0} className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50">Previous</button>
              <span className="text-sm font-semibold text-slate-700">Page {currentPageIndex + 1} / {totalPages}</span>
              <button type="button" onClick={() => setCurrentPageIndex((prev) => Math.min(totalPages - 1, prev + 1))} disabled={currentPageIndex >= totalPages - 1} className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50">Next</button>
              {error && <span className="text-sm font-semibold text-red-600">{error}</span>}
            </div>
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
                    className={`absolute inset-0 ${stampImage ? "cursor-crosshair" : ""}`}
                    onPointerDown={updatePlacementFromPointer}
                    onPointerMove={(event) => {
                      if (event.buttons === 1) updatePlacementFromPointer(event);
                    }}
                  >
                    {stampImage && currentPageIndex === placement.pageIndex && previewImageSize.width > 0 && (
                      <img
                        src={stampImage.previewUrl}
                        alt="Stamp placement preview"
                        className="absolute border-2 border-emerald-500 bg-emerald-500/10 object-contain"
                        style={{
                          left: `${(placement.x / (previewImageSize.width / PREVIEW_SCALE)) * 100}%`,
                          top: `${(((previewImageSize.height / PREVIEW_SCALE) - placement.y - placement.height) / (previewImageSize.height / PREVIEW_SCALE)) * 100}%`,
                          width: `${(placement.width / (previewImageSize.width / PREVIEW_SCALE)) * 100}%`,
                          height: `${(placement.height / (previewImageSize.height / PREVIEW_SCALE)) * 100}%`,
                          opacity,
                        }}
                        draggable={false}
                      />
                    )}
                  </div>
                  <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
                    {stampImage ? "Click or drag on the page to place the stamp center." : "Upload a PNG/JPEG stamp image."}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">Rendering preview…</div>
              )}
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};
