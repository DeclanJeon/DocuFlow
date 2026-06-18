import React, { useState } from "react";
import { AlertCircle, Download, FileText, UploadCloud } from "lucide-react";
import { ToolLayout } from "../components/Layout";
import { FileUpload } from "../components/Shared";
import { getToolByRoute } from "../data/tools";
import { convertHwpToPdf, convertPdfToHwp, downloadBlob, downloadHwpJob, type HwpJobResponse } from "../../services/api/hwpApi";

type HwpMode = "hwp-to-pdf" | "pdf-to-hwp";

const modeConfig = {
  "hwp-to-pdf": {
    route: "/hwp-to-pdf",
    title: "HWP/HWPX to PDF",
    accept: ".hwp,.hwpx",
    uploadText: "Upload a Korean HWP or HWPX document",
    processing: "Server processing: LibreOffice conversion. Advanced hwpforge/rhwp fallbacks are reported by /api/ready.",
  },
  "pdf-to-hwp": {
    route: "/pdf-to-hwp",
    title: "PDF to HWP",
    accept: ".pdf",
    uploadText: "Upload a PDF document",
    processing: "Server processing: requires rhwp-ingest-exporter and Poppler for real HWP output.",
  },
} as const;

const resultFilename = (file: File, mode: HwpMode, job: HwpJobResponse) => {
  if (job.resultFilename) return job.resultFilename;
  if (mode === "hwp-to-pdf") return file.name.replace(/\.(hwp|hwpx)$/i, ".pdf");
  return file.name.replace(/\.pdf$/i, ".hwp");
};

export const HwpConversionTool = ({ mode }: { mode: HwpMode }) => {
  const config = modeConfig[mode];
  const tool = getToolByRoute(config.route);
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<HwpJobResponse | null>(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    setMessage("Uploading file to DocuFlow server…");
    setJob(null);
    try {
      const nextJob = mode === "hwp-to-pdf" ? await convertHwpToPdf(file) : await convertPdfToHwp(file);
      setJob(nextJob);
      setMessage("Conversion completed. Download is ready.");
      const blob = await downloadHwpJob(nextJob);
      downloadBlob(blob, resultFilename(file, mode, nextJob));
    } catch (caught) {
      const payload = caught instanceof Error && "payload" in caught ? (caught as Error & { payload?: { missing?: string[] } }).payload : undefined;
      const missing = payload?.missing?.length ? ` Missing: ${payload.missing.join(", ")}.` : "";
      setError(`${caught instanceof Error ? caught.message : "Conversion failed."}${missing}`);
      setMessage(null);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout
      title={tool?.title || config.title}
      icon={tool?.icon || FileText}
      iconColorClass={tool?.colorClass || "bg-indigo-600"}
      description={tool?.shortDesc || config.processing}
      isProcessing={processing}
      progressLabel={message || "Preparing HWP conversion…"}
      progressSubLabel={config.processing}
    >
      {!file ? (
        <div className="space-y-4">
          <div className="mx-auto max-w-2xl rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
            <div className="flex gap-2">
              <UploadCloud size={18} />
              <span>{config.uploadText}. Files are uploaded temporarily and protected by tokenized downloads.</span>
            </div>
          </div>
          <FileUpload onFilesSelected={(files) => setFile(files[0])} accept={config.accept} />
        </div>
      ) : (
        <div className="mx-auto max-w-xl space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <FileText className="text-indigo-600" />
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-900">{file.name}</p>
                <p className="text-sm text-slate-500">{Math.round(file.size / 1024)} KB</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleConvert}
              disabled={processing}
              className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow disabled:opacity-50"
            >
              Convert
            </button>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setJob(null);
                setError(null);
                setMessage(null);
              }}
              className="mt-2 w-full text-sm font-semibold text-slate-500"
            >
              Reset
            </button>
          </div>
          {job && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              Job {job.jobId} completed. If download did not start, retry conversion.
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex gap-2">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </ToolLayout>
  );
};

export const HwpToPdfTool = () => <HwpConversionTool mode="hwp-to-pdf" />;
export const PdfToHwpTool = () => <HwpConversionTool mode="pdf-to-hwp" />;
