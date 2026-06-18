export interface PdfPointRect {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportRect {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfPageBox {
  width: number;
  height: number;
  viewBox?: number[];
  rotation?: number;
}

interface ViewportLike {
  width: number;
  height: number;
  viewBox?: number[];
  rotation?: number;
  scale?: number;
  convertToViewportPoint?: (x: number, y: number) => number[];
  convertToPdfPoint?: (x: number, y: number) => number[];
}

const normalizeRect = (rect: PdfPointRect): PdfPointRect => {
  const x = rect.width < 0 ? rect.x + rect.width : rect.x;
  const y = rect.height < 0 ? rect.y + rect.height : rect.y;
  return {
    pageIndex: rect.pageIndex,
    x,
    y,
    width: Math.abs(rect.width),
    height: Math.abs(rect.height),
  };
};

export const clampPdfRectToPage = (
  rect: PdfPointRect,
  page: PdfPageBox
): PdfPointRect => {
  const normalized = normalizeRect(rect);
  const x = Math.max(0, Math.min(page.width, normalized.x));
  const y = Math.max(0, Math.min(page.height, normalized.y));
  return {
    pageIndex: normalized.pageIndex,
    x,
    y,
    width: Math.max(0, Math.min(page.width - x, normalized.width)),
    height: Math.max(0, Math.min(page.height - y, normalized.height)),
  };
};

export const pdfRectToViewportRect = (
  rect: PdfPointRect,
  viewport: ViewportLike,
  cssScale = 1,
  devicePixelRatio = 1
): ViewportRect => {
  const normalized = normalizeRect(rect);
  const toViewport = viewport.convertToViewportPoint
    ? viewport.convertToViewportPoint.bind(viewport)
    : (x: number, y: number): [number, number] => [x * (viewport.scale || 1), viewport.height - y * (viewport.scale || 1)];

  const [x1, y1] = toViewport(normalized.x, normalized.y);
  const [x2, y2] = toViewport(normalized.x + normalized.width, normalized.y + normalized.height);
  const factor = cssScale / devicePixelRatio;

  return {
    pageIndex: normalized.pageIndex,
    x: Math.min(x1, x2) * factor,
    y: Math.min(y1, y2) * factor,
    width: Math.abs(x2 - x1) * factor,
    height: Math.abs(y2 - y1) * factor,
  };
};

export const viewportRectToPdfRect = (
  rect: ViewportRect,
  viewport: ViewportLike,
  cssScale = 1,
  devicePixelRatio = 1
): PdfPointRect => {
  const fromViewport = viewport.convertToPdfPoint
    ? viewport.convertToPdfPoint.bind(viewport)
    : (x: number, y: number): [number, number] => [x / (viewport.scale || 1), (viewport.height - y) / (viewport.scale || 1)];

  const factor = devicePixelRatio / cssScale;
  const [x1, y1] = fromViewport(rect.x * factor, rect.y * factor);
  const [x2, y2] = fromViewport((rect.x + rect.width) * factor, (rect.y + rect.height) * factor);

  return normalizeRect({
    pageIndex: rect.pageIndex,
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  });
};

export const topLeftPdfPointRect = (
  pageIndex: number,
  x: number,
  yFromTop: number,
  width: number,
  height: number,
  pageHeight: number
): PdfPointRect => ({
  pageIndex,
  x,
  y: pageHeight - yFromTop - height,
  width,
  height,
});

export const expandPdfRect = (rect: PdfPointRect, padding: number): PdfPointRect => ({
  pageIndex: rect.pageIndex,
  x: rect.x - padding,
  y: rect.y - padding,
  width: rect.width + padding * 2,
  height: rect.height + padding * 2,
});
