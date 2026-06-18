import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.DOCUFLOW_BASE_URL || "https://docuflow.ponslink.com";
const fixturePath = process.env.DOCUFLOW_OCR_FIXTURE || "/home/declan/Documents/폰스링크_사업자등록증.pdf";
const pollLimit = Number.parseInt(process.env.DOCUFLOW_OCR_POLL_LIMIT || "180", 10);

const expectedFields = [
  "사업자등록증명",
  "폰스링크",
  "711-14-02973",
  "전형동",
  "인천광역시",
  "부평구",
  "4동403호",
  "2025년12월06일",
  "2025년12월09일",
  "정보통신업",
  "소매업",
  "공급업",
  "컴퓨터프로그래밍서비스업",
  "해당사항이없습니다",
  "2026년5월13일",
  "101192392970",
  "민원봉사실",
  "032-540-6226",
];

const bytes = await fs.readFile(fixturePath);
const file = new File([bytes], path.basename(fixturePath), { type: "application/pdf" });
const form = new FormData();
form.append("file", file);
form.append("mode", "accurate");
form.append("ocrEngine", "tesseract");
form.append("output", "single");
form.append("ocrProfile", "korean-public-document");
form.append("ocrAccuracy", "accurate");

const submitResponse = await fetch(`${baseUrl}/api/convert/pdf-to-markdown`, {
  method: "POST",
  body: form,
});
const submitPayload = await submitResponse.json();
console.log(JSON.stringify({ status: submitResponse.status, jobId: submitPayload.jobId }, null, 2));
if (!submitResponse.ok) {
  throw new Error(JSON.stringify(submitPayload));
}

let job = submitPayload;
for (let i = 0; i < pollLimit && !["completed", "failed"].includes(job.status); i += 1) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const statusResponse = await fetch(
    `${baseUrl}/api/jobs/${job.jobId}?token=${encodeURIComponent(submitPayload.downloadToken)}`,
    { headers: { "X-Download-Token": submitPayload.downloadToken } }
  );
  job = await statusResponse.json();
}

console.log(JSON.stringify({ status: job.status, resultFilename: job.resultFilename, diagnostics: job.diagnostics }, null, 2));
if (job.status !== "completed") {
  throw new Error(JSON.stringify(job));
}
if (job.diagnostics?.ocrProfile !== "korean-public-document") {
  throw new Error(`Expected korean-public-document profile diagnostics, got ${job.diagnostics?.ocrProfile}`);
}
if (typeof job.diagnostics?.meanConfidence !== "number") {
  throw new Error("Expected numeric OCR confidence diagnostics.");
}
if (!Array.isArray(job.diagnostics?.candidateSummary) || job.diagnostics.candidateSummary.length === 0) {
  throw new Error("Expected Tesseract candidate diagnostics.");
}
if (job.diagnostics?.ocrAccuracy !== "accurate") {
  throw new Error(`Expected accurate OCR diagnostics, got ${job.diagnostics?.ocrAccuracy}`);
}
if (job.diagnostics?.renderer !== "pdftoppm") {
  throw new Error(`Expected pdftoppm renderer diagnostics, got ${job.diagnostics?.renderer}`);
}
if (!Array.isArray(job.diagnostics?.dpiCandidates) || job.diagnostics.dpiCandidates.length === 0) {
  throw new Error("Expected OCR DPI candidate diagnostics.");
}

const downloadResponse = await fetch(
  `${baseUrl}/api/download/${job.jobId}?token=${encodeURIComponent(submitPayload.downloadToken)}`,
  { headers: { "X-Download-Token": submitPayload.downloadToken } }
);
const text = await downloadResponse.text();
console.log(text);

const normalized = text.replace(/\s+/g, "");
const missing = expectedFields.filter((field) => !normalized.includes(field.replace(/\s+/g, "")));
console.log(JSON.stringify({ missing }, null, 2));
if (missing.length) {
  throw new Error(`Missing expected OCR text: ${missing.join(", ")}`);
}
