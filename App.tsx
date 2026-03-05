import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import {
  Merge,
  Split,
  Image as ImageIcon,
  FileOutput,
  Hash,
  PenTool,
  Search,
  FileType,
  FileText,
  Loader2,
  Minimize2,
  Grid,
  Stamp,
  Shield,
  Unlock,
  Type,
  BookOpen,
} from "lucide-react";

// 페이지 컴포넌트 Lazy Loading
const MergePdfTool = lazy(() =>
  import("./src/pages/PdfTools").then((module) => ({
    default: module.MergePdfTool,
  }))
);
const SplitPdfTool = lazy(() =>
  import("./src/pages/PdfTools").then((module) => ({
    default: module.SplitPdfTool,
  }))
);
const PdfToImgTool = lazy(() =>
  import("./src/pages/PdfTools").then((module) => ({
    default: module.PdfToImgTool,
  }))
);
const ImgToPdfTool = lazy(() =>
  import("./src/pages/PdfTools").then((module) => ({
    default: module.ImgToPdfTool,
  }))
);
const PageNumberTool = lazy(() =>
  import("./src/pages/PdfTools").then((module) => ({
    default: module.PageNumberTool,
  }))
);
const AnnotateTool = lazy(() =>
  import("./src/pages/PdfTools").then((module) => ({
    default: module.AnnotateTool,
  }))
);
const OcrTool = lazy(() =>
  import("./src/pages/PdfTools").then((module) => ({ default: module.OcrTool }))
);
const PdfToDocxTool = lazy(() =>
  import("./src/pages/OfficeTools").then((module) => ({
    default: module.PdfToDocxTool,
  }))
);
const DocxToPdfTool = lazy(() =>
  import("./src/pages/OfficeTools").then((module) => ({
    default: module.DocxToPdfTool,
  }))
);
const PdfToMdTool = lazy(() =>
  import("./src/pages/OfficeTools").then((module) => ({
    default: module.PdfToMdTool,
  }))
);
const EpubToPdfTool = lazy(() =>
  import("./src/pages/OfficeTools").then((module) => ({
    default: module.EpubToPdfTool,
  }))
);
// New Tools
const CompressPdfTool = lazy(() =>
  import("./src/pages/PdfTools").then((module) => ({
    default: module.CompressPdfTool,
  }))
);
const OrganizePdfTool = lazy(() =>
  import("./src/pages/PdfTools").then((module) => ({
    default: module.OrganizePdfTool,
  }))
);
const WatermarkTool = lazy(() =>
  import("./src/pages/WatermarkTool").then((module) => ({
    default: module.WatermarkTool,
  }))
);
const ProtectTool = lazy(() =>
  import("./src/pages/ProtectTool").then((module) => ({
    default: module.ProtectTool,
  }))
);
const UnlockTool = lazy(() =>
  import("./src/pages/ProtectTool").then((module) => ({
    default: module.UnlockTool,
  }))
);
const SignTool = lazy(() =>
  import("./src/pages/SignTool").then((module) => ({
    default: module.SignTool,
  }))
);
// 공통 컴포넌트 임포트
import { Navbar, Footer } from "./src/components/Layout";
import { ToolCard } from "./src/components/Shared";
import {
  ErrorBoundary,
  SimpleErrorFallback,
} from "./src/components/ErrorBoundary";

