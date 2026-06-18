export type PdfMarkdownMode = "fast" | "balanced" | "accurate";
export type PdfMarkdownOcrEngine = "none" | "rapidocr" | "tesseract";
export type PdfMarkdownOutput = "single" | "zip";
export type PdfMarkdownOcrProfile = "none" | "korean-public-document" | "receipt" | "contract" | "book-scan" | "table-heavy";
export type PdfMarkdownOcrAccuracy = "fast" | "balanced" | "accurate" | "max";
export type PdfMarkdownJobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled" | "expired";

export interface PdfMarkdownSubmitOptions {
  mode: PdfMarkdownMode;
  ocrEngine: PdfMarkdownOcrEngine;
  ocrProfile?: PdfMarkdownOcrProfile;
  ocrAccuracy?: PdfMarkdownOcrAccuracy;
  splitEvery?: number;
  output: PdfMarkdownOutput;
}

export interface PdfMarkdownCandidateSummary {
  engine?: string;
  language?: string;
  psm?: string;
  meanConfidence?: number;
  lowConfidenceLines?: number;
  lowConfidencePreview?: string[];
  score?: number;
}

export interface PdfMarkdownDiagnostics {
  pageCount?: number;
  weakPages?: number[];
  ocrPages?: number[];
  warnings?: string[];
  source?: string;
  outputFiles?: string[];
  ocrPipeline?: string;
  ocrProfile?: string;
  ocrAccuracy?: string;
  renderer?: string;
  dpiCandidates?: number[];
  language?: string;
  meanConfidence?: number;
  lowConfidenceLineCount?: number;
  lowConfidenceLinePreview?: string[];
  candidateSummary?: PdfMarkdownCandidateSummary[];
}

export interface PdfMarkdownJobCreated {
  jobId: string;
  status: PdfMarkdownJobStatus;
  downloadToken: string;
  message?: string;
}

export interface PdfMarkdownJobProgress {
  current?: number;
  total?: number;
  percent?: number;
  message?: string;
  stage?: string;
}

export interface PdfMarkdownJobRecord {
  jobId: string;
  status: PdfMarkdownJobStatus;
  downloadToken?: string;
  progress?: PdfMarkdownJobProgress;
  diagnostics?: PdfMarkdownDiagnostics;
  error?: string;
  message?: string;
  downloadUrl?: string;
}

