import React, { useState, useEffect, ReactNode, ErrorInfo } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export const ErrorBoundary: React.FC<Props> = ({
  children,
  fallback,
  onError,
}) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);

  // 에러 발생 시 상태 업데이트
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    setHasError(true);
    setError(error);
    setErrorInfo(errorInfo);

    // 에러 리포팅 서비스로 전송 (필요시)
    if (onError) {
      onError(error, errorInfo);
    }

    // 개발 환경에서는 상세 에러 정보를 콘솔에 출력
    if (process.env.NODE_ENV === "development") {
      console.group("Error Boundary Details");
      console.error("Error:", error);
      console.error("Error Info:", errorInfo);
      console.groupEnd();
    }
  };

  // 글로벌 에러 핸들러 설정
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      // Promise rejection을 Error 객체로 변환
      const error =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));

      handleError(error, {
        componentStack: "Unhandled Promise Rejection",
      } as ErrorInfo);
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
    };
  }, []);

  // 리셋 함수
  const handleReset = () => {
    setHasError(false);
    setError(null);
    setErrorInfo(null);
  };

  if (hasError) {
    // 커스텀 폴백이 제공된 경우 사용
    if (fallback) {
      return fallback;
    }

    // 기본 에러 UI
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={32} className="text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            오류가 발생했습니다
          </h1>

          <p className="text-gray-600 mb-8 leading-relaxed">
            문서 처리 중 예상치 못한 문제가 발생했습니다. 다시 시도하거나 다른
            문서를 사용해 보세요.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors"
            >
              <RefreshCw size={18} />
              다시 시도
            </button>

            <Link
              to="/"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
            >
              <Home size={18} />
              홈으로 가기
            </Link>
          </div>

          {process.env.NODE_ENV === "development" && error && (
            <details className="mt-8 text-left">
              <summary className="cursor-pointer text-sm font-medium text-gray-500 mb-2">
                개발자 정보 (상세 오류)
              </summary>
              <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200 text-xs font-mono text-gray-700 overflow-auto max-h-40">
                <div className="mb-2">
                  <strong>오류:</strong>
                  <pre className="whitespace-pre-wrap mt-1">
                    {error.toString()}
                  </pre>
                </div>
                {errorInfo && (
                  <div>
                    <strong>컴포넌트 스택:</strong>
                    <pre className="whitespace-pre-wrap mt-1">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// 간단한 폴백 컴포넌트
export const SimpleErrorFallback = () => (
  <div className="flex items-center justify-center p-8 bg-red-50 border border-red-200 rounded-xl">
    <div className="text-center">
      <AlertTriangle size={24} className="text-red-600 mx-auto mb-2" />
      <p className="text-red-700 font-medium">작업을 처리할 수 없습니다.</p>
    </div>
  </div>
);

// HOC: 컴포넌트를 Error Boundary로 감싸는 고차 컴포넌트
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
};
