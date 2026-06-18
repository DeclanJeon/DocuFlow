import React from "react";
import { Link } from "react-router-dom";
import { Shield, ArrowLeft, Home } from "lucide-react";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-xl font-bold text-slate-900 mb-3">{title}</h2>
    <div className="text-slate-700 leading-relaxed space-y-3">{children}</div>
  </section>
);

export default function PrivacyPolicy() {
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
                <Shield size={20} strokeWidth={3} />
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
            <Shield className="text-indigo-600" size={32} />
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">개인정보처리방침</h1>
              <p className="text-sm text-slate-500 mt-1">Privacy Policy</p>
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-8">최종 수정일: 2026년 6월 18일</p>

          <Section title="1. 개인정보의 처리 목적">
            <p>
              DocuFlow(이하 "서비스")는 사용자가 업로드한 파일의 변환, 편집, 보안 처리 등의 기능을
              제공하기 위해 최소한의 정보만을 처리합니다.
            </p>
            <p>
              서비스는 회원가입이나 로그인을 요구하지 않으며, 사용자가 업로드한 파일은 처리 완료 후
              자동으로 삭제됩니다.
            </p>
          </Section>

          <Section title="2. 수집하는 개인정보 항목">
            <p>
              서비스는 별도의 개인정보를 수집하지 않습니다. 사용자가 업로드한 문서 파일은 서버에서
              처리되며, 처리 완료 후 30분 이내에 자동 삭제됩니다.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>수집하는 개인정보: 없음</li>
              <li>쿠키: 서비스 기능에 필요한 최소한의 세션 쿠키만 사용</li>
              <li>로그: 서버 운영을 위한 비식별 접속 로그만 기록</li>
            </ul>
          </Section>

          <Section title="3. 개인정보의 처리 및 보유 기간">
            <p>
              사용자가 업로드한 파일은 처리가 완료된 후 <strong>30분 이내에 자동으로 삭제</strong>됩니다.
              서비스는 사용자의 파일을 별도로 보관하거나 백업하지 않습니다.
            </p>
          </Section>

          <Section title="4. 개인정보의 제3자 제공">
            <p>
              서비스는 사용자의 개인정보를 제3자에게 제공하지 않습니다. OCR을 포함한 문서 처리 기능은
              DocuFlow 내부 서버 파이프라인에서 처리되며, 별도의 제3자 OCR API로 파일을 전송하지 않습니다.
            </p>
          </Section>

          <Section title="5. 개인정보 보호를 위한 기술적·관리적 조치">
            <ul className="list-disc pl-6 space-y-2">
              <li>HTTPS를 통한 암호화 전송</li>
              <li>파일 처리 후 자동 삭제 정책</li>
              <li>비식별 접속 로그 관리</li>
              <li>접근 권한 최소화 원칙 적용</li>
            </ul>
          </Section>

          <Section title="6. 이용자의 권리와 행사 방법">
            <p>
              사용자는 언제든지 자신의 개인정보에 대한 열람, 정정, 삭제, 처리정지를 요구할 수
              있습니다. 다만, 서비스는 별도의 개인정보를 저장하지 않으므로, 업로드한 파일은 처리
              완료 후 자동 삭제됩니다.
            </p>
          </Section>

          <Section title="7. 개인정보 보호책임자">
            <p>
              서비스와 관련한 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한
              정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고
              있습니다.
            </p>
            <div className="bg-slate-50 rounded-xl p-4 mt-3">
              <p className="font-medium text-slate-900">개인정보 보호책임자</p>
              <p className="text-sm text-slate-600 mt-1">이메일: support@docuflow.ponslink.com</p>
            </div>
          </Section>

          <Section title="8. 개인정보처리방침의 변경">
            <p>
              이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제
              및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
