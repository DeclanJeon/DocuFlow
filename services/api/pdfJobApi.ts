export interface CompletedPdfJob {
  jobId: string;
  status: string;
  downloadToken: string;
  downloadUrl?: string;
  resultFilename?: string;
  originalSize?: number;
  compressedSize?: number;
  reductionPercent?: number;
  preset?: string;
}

const readErrorMessage = async (response: Response, fallback: string) => {
  try {
    const payload: unknown = await response.json();
    if (payload && typeof payload === "object") {
      const record = payload as Record<string, unknown>;
      const message = record.error || record.message || record.code;
      if (typeof message === "string" && message.trim()) return message;
    }
  } catch {
  }
  return fallback;
};

const parseCompletedJob = (payload: unknown): CompletedPdfJob => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Server returned an invalid job response.");
  }
  const record = payload as Record<string, unknown>;
  const jobId = typeof record.jobId === "string" ? record.jobId : typeof record.id === "string" ? record.id : "";
  const downloadToken = typeof record.downloadToken === "string" ? record.downloadToken : "";
  if (!jobId || !downloadToken) {
    throw new Error("Server did not return a job id and download token.");
  }
  return {
    jobId,
    status: typeof record.status === "string" ? record.status : "completed",
    downloadToken,
    downloadUrl: typeof record.downloadUrl === "string" ? record.downloadUrl : undefined,
    resultFilename: typeof record.resultFilename === "string" ? record.resultFilename : undefined,
    originalSize: typeof record.originalSize === "number" ? record.originalSize : undefined,
    compressedSize: typeof record.compressedSize === "number" ? record.compressedSize : undefined,
    reductionPercent: typeof record.reductionPercent === "number" ? record.reductionPercent : undefined,
    preset: typeof record.preset === "string" ? record.preset : undefined,
  };
};

const submitPdfJob = async (route: string, formData: FormData, fallback: string) => {
  const response = await fetch(route, { method: "POST", body: formData });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, fallback));
  }
  return parseCompletedJob(await response.json());
};

export const encryptPdfOnServer = async (file: File, password: string) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("password", password);
  return submitPdfJob("/api/pdf/encrypt", formData, "Server PDF encryption failed.");
};

export const decryptPdfOnServer = async (file: File, password: string) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("password", password);
  return submitPdfJob("/api/pdf/decrypt", formData, "Server PDF decryption failed.");
};

export const compressPdfOnServer = async (
  file: File,
  preset: "screen" | "ebook" | "printer" | "prepress"
) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("preset", preset);
  return submitPdfJob("/api/pdf/compress", formData, "Server PDF compression failed.");
};

export const downloadCompletedPdfJob = async (job: CompletedPdfJob) => {
  const url = job.downloadUrl || `/api/download/${encodeURIComponent(job.jobId)}`;
  const separator = url.includes("?") ? "&" : "?";
  const response = await fetch(`${url}${separator}token=${encodeURIComponent(job.downloadToken)}`, {
    headers: { "X-Download-Token": job.downloadToken },
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Could not download the processed PDF."));
  }
  return response.blob();
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
