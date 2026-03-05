import React, { Suspense, lazy } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AppShell } from "./src/components/Layout";
import { WelcomePanel } from "./src/pages/WelcomePanel";
import {
  ErrorBoundary,
  SimpleErrorFallback,
} from "./src/components/ErrorBoundary";

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

// 로딩 컴포넌트
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
      <Loader2 size={32} className="text-white animate-spin" />
    </div>
    <p className="text-lg font-medium text-gray-700">Loading tool...</p>
  </div>
);

const App = () => {
  return (
    <Router>
      <AppShell>
        <Routes>
          <Route path="/" element={<WelcomePanel />} />
          <Route path="/merge" element={<ErrorBoundary fallback={<SimpleErrorFallback />}><Suspense fallback={<LoadingSpinner />}><MergePdfTool /></Suspense></ErrorBoundary>} />
          <Route path="/split" element={<ErrorBoundary fallback={<SimpleErrorFallback />}><Suspense fallback={<LoadingSpinner />}><SplitPdfTool /></Suspense></ErrorBoundary>} />
          <Route path="/pdf-to-img" element={<ErrorBoundary fallback={<SimpleErrorFallback />}><Suspense fallback={<LoadingSpinner />}><PdfToImgTool /></Suspense></ErrorBoundary>} />
          <Route path="/img-to-pdf" element={<ErrorBoundary fallback={<SimpleErrorFallback />}><Suspense fallback={<LoadingSpinner />}><ImgToPdfTool /></Suspense></ErrorBoundary>} />
          <Route path="/page-numbers" element={<ErrorBoundary fallback={<SimpleErrorFallback />}><Suspense fallback={<LoadingSpinner />}><PageNumberTool /></Suspense></ErrorBoundary>} />
          <Route path="/annotate" element={<ErrorBoundary fallback={<SimpleErrorFallback />}><Suspense fallback={<LoadingSpinner />}><AnnotateTool /></Suspense></ErrorBoundary>} />
          <Route path="/ocr" element={<ErrorBoundary fallback={<SimpleErrorFallback />}><Suspense fallback={<LoadingSpinner />}><OcrTool /></Suspense></ErrorBoundary>} />
          <Route path="/compress" element={<ErrorBoundary fallback={<SimpleErrorFallback />}><Suspense fallback={<LoadingSpinner />}><CompressPdfTool /></Suspense></ErrorBoundary>} />
          <Route path="/organize" element={<ErrorBoundary fallback={<SimpleErrorFallback />}><Suspense fallback={<LoadingSpinner />}><OrganizePdfTool /></Suspense></ErrorBoundary>} />
          <Route path="/watermark" element={<ErrorBoundary fallback={<SimpleErrorFallback />}><Suspense fallback={<LoadingSpinner />}><WatermarkTool /></Suspense></ErrorBoundary>} />
          <Route path="/protect" element={<ErrorBoundary fallback={<SimpleErrorFallback />}><Suspense fallback={<LoadingSpinner />}><ProtectTool /></Suspense></ErrorBoundary>} />
          <Route path="/unlock" element={<ErrorBoundary fallback={<SimpleErrorFallback />}><Suspense fallback={<LoadingSpinner />}><UnlockTool /></Suspense></ErrorBoundary>} />
          <Route path="/sign" element={<ErrorBoundary fallback={<SimpleErrorFallback />}><Suspense fallback={<LoadingSpinner />}><SignTool /></Suspense></ErrorBoundary>} />
          <Route path="/pdf-to-docx" element={<ErrorBoundary fallback={<SimpleErrorFallback />}><Suspense fallback={<LoadingSpinner />}><PdfToDocxTool /></Suspense></ErrorBoundary>} />
          <Route path="/docx-to-pdf" element={<ErrorBoundary fallback={<SimpleErrorFallback />}><Suspense fallback={<LoadingSpinner />}><DocxToPdfTool /></Suspense></ErrorBoundary>} />
          <Route path="/pdf-to-md" element={<ErrorBoundary fallback={<SimpleErrorFallback />}><Suspense fallback={<LoadingSpinner />}><PdfToMdTool /></Suspense></ErrorBoundary>} />
          <Route path="/epub-to-pdf" element={<ErrorBoundary fallback={<SimpleErrorFallback />}><Suspense fallback={<LoadingSpinner />}><EpubToPdfTool /></Suspense></ErrorBoundary>} />
        </Routes>
      </AppShell>
    </Router>
  );
};

export default App;