const TERMINAL_STATUSES = new Set<PdfMarkdownJobStatus>([
  "completed",
  "failed",
  "cancelled",
  "expired",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (record: Record<string, unknown>, key: string) => {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
};

const readNumber = (record: Record<string, unknown>, key: string) => {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
};

const readStringArray = (record: Record<string, unknown>, key: string) => {
  const value = record[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;
};

const readNumberArray = (record: Record<string, unknown>, key: string) => {
  const value = record[key];
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === "number" && Number.isFinite(item))
    : undefined;
};

const readCandidateSummary = (record: Record<string, unknown>) => {
  const value = record.candidateSummary;
  if (!Array.isArray(value)) return undefined;
  return value.filter(isRecord).map((item) => ({
    engine: readString(item, "engine"),
    language: readString(item, "language"),
    psm: readString(item, "psm"),
    meanConfidence: readNumber(item, "meanConfidence"),
    lowConfidenceLines: readNumber(item, "lowConfidenceLines"),
    lowConfidencePreview: readStringArray(item, "lowConfidencePreview"),
    score: readNumber(item, "score"),
  }));
};

const normalizeStatus = (value: unknown): PdfMarkdownJobStatus => {
  if (
    value === "queued" ||
    value === "processing" ||
    value === "completed" ||
    value === "failed" ||
    value === "cancelled"
  ) {
    return value;
  }
  return "queued";
};

const parseDiagnostics = (value: unknown): PdfMarkdownDiagnostics | undefined => {
  if (!isRecord(value)) return undefined;

  return {
    pageCount: readNumber(value, "pageCount"),
    weakPages: readNumberArray(value, "weakPages"),
    ocrPages: readNumberArray(value, "ocrPages"),
    warnings: readStringArray(value, "warnings"),
    source: readString(value, "source"),
    outputFiles: readStringArray(value, "outputFiles"),
    ocrPipeline: readString(value, "ocrPipeline"),
    ocrProfile: readString(value, "ocrProfile"),
    ocrAccuracy: readString(value, "ocrAccuracy"),
    renderer: readString(value, "renderer"),
    dpiCandidates: readNumberArray(value, "dpiCandidates"),
    language: readString(value, "language"),
    meanConfidence: readNumber(value, "meanConfidence"),
    lowConfidenceLineCount: readNumber(value, "lowConfidenceLineCount"),
    lowConfidenceLinePreview: readStringArray(value, "lowConfidenceLinePreview"),
    candidateSummary: readCandidateSummary(value),
  };
};

const parseProgress = (value: unknown): PdfMarkdownJobProgress | undefined => {
  if (!isRecord(value)) return undefined;

  return {
    current: readNumber(value, "current"),
    total: readNumber(value, "total"),
    percent: readNumber(value, "percent"),
    message: readString(value, "message"),
    stage: readString(value, "stage"),
  };
};

const readErrorMessage = async (response: Response, fallback: string) => {
  try {
    const payload: unknown = await response.json();
    if (isRecord(payload)) {
      const error = readString(payload, "error") || readString(payload, "message");
      if (error) return error;
    }
  } catch {
  }
  return fallback;
};

const parseJobCreated = (payload: unknown): PdfMarkdownJobCreated => {
  if (!isRecord(payload)) {
    throw new Error("Server returned an invalid PDF to Markdown job response.");
  }

  const jobId = readString(payload, "jobId") || readString(payload, "id");
  const downloadToken =
    readString(payload, "downloadToken") ||
    readString(payload, "anonymousDownloadToken") ||
    readString(payload, "token");

  if (!jobId || !downloadToken) {
    throw new Error("Server did not return a job id and download token.");
  }

  return {
    jobId,
    downloadToken,
    status: normalizeStatus(payload.status),
    message: readString(payload, "message"),
  };
};

const parseJobRecord = (payload: unknown, fallbackToken?: string): PdfMarkdownJobRecord => {
  if (!isRecord(payload)) {
    throw new Error("Server returned an invalid PDF to Markdown job status.");
  }

  const jobId = readString(payload, "jobId") || readString(payload, "id");
  if (!jobId) {
    throw new Error("Server did not return a job id in status response.");
  }

  return {
    jobId,
    status: normalizeStatus(payload.status),
    downloadToken:
      readString(payload, "downloadToken") ||
      readString(payload, "anonymousDownloadToken") ||
      readString(payload, "token") ||
      fallbackToken,
    progress: parseProgress(payload.progress),
    diagnostics: parseDiagnostics(payload.diagnostics),
    error: readString(payload, "error"),
    message: readString(payload, "message"),
    downloadUrl: readString(payload, "downloadUrl"),
  };
};

const appendToken = (url: string, token: string) => {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}token=${encodeURIComponent(token)}`;
};

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

export const isTerminalMarkdownStatus = (status: PdfMarkdownJobStatus) =>
  TERMINAL_STATUSES.has(status);

// ServerApis owns the route implementation. This client expects:
// POST /api/convert/pdf-to-markdown multipart fields file, mode, ocrEngine, splitEvery, output
// -> { jobId, status, downloadToken }; then token-protected GET /api/jobs/:jobId and /api/download/:jobId.
// The server handler still needs the pdftomd subprocess wrapper with isolated cwd, explicit output,
// --force, --progress-format jsonl, JSONL progress parsing, and Node-owned ZIP creation for split output.

export const submitPdfToMarkdownJob = async (
  file: File,
  options: PdfMarkdownSubmitOptions
): Promise<PdfMarkdownJobCreated> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mode", options.mode);
  formData.append("ocrEngine", options.ocrEngine);
  formData.append("output", options.output);
  if (typeof options.splitEvery === "number" && options.splitEvery > 0) {
    formData.append("splitEvery", String(Math.floor(options.splitEvery)));
  }
  if (options.ocrProfile) {
    formData.append("ocrProfile", options.ocrProfile);
  }
  if (options.ocrAccuracy) {
    formData.append("ocrAccuracy", options.ocrAccuracy);
  }

  const response = await fetch("/api/convert/pdf-to-markdown", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Server PDF to Markdown conversion could not be started.")
    );
  }

  return parseJobCreated(await response.json());
};

export const getPdfToMarkdownJob = async (
  jobId: string,
  downloadToken: string
): Promise<PdfMarkdownJobRecord> => {
  const response = await fetch(appendToken(`/api/jobs/${encodeURIComponent(jobId)}`, downloadToken), {
    headers: {
      "X-Download-Token": downloadToken,
    },
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Could not read conversion job status."));
  }

  return parseJobRecord(await response.json(), downloadToken);
};

export const pollPdfToMarkdownJob = async (
  jobId: string,
  downloadToken: string,
  onUpdate: (job: PdfMarkdownJobRecord) => void,
  intervalMs = 1200
): Promise<PdfMarkdownJobRecord> => {
  for (;;) {
    const job = await getPdfToMarkdownJob(jobId, downloadToken);
    onUpdate(job);
    if (isTerminalMarkdownStatus(job.status)) {
      return job;
    }
    await delay(intervalMs);
  }
};

export const downloadPdfToMarkdownResult = async (
  jobId: string,
  downloadToken: string,
  downloadUrl?: string
): Promise<Blob> => {
  const url = downloadUrl || `/api/download/${encodeURIComponent(jobId)}`;
  const response = await fetch(appendToken(url, downloadToken), {
    headers: {
      "X-Download-Token": downloadToken,
    },
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Could not download conversion result."));
  }

  return response.blob();
};
