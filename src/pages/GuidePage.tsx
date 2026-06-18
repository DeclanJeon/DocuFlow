import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Home, BookOpen, Merge, Split, Image as ImageIcon, FileOutput,
  Hash, PenTool, Search, Minimize2, Grid, Stamp, Shield, Unlock, Type,
  FileType, FileText, ScanSearch, FileUp,
} from "lucide-react";

interface GuideSectionProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconColor: string;
  title: string;
  description: string;
  steps: string[];
  route: string;
  processing: string;
}

const GuideSection = ({ icon: Icon, iconColor, title, description, steps, route, processing }: GuideSectionProps) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="p-6">
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${iconColor}`}>
          <Icon size={24} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              processing === "browser" ? "bg-blue-100 text-blue-700" :
              processing === "server" ? "bg-purple-100 text-purple-700" :
              "bg-orange-100 text-orange-700"
            }`}>
              {processing === "browser" ? "브라우저 처리" : processing === "server" ? "서버 처리" : "외부 OCR"}
            </span>
          </div>
          <p className="text-sm text-slate-600 mb-4">{description}</p>
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-700">{step}</p>
              </div>
            ))}
          </div>
          <Link
            to={route}
            className="inline-flex items-center gap-1.5 mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            도구 사용하기
          </Link>
        </div>
      </div>
    </div>
  </div>
);

