export interface HwpJobResponse {
  jobId: string;
  status: string;
  downloadToken?: string;
  downloadUrl?: string;
  resultFilename?: string;
  error?: { code: string; message: string };
  missing?: string[];
}

const readPayload = async (response: Response) => {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { error: text }; }
};

const submitHwpJob = async (route: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(route, { method: "POST", body: formData });
  const payload = await readPayload(response) as HwpJobResponse & Record<string, unknown>;
  if (!response.ok) {
    const message = typeof payload.error === "string"
      ? payload.error
      : typeof payload.code === "string"
        ? payload.code
        : "HWP conversion request failed.";
    const error = new Error(message) as Error & { status?: number; payload?: typeof payload };
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  if (!payload.jobId) throw new Error("Server did not return a job id.");
  return payload;
};

export const convertHwpToPdf = (file: File) => submitHwpJob("/api/convert/hwp-to-pdf", file);
export const convertPdfToHwp = (file: File) => submitHwpJob("/api/convert/pdf-to-hwp", file);

export const downloadHwpJob = async (job: HwpJobResponse) => {
  if (!job.downloadToken) throw new Error("Download token is missing.");
  const url = job.downloadUrl || `/api/download/${encodeURIComponent(job.jobId)}`;
  const separator = url.includes("?") ? "&" : "?";
  const response = await fetch(`${url}${separator}token=${encodeURIComponent(job.downloadToken)}`, {
    headers: { "X-Download-Token": job.downloadToken },
  });
  if (!response.ok) {
    const payload = await readPayload(response);
    throw new Error(typeof payload.error === "string" ? payload.error : "Download failed.");
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
