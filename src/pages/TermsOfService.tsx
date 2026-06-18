import React from "react";
import { Link } from "react-router-dom";
import { FileText, ArrowLeft, Home } from "lucide-react";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-xl font-bold text-slate-900 mb-3">{title}</h2>
    <div className="text-slate-700 leading-relaxed space-y-3">{children}</div>
  </section>
);

export default function TermsOfService() {
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
                <span>뒤로</span>
              </Link>
              <Link
                to="/"
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
              >
                <Home size={16} />
                <span>홈</span>
              </Link>
            </div>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                <FileText size={20} strokeWidth={3} />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">DocuFlow</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="text-indigo-600" size={32} />
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">이용약관</h1>
              <p className="text-sm text-slate-500 mt-1">Terms of Service</p>
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-8">최종 수정일: 2026년 6월 18일</p>

          <Section title="제1조 (목적)">
            <p>
              이 약관은 DocuFlow(이하 "서비스")가 제공하는 PDF 및 문서 처리 서비스의 이용과 관련하여
              서비스와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>
          </Section>

          <Section title="제2조 (정의)">
            <ul className="list-disc pl-6 space-y-2">
              <li>"서비스"란 DocuFlow가 제공하는 PDF 변환, 편집, 보안 처리 등 문서 처리 일체를 의미합니다.</li>
              <li>"이용자"란 이 약관에 따라 서비스를 이용하는 자를 의미합니다.</li>
              <li>"콘텐츠"란 이용자가 서비스에 업로드하는 문서, 이미지 등 파일 일체를 의미합니다.</li>
            </ul>
          </Section>

          <Section title="제3조 (약관의 게시와 개정)">
            <p>
              서비스는 이 약관의 내용을 이용자가 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.
              서비스는 관련 법령을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.
            </p>
          </Section>

          <Section title="제4조 (서비스의 제공 및 변경)">
            <p>서비스는 다음과 같은 업무를 수행합니다:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>PDF 병합, 분할, 회전, 정리</li>
              <li>PDF 변환 (이미지, DOCX, Markdown, HWP 등)</li>
              <li>PDF 보안 (암호 설정, 해제, 보안 처리)</li>
              <li>PDF 압축, OCR 텍스트 추출</li>
              <li>워터마크, 도장, 서명 이미지 삽입</li>
              <li>개인정보 검출 및 보안 검사</li>
            </ul>
            <p className="mt-3">
              <strong>본 서비스는 모든 기능을 무료로 제공합니다.</strong> 유료 요금제나 결제를 요구하지
              않습니다.
            </p>
          </Section>

          <Section title="제5조 (이용자의 의무)">
            <p>이용자는 다음 행위를 하여서는 안 됩니다:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>타인의 저작권, 개인정보 등 권리를 침해하는 콘텐츠의 업로드</li>
              <li>서비스의 안정적 운영을 방해하는 행위</li>
              <li>서비스를 불법적인 목적으로 사용하는 행위</li>
              <li>악성코드, 바이러스 등이 포함된 파일의 업로드</li>
            </ul>
          </Section>

          <Section title="제6조 (콘텐츠의 처리)">
            <p>
              이용자가 업로드한 콘텐츠는 서비스 제공을 위해 일시적으로 서버에서 처리됩니다. 처리가
              완료된 콘텐츠는 자동으로 삭제되며, 서비스는 이용자의 콘텐츠를 별도로 저장하거나 제3자에게
              제공하지 않습니다.
            </p>
          </Section>

          <Section title="제7조 (서비스 이용의 제한)">
            <p>
              서비스는 안정적인 서비스 제공을 위해 이용자의 서비스 이용을 제한할 수 있습니다. 다음과
              같은 경우 서비스 이용이 제한될 수 있습니다:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>서비스 서버에 과도한 부하를 유발하는 경우</li>
              <li>반복적으로 비정상적인 요청을 보내는 경우</li>
              <li>서비스 운영을 방해하는 경우</li>
            </ul>
          </Section>

          <Section title="제8조 (면책조항)">
            <p>
              서비스는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우
              서비스 제공에 관한 책임이 면제됩니다.
            </p>
            <p>
              서비스는 이용자의 귀책사유로 인한 서비스 이용 장애에 대하여 책임을 지지 않습니다.
            </p>
            <p>
              서비스는 이용자가 업로드한 콘텐츠의 내용, 정확성, 합법성에 대해 책임을 지지 않습니다.
            </p>
          </Section>

          <Section title="제9조 (분쟁해결)">
            <p>
              서비스와 이용자 간에 발생한 분쟁에 관한 소송은 대한민국 법을 준거법으로 하며, 서비스
              소재지를 관할하는 법원을 관할 법원으로 합니다.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
