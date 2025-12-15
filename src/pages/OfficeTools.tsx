import React, { useState } from "react";
import {
  FileType,
  Printer,
  FileText,
  FileCode,
  CheckCircle,
} from "lucide-react";
import { ToolLayout } from "../components/Layout";
import { FileUpload } from "../components/Shared";
import * as officeUtils from "../../services/officeUtils";
import * as pdfUtils from "../../services/pdfUtils";

export const PdfToDocxTool = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [conversionOption, setConversionOption] = useState<
    "preserve-layout" | "extract-text"
  >("preserve-layout");

  const handleConvert = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      await officeUtils.pdfToDocx(file, conversionOption);
      alert("변환이 완료되어 다운로드가 시작됩니다.");
    } catch (e) {
      alert("변환 중 오류가 발생했습니다.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="PDF to Word" isProcessing={processing}>
      {!file ? (
        <FileUpload
          onFilesSelected={(files) => setFile(files[0])}
          accept=".pdf"
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto">
          <div className="bg-blue-50 p-6 rounded-2xl mb-6">
            <FileText size={64} className="text-blue-600" />
          </div>
          <h3 className="text-xl font-bold mb-6">{file.name}</h3>

          <div className="w-full bg-white p-6 rounded-xl border border-gray-200 mb-8">
            <h4 className="font-semibold text-gray-900 mb-4">변환 옵션 선택</h4>

            <div className="space-y-3">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="conversion-option"
                  value="preserve-layout"
                  checked={conversionOption === "preserve-layout"}
                  onChange={(e) =>
                    setConversionOption(
                      e.target.value as "preserve-layout" | "extract-text"
                    )
                  }
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900">레이아웃 보존</div>
                  <div className="text-sm text-gray-500">
                    PDF의 원래 서식과 이미지를 유지하여 DOCX로 변환
                  </div>
                </div>
              </label>

              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="conversion-option"
                  value="extract-text"
                  checked={conversionOption === "extract-text"}
                  onChange={(e) =>
                    setConversionOption(
                      e.target.value as "preserve-layout" | "extract-text"
                    )
                  }
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900">텍스트만 추출</div>
                  <div className="text-sm text-gray-500">
                    PDF에서 텍스트 내용만 추출하여 순수 텍스트 DOCX로 변환
                  </div>
                </div>
              </label>
            </div>
          </div>

          <button
            onClick={handleConvert}
            className="px-8 py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-lg transition-all w-full"
          >
            Convert to DOCX
          </button>
          <button
            onClick={() => setFile(null)}
            className="mt-4 text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}
    </ToolLayout>
  );
};

export const DocxToPdfTool = () => {
  const [file, setFile] = useState<File | null>(null);
  const [htmlContent, setHtmlContent] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleConvert = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const html = await officeUtils.docxToPdf(file);
      setHtmlContent(html);
    } catch (e) {
      alert("변환 실패");
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "", "width=800,height=600");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print to PDF</title>
            <style>body { font-family: sans-serif; padding: 40px; line-height: 1.6; }</style>
          </head>
          <body>${htmlContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <ToolLayout title="Word to PDF" isProcessing={processing}>
      {!file ? (
        <FileUpload
          onFilesSelected={(files) => setFile(files[0])}
          accept=".docx"
        />
      ) : !htmlContent ? (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="bg-indigo-50 p-6 rounded-2xl mb-6">
            <FileType size={64} className="text-indigo-600" />
          </div>
          <h3 className="text-xl font-bold mb-8">{file.name}</h3>
          <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
            *클라이언트 보안 정책상, 문서를 렌더링한 후 'PDF로 저장' 기능을
            사용해야 합니다.
          </p>
          <button
            onClick={handleConvert}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all"
          >
            Preview & Print to PDF
          </button>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">Preview</h3>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
            >
              <Printer size={16} /> Print / Save as PDF
            </button>
          </div>
          <div className="flex-1 bg-white border border-gray-200 rounded-xl p-8 overflow-y-auto shadow-inner">
            <div
              dangerouslySetInnerHTML={{ __html: htmlContent }}
              className="prose max-w-none"
            />
          </div>
          <button
            onClick={() => {
              setFile(null);
              setHtmlContent("");
            }}
            className="mt-4 text-center text-gray-500 hover:text-gray-700"
          >
            Convert Another
          </button>
        </div>
      )}
    </ToolLayout>
  );
};

// --- PDF to Markdown Tool ---
export const PdfToMdTool = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [resultText, setResultText] = useState("");

  const handleConvert = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const text = await pdfUtils.extractTextFromPdf(file);
      setResultText(text);
    } catch (e) {
      console.error(e);
      alert("PDF에서 텍스트 추출에 실패했습니다.");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultText) return;
    const blob = new Blob([resultText], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file?.name.replace(".pdf", ".md") || "converted.md";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ToolLayout title="PDF to Markdown" isProcessing={processing}>
      {!file ? (
        <FileUpload
          onFilesSelected={(files) => setFile(files[0])}
          accept=".pdf"
        />
      ) : !resultText ? (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="bg-purple-50 p-6 rounded-2xl mb-6">
            <FileCode size={64} className="text-purple-600" />
          </div>
          <h3 className="text-xl font-bold mb-8">{file.name}</h3>
          <button
            onClick={handleConvert}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg transition-all"
          >
            Extract Text as Markdown
          </button>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">Extracted Markdown</h3>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <CheckCircle size={16} /> Download MD
            </button>
          </div>
          <div className="flex-1 bg-white border border-gray-200 rounded-xl p-8 overflow-y-auto shadow-inner">
            <textarea
              className="w-full h-[400px] p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-mono text-sm leading-relaxed outline-none focus:border-purple-500 resize-none"
              value={resultText}
              readOnly
            />
          </div>
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => navigator.clipboard.writeText(resultText)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
            >
              <CheckCircle size={16} /> Copy to Clipboard
            </button>
            <button
              onClick={() => {
                setFile(null);
                setResultText("");
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              Convert Another
            </button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

// --- Markdown to PDF Tool ---
export const MdToPdfTool = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleConvert = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      await officeUtils.mdToPdf(file);
      alert("변환이 완료되어 다운로드가 시작됩니다.");
    } catch (e) {
      console.error(e);
      alert("Markdown을 PDF로 변환하는 데 실패했습니다.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="Markdown to PDF" isProcessing={processing}>
      {!file ? (
        <div className="text-center">
          <FileUpload
            onFilesSelected={(files) => setFile(files[0])}
            accept=".md,.markdown,.txt"
          />
          <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-100">
            <p className="text-sm text-green-700">
              <strong>Markdown to PDF:</strong> Convert Markdown files to PDF
              documents with proper formatting.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="bg-green-50 p-6 rounded-2xl mb-6">
            <FileCode size={64} className="text-green-600" />
          </div>
          <h3 className="text-xl font-bold mb-8">{file.name}</h3>
          <button
            onClick={handleConvert}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg transition-all"
          >
            Convert to PDF
          </button>
          <button
            onClick={() => setFile(null)}
            className="mt-4 text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}
    </ToolLayout>
  );
};
