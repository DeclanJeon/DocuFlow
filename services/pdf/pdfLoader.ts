import * as pdfjsLib from "pdfjs-dist";

export type PdfDocumentProxy = pdfjsLib.PDFDocumentProxy;
export type PdfPageProxy = pdfjsLib.PDFPageProxy;

export class LocalPdfPasswordError extends Error {
  constructor(message = "This PDF is encrypted or password-protected. Unlock PDF first, then upload it again.") {
    super(message);
    this.name = "LocalPdfPasswordError";
  }
}

let configured = false;

export const configurePdfJs = () => {
  if (configured) return;

  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  configured = true;
};

const isPasswordError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { name?: string; code?: number; message?: string };
  return (
    maybe.name === "PasswordException" ||
    maybe.code === 1 ||
    maybe.code === 2 ||
    /password|encrypted/i.test(maybe.message || "")
  );
};

const mapPdfError = (error: unknown): Error => {
  if (isPasswordError(error)) return new LocalPdfPasswordError();
  return error instanceof Error ? error : new Error("Unable to open this PDF.");
};

export const getLocalPdfDocument = async (
  source: File | Blob | ArrayBuffer | Uint8Array
): Promise<PdfDocumentProxy> => {
  configurePdfJs();

  const bytes = source instanceof Uint8Array
    ? source.slice()
    : source instanceof ArrayBuffer
      ? source.slice(0)
      : await source.arrayBuffer();

  try {
    return await pdfjsLib.getDocument({
      data: bytes,
      cMapUrl: new URL("pdfjs-dist/cmaps/", import.meta.url).toString(),
      cMapPacked: true,
      standardFontDataUrl: new URL("pdfjs-dist/standard_fonts/", import.meta.url).toString(),
      disableAutoFetch: true,
      disableStream: true,
    }).promise;
  } catch (error) {
    throw mapPdfError(error);
  }
};

export const assertLocalPdfEditable = async (file: File | Blob | Uint8Array) => {
  const pdf = await getLocalPdfDocument(file);
  await pdf.destroy();
};

export const loadPdfPage = async (pdf: PdfDocumentProxy, pageIndex: number) => {
  if (pageIndex < 0 || pageIndex >= pdf.numPages) {
    throw new RangeError("Page index is outside the PDF page range.");
  }
  return pdf.getPage(pageIndex + 1);
};

export const renderPdfPageToCanvas = async (
  pdf: PdfDocumentProxy,
  pageIndex: number,
  scale = 1.5,
  rotation?: number
): Promise<HTMLCanvasElement> => {
  const page = await loadPdfPage(pdf, pageIndex);
  const viewport = page.getViewport({ scale, rotation });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas rendering is not available in this browser.");
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
};

export const renderPdfPageToDataUrl = async (
  file: File | Blob | Uint8Array,
  pageIndex: number,
  scale = 1.5
): Promise<string> => {
  const pdf = await getLocalPdfDocument(file);
  try {
    const canvas = await renderPdfPageToCanvas(pdf, pageIndex, scale);
    return canvas.toDataURL("image/png");
  } finally {
    await pdf.destroy();
  }
};
