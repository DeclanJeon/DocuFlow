import React, { useState, useEffect } from "react";
import {
  FileType,
  Printer,
  FileText,
  FileCode,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  Files,
} from "lucide-react";
import { ToolLayout } from "../components/Layout";
import { FileUpload } from "../components/Shared";
import * as officeUtils from "../../services/officeUtils";
import * as pdfUtils from "../../services/pdfUtils";
import { extractMarkdownFromPdfWithOCR } from "../../services/pdfOCRExtractor";
import { OcrFailureReason } from "../../services/openRouterService";
import { ProgressStep } from "../components/ProgressSteps";
import JSZip from "jszip";

interface MarkdownResult {
  sourceName: string;
  markdown: string;
  warning?: string;
  hasPartialFailure?: boolean;
  failureTags?: string[];
}

const OCR_REASON_LABELS: Record<OcrFailureReason, string> = {
  timeout: "Timeout",
  rate_limit: "Rate Limit",
  server: "Server",
  unauthorized: "Auth",
  network: "Network",
  unknown: "Unknown",
};

const toSafeMarkdownName = (sourceName: string) => {
  const base = sourceName.replace(/\.pdf$/i, "").trim() || "converted";
  const safeBase = base.replace(/[\\/:*?"<>|]+/g, "-");
  return `${safeBase}.md`;
};

export const PdfToDocxTool = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progressValue, setProgressValue] = useState<number | undefined>(undefined);
  const [conversionOption, setConversionOption] = useState<
    "preserve-layout" | "extract-text"
  >("preserve-layout");

  const handleConvert = async () => {
    if (!file) return;
    setProcessing(true);
    setProgressValue(0);
    try {
      await officeUtils.pdfToDocx(file, conversionOption, (current, total, message) => {
        const percent = Math.round((current / total) * 100);
        setProgressValue(percent);
        console.log(`PDF to DOCX progress: ${percent}% - ${message}`);
      });
      alert("변환이 완료되어 다운로드가 시작됩니다.");
    } catch (e) {
      alert("변환 중 오류가 발생했습니다.");
    } finally {
      setProcessing(false);
      setProgressValue(undefined);
    }
  };

  return (
    <ToolLayout 
      title="PDF to Word" 
      isProcessing={processing}
      progressValue={progressValue}
      progressLabel="Converting PDF to Word..."
      progressSubLabel={`Preparing ${file ? 1 : 0} file for DOCX conversion`}
    >
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
              <label htmlFor="pdf-to-docx-preserve-layout" className="flex items-center cursor-pointer">
                <input
                  id="pdf-to-docx-preserve-layout"
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

              <label htmlFor="pdf-to-docx-extract-text" className="flex items-center cursor-pointer">
                <input
                  id="pdf-to-docx-extract-text"
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
            type="button"
            onClick={handleConvert}
            className="px-8 py-4 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-lg transition-all w-full text-lg"
          >
            Convert to DOCX
          </button>
          <button
            type="button"
            onClick={() => setFile(null)}
            className="mt-6 text-gray-500 hover:text-gray-700 py-2"
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
    <ToolLayout 
      title="Word to PDF" 
      isProcessing={processing}
      progressLabel="Converting Word to PDF..."
      progressSubLabel={`Rendering ${file ? 1 : 0} DOCX into print-ready layout`}
    >
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
            type="button"
            onClick={handleConvert}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all text-lg"
          >
            Preview & Print to PDF
          </button>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">Preview</h3>
            <button
              type="button"
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
            type="button"
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

export const EpubToPdfTool = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progressValue, setProgressValue] = useState<number | undefined>(undefined);
  const [progressEtaSeconds, setProgressEtaSeconds] = useState<number | null>(null);
  const [activeFileName, setActiveFileName] = useState<string>("");

  const handleConvert = async () => {
    if (!files.length || processing) return;
    setProcessing(true);
    setProgressValue(0);
    setProgressEtaSeconds(null);

    const startedAt = Date.now();

    try {
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        setActiveFileName(file.name);

        await officeUtils.epubToPdf(file, (current, total) => {
          const currentFileRatio = total > 0 ? current / total : 0;
          const overallRatio = (index + currentFileRatio) / files.length;
          const overallPercent = Math.max(0, Math.min(100, overallRatio * 100));
          setProgressValue(overallPercent);

          const elapsedSeconds = Math.max(1, (Date.now() - startedAt) / 1000);
          if (overallPercent >= 100) {
            setProgressEtaSeconds(0);
            return;
          }

          const progressPerSecond = overallPercent / elapsedSeconds;
          if (progressPerSecond > 0) {
            const eta = Math.round((100 - overallPercent) / progressPerSecond);
            setProgressEtaSeconds(Math.max(0, eta));
          } else {
            setProgressEtaSeconds(null);
          }
        });
      }

      setProgressValue(100);
      setProgressEtaSeconds(0);
      alert(`${files.length}개 EPUB 변환이 완료되어 다운로드가 시작됩니다.`);
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : "EPUB를 PDF로 변환하는데 실패했습니다.";
      alert(message);
    } finally {
      setProcessing(false);
      setProgressValue(undefined);
      setProgressEtaSeconds(null);
      setActiveFileName("");
    }
  };

  return (
    <ToolLayout
      title="EPUB to PDF"
      isProcessing={processing}
      progressValue={progressValue}
      progressEtaSeconds={progressEtaSeconds}
      progressLabel="Converting EPUB to PDF..."
      progressSubLabel={
        files.length
          ? `Converting ${activeFileName || files[0].name} (${Math.min(
              files.length,
              Math.floor(((progressValue || 0) / 100) * files.length) + 1
            )}/${files.length} files)`
          : "Extracting chapters from EPUB files"
      }
    >
      {!files.length ? (
        <div className="text-center max-w-2xl mx-auto">
          <FileUpload
            onFilesSelected={(selectedFiles) => setFiles(selectedFiles)}
            accept=".epub"
            multiple
            description="Upload one or more EPUB files"
          />
          <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-left">
            <p className="text-sm text-emerald-700">
              <strong>EPUB to PDF:</strong> Extracts chapter text from EPUB and
              creates a readable PDF document.
            </p>
            <p className="text-sm text-emerald-700 mt-2">
              <strong>Batch Convert:</strong> Multiple EPUB files are converted in sequence.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto">
          <div className="bg-emerald-50 p-6 rounded-2xl mb-6">
            <BookOpen size={64} className="text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-center break-all">
            {files.length === 1 ? files[0].name : `${files.length} EPUB files selected`}
          </h3>
          <p className="text-sm text-gray-500 mb-8 text-center">
            문서 내 텍스트를 기반으로 EPUB들을 순차 변환해 PDF를 생성합니다.
          </p>
          <button
            type="button"
            onClick={handleConvert}
            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all w-full text-lg"
            disabled={processing}
          >
            Convert EPUBs to PDF
          </button>
          <button
            type="button"
            onClick={() => setFiles([])}
            className="mt-6 text-gray-500 hover:text-gray-700 py-2"
          >
            Cancel
          </button>
        </div>
      )}
    </ToolLayout>
  );
};

