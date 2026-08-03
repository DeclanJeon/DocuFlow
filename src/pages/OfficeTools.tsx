import React, { useState } from "react";
import {
  FileType,
  FileText,
  FileCode,
  CheckCircle,
  BookOpen,
  Files,
} from "lucide-react";
import { ToolLayout } from "../components/Layout";
import { getToolByRoute } from "../data/tools";
import { FileUpload } from "../components/Shared";
import * as officeUtils from "../../services/officeUtils";
import * as pdfUtils from "../../services/pdfUtils";
import {
  downloadPdfToMarkdownResult,
  pollPdfToMarkdownJob,
  submitPdfToMarkdownJob,
  type PdfMarkdownDiagnostics,
  type PdfMarkdownJobProgress,
  type PdfMarkdownOutput,
  type PdfMarkdownOcrProfile,
} from "../../services/api/markdownApi";
import { ProgressStep } from "../components/ProgressSteps";
import JSZip from "jszip";

interface MarkdownResult {
  sourceName: string;
  markdown: string;
  mode: "local" | "server";
  diagnostics?: PdfMarkdownDiagnostics;
  serverDownload?: {
    jobId: string;
    token: string;
    downloadUrl?: string;
    fileName: string;
  };
}

const toSafeMarkdownName = (sourceName: string) => {
  const base = sourceName.replace(/\.pdf$/i, "").trim() || "converted";
  const safeBase = base.replace(/[\\/:*?"<>|]+/g, "-");
  return `${safeBase}.md`;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

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
      icon={getToolByRoute("/pdf-to-docx")?.icon}
      iconColorClass={getToolByRoute("/pdf-to-docx")?.colorClass}
      description={getToolByRoute("/pdf-to-docx")?.shortDesc} 
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
  const [processing, setProcessing] = useState(false);
  const [progressValue, setProgressValue] = useState<number | undefined>(undefined);
  const [done, setDone] = useState(false);

  const handleConvert = async () => {
    if (!file || processing) return;
    setProcessing(true);
    setDone(false);
    setProgressValue(0);
    try {
      await officeUtils.docxToPdf(file, (current, total) => {
        const percent = total > 0 ? (current / total) * 100 : 0;
        setProgressValue(Math.max(0, Math.min(100, percent)));
      });
      setProgressValue(100);
      setDone(true);
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : "DOCX를 PDF로 변환하는데 실패했습니다.";
      alert(message);
    } finally {
      setProcessing(false);
      setProgressValue(undefined);
    }
  };

  return (
    <ToolLayout
      title="Word to PDF"
      icon={getToolByRoute("/docx-to-pdf")?.icon}
      iconColorClass={getToolByRoute("/docx-to-pdf")?.colorClass}
      description={getToolByRoute("/docx-to-pdf")?.shortDesc}
      isProcessing={processing}
      progressValue={progressValue}
      progressLabel="Converting Word to PDF..."
      progressSubLabel={
        file
          ? `Rendering ${file.name} through the headless PDF server`
          : "Upload a DOCX document to convert"
      }
    >
      {!file ? (
        <FileUpload
          onFilesSelected={(files) => {
            setFile(files[0]);
            setDone(false);
          }}
          accept=".docx"
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="bg-indigo-50 p-6 rounded-2xl mb-6">
            <FileType size={64} className="text-indigo-600" />
          </div>
          <h3 className="text-xl font-bold mb-4">{file.name}</h3>
          <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
            Converts DOCX to HTML first, then renders a downloadable PDF through
            the DocuFlow render server.
          </p>
          {done ? (
            <div className="mb-6 flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 px-4 py-3 rounded-xl">
              <CheckCircle size={18} />
              <span className="text-sm font-medium">PDF download started.</span>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleConvert}
              disabled={processing}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-lg transition-all text-lg"
            >
              {processing ? "Converting..." : done ? "Convert Again" : "Convert to PDF"}
            </button>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setDone(false);
              }}
              className="px-6 py-3 text-gray-600 hover:text-gray-800"
            >
              Choose another file
            </button>
          </div>
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
      icon={getToolByRoute("/epub-to-pdf")?.icon}
      iconColorClass={getToolByRoute("/epub-to-pdf")?.colorClass}
      description={getToolByRoute("/epub-to-pdf")?.shortDesc}
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
  const [conversionMode, setConversionMode] = useState<"local" | "server">("server");
  const [serverQuality, setServerQuality] = useState<"fast" | "balanced" | "accurate">("balanced");
  const [serverOcr, setServerOcr] = useState<"none" | "rapidocr" | "tesseract">("tesseract");
  const [serverOcrProfile, setServerOcrProfile] = useState<PdfMarkdownOcrProfile>("none");
  const [serverOutput, setServerOutput] = useState<PdfMarkdownOutput>("single");
  const [splitEvery, setSplitEvery] = useState("");
  const [jobDiagnostics, setJobDiagnostics] = useState<string[]>([]);
  const [ocrSteps, setOcrSteps] = useState<ProgressStep[]>([
    { id: "init", label: "Preparing files", status: "pending" },
    { id: "convert", label: "Converting PDFs", status: "pending" },
    { id: "finalize", label: "Preparing downloads", status: "pending" },
  ]);

  const updateStep = (id: string, status: ProgressStep["status"], detail?: string) => {
    setOcrSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, status, detail } : step))
    );
  };

  const addDiagnostic = (message: string) => {
    setJobDiagnostics((prev) => [...prev.slice(-7), message]);
  };

  const formatServerProgress = (progress?: PdfMarkdownJobProgress) => {
    if (!progress) return "Waiting for server progress";
    const prefix =
      typeof progress.percent === "number" ? `${Math.round(progress.percent)}%` : progress.stage;
    return [prefix, progress.message].filter(Boolean).join(" - ") || "Processing on server";
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadMarkdown = async (result: MarkdownResult) => {
    if (result.serverDownload) {
      const blob = await downloadPdfToMarkdownResult(
        result.serverDownload.jobId,
        result.serverDownload.token,
        result.serverDownload.downloadUrl
      );
      downloadBlob(blob, result.serverDownload.fileName);
      return;
    }

    downloadBlob(new Blob([result.markdown], { type: "text/markdown" }), toSafeMarkdownName(result.sourceName));
  };

  const downloadAllAsZip = async () => {
    if (!results.length || downloadingZip) return;
    const serverResults = results.filter((result) => result.serverDownload);
    if (serverResults.length) {
      setZipStatus({
        type: "error",
        message: "Server-mode files use token-protected downloads. Download each completed job individually.",
      });
      return;
    }

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
      downloadBlob(zipBlob, `${zipName}.zip`);
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

  const convertLocally = async (targetFiles: File[]) => {
    updateStep("convert", "processing", "Extracting embedded PDF text in this browser");
    const converted: MarkdownResult[] = [];

    for (const [index, file] of targetFiles.entries()) {
      const filePrefix = `File ${index + 1}/${targetFiles.length}: ${file.name}`;
      updateStep("convert", "processing", `${filePrefix} - extracting embedded text`);
      const markdown = await pdfUtils.extractTextFromPdf(file);

      converted.push({ sourceName: file.name, markdown, mode: "local" });
    }

    return converted;
  };

  const convertOnServer = async (targetFiles: File[]) => {
    updateStep("convert", "processing", "Uploading to DocuFlow server");
    const converted: MarkdownResult[] = [];
    const parsedSplitEvery = Number.parseInt(splitEvery, 10);
    const splitValue = Number.isFinite(parsedSplitEvery) && parsedSplitEvery > 0
      ? parsedSplitEvery
      : undefined;

    for (const [index, file] of targetFiles.entries()) {
      const filePrefix = `File ${index + 1}/${targetFiles.length}: ${file.name}`;
      updateStep("convert", "processing", `${filePrefix} - starting server job`);
      addDiagnostic(`${file.name}: uploading to /api/convert/pdf-to-markdown`);

      const created = await submitPdfToMarkdownJob(file, {
        mode: serverQuality,
        ocrEngine: serverOcr,
        output: serverOutput,
        splitEvery: splitValue,
        ocrProfile: serverOcrProfile,
      });

      addDiagnostic(`${file.name}: job ${created.jobId} ${created.status}`);
      const completed = await pollPdfToMarkdownJob(
        created.jobId,
        created.downloadToken,
        (job) => {
          updateStep("convert", "processing", `${filePrefix} - ${formatServerProgress(job.progress)}`);
          if (job.progress?.message) {
            addDiagnostic(`${file.name}: ${job.progress.message}`);
          }
        }
      );

      if (completed.status !== "completed") {
        throw new Error(completed.error || completed.message || `${file.name} conversion did not complete.`);
      }

      const token = completed.downloadToken || created.downloadToken;
      const serverDownload = {
        jobId: completed.jobId,
        token,
        downloadUrl: completed.downloadUrl,
        fileName: serverOutput === "zip"
          ? file.name.replace(/\.pdf$/i, ".zip")
          : toSafeMarkdownName(file.name),
      };
      const markdown =
        serverOutput === "zip"
          ? "Server conversion completed with split ZIP output. Use Download Result to save the token-protected ZIP."
          : "Server conversion completed. Use Download Result to save the token-protected Markdown file.";

      converted.push({
        sourceName: file.name,
        markdown,
        mode: "server",
        diagnostics: completed.diagnostics,
        serverDownload,
      });
      addDiagnostic(`${file.name}: completed`);
    }

    return converted;
  };

  const handleConvert = async (targetFiles: File[] = files) => {
    if (!targetFiles.length) return;

    setProcessing(true);
    setResults([]);
    setActiveResultIndex(0);
    setJobDiagnostics([]);
    setZipStatus(null);
    setOcrSteps([
      { id: "init", label: "Preparing files", status: "processing" },
      {
        id: "convert",
        label: conversionMode === "local" ? "Extracting embedded text" : "Server PDF to Markdown job",
        status: "pending",
      },
      { id: "finalize", label: "Preparing downloads", status: "pending" },
    ]);

    try {
      updateStep("init", "completed", `${targetFiles.length} file(s) ready`);
      const converted =
        conversionMode === "local"
          ? await convertLocally(targetFiles)
          : await convertOnServer(targetFiles);

      updateStep("convert", "completed", `Converted ${converted.length} file(s)`);
      updateStep("finalize", "processing", "Preparing preview and downloads");
      setResults(converted);
      setActiveResultIndex(0);
      updateStep("finalize", "completed", "Markdown output ready");
    } catch (e) {
      const message = getErrorMessage(
        e,
        "Check the PDF, server route, or selected conversion mode."
      );
      console.error(e);
      updateStep("convert", "error", message);
      alert(`Failed to extract markdown. ${message}`);
    } finally {
      setProcessing(false);
    }
  };

  const activeResult = results[activeResultIndex] || null;
  const activeDiagnostics = activeResult?.diagnostics;

  return (
    <ToolLayout
      title="PDF to Markdown"
      icon={getToolByRoute("/pdf-to-md")?.icon}
      iconColorClass={getToolByRoute("/pdf-to-md")?.colorClass}
      description={getToolByRoute("/pdf-to-md")?.shortDesc}
      isProcessing={processing}
      progressSteps={ocrSteps}
      progressLabel={conversionMode === "local" ? "Extracting embedded text" : "Running server conversion"}
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

          <div className="w-full bg-white p-6 rounded-xl border border-gray-200 mb-8 space-y-5">
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Conversion Method</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConversionMode("local")}
                  className={`text-left rounded-xl border p-4 transition-colors ${
                    conversionMode === "local"
                      ? "border-purple-300 bg-purple-50 text-purple-900"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  disabled={processing}
                >
                  <p className="font-semibold">Local simple extraction</p>
                  <p className="text-sm mt-1">
                    Uses DocuFlow PDF.js text extraction in your browser. No upload, no OCR.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setConversionMode("server")}
                  className={`text-left rounded-xl border p-4 transition-colors ${
                    conversionMode === "server"
                      ? "border-purple-300 bg-purple-50 text-purple-900"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  disabled={processing}
                >
                  <p className="font-semibold">Server high-quality conversion</p>
                  <p className="text-sm mt-1">
                    Uploads the PDF to the DocuFlow server for pdftomd extraction and optional OCR.
                  </p>
                </button>
              </div>
            </div>

            {conversionMode === "local" ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Local mode only extracts embedded text. Scanned pages and OCR require server mode.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Server mode uploads files to the configured DocuFlow API. OCR runs only when the
                  selected server engine is available; no third-party provider is used by the browser.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="text-sm font-medium text-gray-700">
                    Quality profile
                    <select
                      value={serverQuality}
                      onChange={(event) => setServerQuality(event.target.value as "fast" | "balanced" | "accurate")}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                      disabled={processing}
                    >
                      <option value="fast">Fast</option>
                      <option value="balanced">Balanced</option>
                      <option value="accurate">Accurate</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    OCR engine
                    <select
                      value={serverOcr}
                      onChange={(event) => setServerOcr(event.target.value as "none" | "rapidocr" | "tesseract")}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                      disabled={processing}
                    >
                      <option value="tesseract">Tesseract Korean/English on server (recommended)</option>
                      <option value="rapidocr">RapidOCR on server (English/numeric)</option>
                      <option value="none">None</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    OCR profile
                    <select
                      value={serverOcrProfile}
                      onChange={(event) => setServerOcrProfile(event.target.value as PdfMarkdownOcrProfile)}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                      disabled={processing}
                    >
                      <option value="none">General document</option>
                      <option value="korean-public-document">Korean public document</option>
                      <option value="receipt">Receipt</option>
                      <option value="contract">Contract</option>
                      <option value="book-scan">Book scan</option>
                      <option value="table-heavy">Table-heavy document</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    Output
                    <select
                      value={serverOutput}
                      onChange={(event) => setServerOutput(event.target.value as PdfMarkdownOutput)}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                      disabled={processing}
                    >
                      <option value="single">Single Markdown file</option>
                      <option value="zip">ZIP split output</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    Split every N pages
                    <input
                      value={splitEvery}
                      onChange={(event) => setSplitEvery(event.target.value)}
                      inputMode="numeric"
                      placeholder="Optional"
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                      disabled={processing}
                    />
                  </label>
                </div>
              </div>
            )}

            {jobDiagnostics.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-sm font-semibold text-gray-800 mb-2">Server diagnostics</p>
                <ul className="space-y-1 text-xs text-gray-600">
                  {jobDiagnostics.map((message, index) => (
                    <li key={`${message}-${index}`}>{message}</li>
                  ))}
                </ul>
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
            {conversionMode === "local"
              ? `Extract Markdown Locally (${files.length})`
              : `Start Server Conversion (${files.length})`}
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
                className="text-xs px-3 py-1.5 rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-300"
              >
                {downloadingZip ? "Creating ZIP..." : "Download ZIP"}
              </button>
            </div>
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
                  <p className="text-xs text-gray-500">
                    {result.mode === "local" ? "Local embedded text" : "Server pdftomd job"}
                  </p>
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
                    onClick={() => {
                      void downloadMarkdown(activeResult);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    <FileCode size={16} /> {activeResult.serverDownload ? "Download Result" : "Download MD"}
                  </button>
                </div>
              )}
            </div>
            {activeDiagnostics && (
              <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                <p className="font-semibold text-gray-900 mb-2">Conversion diagnostics</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <p>Pages: {activeDiagnostics.pageCount ?? "unknown"}</p>
                  <p>Weak pages: {activeDiagnostics.weakPages?.join(", ") || "none"}</p>
                  <p>OCR pages: {activeDiagnostics.ocrPages?.join(", ") || "none"}</p>
                  <p>Profile: {activeDiagnostics.ocrProfile || "none"}</p>
                  <p>Confidence: {typeof activeDiagnostics.meanConfidence === "number" ? `${activeDiagnostics.meanConfidence.toFixed(1)}%` : "unknown"}</p>
                  <p>Low-confidence lines: {activeDiagnostics.lowConfidenceLineCount ?? "unknown"}</p>
                </div>
                {activeDiagnostics.warnings?.length ? (
                  <ul className="mt-2 list-disc list-inside text-amber-700">
                    {activeDiagnostics.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
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
                setJobDiagnostics([]);
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
