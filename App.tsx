import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Loader2, BookOpen } from "lucide-react";
import { Navbar, Footer } from "./src/components/Layout";
import { ToolCard } from "./src/components/Shared";
import {
  ErrorBoundary,
  SimpleErrorFallback,
} from "./src/components/ErrorBoundary";
import { ALL_TOOLS, TOOL_GROUPS } from "./src/data/tools";

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
const HwpToPdfTool = lazy(() =>
  import("./src/pages/HwpTools").then((module) => ({
    default: module.HwpToPdfTool,
  }))
);
const PdfToHwpTool = lazy(() =>
  import("./src/pages/HwpTools").then((module) => ({
    default: module.PdfToHwpTool,
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
const RedactionTool = lazy(() =>
  import("./src/pages/RedactionTool").then((module) => ({
    default: module.RedactionTool,
  }))
);
const PrivacyScanTool = lazy(() =>
  import("./src/pages/RedactionTool").then((module) => ({
    default: function PrivacyScanRoute() {
      return <module.RedactionTool detectionOnly />;
    },
  }))
);
const StampTool = lazy(() =>
  import("./src/pages/StampTool").then((module) => ({
    default: module.StampTool,
  }))
);
const PrivacyPolicy = lazy(() => import("./src/pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./src/pages/TermsOfService"));
const GuidePage = lazy(() => import("./src/pages/GuidePage"));
const getDashboardGroupDescription = (label: string) => {
  switch (label) {
    case "PDF 도구":
      return "PDF 파일의 자주 사용하는 편집, 최적화, 추출 기능입니다.";
    case "오피스 & 문서 변환":
      return "오피스 및 문서 형식 간 변환으로 공유와 편집 워크플로우를 지원합니다.";
    case "보안 & 개인정보":
      return "PDF 보안 설정, 잠금 해제, 보안 처리, 도장, 서명, 민감한 내용 검사를 수행합니다.";
    default:
      return "원하는 문서 작업을 선택하고 파일을 빠르게 처리하세요.";
  }
};

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-cyan-950 px-4 py-20 text-white md:py-28">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-indigo-500/15 blur-[100px]" />
        <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/80 backdrop-blur-sm">
              100% 무료 — 모든 문서 도구를 자유롭게 사용하세요
            </p>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl" style={{ letterSpacing: '-0.04em' }}>
              문서 작업,
              <span className="block text-indigo-300">한 번의 흐름으로 완성</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base text-white/70 md:text-lg leading-relaxed">
              DocuFlow는 PDF 변환, 편집, OCR, 보안 처리에 필요한 실용적인 도구를 무료로 제공합니다.
              원하는 작업을 선택하고 파일을 빠르게 처리하세요.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/merge"
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                Merge로 시작하기
              </Link>
              <Link
                to="/guide"
                className="rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10"
              >
                이용 가이드
              </Link>
            </div>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <p className="text-2xl font-bold tracking-tight">{ALL_TOOLS.length}+</p>
              <p className="mt-1 text-xs text-white/50">문서 도구</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <p className="text-2xl font-bold tracking-tight">OCR</p>
              <p className="mt-1 text-xs text-white/50">이미지/PDF 텍스트 추출</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <p className="text-2xl font-bold tracking-tight">HWP</p>
              <p className="mt-1 text-xs text-white/50">한글 문서 변환</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <p className="text-2xl font-bold tracking-tight">FREE</p>
              <p className="mt-1 text-xs text-white/50">모든 기능 무료</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Start Guide */}
      <section id="usage-guide" className="mx-auto max-w-7xl px-4 py-16">
        <div className="rounded-2xl border border-gray-200 bg-white px-8 py-10">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900">DocuFlow 사용법</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            1) 도구를 선택하고, 2) 파일을 업로드하고, 3) 옵션을 설정하고, 4) 결과를 다운로드하세요.
            긴 작업의 경우 실시간으로 진행 상황을 확인할 수 있습니다.
          </p>
          <div className="mt-6 grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-lg bg-gray-50 px-4 py-3 text-gray-600 border border-gray-100">
              변환: PDF, DOCX, EPUB, Markdown, HWP
            </div>
            <div className="rounded-lg bg-gray-50 px-4 py-3 text-gray-600 border border-gray-100">
              편집: 병합, 분할, 정리, 워터마크, 서명
            </div>
            <div className="rounded-lg bg-gray-50 px-4 py-3 text-gray-600 border border-gray-100">
              보안: 암호 설정, 해제, 보안 처리, 도장
            </div>
          </div>
          <div className="mt-6">
            <Link
              to="/guide"
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md"
            >
              <BookOpen size={16} />
              전체 이용 가이드 보기
            </Link>
          </div>
        </div>
      </section>

      {/* Tool Groups */}
      {TOOL_GROUPS.map((group) => (
        <section key={group.label} className="mx-auto max-w-7xl px-4 pb-16 last:pb-20">
          <div className="mb-6">
            <h2 className="text-xl font-semibold tracking-tight text-gray-900">{group.label}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {getDashboardGroupDescription(group.label)}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {group.tools.map((tool) => (
              <ToolCard key={tool.to} {...tool} />
            ))}
          </div>
        </section>
      ))}

      <Footer />
    </div>
  );
};

// 로딩 컴포넌트
const LoadingSpinner = () => (
  <div className="min-h-screen bg-white flex flex-col items-center justify-center">
    <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-sm shadow-indigo-200">
      <Loader2 size={24} className="text-white animate-spin" />
    </div>
    <p className="text-sm font-medium text-gray-500">Loading...</p>
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
        <Route
          path="/redact"
          element={
            <ErrorBoundary fallback={<SimpleErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>
                <RedactionTool />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/privacy-scan"
          element={
            <ErrorBoundary fallback={<SimpleErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>
                <PrivacyScanTool />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/stamp"
          element={
            <ErrorBoundary fallback={<SimpleErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>
                <StampTool />
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
          path="/hwp-to-pdf"
          element={
            <ErrorBoundary fallback={<SimpleErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>
                <HwpToPdfTool />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/pdf-to-hwp"
          element={
            <ErrorBoundary fallback={<SimpleErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>
                <PdfToHwpTool />
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
        {/* Legal & Guide Routes */}
        <Route
          path="/privacy"
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <PrivacyPolicy />
            </Suspense>
          }
        />
        <Route
          path="/terms"
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <TermsOfService />
            </Suspense>
          }
        />
        <Route
          path="/guide"
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <GuidePage />
            </Suspense>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