const guideItems: GuideSectionProps[] = [
  {
    icon: Merge, iconColor: "bg-rose-500",
    title: "PDF 병합",
    description: "여러 PDF 파일이나 이미지를 하나의 PDF로 합칩니다.",
    steps: [
      "파일을 업로드하거나 드래그 앤 드롭하세요.",
      "병합할 파일의 순서를 조정할 수 있습니다.",
      "'병합' 버튼을 클릭하면 하나의 PDF로 합쳐집니다.",
      "완료된 파일을 다운로드하세요.",
    ],
    route: "/merge", processing: "browser",
  },
  {
    icon: Split, iconColor: "bg-orange-500",
    title: "PDF 분할",
    description: "하나의 PDF를 여러 파일로 분할합니다.",
    steps: [
      "PDF 파일을 업로드하세요.",
      "분할할 페이지 범위를 설정하세요.",
      "'분할' 버튼을 클릭하면 선택한 범위의 PDF가 생성됩니다.",
      "각 파일을 개별적으로 다운로드하세요.",
    ],
    route: "/split", processing: "browser",
  },
  {
    icon: ImageIcon, iconColor: "bg-amber-500",
    title: "PDF → 이미지",
    description: "PDF 페이지를 JPG 이미지로 변환합니다.",
    steps: [
      "PDF 파일을 업로드하세요.",
      "이미지 형식(JPG/PNG)과 품질을 설정하세요.",
      "'변환' 버튼을 클릭하면 각 페이지가 이미지로 변환됩니다.",
      "이미지를 개별적으로 또는 ZIP으로 다운로드하세요.",
    ],
    route: "/pdf-to-img", processing: "browser",
  },
  {
    icon: FileOutput, iconColor: "bg-emerald-500",
    title: "이미지 → PDF",
    description: "이미지 파일들을 PDF로 변환합니다.",
    steps: [
      "이미지 파일(JPG, PNG 등)을 업로드하세요.",
      "여러 이미지를 하나의 PDF로 합칠 수 있습니다.",
      "'변환' 버튼을 클릭하면 PDF가 생성됩니다.",
      "완료된 PDF를 다운로드하세요.",
    ],
    route: "/img-to-pdf", processing: "browser",
  },
  {
    icon: Hash, iconColor: "bg-cyan-500",
    title: "페이지 번호",
    description: "PDF에 페이지 번호를 추가합니다.",
    steps: [
      "PDF 파일을 업로드하세요.",
      "페이지 번호 위치(상단/하단, 좌/중/우)를 선택하세요.",
      "시작 번호와 형식을 설정하세요.",
      "'적용' 버튼을 클릭하면 페이지 번호가 추가됩니다.",
    ],
    route: "/page-numbers", processing: "browser",
  },
  {
    icon: PenTool, iconColor: "bg-blue-600",
    title: "PDF 주석",
    description: "PDF에 텍스트, 그리기, 메모를 추가합니다.",
    steps: [
      "PDF 파일을 업로드하세요.",
      "도구 모음에서 주석 유형을 선택하세요.",
      "페이지에 직접 텍스트를 입력하거나 그릴 수 있습니다.",
      "'저장' 버튼을 클릭하면 주석이 포함된 PDF가 생성됩니다.",
    ],
    route: "/annotate", processing: "browser",
  },
  {
    icon: Minimize2, iconColor: "bg-rose-600",
    title: "PDF 압축",
    description: "Ghostscript를 사용하여 PDF 파일 크기를 줄입니다.",
    steps: [
      "PDF 파일을 업로드하세요.",
      "압축 프리셋을 선택하세요 (screen: 최소, ebook: 균형, printer/prepress: 고품질).",
      "'압축' 버튼을 클릭하면 파일 크기가 줄어듭니다.",
      "압축된 파일을 다운로드하세요.",
    ],
    route: "/compress", processing: "server",
  },
  {
    icon: Grid, iconColor: "bg-indigo-500",
    title: "PDF 정리",
    description: "PDF 페이지를 재정렬, 회전, 삭제합니다.",
    steps: [
      "PDF 파일을 업로드하세요.",
      "썸네일을 드래그하여 페이지 순서를 변경하세요.",
      "회전하거나 삭제할 페이지를 선택하세요.",
      "'저장' 버튼을 클릭하면 변경된 PDF가 생성됩니다.",
    ],
    route: "/organize", processing: "browser",
  },
  {
    icon: FileType, iconColor: "bg-blue-700",
    title: "PDF → Word",
    description: "PDF를 편집 가능한 DOCX 문서로 변환합니다.",
    steps: [
      "PDF 파일을 업로드하세요.",
      "'변환' 버튼을 클릭하면 DOCX가 생성됩니다.",
      "완료된 DOCX 파일을 다운로드하세요.",
    ],
    route: "/pdf-to-docx", processing: "browser",
  },
  {
    icon: FileType, iconColor: "bg-indigo-600",
    title: "Word → PDF",
    description: "DOCX 문서를 PDF로 변환합니다.",
    steps: [
      "DOCX 파일을 업로드하세요.",
      "'변환' 버튼을 클릭하면 서버에서 PDF가 생성됩니다.",
      "완료된 PDF를 다운로드하세요.",
    ],
    route: "/docx-to-pdf", processing: "server",
  },
  {
    icon: FileText, iconColor: "bg-purple-600",
    title: "PDF → Markdown",
    description: "PDF를 Markdown 텍스트로 변환합니다. OCR 폴백을 지원합니다.",
    steps: [
      "PDF 파일을 업로드하세요.",
      "모드를 선택하세요 (fast: 빠른 추출, balanced: OCR 자동, accurate: OCR 강제).",
      "OCR 엔진을 선택할 수 있습니다 (Tesseract, RapidOCR).",
      "'변환' 버튼을 클릭하면 Markdown이 생성됩니다.",
    ],
    route: "/pdf-to-md", processing: "server",
  },
  {
    icon: FileText, iconColor: "bg-red-600",
    title: "HWP/HWPX → PDF",
    description: "한글 문서를 PDF로 변환합니다.",
    steps: [
      "HWP 또는 HWPX 파일을 업로드하세요.",
      "'변환' 버튼을 클릭하면 서버에서 PDF가 생성됩니다.",
      "완료된 PDF를 다운로드하세요.",
    ],
    route: "/hwp-to-pdf", processing: "server",
  },
  {
    icon: FileUp, iconColor: "bg-orange-600",
    title: "PDF → HWP",
    description: "PDF를 한글 문서로 변환합니다.",
    steps: [
      "PDF 파일을 업로드하세요.",
      "'변환' 버튼을 클릭하면 서버에서 HWP가 생성됩니다.",
      "완료된 HWP 파일을 다운로드하세요.",
    ],
    route: "/pdf-to-hwp", processing: "server",
  },
  {
    icon: BookOpen, iconColor: "bg-emerald-600",
    title: "EPUB → PDF",
    description: "EPUB 전자책을 PDF로 변환합니다.",
    steps: [
      "EPUB 파일을 업로드하세요.",
      "'변환' 버튼을 클릭하면 서버에서 PDF가 생성됩니다.",
      "완료된 PDF를 다운로드하세요.",
    ],
    route: "/epub-to-pdf", processing: "server",
  },
  {
    icon: Stamp, iconColor: "bg-blue-400",
    title: "워터마크",
    description: "PDF에 텍스트 또는 이미지 워터마크를 추가합니다.",
    steps: [
      "PDF 파일을 업로드하세요.",
      "워터마크 유형(텍스트/이미지)을 선택하세요.",
      "위치, 크기, 투명도를 설정하세요.",
      "'적용' 버튼을 클릭하면 워터마크가 추가됩니다.",
    ],
    route: "/watermark", processing: "browser",
  },
  {
    icon: Shield, iconColor: "bg-gray-700",
    title: "PDF 보호",
    description: "qpdf를 사용하여 PDF에 비밀번호를 설정합니다.",
    steps: [
      "PDF 파일을 업로드하세요.",
      "비밀번호를 입력하세요.",
      "'보호' 버튼을 클릭하면 암호화된 PDF가 생성됩니다.",
      "보호된 PDF를 다운로드하세요.",
    ],
    route: "/protect", processing: "server",
  },
  {
    icon: Unlock, iconColor: "bg-teal-600",
    title: "PDF 잠금 해제",
    description: "비밀번호로 보호된 PDF의 암호를 해제합니다.",
    steps: [
      "보호된 PDF 파일을 업로드하세요.",
      "비밀번호를 입력하세요.",
      "'해제' 버튼을 클릭하면 암호가 제거된 PDF가 생성됩니다.",
      "해제된 PDF를 다운로드하세요.",
    ],
    route: "/unlock", processing: "server",
  },
  {
    icon: Shield, iconColor: "bg-red-600",
    title: "PDF 보안 처리",
    description: "PDF에서 민감한 영역을 선택적으로 보안 처리합니다.",
    steps: [
      "PDF 파일을 업로드하세요.",
      "페이지에서 보안 처리할 영역을 드래그하여 선택하세요.",
      "감지된 민감 정보를 확인하고 선택하세요.",
      "'보안 처리' 버튼을 클릭하면 보안 처리된 PDF가 생성됩니다.",
    ],
    route: "/redact", processing: "browser",
  },
  {
    icon: ScanSearch, iconColor: "bg-fuchsia-600",
    title: "개인정보 검사",
    description: "PDF에서 민감한 개인정보를 검출합니다.",
    steps: [
      "PDF 파일을 업로드하세요.",
      "주민등록번호, 전화번호, 이메일, 계좌번호 등이 자동으로 검출됩니다.",
      "검출된 항목을 확인하세요.",
    ],
    route: "/privacy-scan", processing: "browser",
  },
  {
    icon: Stamp, iconColor: "bg-amber-600",
    title: "도장/인감",
    description: "PDF에 도장 또는 인감 이미지를 삽입합니다.",
    steps: [
      "PDF 파일을 업로드하세요.",
      "도장/인감 이미지(PNG, JPG)를 업로드하세요.",
      "페이지에서 도장을 놓을 위치를 클릭하거나 드래그하세요.",
      "'적용' 버튼을 클릭하면 도장이 삽입된 PDF가 생성됩니다.",
    ],
    route: "/stamp", processing: "browser",
  },
  {
    icon: Type, iconColor: "bg-emerald-600",
    title: "서명",
    description: "PDF에 서명 이미지를 추가합니다.",
    steps: [
      "PDF 파일을 업로드하세요.",
      "서명 이미지를 업로드하거나 그려서 만드세요.",
      "페이지에서 서명 위치를 지정하세요.",
      "'적용' 버튼을 클릭하면 서명이 추가된 PDF가 생성됩니다.",
    ],
    route: "/sign", processing: "browser",
  },
  {
    icon: Search, iconColor: "bg-violet-600",
    title: "OCR 텍스트 추출",
    description: "PDF 또는 이미지에서 텍스트를 추출합니다.",
    steps: [
      "PDF 또는 이미지 파일을 업로드하세요.",
      "OCR 엔진을 선택하세요.",
      "'추출' 버튼을 클릭하면 텍스트가 추출됩니다.",
      "추출된 텍스트를 복사하거나 다운로드하세요.",
    ],
    route: "/ocr", processing: "external",
  },
];

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
              >
                <ArrowLeft size={16} />
                뒤로
              </Link>
              <Link
                to="/"
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
              >
                <Home size={16} />
                홈
              </Link>
            </div>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                <BookOpen size={20} strokeWidth={3} />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">DocuFlow</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-sky-900 px-4 py-16 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen size={32} />
            <h1 className="text-3xl font-extrabold">이용 가이드</h1>
          </div>
          <p className="text-slate-100/90 max-w-2xl">
            DocuFlow의 모든 도구 사용법을 안내합니다. 각 도구를 클릭하면 해당 페이지로 이동합니다.
            모든 기능은 무료로 제공됩니다.
          </p>
        </div>
      </div>

      {/* Guide Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Quick Start */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">빠른 시작</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">1</span>
              <div>
                <p className="font-semibold text-slate-900 text-sm">도구 선택</p>
                <p className="text-xs text-slate-600">홈페이지에서 원하는 도구를 선택하세요.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">2</span>
              <div>
                <p className="font-semibold text-slate-900 text-sm">파일 업로드</p>
                <p className="text-xs text-slate-600">파일을 업로드하거나 드래그 앤 드롭하세요.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">3</span>
              <div>
                <p className="font-semibold text-slate-900 text-sm">옵션 설정</p>
                <p className="text-xs text-slate-600">원하는 옵션을 설정하세요.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">4</span>
              <div>
                <p className="font-semibold text-slate-900 text-sm">다운로드</p>
                <p className="text-xs text-slate-600">처리 완료 후 결과를 다운로드하세요.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tool Guides */}
        <div className="grid gap-6 md:grid-cols-2">
          {guideItems.map((item) => (
            <GuideSection key={item.route} {...item} />
          ))}
        </div>

        {/* Processing Info */}
        <div className="mt-12 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">처리 방식 안내</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">브라우저 처리</span>
              </div>
              <p className="text-sm text-slate-600">
                파일이 서버로 전송되지 않고 브라우저에서 직접 처리됩니다.
                개인정보가 외부로 나가지 않으므로 안전합니다.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">서버 처리</span>
              </div>
              <p className="text-sm text-slate-600">
                파일이 DocuFlow 서버에서 처리됩니다.
                처리 완료 후 파일은 자동으로 삭제됩니다.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700">외부 OCR</span>
              </div>
              <p className="text-sm text-slate-600">
                외부 OCR 서비스를 사용할 수 있습니다.
                사용 시 데이터가 외부로 전송될 수 있음을 안내합니다.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">자주 묻는 질문</h2>
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-slate-900 text-sm">Q: 정말 모든 기능이 무료인가요?</p>
              <p className="text-sm text-slate-600 mt-1">
                네, DocuFlow의 모든 기능은 무료로 제공됩니다. 유료 요금제나 결제를 요구하지 않습니다.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">Q: 업로드한 파일은 안전한가요?</p>
              <p className="text-sm text-slate-600 mt-1">
                브라우저 처리 도구는 파일이 서버로 전송되지 않습니다. 서버 처리 도구의 경우, 처리 완료 후 30분 이내에 파일이 자동으로 삭제됩니다.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">Q: 파일 크기 제한이 있나요?</p>
              <p className="text-sm text-slate-600 mt-1">
                도구에 따라 다르지만, 대부분 100MB 이상의 파일을 처리할 수 있습니다.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">Q: 어떤 파일 형식을 지원하나요?</p>
              <p className="text-sm text-slate-600 mt-1">
                PDF, DOCX, EPUB, HWP, HWPX, JPG, PNG 등 다양한 형식을 지원합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
