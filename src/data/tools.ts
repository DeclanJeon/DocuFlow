// src/data/tools.ts
import {
  Merge, Split, Image as ImageIcon, FileOutput, Hash, PenTool, Search,
  Minimize2, Grid, Stamp, Shield, Unlock, Type, FileType, FileText,
  BookOpen, ScanSearch, FileUp,
} from "lucide-react";
import { ComponentType } from "react";

export type ToolCategory = "pdf" | "conversion" | "security";
export type ToolProcessing = "browser" | "server" | "external";

export interface ToolDef {
  id: string;
  to: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  colorClass: string;
  shortDesc: string; // one-liner for tool page header
  category: ToolCategory;
  processing: ToolProcessing;
  requiresServer?: boolean;
  requiresExternalDependency?: boolean;
}

export interface ToolGroup {
  label: string;
  tools: ToolDef[];
}

export const TOOL_GROUPS: ToolGroup[] = [
  {
    label: "PDF 도구",
    tools: [
      { id: "merge",        to: "/merge",        icon: Merge,      title: "Merge Files",     description: "Browser processing: combine PDFs, JPG, PNG, and other image files into one unified PDF document.", colorClass: "bg-rose-500",    shortDesc: "Combine multiple files into a single PDF", category: "pdf", processing: "browser" },
      { id: "split",        to: "/split",        icon: Split,      title: "Split PDF",       description: "Browser processing: separate one page or a whole set for easy conversion.",                         colorClass: "bg-orange-500",  shortDesc: "Extract pages or split into multiple PDFs", category: "pdf", processing: "browser" },
      { id: "pdf-to-img",   to: "/pdf-to-img",   icon: ImageIcon,  title: "PDF to JPG",      description: "Browser processing: extract images from your PDF or save each page as a separate image.",           colorClass: "bg-amber-500",   shortDesc: "Save each PDF page as an image file", category: "pdf", processing: "browser" },
      { id: "img-to-pdf",   to: "/img-to-pdf",   icon: FileOutput, title: "JPG to PDF",      description: "Browser processing: convert your images to a PDF file in seconds.",                                 colorClass: "bg-emerald-500", shortDesc: "Turn images into a PDF document", category: "pdf", processing: "browser" },
      { id: "page-numbers", to: "/page-numbers", icon: Hash,       title: "Page Numbers",    description: "Browser processing: add page numbers into your PDF documents easily.",                              colorClass: "bg-cyan-500",    shortDesc: "Insert page numbers into any PDF", category: "pdf", processing: "browser" },
      { id: "annotate",     to: "/annotate",     icon: PenTool,    title: "Annotate PDF",    description: "Browser processing: draw, type and add notes to your PDF documents.",                               colorClass: "bg-blue-600",    shortDesc: "Draw, type and annotate PDF pages", category: "pdf", processing: "browser" },
      { id: "ocr",          to: "/ocr",          icon: Search,     title: "OCR Reader",      description: "Server processing: extract text from PDFs and images with internal Tesseract OCR.",                  colorClass: "bg-violet-600",  shortDesc: "Internal OCR for scanned PDFs and images", category: "pdf", processing: "server", requiresServer: true },
      { id: "compress",     to: "/compress",     icon: Minimize2,  title: "Compress PDF",    description: "Server processing: reduce PDF file size with Ghostscript presets.",                             colorClass: "bg-rose-600",    shortDesc: "Server Ghostscript PDF compression", category: "pdf", processing: "server", requiresServer: true },
      { id: "organize",     to: "/organize",     icon: Grid,       title: "Organize PDF",    description: "Browser processing: rearrange, rotate, and delete pages visually.",                                 colorClass: "bg-indigo-500",  shortDesc: "Reorder, rotate or delete PDF pages", category: "pdf", processing: "browser" },
    ],
  },
  {
    label: "오피스 & 문서 변환",
    tools: [
      { id: "pdf-to-docx", to: "/pdf-to-docx", icon: FileType, title: "PDF to Word",     description: "Browser processing: convert PDF files into editable DOCX documents.",                              colorClass: "bg-blue-700",    shortDesc: "Convert PDF to editable Word document", category: "conversion", processing: "browser" },
      { id: "docx-to-pdf", to: "/docx-to-pdf", icon: FileType, title: "Word to PDF",     description: "Server processing: generate high-quality PDF files from DOCX documents through the render API.", colorClass: "bg-indigo-600",  shortDesc: "Convert Word documents to PDF", category: "conversion", processing: "server", requiresServer: true },
      { id: "pdf-to-md",   to: "/pdf-to-md",   icon: FileText, title: "PDF to Markdown", description: "Browser extraction with optional server pdftomd/OCR conversion.", colorClass: "bg-purple-600",  shortDesc: "Browser or server PDF to Markdown", category: "conversion", processing: "server", requiresServer: true },
      { id: "epub-to-pdf", to: "/epub-to-pdf", icon: BookOpen, title: "EPUB to PDF",     description: "Server processing: convert EPUB ebook files into readable PDF documents through the render API.", colorClass: "bg-emerald-600", shortDesc: "Convert ebooks to shareable PDFs", category: "conversion", processing: "server", requiresServer: true },
      { id: "hwp-to-pdf",  to: "/hwp-to-pdf",  icon: FileText, title: "HWP/HWPX to PDF", description: "Server processing: convert Korean HWP/HWPX documents to PDF with LibreOffice when available.", colorClass: "bg-red-600", shortDesc: "Server HWP/HWPX to PDF conversion", category: "conversion", processing: "server", requiresServer: true, requiresExternalDependency: true },
      { id: "pdf-to-hwp",  to: "/pdf-to-hwp",  icon: FileUp,   title: "PDF to HWP",      description: "Server processing: requires rhwp-ingest-exporter/Poppler for real Korean HWP output.", colorClass: "bg-orange-600", shortDesc: "Server PDF to Korean HWP conversion", category: "conversion", processing: "server", requiresServer: true, requiresExternalDependency: true },
    ],
  },
  {
    label: "보안 & 개인정보",
    tools: [
      { id: "watermark",    to: "/watermark",    icon: Stamp,      title: "Watermark",      description: "Browser processing: add text or image watermarks for security.",                              colorClass: "bg-blue-400",    shortDesc: "Stamp text or image watermarks on PDFs", category: "security", processing: "browser" },
      { id: "protect",      to: "/protect",      icon: Shield,     title: "Protect PDF",    description: "Server processing: encrypt PDFs with qpdf password protection.",                              colorClass: "bg-gray-700",    shortDesc: "Server qpdf password encryption", category: "security", processing: "server", requiresServer: true },
      { id: "unlock",       to: "/unlock",       icon: Unlock,     title: "Unlock PDF",     description: "Server processing: decrypt password-protected PDFs with qpdf.",                                colorClass: "bg-teal-600",    shortDesc: "Server qpdf password removal", category: "security", processing: "server", requiresServer: true },
      { id: "redact",       to: "/redact",       icon: Shield,     title: "Redact PDF",     description: "Browser processing: visually redact selected PDF areas and export flattened redacted pages.", colorClass: "bg-red-600",     shortDesc: "Browser processing: visual redaction export", category: "security", processing: "browser" },
      { id: "privacy-scan", to: "/privacy-scan", icon: ScanSearch, title: "Privacy Scan",   description: "Browser processing: detect sensitive PDF text for review without applying redactions.",       colorClass: "bg-fuchsia-600", shortDesc: "Browser processing: detection-only scan", category: "security", processing: "browser" },
      { id: "stamp",        to: "/stamp",        icon: Stamp,      title: "Stamp PDF",      description: "Browser processing: place stamp or seal images onto PDF pages.",                            colorClass: "bg-amber-600",   shortDesc: "Browser processing: stamp image placement", category: "security", processing: "browser" },
      { id: "sign",         to: "/sign",         icon: Type,       title: "Sign PDF",       description: "Browser processing: add signature images to PDF pages.",                                      colorClass: "bg-emerald-600", shortDesc: "Add your signature to PDF documents", category: "security", processing: "browser" },
    ],
  },
];

// Flat list for convenience
export const ALL_TOOLS: ToolDef[] = TOOL_GROUPS.flatMap((g) => g.tools);

// Lookup by route
export const getToolByRoute = (path: string): ToolDef | undefined =>
  ALL_TOOLS.find((t) => t.to === path);
