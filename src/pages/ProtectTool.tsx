import React, { useState } from "react";
import { Lock, Unlock, FileText } from "lucide-react";
import { ToolLayout } from "../components/Layout";
import { FileUpload } from "../components/Shared";
import * as pdfUtils from "../../services/pdfUtils";

const uint8ArrayToBlob = (
  bytes: Uint8Array,
  mimeType: string = "application/pdf"
): Blob => {
  // Convert Uint8Array to a new ArrayBuffer to ensure type compatibility
  const arrayBuffer = new ArrayBuffer(bytes.length);
  const view = new Uint8Array(arrayBuffer);
  view.set(bytes);
  return new Blob([arrayBuffer], { type: mimeType });
};

export const ProtectTool = () => {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleProtect = async () => {
    if (!file || !password) return;
    setProcessing(true);
    setStatus(null);
    try {
      const bytes = await pdfUtils.encryptPdf(file, password);
      const blob = uint8ArrayToBlob(bytes);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `protected_${file.name}`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus({
        type: "success",
        message:
          "처리가 완료되었습니다. 현재 브라우저 환경에서는 일부 PDF 암호화 옵션이 제한될 수 있습니다.",
      });
    } catch (e) {
      console.error(e);
      setStatus({
        type: "error",
        message:
          "PDF 보호 처리에 실패했습니다. 파일을 다시 선택하거나 비밀번호를 변경해 재시도해 주세요.",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout
      title="Protect PDF"
      isProcessing={processing}
      progressLabel="Encrypting PDF..."
      progressSubLabel="Securing 1 file with password protection"
    >
      {!file ? (
        <FileUpload onFilesSelected={(f) => setFile(f[0])} accept=".pdf" />
      ) : (
        <div className="max-w-md mx-auto text-center">
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 mb-6 flex items-center justify-center">
            <Lock size={48} className="text-gray-400 mb-4" />
            <div className="text-white">
              <h3 className="text-xl font-bold mb-2">Encrypt Your Document</h3>
              <p className="text-gray-300 mb-4">
                Enter a password to protect this PDF document with encryption
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center gap-3">
              <FileText size={32} className="text-blue-600" />
              <span className="font-semibold text-gray-700">{file.name}</span>
            </div>

            <input
              type="password"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border p-3 rounded-lg text-center mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />

            <button
              type="button"
              onClick={handleProtect}
              className="w-full py-3 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl shadow-lg transition-colors"
            >
              Encrypt PDF
            </button>

            <button
              type="button"
              onClick={() => {
                setStatus(null);
                setPassword("");
              }}
              className="w-full mt-2 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-colors"
            >
              Reset
            </button>

            {status && (
              <p
                className={`mt-3 text-sm ${
                  status.type === "success" ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {status.message}
              </p>
            )}

            <div className="mt-4 text-left text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-lg p-3">
              Browser-based PDF processing has library compatibility limits.
              If a specific file fails, try: (1) re-save PDF in another viewer,
              (2) retry with a shorter password, (3) process from Unlock first.
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

export const UnlockTool = () => {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleUnlock = async () => {
    if (!file) return;
    setProcessing(true);
    setStatus(null);

    try {
      const bytes = await pdfUtils.unlockPdf(file, password);
      const blob = uint8ArrayToBlob(bytes);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `unlocked_${file.name}`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus({
        type: "success",
        message: "잠금 해제 PDF 다운로드가 시작되었습니다.",
      });
    } catch (e) {
      console.error(e);
      setStatus({
        type: "error",
        message:
          (e as Error).message ||
          "PDF 잠금 해제에 실패했습니다. 비밀번호를 확인하고 다시 시도하세요.",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout
      title="Unlock PDF"
      isProcessing={processing}
      progressLabel="Unlocking PDF..."
      progressSubLabel="Validating password and exporting 1 file"
    >
      {!file ? (
        <FileUpload onFilesSelected={(f) => setFile(f[0])} accept=".pdf" />
      ) : (
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 mb-6 flex items-center justify-center gap-4">
            <Unlock size={42} className="text-emerald-600" />
            <div className="text-left">
              <h3 className="text-xl font-bold mb-2 text-gray-900">Unlock Document</h3>
              <p className="text-gray-500 text-sm">
                Enter password when required and export an unlocked copy.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center gap-3">
              <FileText size={32} className="text-emerald-600" />
              <span className="font-semibold text-gray-700 break-all">{file.name}</span>
            </div>

            <input
              type="password"
              placeholder="Password (optional)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border p-3 rounded-lg text-center mb-4 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            />

            <button
              type="button"
              onClick={handleUnlock}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-colors"
            >
              Unlock PDF
            </button>

            <button
              type="button"
              onClick={() => {
                setStatus(null);
                handleUnlock();
              }}
              className="w-full mt-2 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-colors"
              disabled={processing}
            >
              Retry
            </button>

            {status && (
              <p
                className={`mt-3 text-sm ${
                  status.type === "success" ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {status.message}
              </p>
            )}

            <div className="mt-4 text-left text-xs text-gray-500 bg-emerald-50 border border-emerald-100 rounded-lg p-3">
              If unlock fails repeatedly: verify password, ensure this is an
              encrypted PDF, then re-export the file once and try again.
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};
