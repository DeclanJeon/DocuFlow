export enum ToolType {
  MERGE = "merge",
  SPLIT = "split",
  PDF_TO_IMG = "pdf-to-img",
  IMG_TO_PDF = "img-to-pdf",
  PAGE_NUMBERS = "page-numbers",
  ANNOTATE = "annotate",
  OCR = "ocr",
  // New Tools
  COMPRESS = "compress",
  ORGANIZE = "organize",
  WATERMARK = "watermark",
  PROTECT = "protect",
  UNLOCK = "unlock",
  SIGN = "sign", // 도장/서명
}

// 페이지 정리를 위한 인터페이스
export interface PageOrder {
  oldIndex: number;
  newIndex: number;
  rotation: number; // 0, 90, 180, 270
  deleted: boolean;
}

export interface UploadedFile {
  file: File;
  id: string;
  previewUrl?: string;
}

export interface Annotation {
  id: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  text: string;
  pageIndex: number;
}
