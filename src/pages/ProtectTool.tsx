import React, { useState } from "react";
import { Shield, Lock, FileText } from "lucide-react";
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

  const handleProtect = async () => {
    if (!file || !password) return;
    setProcessing(true);
    try {
      const bytes = await pdfUtils.encryptPdf(file, password);
      const blob = uint8ArrayToBlob(bytes);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `protected_${file.name}`;
      link.click();
    } catch (e) {
      console.error(e);
      alert("Error protecting PDF");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="Protect PDF" isProcessing={processing}>
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
              onClick={handleProtect}
              className="w-full py-3 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl shadow-lg transition-colors"
            >
              Encrypt PDF
            </button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};
