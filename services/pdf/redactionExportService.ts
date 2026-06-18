import { PDFDocument, rgb } from "pdf-lib";
import { pdfRectToViewportRect } from "./coordinateService";
import type { PdfPointRect } from "./coordinateService";
import { getLocalPdfDocument } from "./pdfLoader";

export type RedactionExportMode = "all-pages-image-only" | "selected-pages-image-only";
export type RedactionImageFormat = "png" | "jpeg";

export interface RedactionExportOptions {
  mode: RedactionExportMode;
  rects: PdfPointRect[];
  scale?: number;
  imageFormat?: RedactionImageFormat;
  jpegQuality?: number;
  fill?: { r: number; g: number; b: number };
  cleanDocumentInfo?: boolean;
}

export interface RedactionExportResult {
  pdfBytes: Uint8Array;
  rasterizedPageCount: number;
  redactionCount: number;
}

const groupRectsByPage = (rects: PdfPointRect[]) => {
  const grouped = new Map<number, PdfPointRect[]>();
  for (const rect of rects) {
    grouped.set(rect.pageIndex, [...(grouped.get(rect.pageIndex) || []), rect]);
  }
  return grouped;
};

const canvasToBytes = async (
  canvas: HTMLCanvasElement,
  format: RedactionImageFormat,
  jpegQuality: number
) => new Promise<Uint8Array>((resolve, reject) => {
  canvas.toBlob(async (blob) => {
    if (!blob) {
      reject(new Error("Unable to render redacted page image."));
      return;
    }
    resolve(new Uint8Array(await blob.arrayBuffer()));
  }, format === "png" ? "image/png" : "image/jpeg", jpegQuality);
});

const clearDocumentInfo = (pdfDoc: PDFDocument) => {
  pdfDoc.setTitle("");
  pdfDoc.setAuthor("");
  pdfDoc.setSubject("");
  pdfDoc.setKeywords([]);
  pdfDoc.setCreator("DocuFlow");
  pdfDoc.setProducer("DocuFlow");
};

export const exportRedactedPdf = async (
  file: File | Blob | Uint8Array,
  options: RedactionExportOptions
): Promise<RedactionExportResult> => {
  if (options.rects.length === 0) {
    throw new Error("Add at least one redaction rectangle before exporting.");
  }

  const sourceBytes = file instanceof Uint8Array ? file.slice() : new Uint8Array(await file.arrayBuffer());
  const sourcePdf = await PDFDocument.load(sourceBytes);
  const sourcePages = sourcePdf.getPages();
  const pdfjsDoc = await getLocalPdfDocument(sourceBytes.slice());
  const outputPdf = await PDFDocument.create();
  const rectsByPage = groupRectsByPage(options.rects);
  const scale = options.scale || 2;
  const imageFormat = options.imageFormat || "png";
  const jpegQuality = options.jpegQuality || 0.92;
  const fill = options.fill || { r: 0, g: 0, b: 0 };
  const shouldRasterize = (pageIndex: number) =>
    options.mode === "all-pages-image-only" || (rectsByPage.get(pageIndex)?.length || 0) > 0;

  let rasterizedPageCount = 0;

  try {
    for (let pageIndex = 0; pageIndex < sourcePages.length; pageIndex += 1) {
      const sourcePage = sourcePages[pageIndex];
      const { width, height } = sourcePage.getSize();

      if (!shouldRasterize(pageIndex)) {
        const [copiedPage] = await outputPdf.copyPages(sourcePdf, [pageIndex]);
        outputPdf.addPage(copiedPage);
        continue;
      }

      const pdfjsPage = await pdfjsDoc.getPage(pageIndex + 1);
      const viewport = pdfjsPage.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas rendering is not available in this browser.");

      await pdfjsPage.render({ canvasContext: context, viewport }).promise;

      context.save();
      context.fillStyle = `rgb(${fill.r}, ${fill.g}, ${fill.b})`;
      for (const rect of rectsByPage.get(pageIndex) || []) {
        const viewportRect = pdfRectToViewportRect(rect, viewport);
        context.fillRect(viewportRect.x, viewportRect.y, viewportRect.width, viewportRect.height);
      }
      context.restore();

      const imageBytes = await canvasToBytes(canvas, imageFormat, jpegQuality);
      const embeddedImage = imageFormat === "png"
        ? await outputPdf.embedPng(imageBytes)
        : await outputPdf.embedJpg(imageBytes);
      const page = outputPdf.addPage([width, height]);
      page.drawImage(embeddedImage, { x: 0, y: 0, width, height });
      rasterizedPageCount += 1;
    }

    if (options.cleanDocumentInfo !== false) clearDocumentInfo(outputPdf);
    const saved = await outputPdf.save();
    return {
      pdfBytes: new Uint8Array(saved),
      rasterizedPageCount,
      redactionCount: options.rects.length,
    };
  } finally {
    await pdfjsDoc.destroy();
  }
};

export const exportPreviewOverlayPdf = async (
  file: File | Blob | Uint8Array,
  rects: PdfPointRect[]
): Promise<Uint8Array> => {
  const bytes = file instanceof Uint8Array ? file.slice() : new Uint8Array(await file.arrayBuffer());
  const pdfDoc = await PDFDocument.load(bytes);
  const pages = pdfDoc.getPages();
  for (const rect of rects) {
    const page = pages[rect.pageIndex];
    if (!page) continue;
    page.drawRectangle({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      color: rgb(0, 0, 0),
      opacity: 1,
    });
  }
  const saved = await pdfDoc.save();
  return new Uint8Array(saved);
};
