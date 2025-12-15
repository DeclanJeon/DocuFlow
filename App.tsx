import React, { Suspense, lazy } from "react";
import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";
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
  Type,
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
const SignTool = lazy(() =>
  import("./src/pages/SignTool").then((module) => ({
    default: module.SignTool,
  }))
);
const MdToPdfTool = lazy(() =>
  import("./src/pages/OfficeTools").then((module) => ({
    default: module.MdToPdfTool,
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
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-white pt-20 pb-24 px-4 text-center border-b border-gray-100">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
          Everything you need to{" "}
          <span className="text-brand-600">manage documents</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10">
          Merge, split, compress, convert, rotate, unlock and watermark PDFs
          with just a few clicks.
        </p>
      </section>

      {/* Tools Grid */}
      <section className="max-w-7xl mx-auto px-4 -mt-16 pb-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ToolCard
          to="/merge"
          icon={Merge}
          title="Merge Files"
          description="Combine PDFs, JPG, PNG, and other image files into one unified PDF document."
          colorClass="bg-rose-500"
        />
        <ToolCard
          to="/split"
          icon={Split}
          title="Split PDF"
          description="Separate one page or a whole set for easy conversion."
          colorClass="bg-orange-500"
        />
        <ToolCard
          to="/pdf-to-img"
          icon={ImageIcon}
          title="PDF to JPG"
          description="Extract images from your PDF or save each page as a separate image."
          colorClass="bg-amber-500"
        />
        <ToolCard
          to="/img-to-pdf"
          icon={FileOutput}
          title="JPG to PDF"
          description="Convert your images to a PDF file in seconds."
          colorClass="bg-emerald-500"
        />
        <ToolCard
          to="/page-numbers"
          icon={Hash}
          title="Page Numbers"
          description="Add page numbers into your PDF documents easily."
          colorClass="bg-cyan-500"
        />
        <ToolCard
          to="/annotate"
          icon={PenTool}
          title="Annotate PDF"
          description="Draw, type and add notes to your PDF documents."
          colorClass="bg-blue-600"
        />
        <ToolCard
          to="/ocr"
          icon={Search}
          title="OCR Reader"
          description="Recognize text in PDFs and images using advanced AI."
          colorClass="bg-violet-600"
        />

        {/* NEW PDF Tools */}
        <ToolCard
          to="/compress"
          icon={Minimize2}
          title="Compress PDF"
          description="Reduce file size while maintaining quality."
          colorClass="bg-rose-600"
        />
        <ToolCard
          to="/organize"
          icon={Grid}
          title="Organize PDF"
          description="Rearrange, rotate, and delete pages visually."
          colorClass="bg-indigo-500"
        />
        <ToolCard
          to="/watermark"
          icon={Stamp}
          title="Watermark"
          description="Add text or image watermarks for security."
          colorClass="bg-blue-400"
        />
        <ToolCard
          to="/protect"
          icon={Shield}
          title="Protect PDF"
          description="Encrypt your PDF with a password."
          colorClass="bg-gray-700"
        />
        <ToolCard
          to="/sign"
          icon={Type}
          title="Sign & Stamp"
          description="Add signatures easily."
          colorClass="bg-emerald-600"
        />

        {/* NEW Office Tools */}
        <ToolCard
          to="/pdf-to-docx"
          icon={FileType}
          title="PDF to Word"
          description="Convert to editable DOCX."
          colorClass="bg-blue-700"
        />
        <ToolCard
          to="/docx-to-pdf"
          icon={FileType}
          title="Word to PDF"
          description="Convert DOCX to PDF."
          colorClass="bg-indigo-600"
        />
        <ToolCard
          to="/pdf-to-md"
          icon={FileText}
          title="PDF to Markdown"
          description="Extract text from PDF as Markdown."
          colorClass="bg-purple-600"
        />
        <ToolCard
          to="/md-to-pdf"
          icon={FileText}
          title="Markdown to PDF"
          description="Convert Markdown files to PDF."
          colorClass="bg-green-600"
        />
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
          path="/md-to-pdf"
          element={
            <ErrorBoundary fallback={<SimpleErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>
                <MdToPdfTool />
              </Suspense>
            </ErrorBoundary>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