export const PdfToMdTool = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [zipStatus, setZipStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [results, setResults] = useState<MarkdownResult[]>([]);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [useOcr, setUseOcr] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [ocrSummaryWarning, setOcrSummaryWarning] = useState<string | null>(null);
  const [ocrSteps, setOcrSteps] = useState<ProgressStep[]>([
    { id: "init", label: "Preparing files", status: "pending" },
    { id: "ocr", label: "Converting PDFs", status: "pending" },
    { id: "finalize", label: "Generating Markdown", status: "pending" },
  ]);

  useEffect(() => {
    const key = (import.meta as ImportMeta & { env?: Record<string, string> }).env
      ?.VITE_OPENROUTER_API_KEY;
    setHasApiKey(Boolean(key));
  }, []);

  const updateStep = (id: string, status: ProgressStep["status"], detail?: string) => {
    setOcrSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, status, detail } : step))
    );
  };

  const downloadMarkdown = (sourceName: string, markdown: string) => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = sourceName.replace(/\.pdf$/i, ".md");
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadAllAsZip = async () => {
    if (!results.length || downloadingZip) return;
    setDownloadingZip(true);
    setZipStatus(null);
    try {
      const zip = new JSZip();
      const usedNames = new Map<string, number>();
      for (const result of results) {
        const initialName = toSafeMarkdownName(result.sourceName);
        const count = usedNames.get(initialName) || 0;
        usedNames.set(initialName, count + 1);

        const entryName =
          count === 0
            ? initialName
            : initialName.replace(/\.md$/i, `-${count + 1}.md`);

        zip.file(entryName, result.markdown);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipName =
        results.length === 1
          ? results[0].sourceName.replace(/\.pdf$/i, "")
          : `pdf-to-markdown-${results.length}-files`;
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${zipName}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      setZipStatus({
        type: "success",
        message: `${results.length}개 파일을 ZIP으로 다운로드했습니다.`,
      });
    } catch (e) {
      console.error(e);
      setZipStatus({
        type: "error",
        message: "ZIP 파일 생성에 실패했습니다.",
      });
    } finally {
      setDownloadingZip(false);
    }
  };

  const retryFailedFiles = () => {
    const failedNames = new Set(
      results.filter((result) => result.hasPartialFailure).map((result) => result.sourceName)
    );
    const failedFiles = files.filter((file) => failedNames.has(file.name));

    if (!failedFiles.length) {
      setZipStatus({
        type: "error",
        message: "재시도할 실패 파일이 없습니다.",
      });
      return;
    }

    setUseOcr(true);
    setFiles(failedFiles);
    setResults([]);
    setActiveResultIndex(0);
    setOcrSummaryWarning(null);
    setZipStatus(null);
    window.setTimeout(() => {
      void handleConvert(failedFiles);
    }, 0);
  };

  const handleConvert = async (targetFiles: File[] = files) => {
    if (!targetFiles.length) return;
    if (useOcr && !hasApiKey) {
      alert("OpenRouter API Key가 설정되지 않았습니다. .env 파일을 확인해주세요.");
      return;
    }

    setProcessing(true);
    setResults([]);
    setOcrSummaryWarning(null);
    setActiveResultIndex(0);
    setOcrSteps([
      { id: "init", label: "Preparing files", status: "processing" },
      { id: "ocr", label: "Converting PDFs", status: "pending" },
      { id: "finalize", label: "Generating Markdown", status: "pending" },
    ]);

    try {
      updateStep("init", "completed", `${targetFiles.length} file(s) ready`);
      updateStep(
        "ocr",
        "processing",
        useOcr ? "Starting OCR conversions..." : "Extracting text from PDFs..."
      );

      const converted: MarkdownResult[] = [];
      const warningMessages: string[] = [];
      const reasonCounts = new Map<string, number>();

      for (const [index, file] of targetFiles.entries()) {
        const filePrefix = `File ${index + 1}/${targetFiles.length}: ${file.name}`;
        let markdown = "";

        if (useOcr) {
          const ocrResult = await extractMarkdownFromPdfWithOCR(file, {}, (current, total) => {
            const percent = Math.round((current / total) * 100);
            updateStep(
              "ocr",
              "processing",
              `${filePrefix} - page ${current}/${total} (${percent}%)`
            );
          });

          markdown = ocrResult.markdown;

          if (ocrResult.failedBatchCount > 0) {
            const failureTags = Object.keys(ocrResult.failedReasonCounts).map(
              (reason) =>
                OCR_REASON_LABELS[(reason as OcrFailureReason) || "unknown"] ||
                OCR_REASON_LABELS.unknown
            );
            Object.entries(ocrResult.failedReasonCounts).forEach(([reason, count]) => {
              if (!count) return;
              reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + count);
            });
            const warning = `${file.name}: ${ocrResult.failedBatchCount} batch failed (pages ${ocrResult.failedBatchRanges.join(", ")})`;
            warningMessages.push(warning);
            converted.push({
              sourceName: file.name,
              markdown,
              warning,
              hasPartialFailure: true,
              failureTags,
            });
            continue;
          }
        } else {
          updateStep("ocr", "processing", `${filePrefix} - extracting text`);
          markdown = await pdfUtils.extractTextFromPdf(file);
        }

        converted.push({ sourceName: file.name, markdown });
      }

      updateStep("ocr", "completed", `Converted ${converted.length} file(s)`);
      updateStep("finalize", "processing", "Preparing preview and downloads");
      setResults(converted);
      if (warningMessages.length > 0) {
        const reasonSummary = Array.from(reasonCounts.entries())
          .map(([reason, count]) => `${OCR_REASON_LABELS[(reason as OcrFailureReason) || "unknown"]}: ${count}`)
          .join(", ");
        setOcrSummaryWarning(
          `${warningMessages.length} file(s) completed with partial OCR failures (${reasonSummary || "Unknown"}). Review warnings and retry those files.`
        );
      }
      setActiveResultIndex(0);
      updateStep("finalize", "completed", "Markdown output ready");
    } catch (e) {
      console.error(e);
      updateStep("ocr", "error", (e as Error).message || "Conversion failed");
      alert(
        "Failed to extract markdown. " +
          ((e as Error).message || "Check API key or file format.")
      );
    } finally {
      setProcessing(false);
    }
  };

  const activeResult = results[activeResultIndex] || null;

  return (
    <ToolLayout
      title="PDF to Markdown"
      isProcessing={processing}
      progressSteps={ocrSteps}
      progressLabel={useOcr ? "AI OCR Processing" : "Extracting Markdown"}
      progressSubLabel={`Processing ${files.length || 1} PDF file(s)`}
    >
      {!files.length ? (
        <FileUpload
          onFilesSelected={(selected) => setFiles(selected)}
          accept=".pdf"
          multiple
          description="Upload one or more PDF files"
        />
      ) : !results.length ? (
        <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto">
          <div className="bg-purple-50 p-6 rounded-2xl mb-6">
            <Files size={64} className="text-purple-600" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-center">
            {files.length} PDF file(s) selected
          </h3>
          <p className="text-sm text-gray-500 mb-6 text-center">
            {files.slice(0, 3).map((file) => file.name).join(" | ")}
            {files.length > 3 ? ` + ${files.length - 3} more` : ""}
          </p>

          <div className="w-full bg-white p-6 rounded-xl border border-gray-200 mb-8">
            <h4 className="font-semibold text-gray-900 mb-4">Conversion Method</h4>
            <div className="flex gap-4 mb-4">
              <button
                type="button"
                onClick={() => setUseOcr(false)}
                className={`flex-1 py-3 px-4 rounded-xl font-medium border-2 text-sm transition-all ${
                  !useOcr
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-transparent bg-gray-100 text-gray-600"
                }`}
              >
                Standard Text (Fast)
              </button>
              <button
                type="button"
                onClick={() => setUseOcr(true)}
                className={`flex-1 py-3 px-4 rounded-xl font-medium border-2 text-sm transition-all ${
                  useOcr
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-transparent bg-gray-100 text-gray-600"
                }`}
              >
                AI OCR (Images & Tables)
              </button>
            </div>

            {useOcr && (
              <div
                className={`mt-2 p-3 rounded-lg text-xs ${
                  hasApiKey
                    ? "bg-gray-50 text-gray-500"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                <p>
                  Uses OpenRouter OCR for scanned pages, figures, and complex
                  layouts.
                </p>
                {!hasApiKey && (
                  <div className="flex items-center gap-2 mt-2 font-semibold">
                    <AlertTriangle size={14} />
                    <span>
                      API key not found. Set VITE_OPENROUTER_API_KEY in .env.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              void handleConvert();
            }}
            className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg transition-all w-full text-lg"
            disabled={processing}
          >
            {`Extract Markdown (${files.length})`}
          </button>

          <button
            type="button"
            onClick={() => setFiles([])}
            className="mt-6 text-gray-500 hover:text-gray-700 py-2"
            disabled={processing}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          <div className="lg:col-span-1 border border-gray-200 rounded-xl p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">Converted Files</h3>
              <button
                type="button"
                onClick={downloadAllAsZip}
                disabled={downloadingZip}
                className="text-xs px-3 py-1.5 rounded-md bg-purple-600 text-white hover:bg-purple-700"
              >
                {downloadingZip ? "Creating ZIP..." : "Download ZIP"}
              </button>
            </div>
            {ocrSummaryWarning && (
              <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-2">
                <p>{ocrSummaryWarning}</p>
                <button
                  type="button"
                  onClick={retryFailedFiles}
                  className="mt-2 inline-flex px-2.5 py-1 rounded bg-amber-600 text-white hover:bg-amber-700"
                >
                  Retry Failed Files
                </button>
              </div>
            )}
            {zipStatus && (
              <p
                className={`text-xs mb-3 ${
                  zipStatus.type === "success" ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {zipStatus.message}
              </p>
            )}
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {results.map((result, index) => (
                <button
                  type="button"
                  key={`${result.sourceName}-${index}-${result.markdown.length}`}
                  onClick={() => setActiveResultIndex(index)}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                    index === activeResultIndex
                      ? "border-purple-300 bg-purple-50 text-purple-900"
                      : "border-transparent bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <p className="text-sm font-medium truncate">{result.sourceName}</p>
                  {result.failureTags && result.failureTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {result.failureTags.map((tag) => (
                        <span
                          key={`${result.sourceName}-${tag}`}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {result.warning && (
                    <p className="text-[11px] text-amber-700 mt-1 truncate">{result.warning}</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900">Extracted Markdown</h3>
              {activeResult && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      navigator.clipboard.writeText(activeResult.markdown)
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg"
                  >
                    <CheckCircle size={16} /> Copy
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadMarkdown(activeResult.sourceName, activeResult.markdown)
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    <FileCode size={16} /> Download MD
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 bg-white border border-gray-200 rounded-xl p-6 overflow-y-auto shadow-inner">
              <textarea
                className="w-full h-full min-h-[420px] bg-transparent border-none outline-none font-mono text-sm leading-relaxed resize-none"
                value={activeResult?.markdown || ""}
                readOnly
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setFiles([]);
                setResults([]);
                setActiveResultIndex(0);
              }}
              className="mt-4 text-gray-500 hover:text-gray-700 text-left"
            >
              Convert Another Batch
            </button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};
