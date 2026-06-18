import { PDFDocument } from "pdf-lib";
import type { PdfPointRect } from "./coordinateService";
import { assertLocalPdfEditable } from "./pdfLoader";

export type StampImageMime = "image/png" | "image/jpeg";
export type StampPageSelection =
  | { mode: "first" }
  | { mode: "all" }
  | { mode: "custom"; pageNumbers: number[] };

export interface StampPlacement {
  rect: PdfPointRect;
  opacity: number;
}

export interface StampExportOptions {
  imageBytes: Uint8Array;
  imageMime: StampImageMime;
  placement: StampPlacement;
  pages: StampPageSelection;
}

export interface StampExportResult {
  pdfBytes: Uint8Array;
  stampedPageCount: number;
}

const isPng = (bytes: Uint8Array) =>
  bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;

const isJpeg = (bytes: Uint8Array) =>
  bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

export const readStampImageFile = async (file: File): Promise<{ bytes: Uint8Array; mime: StampImageMime }> => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = file.type === "image/png" || isPng(bytes)
    ? "image/png"
    : file.type === "image/jpeg" || isJpeg(bytes)
      ? "image/jpeg"
      : null;

  if (!mime) throw new Error("Stamp image must be a PNG or JPEG file.");
  return { bytes, mime };
};

export const getImageNaturalSize = async (file: File | Blob) => new Promise<{ width: number; height: number }>((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    resolve({ width: image.naturalWidth, height: image.naturalHeight });
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error("Unable to read the stamp image."));
  };
  image.src = url;
});

export const getDefaultStampRect = (
  pageIndex: number,
  pageWidth: number,
  pageHeight: number,
  imageWidth: number,
  imageHeight: number
): PdfPointRect => {
  const width = 72;
  const ratio = imageHeight > 0 ? imageHeight / imageWidth : 1;
  const height = Math.max(1, width * ratio);
  return {
    pageIndex,
    x: Math.max(0, pageWidth - width - 50),
    y: Math.max(0, pageHeight - height - 50),
    width,
    height,
  };
};

const getTargetPageIndexes = (selection: StampPageSelection, pageCount: number) => {
  if (selection.mode === "first") return [0];
  if (selection.mode === "all") return Array.from({ length: pageCount }, (_, index) => index);
  const unique = Array.from(new Set(selection.pageNumbers));
  return unique
    .filter((pageNumber) => Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= pageCount)
    .map((pageNumber) => pageNumber - 1);
};

export const stampPdf = async (
  file: File | Blob | Uint8Array,
  options: StampExportOptions
): Promise<StampExportResult> => {
  if (options.placement.rect.width <= 0 || options.placement.rect.height <= 0) {
    throw new Error("Stamp width and height must be greater than zero.");
  }
  if (options.placement.opacity < 0 || options.placement.opacity > 1) {
    throw new Error("Stamp opacity must be between 0 and 1.");
  }

  await assertLocalPdfEditable(file);
  const sourceBytes = file instanceof Uint8Array ? file.slice() : new Uint8Array(await file.arrayBuffer());
  const pdfDoc = await PDFDocument.load(sourceBytes);
  const pages = pdfDoc.getPages();
  const image = options.imageMime === "image/png"
    ? await pdfDoc.embedPng(options.imageBytes)
    : await pdfDoc.embedJpg(options.imageBytes);
  const targetIndexes = getTargetPageIndexes(options.pages, pages.length);

  if (targetIndexes.length === 0) throw new Error("Select at least one target page for the stamp.");

  for (const pageIndex of targetIndexes) {
    const page = pages[pageIndex];
    const { x, y, width, height } = options.placement.rect;
    page.drawImage(image, {
      x,
      y,
      width,
      height,
      opacity: options.placement.opacity,
    });
  }

  const saved = await pdfDoc.save();
  return { pdfBytes: new Uint8Array(saved), stampedPageCount: targetIndexes.length };
};
