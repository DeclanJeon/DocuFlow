import React, { useState } from "react";
import { Lock, Unlock, FileText } from "lucide-react";
import { ToolLayout } from "../components/Layout";
import { getToolByRoute } from "../data/tools";
import { FileUpload } from "../components/Shared";
import {
  decryptPdfOnServer,
  downloadBlob,
  downloadCompletedPdfJob,
  encryptPdfOnServer,
} from "../../services/api/pdfJobApi";

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
      const job = await encryptPdfOnServer(file, password);
      const blob = await downloadCompletedPdfJob(job);
      downloadBlob(blob, job.resultFilename || `protected_${file.name}`);
      setStatus({
        type: "success",
        message: "qpdf 서버 암호화가 완료되어 다운로드가 시작되었습니다.",
      });
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : "PDF 보호 처리에 실패했습니다.";
      setStatus({
        type: "error",
        message,
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout
      title="Protect PDF"
      icon={getToolByRoute("/protect")?.icon}
      iconColorClass={getToolByRoute("/protect")?.colorClass}
      description={getToolByRoute("/protect")?.shortDesc}
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
              This uses the DocuFlow server qpdf pipeline. The file is uploaded
              temporarily, encrypted with 256-bit PDF password protection, then
              removed by the server cleanup window.
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
      const job = await decryptPdfOnServer(file, password);
      const blob = await downloadCompletedPdfJob(job);
      downloadBlob(blob, job.resultFilename || `unlocked_${file.name}`);
      setStatus({
        type: "success",
        message: "qpdf 서버 잠금 해제가 완료되어 다운로드가 시작되었습니다.",
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
      icon={getToolByRoute("/unlock")?.icon}
      iconColorClass={getToolByRoute("/unlock")?.colorClass}
      description={getToolByRoute("/unlock")?.shortDesc}
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
              This uses the DocuFlow server qpdf pipeline. Wrong passwords are
              rejected by qpdf; the original upload is temporary and requires a
              valid download token for the result.
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};
