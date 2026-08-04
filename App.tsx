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
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 px-4 py-20 text-white md:py-28">
        {/* Animated background blobs */}
        <div className="absolute -left-48 top-0 h-96 w-96 rounded-full bg-indigo-500/15 blur-[120px] animate-pulse-soft" />
        <div className="absolute -right-48 bottom-0 h-96 w-96 rounded-full bg-indigo-400/10 blur-[120px] animate-float" />
        <div className="absolute left-1/3 top-1/2 h-64 w-64 rounded-full bg-violet-500/8 blur-[100px]" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
          }}
        />

        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-3xl animate-fade-in-up">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/80 backdrop-blur-sm shadow-lg shadow-indigo-500/10">
              ✨ 100% 무료 — 모든 문서 도구를 자유롭게 사용하세요
            </p>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl" style={{ letterSpacing: '-0.04em' }}>
              문서 작업,
              <span className="block bg-gradient-to-r from-indigo-300 via-indigo-200 to-cyan-200 bg-clip-text text-transparent">한 번의 흐름으로 완성</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base text-white/60 md:text-lg leading-relaxed">
              DocuFlow는 PDF 변환, 편집, OCR, 보안 처리에 필요한 실용적인 도구를 무료로 제공합니다.
              원하는 작업을 선택하고 파일을 빠르게 처리하세요.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/merge"
                className="group relative rounded-full bg-white px-7 py-3 text-sm font-semibold text-gray-900 shadow-xl shadow-indigo-500/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/30"
              >
                <span className="relative z-10">Merge로 시작하기</span>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
              <Link
                to="/guide"
                className="rounded-full border border-white/25 bg-white/5 px-7 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/40"
              >
                이용 가이드
              </Link>
            </div>
          </div>

          {/* Stats cards */}
          <div className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="group rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5">
              <p className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-300 to-indigo-200 bg-clip-text text-transparent">{ALL_TOOLS.length}+</p>
              <p className="mt-1 text-xs text-white/40 group-hover:text-white/60 transition-colors">문서 도구</p>
            </div>
            <div className="group rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5">
              <p className="text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-300 to-emerald-200 bg-clip-text text-transparent">OCR</p>
              <p className="mt-1 text-xs text-white/40 group-hover:text-white/60 transition-colors">이미지/PDF 텍스트 추출</p>
            </div>
            <div className="group rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5">
              <p className="text-2xl font-bold tracking-tight bg-gradient-to-r from-amber-300 to-amber-200 bg-clip-text text-transparent">HWP</p>
              <p className="mt-1 text-xs text-white/40 group-hover:text-white/60 transition-colors">한글 문서 변환</p>
            </div>
            <div className="group rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5">
              <p className="text-2xl font-bold tracking-tight bg-gradient-to-r from-cyan-300 to-cyan-200 bg-clip-text text-transparent">FREE</p>
              <p className="mt-1 text-xs text-white/40 group-hover:text-white/60 transition-colors">모든 기능 무료</p>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* Quick Start Guide */}
      <section id="usage-guide" className="mx-auto max-w-7xl px-4 -mt-8 relative z-10 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <div className="rounded-2xl border border-gray-200/70 bg-white/90 backdrop-blur-sm px-8 py-10 shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <BookOpen size={18} className="text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">DocuFlow 사용법</h2>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
            1) 도구를 선택하고, 2) 파일을 업로드하고, 3) 옵션을 설정하고, 4) 결과를 다운로드하세요.
            긴 작업의 경우 실시간으로 진행 상황을 확인할 수 있습니다.
          </p>
          <div className="mt-6 grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-50/50 px-4 py-3.5 text-indigo-700 border border-indigo-100/60 font-medium">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-200 text-indigo-700 text-xs font-bold mr-2">1</span>
              변환: PDF, DOCX, EPUB, Markdown, HWP
            </div>
            <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-50/50 px-4 py-3.5 text-emerald-700 border border-emerald-100/60 font-medium">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-200 text-emerald-700 text-xs font-bold mr-2">2</span>
              편집: 병합, 분할, 정리, 워터마크, 서명
            </div>
            <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-50/50 px-4 py-3.5 text-amber-700 border border-amber-100/60 font-medium">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-200 text-amber-700 text-xs font-bold mr-2">3</span>
              보안: 암호 설정, 해제, 보안 처리, 도장
            </div>
          </div>
          <div className="mt-6">
            <Link
              to="/guide"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5"
            >
              <BookOpen size={16} />
              전체 이용 가이드 보기
            </Link>
          </div>
        </div>
      </section>

      {/* Tool Groups */}
      {TOOL_GROUPS.map((group, groupIndex) => (
        <section key={group.label} className="mx-auto max-w-7xl px-4 pt-16 pb-16 last:pb-24">
          <div className="mb-6 animate-fade-in-up" style={{ animationDelay: `${0.1 + groupIndex * 0.1}s` }}>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">{group.label}</h2>
            <p className="mt-1.5 text-sm text-gray-500">
              {getDashboardGroupDescription(group.label)}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {group.tools.map((tool, toolIndex) => (
              <div key={tool.to} className="animate-fade-in-up" style={{ animationDelay: `${0.2 + toolIndex * 0.05}s` }}>
                <ToolCard {...tool} />
              </div>
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
    <div className="relative mb-6">
      <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200/50">
        <Loader2 size={28} className="text-white animate-spin" />
      </div>
      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-500 rounded-full animate-ping opacity-60" />
    </div>
    <p className="text-sm font-semibold text-gray-500">Loading...</p>
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
