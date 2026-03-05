// src/data/tools.ts
import {
  Merge, Split, Image as ImageIcon, FileOutput, Hash, PenTool, Search,
  Minimize2, Grid, Stamp, Shield, Unlock, Type, FileType, FileText,
  BookOpen,
} from "lucide-react";
import { ComponentType } from "react";

export interface ToolDef {
  to: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  colorClass: string;
  shortDesc: string; // one-liner for tool page header
}

export interface ToolGroup {
  label: string;
  tools: ToolDef[];
}

export const TOOL_GROUPS: ToolGroup[] = [
  {
    label: "PDF Tools",
    tools: [
      { to: "/merge",        icon: Merge,      title: "Merge Files",     description: "Combine PDFs, JPG, PNG, and other image files into one unified PDF document.", colorClass: "bg-rose-500",    shortDesc: "Combine multiple files into a single PDF" },
      { to: "/split",        icon: Split,      title: "Split PDF",       description: "Separate one page or a whole set for easy conversion.",                         colorClass: "bg-orange-500",  shortDesc: "Extract pages or split into multiple PDFs" },
      { to: "/pdf-to-img",   icon: ImageIcon,  title: "PDF to JPG",      description: "Extract images from your PDF or save each page as a separate image.",           colorClass: "bg-amber-500",   shortDesc: "Save each PDF page as an image file" },
      { to: "/img-to-pdf",   icon: FileOutput, title: "JPG to PDF",      description: "Convert your images to a PDF file in seconds.",                                 colorClass: "bg-emerald-500", shortDesc: "Turn images into a PDF document" },
      { to: "/page-numbers", icon: Hash,       title: "Page Numbers",    description: "Add page numbers into your PDF documents easily.",                              colorClass: "bg-cyan-500",    shortDesc: "Insert page numbers into any PDF" },
      { to: "/annotate",     icon: PenTool,    title: "Annotate PDF",    description: "Draw, type and add notes to your PDF documents.",                               colorClass: "bg-blue-600",    shortDesc: "Draw, type and annotate PDF pages" },
      { to: "/ocr",          icon: Search,     title: "OCR Reader",      description: "Extract text from PDFs and images with OCR (local-first support).",             colorClass: "bg-violet-600",  shortDesc: "Extract text from scanned PDFs and images" },
      { to: "/compress",     icon: Minimize2,  title: "Compress PDF",    description: "Reduce file size while maintaining quality.",                                   colorClass: "bg-rose-600",    shortDesc: "Reduce PDF file size without losing quality" },
      { to: "/organize",     icon: Grid,       title: "Organize PDF",    description: "Rearrange, rotate, and delete pages visually.",                                 colorClass: "bg-indigo-500",  shortDesc: "Reorder, rotate or delete PDF pages" },
    ],
  },
  {
    label: "Office & Reading",
    tools: [
      { to: "/pdf-to-docx",  icon: FileType,   title: "PDF to Word",     description: "Convert PDF files into editable DOCX documents.",                              colorClass: "bg-blue-700",    shortDesc: "Convert PDF to editable Word document" },
      { to: "/docx-to-pdf",  icon: FileType,   title: "Word to PDF",     description: "Generate high-quality PDF files from DOCX documents.",                         colorClass: "bg-indigo-600",  shortDesc: "Convert Word documents to PDF" },
      { to: "/pdf-to-md",    icon: FileText,   title: "PDF to Markdown",  description: "Extract text from PDF as clean Markdown for editing.",                        colorClass: "bg-purple-600",  shortDesc: "Extract PDF content as clean Markdown" },
      { to: "/epub-to-pdf",  icon: BookOpen,   title: "EPUB to PDF",     description: "Convert EPUB ebook files into readable PDF documents.",                         colorClass: "bg-emerald-600", shortDesc: "Convert ebooks to shareable PDFs" },
    ],
  },
  {
    label: "Security",
    tools: [
      { to: "/watermark",    icon: Stamp,      title: "Watermark",       description: "Add text or image watermarks for security.",                                   colorClass: "bg-blue-400",    shortDesc: "Stamp text or image watermarks on PDFs" },
      { to: "/protect",      icon: Shield,     title: "Protect PDF",     description: "Encrypt your PDF with a password.",                                            colorClass: "bg-gray-700",    shortDesc: "Password-protect your PDF files" },
      { to: "/unlock",       icon: Unlock,     title: "Unlock PDF",      description: "Remove password from PDF files.",                                              colorClass: "bg-teal-600",    shortDesc: "Remove password from PDF files" },
      { to: "/sign",         icon: Type,       title: "Sign & Stamp",    description: "Add signatures easily.",                                                       colorClass: "bg-emerald-600", shortDesc: "Add your signature to PDF documents" },
    ],
  },
];

// Flat list for convenience
export const ALL_TOOLS: ToolDef[] = TOOL_GROUPS.flatMap((g) => g.tools);

// Lookup by route
export const getToolByRoute = (path: string): ToolDef | undefined =>
  ALL_TOOLS.find((t) => t.to === path);