const Dashboard = () => {
  const pdfTools = [
    {
      to: "/merge",
      icon: Merge,
      title: "Merge Files",
      description:
        "Combine PDFs, JPG, PNG, and other image files into one unified PDF document.",
      colorClass: "bg-rose-500",
    },
    {
      to: "/split",
      icon: Split,
      title: "Split PDF",
      description: "Separate one page or a whole set for easy conversion.",
      colorClass: "bg-orange-500",
    },
    {
      to: "/pdf-to-img",
      icon: ImageIcon,
      title: "PDF to JPG",
      description: "Extract images from your PDF or save each page as a separate image.",
      colorClass: "bg-amber-500",
    },
    {
      to: "/img-to-pdf",
      icon: FileOutput,
      title: "JPG to PDF",
      description: "Convert your images to a PDF file in seconds.",
      colorClass: "bg-emerald-500",
    },
    {
      to: "/page-numbers",
      icon: Hash,
      title: "Page Numbers",
      description: "Add page numbers into your PDF documents easily.",
      colorClass: "bg-cyan-500",
    },
    {
      to: "/annotate",
      icon: PenTool,
      title: "Annotate PDF",
      description: "Draw, type and add notes to your PDF documents.",
      colorClass: "bg-blue-600",
    },
    {
      to: "/ocr",
      icon: Search,
      title: "OCR Reader",
      description: "Extract text from PDFs and images with OCR (local-first support).",
      colorClass: "bg-violet-600",
    },
    {
      to: "/compress",
      icon: Minimize2,
      title: "Compress PDF",
      description: "Reduce file size while maintaining quality.",
      colorClass: "bg-rose-600",
    },
    {
      to: "/organize",
      icon: Grid,
      title: "Organize PDF",
      description: "Rearrange, rotate, and delete pages visually.",
      colorClass: "bg-indigo-500",
    },
    {
      to: "/watermark",
      icon: Stamp,
      title: "Watermark",
      description: "Add text or image watermarks for security.",
      colorClass: "bg-blue-400",
    },
    {
      to: "/protect",
      icon: Shield,
      title: "Protect PDF",
      description: "Encrypt your PDF with a password.",
      colorClass: "bg-gray-700",
    },
    {
      to: "/unlock",
      icon: Unlock,
      title: "Unlock PDF",
      description: "Unlock password-protected PDF files.",
      colorClass: "bg-teal-600",
    },
    {
      to: "/sign",
      icon: Type,
      title: "Sign & Stamp",
      description: "Add signatures easily.",
      colorClass: "bg-emerald-600",
    },
  ];

  const officeTools = [
    {
      to: "/pdf-to-docx",
      icon: FileType,
      title: "PDF to Word",
      description: "Convert PDF files into editable DOCX documents.",
      colorClass: "bg-blue-700",
    },
    {
      to: "/docx-to-pdf",
      icon: FileType,
      title: "Word to PDF",
      description: "Generate high-quality PDF files from DOCX documents.",
      colorClass: "bg-indigo-600",
    },
    {
      to: "/pdf-to-md",
      icon: FileText,
      title: "PDF to Markdown",
      description: "Extract text from PDF as clean Markdown for editing.",
      colorClass: "bg-purple-600",
    },
    {
      to: "/epub-to-pdf",
      icon: BookOpen,
      title: "EPUB to PDF",
      description: "Convert EPUB ebook files into readable PDF documents.",
      colorClass: "bg-emerald-600",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-brand-900 to-sky-900 px-4 py-20 text-white md:py-24">
        <div className="absolute -left-24 top-10 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -right-24 bottom-2 h-64 w-64 rounded-full bg-brand-300/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-1 text-sm font-medium text-sky-100">
              Smart PDF Toolkit for daily workflows
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">
              Document work, completed
              <span className="block text-cyan-200">in a single flow</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base text-slate-100/90 md:text-lg">
              DocuFlow provides practical tools for conversion, editing, OCR, and
              security. Start with the job you need and process your files quickly
              in your browser.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/merge"
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100"
              >
                Start with Merge
              </Link>
              <a
                href="#usage-guide"
                className="rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Usage Guide
              </a>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 md:mt-14 md:grid-cols-4">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-2xl font-bold">17+</p>
              <p className="mt-1 text-xs text-slate-100/80">Document tools</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-2xl font-bold">OCR</p>
              <p className="mt-1 text-xs text-slate-100/80">Image/PDF text extraction</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-2xl font-bold">EPUB</p>
              <p className="mt-1 text-xs text-slate-100/80">Ebook conversion workflow</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-2xl font-bold">Secure</p>
              <p className="mt-1 text-xs text-slate-100/80">Protect and unlock PDF</p>
            </div>
          </div>
        </div>
      </section>

      <section id="usage-guide" className="mx-auto max-w-7xl px-4 py-14">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm md:px-8">
          <h2 className="text-2xl font-bold text-slate-900">How to use DocuFlow</h2>
          <p className="mt-2 text-sm text-slate-600 md:text-base">
            1) Select a tool card, 2) upload files, 3) configure options, and 4)
            download the result. For long tasks, progress feedback is shown in real time.
          </p>
          <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-xl bg-slate-100 px-4 py-3 text-slate-700">
              Conversion: PDF, DOCX, EPUB, Markdown
            </div>
            <div className="rounded-xl bg-slate-100 px-4 py-3 text-slate-700">
              Editing: Merge, Split, Organize, Watermark, Sign
            </div>
            <div className="rounded-xl bg-slate-100 px-4 py-3 text-slate-700">
              Security: Protect/Unlock + OCR extraction
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">PDF Essential Tools</h2>
            <p className="text-sm text-slate-600 md:text-base">
              Frequently used editing, optimization, and security operations for PDF files.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {pdfTools.map((tool) => (
            <ToolCard key={tool.to} {...tool} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Office & Reading Tools</h2>
            <p className="text-sm text-slate-600 md:text-base">
              Convert across office and reading formats for sharing and editing workflows.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {officeTools.map((tool) => (
            <ToolCard key={tool.to} {...tool} />
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

// 로딩 컴포넌트
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
    <div className="w-16 h-16 bg-brand-600 rounded-full flex items-center justify-center mb-4">
      <Loader2 size={32} className="text-white animate-spin" />
    </div>
    <p className="text-lg font-medium text-gray-700">Loading tool...</p>
  </div>
);

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/merge"
          element={
            <ErrorBoundary fallback={<SimpleErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>
                <MergePdfTool />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/split"
          element={
            <ErrorBoundary fallback={<SimpleErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>
                <SplitPdfTool />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/pdf-to-img"
          element={
            <ErrorBoundary fallback={<SimpleErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>
                <PdfToImgTool />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/img-to-pdf"
          element={
            <ErrorBoundary fallback={<SimpleErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>
                <ImgToPdfTool />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/page-numbers"
          element={
            <ErrorBoundary fallback={<SimpleErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>
                <PageNumberTool />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/annotate"
          element={
            <ErrorBoundary fallback={<SimpleErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>
                <AnnotateTool />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/ocr"
          element={
            <ErrorBoundary fallback={<SimpleErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>
                <OcrTool />
              </Suspense>
            </ErrorBoundary>
          }
        />
        {/* New PDF Tools Routes */}
        <Route
          path="/compress"
          element={
            <ErrorBoundary fallback={<SimpleErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>
                <CompressPdfTool />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/organize"
          element={
            <ErrorBoundary fallback={<SimpleErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>
                <OrganizePdfTool />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/watermark"
          element={
            <ErrorBoundary fallback={<SimpleErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>
                <WatermarkTool />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/protect"
          element={
            <ErrorBoundary fallback={<SimpleErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>
                <ProtectTool />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/sign"
          element={
            <ErrorBoundary fallback={<SimpleErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>
                <SignTool />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/unlock"
          element={
            <ErrorBoundary fallback={<SimpleErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>
                <UnlockTool />
              </Suspense>
            </ErrorBoundary>
          }
        />

        {/* New Office Tools Routes */}
        <Route
          path="/pdf-to-docx"
          element={
            <ErrorBoundary fallback={<SimpleErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>
                <PdfToDocxTool />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/docx-to-pdf"
          element={
            <ErrorBoundary fallback={<SimpleErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>
                <DocxToPdfTool />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/pdf-to-md"
          element={
            <ErrorBoundary fallback={<SimpleErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>
                <PdfToMdTool />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/epub-to-pdf"
          element={
            <ErrorBoundary fallback={<SimpleErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>
                <EpubToPdfTool />
              </Suspense>
            </ErrorBoundary>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
