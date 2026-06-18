import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { pipeline } from "node:stream/promises";
import JSZip from "jszip";
import express from "express";
import { chromium } from "playwright";

const app = express();
const PORT = Number(process.env.PDF_SERVER_PORT || 4177);
const JOB_ROOT = path.resolve(process.cwd(), "server-runtime", "jobs");
const QPDF_PATH = process.env.QPDF_PATH || "qpdf";
const GHOSTSCRIPT_PATH = process.env.GHOSTSCRIPT_PATH || process.env.GS_PATH || "gs";
const OCRMYPDF_PATH = process.env.OCRMYPDF_PATH || "ocrmypdf";
const LOCAL_PDFTOMD_PYTHON = path.resolve(process.cwd(), ".venv-pdftomd", "bin", "python");
const PYTHON_PATH = process.env.PYTHON_PATH || (fs.existsSync(LOCAL_PDFTOMD_PYTHON) ? LOCAL_PDFTOMD_PYTHON : "python3");
const PDFTOMD_SCRIPT_PATH = process.env.PDFTOMD_PATH || (fs.existsSync(path.resolve(process.cwd(), "../pdftomd/cli/pdf_to_md.py")) ? path.resolve(process.cwd(), "../pdftomd/cli/pdf_to_md.py") : path.resolve(process.cwd(), "pdftomd/pdf_to_md.py"));
const SOFFICE_PATH = process.env.SOFFICE_PATH || "soffice";
const HWPX2HTML_PATH = process.env.HWPX2HTML_PATH || path.resolve(process.cwd(), "../pdf-master/server/hwpx2html.py");
const LOCAL_RHWP_INGEST_EXPORTER_PATH = path.resolve(process.cwd(), "../pdf-master/tools/rhwp-ingest-exporter/target/release/rhwp-ingest-exporter");
const RHWP_INGEST_EXPORTER_PATH = process.env.RHWP_INGEST_EXPORTER_PATH || (fs.existsSync(LOCAL_RHWP_INGEST_EXPORTER_PATH) ? LOCAL_RHWP_INGEST_EXPORTER_PATH : "rhwp-ingest-exporter");
const PDFTOHTML_PATH = process.env.PDFTOHTML_PATH || "pdftohtml";
const PDFTOTEXT_PATH = process.env.PDFTOTEXT_PATH || "pdftotext";
const PDFTOPPM_PATH = process.env.PDFTOPPM_PATH || "pdftoppm";
const JOB_TTL_MS = 30 * 60 * 1000;
const ABANDONED_PROCESSING_TTL_MS = 20 * 60 * 1000;
const STARTUP_ORPHAN_TTL_MS = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const PDF_UPLOAD_LIMIT = 100 * 1024 * 1024;
const MARKDOWN_UPLOAD_LIMIT = 200 * 1024 * 1024;
const HWP_UPLOAD_LIMIT = 200 * 1024 * 1024;
const MULTIPART_OVERHEAD_LIMIT = 1024 * 1024;
const PROCESS_TIMEOUT_MS = 120_000;
const COMPLETE = new Set(["completed", "failed", "expired"]);
const COMPRESS_PRESETS = new Set(["screen", "ebook", "printer", "prepress"]);

app.use(express.json({ limit: "60mb" }));

const jobs = new Map();
let browserPromise;

const ensureJobRoot = () => fsp.mkdir(JOB_ROOT, { recursive: true });

const nowIso = () => new Date().toISOString();

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const randomId = (bytes = 16) => crypto.randomBytes(bytes).toString("hex");

const safeName = (name, fallback = "document.pdf") => {
  const base = path.basename(String(name || fallback)).replace(/[\r\n\0]/g, "");
  return base || fallback;
};

const decodeHeaderUtf8Value = (value) => {
  const text = String(value || "");
  const decoded = Buffer.from(text, "latin1").toString("utf8");
  return decoded.includes("\uFFFD") ? text : decoded;
};

const decodeExtendedDispositionValue = (value) => {
  const match = /^([^']*)'[^']*'(.*)$/u.exec(String(value || ""));
  if (!match) return undefined;
  const charset = match[1].toLowerCase();
  const bytes = [];
  for (let i = 0; i < match[2].length; i += 1) {
    if (match[2][i] === "%" && /^[0-9a-f]{2}$/i.test(match[2].slice(i + 1, i + 3))) {
      bytes.push(Number.parseInt(match[2].slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(match[2].charCodeAt(i));
    }
  }
  if (charset === "utf-8" || charset === "") return Buffer.from(bytes).toString("utf8");
  if (charset === "iso-8859-1" || charset === "latin1") return Buffer.from(bytes).toString("latin1");
  return undefined;
};

const dispositionFilename = (disposition, fallback = "document.pdf") => {
  const extended = disposition["filename*"] ? decodeExtendedDispositionValue(disposition["filename*"]) : undefined;
  return safeName(extended || decodeHeaderUtf8Value(disposition.filename || fallback), fallback);
};

const quoteDispositionValue = (value) => String(value).replace(/["\\]/g, "\\$&");

const attachmentDisposition = (filename) => {
  const safe = safeName(filename);
  const asciiFallback = safe.replace(/[^\x20-\x7E]/g, "_").replace(/[\\"]/g, "_") || "document.pdf";
  return `attachment; filename="${quoteDispositionValue(asciiFallback)}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
};

const appendSuffix = (filename, suffix) => {
  const safe = safeName(filename);
  return /\.pdf$/i.test(safe) ? safe.replace(/\.pdf$/i, `${suffix}.pdf`) : `${safe}${suffix}.pdf`;
};

const jsonError = (res, status, code, message, extra = {}) => {
  res.status(status).json({ ok: false, code, error: message, ...extra });
};
const commandAvailable = (command, args = ["--version"], timeout = 5000) =>
  new Promise((resolve) => {
    execFile(command, args, { timeout }, (error, stdout, stderr) => {
      resolve({
        available: !error,
        command,
        detail: error ? String(stderr || stdout || error.message).trim() : String(stdout || stderr || "").trim(),
      });
    });
  });

const execFileChecked = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    execFile(command, args, { timeout: PROCESS_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024, ...options }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });

const BROWSER_CANDIDATES = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  process.env.CHROME_PATH,
  process.env.CHROME_BINARY_PATH,
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/brave-browser",
].filter(Boolean);

const resolveBrowserExecutable = () => {
  for (const candidate of BROWSER_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  try {
    const executablePath = chromium.executablePath();
    return fs.existsSync(executablePath) ? executablePath : undefined;
  } catch {
    return undefined;
  }
};


const getBrowser = async () => {
  if (!browserPromise) {
    const executablePath = resolveBrowserExecutable();
    browserPromise = chromium
      .launch({
        headless: true,
        executablePath,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      })
      .catch((error) => {
        browserPromise = undefined;
        throw error;
      });
  }
  return browserPromise;
};

const playwrightChromiumDependency = () => {
  const executablePath = resolveBrowserExecutable();
  if (executablePath) {
    return {
      requiredFor: ["/api/render-pdf"],
      available: true,
      command: executablePath,
      detail: "Browser executable is present.",
    };
  }
  try {
    const bundledPath = chromium.executablePath();
    return {
      requiredFor: ["/api/render-pdf"],
      available: false,
      command: bundledPath,
      detail: "Neither system Chrome/Chromium nor Playwright bundled Chromium is available.",
    };
  } catch (error) {
    return {
      requiredFor: ["/api/render-pdf"],
      available: false,
      command: "playwright chromium",
      detail: error instanceof Error ? error.message : "Unable to resolve a browser executable.",
    };
  }
};

const createJob = async (kind, req) => {
  await ensureJobRoot();
  const jobId = randomId(12);
  const anonymousDownloadToken = randomId(32);
  const jobDir = path.join(JOB_ROOT, jobId);
  await fsp.mkdir(jobDir, { recursive: false });

  const createdAt = Date.now();
  const record = {
    id: jobId,
    kind,
    status: "processing",
    progress: 0,
    createdAt,
    updatedAt: createdAt,
    deleteAt: undefined,
    jobDir,
    inputPath: undefined,
    outputPath: undefined,
    originalName: undefined,
    resultFilename: undefined,
    error: undefined,
    ownerSessionId: typeof req.get("x-docuflow-session") === "string" ? req.get("x-docuflow-session") : undefined,
    anonymousDownloadToken,
    downloadTokenHash: hashToken(anonymousDownloadToken),
    ownerEmail: undefined,
  };
  jobs.set(jobId, record);
  return record;
};

const publicJob = (job, includeToken = false) => {
  const tokenParam = includeToken ? `?token=${encodeURIComponent(job.anonymousDownloadToken)}` : "";
  return {
    jobId: job.id,
    id: job.id,
    kind: job.kind,
    status: job.status,
    progress: typeof job.progress === "number" ? { percent: job.progress } : job.progress,
    createdAt: new Date(job.createdAt).toISOString(),
    updatedAt: new Date(job.updatedAt).toISOString(),
    deleteAt: job.deleteAt ? new Date(job.deleteAt).toISOString() : undefined,
    error: job.error,
    resultFilename: job.resultFilename,
    diagnostics: job.diagnostics,
    downloadUrl: job.status === "completed" ? `/api/download/${job.id}${tokenParam}` : undefined,
    downloadToken: includeToken ? job.anonymousDownloadToken : undefined,
  };
};

const finishJob = async (job, fields) => {
  Object.assign(job, fields, {
    status: "completed",
    progress: 100,
    updatedAt: Date.now(),
    deleteAt: Date.now() + JOB_TTL_MS,
  });
};

const failJob = async (job, code, message) => {
  Object.assign(job, {
    status: "failed",
    progress: 100,
    updatedAt: Date.now(),
    deleteAt: Date.now() + JOB_TTL_MS,
    error: { code, message },
  });
};

const authorizeJob = (req, job) => {
  const token = req.get("x-download-token") || req.query.token;
  const sessionId = req.get("x-docuflow-session");
  if (sessionId && job.ownerSessionId && sessionId === job.ownerSessionId) return true;
  return typeof token === "string" && hashToken(token) === job.downloadTokenHash;
};

const cleanupJobs = async () => {
  const now = Date.now();
  for (const [jobId, job] of jobs) {
    if (COMPLETE.has(job.status) && job.deleteAt && job.deleteAt <= now) {
      jobs.delete(jobId);
      await fsp.rm(job.jobDir, { recursive: true, force: true }).catch(() => undefined);
      continue;
    }
    if ((job.status === "queued" || job.status === "processing") && now - job.updatedAt > ABANDONED_PROCESSING_TTL_MS) {
      await failJob(job, "SERVER_PROCESS_TIMEOUT", "Job heartbeat timed out.");
    }
  }
};

const cleanupStartupOrphans = async () => {
  await ensureJobRoot();
  const entries = await fsp.readdir(JOB_ROOT, { withFileTypes: true }).catch(() => []);
  const now = Date.now();
  await Promise.all(entries.map(async (entry) => {
    if (!entry.isDirectory()) return;
    const dir = path.join(JOB_ROOT, entry.name);
    const stat = await fsp.stat(dir).catch(() => undefined);
    if (stat && now - stat.mtimeMs > STARTUP_ORPHAN_TTL_MS) {
      await fsp.rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }));
};

const parseContentDisposition = (header) => {
  const fields = {};
  const parts = String(header || "").match(/(?:[^";]+|"(?:\\.|[^"])*")+/g) || [];
  for (const part of parts) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim().toLowerCase();
    let value = part.slice(separator + 1).trim();
    if (value.startsWith("\"") && value.endsWith("\"")) {
      value = value.slice(1, -1).replace(/\\(["\\])/g, "$1");
    }
    fields[key] = value;
  }
  return fields;
};

const parseMultipart = async (req, { limitBytes, jobDir }) => {
  const contentType = req.headers["content-type"] || "";
  const boundaryMatch = /boundary=(?:(?:"([^"]+)")|([^;]+))/i.exec(contentType);
  if (!boundaryMatch) {
    const error = new Error("Expected multipart/form-data with a boundary.");
    error.code = "INVALID_MULTIPART";
    throw error;
  }

  const chunks = [];
  let total = 0;
  const maxBytes = limitBytes + MULTIPART_OVERHEAD_LIMIT;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      const error = new Error("Uploaded file is too large.");
      error.code = "LIMIT_FILE_SIZE";
      throw error;
    }
    chunks.push(chunk);
  }

  const body = Buffer.concat(chunks, total);
  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
  const fields = {};
  let file = undefined;
  let cursor = body.indexOf(boundary);

  while (cursor !== -1) {
    cursor += boundary.length;
    if (body[cursor] === 45 && body[cursor + 1] === 45) break;
    if (body[cursor] === 13 && body[cursor + 1] === 10) cursor += 2;

    const headerEnd = body.indexOf(Buffer.from("\r\n\r\n"), cursor);
    if (headerEnd === -1) break;
    const headerText = body.subarray(cursor, headerEnd).toString("latin1");
    const headers = new Map();
    for (const line of headerText.split("\r\n")) {
      const separator = line.indexOf(":");
      if (separator === -1) continue;
      headers.set(line.slice(0, separator).toLowerCase(), line.slice(separator + 1).trim());
    }

    const nextBoundary = body.indexOf(boundary, headerEnd + 4);
    if (nextBoundary === -1) break;
    let partEnd = nextBoundary;
    if (body[partEnd - 2] === 13 && body[partEnd - 1] === 10) partEnd -= 2;
    const content = body.subarray(headerEnd + 4, partEnd);
    const disposition = parseContentDisposition(headers.get("content-disposition") || "");

    if (disposition.filename !== undefined) {
      if (content.length > limitBytes) {
        const error = new Error("Uploaded file is too large.");
        error.code = "LIMIT_FILE_SIZE";
        throw error;
      }
      const originalName = dispositionFilename(disposition);
      const extension = /\.(hwp|hwpx|pdf)$/i.exec(originalName)?.[1]?.toLowerCase() || "pdf";
      const tempPath = path.join(jobDir, "upload.tmp");
      const inputPath = path.join(jobDir, `input.${extension}`);
      await fsp.writeFile(tempPath, content);
      await fsp.rename(tempPath, inputPath);
      file = { path: inputPath, originalName, size: content.length, mimeType: headers.get("content-type") || "application/octet-stream" };
    } else if (disposition.name) {
      fields[disposition.name] = content.toString("utf8");
    }

    cursor = nextBoundary;
  }

  if (!file) {
    const error = new Error("PDF file is required.");
    error.code = "FILE_REQUIRED";
    throw error;
  }

  return { fields, file };
};

const assertOutput = async (outputPath) => {
  const stat = await fsp.stat(outputPath).catch(() => undefined);
  if (!stat || stat.size === 0) {
    const error = new Error("Expected output file was not created.");
    error.code = "SERVER_PROCESS_FAILED";
    throw error;
  }
  return stat;
};

const mapProcessError = (error) => {
  if (error?.status && error?.code) {
    return { status: error.status, code: error.code, message: error.message };
  }
  const stderr = String(error?.stderr || "");
  const stdout = String(error?.stdout || "");
  const message = String(error?.message || "");
  const combined = `${stderr}\n${stdout}\n${message}`.toLowerCase();
  if (error?.killed || error?.signal === "SIGTERM" || /timed out|timeout/.test(combined)) {
    return { status: 504, code: "SERVER_PROCESS_TIMEOUT", message: "Server processing timed out." };
  }
  if (/invalid password|incorrect password|bad password|password is incorrect/.test(combined)) {
    return { status: 401, code: "PDF_PASSWORD_INCORRECT", message: "PDF password is incorrect." };
  }
  return { status: 500, code: "SERVER_PROCESS_FAILED", message: "PDF processing failed." };
};

const handleUploadError = async (res, job, error) => {
  if (error.code === "LIMIT_FILE_SIZE") {
    if (job) await failJob(job, "FILE_TOO_LARGE", "Uploaded PDF exceeds the route limit.");
    jsonError(res, 413, "FILE_TOO_LARGE", "Uploaded PDF exceeds the route limit.");
    return true;
  }
  if (error.code === "FILE_REQUIRED") {
    if (job) await failJob(job, "FILE_REQUIRED", "A PDF file field is required.");
    jsonError(res, 400, "FILE_REQUIRED", "A PDF file field is required.");
    return true;
  }
  if (error.code === "INVALID_MULTIPART") {
    if (job) await failJob(job, "INVALID_MULTIPART", error.message);
    jsonError(res, 400, "INVALID_MULTIPART", error.message);
    return true;
  }
  return false;
};

const processPdfRoute = (kind, handler) => async (req, res) => {
  const job = await createJob(kind, req);
  try {
    const upload = await parseMultipart(req, { limitBytes: PDF_UPLOAD_LIMIT, jobDir: job.jobDir });
    job.inputPath = upload.file.path;
    job.originalName = upload.file.originalName;
    job.updatedAt = Date.now();
    const result = await handler(job, upload.fields, upload.file);
    await finishJob(job, result.jobFields);
    res.json({ ok: true, ...publicJob(job, true), ...result.response });
  } catch (error) {
    if (await handleUploadError(res, job, error)) return;
    const mapped = mapProcessError(error);
    await failJob(job, mapped.code, mapped.message);
    jsonError(res, mapped.status, mapped.code, mapped.message);
  }
};

const parsePdftomdProgressLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return undefined;
  try {
    const event = JSON.parse(trimmed);
    if (!event || typeof event !== "object") return undefined;
    const percent =
      typeof event.percent === "number"
        ? event.percent
        : typeof event.progress === "number"
          ? event.progress
          : undefined;
    return {
      percent,
      stage: typeof event.stage === "string" ? event.stage : undefined,
      message: typeof event.message === "string" ? event.message : trimmed,
      raw: event,
    };
  } catch {
    return undefined;
  }
};

const mapPdfToMarkdownArgs = (fields, inputPath, outputPath) => {
  const mode = typeof fields.mode === "string" ? fields.mode : "balanced";
  const requestedEngine = typeof fields.ocrEngine === "string" ? fields.ocrEngine : "none";
  const ocrEngine = requestedEngine === "tesseract" || requestedEngine === "rapidocr" ? requestedEngine : "none";
  const splitEvery = Number.parseInt(String(fields.splitEvery || ""), 10);
  const args = [PDFTOMD_SCRIPT_PATH, inputPath, "-o", outputPath, "--force", "--progress-format", "jsonl"];

  if (ocrEngine !== "none" && mode === "balanced") {
    args.push("--ocr", "auto", "--ocr-engine", ocrEngine);
  } else if (ocrEngine !== "none" && mode === "accurate") {
    args.push("--ocr-fallback", "--ocr-engine", ocrEngine);
  }

  if (Number.isFinite(splitEvery) && splitEvery > 0) {
    args.push("--split-every", String(splitEvery));
  }

  return { args, mode, ocrEngine, splitEvery: Number.isFinite(splitEvery) && splitEvery > 0 ? splitEvery : undefined };
};

const collectMarkdownOutputs = async (jobDir, outputBasePath) => {
  const outputDir = path.dirname(outputBasePath);
  const outputBaseName = path.basename(outputBasePath, ".md");
  const entries = await fsp.readdir(outputDir, { withFileTypes: true });
  const escapedBaseName = outputBaseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const chunkPatterns = [
    new RegExp(`^${escapedBaseName}_pages_(\\d+)-(\\d+)\\.md$`),
    new RegExp(`^${escapedBaseName}_p0*(\\d+)-0*(\\d+)\\.md$`),
  ];
  const chunks = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const match = chunkPatterns.map((pattern) => pattern.exec(entry.name)).find(Boolean);
    if (match) {
      chunks.push({
        filename: entry.name,
        path: path.join(outputDir, entry.name),
        start: Number(match[1]),
        end: Number(match[2]),
      });
    }
  }

  chunks.sort((a, b) => a.start - b.start || a.end - b.end);
  if (chunks.length > 0) return chunks;
  const stat = await fsp.stat(outputBasePath).catch(() => undefined);
  return stat && stat.size > 0 ? [{ filename: path.basename(outputBasePath), path: outputBasePath, start: 1, end: 1 }] : [];
};

const createMarkdownZip = async (outputs, targetPath) => {
  const zip = new JSZip();
  for (const output of outputs) {
    zip.file(output.filename, await fsp.readFile(output.path));
  }
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  await fsp.writeFile(targetPath, zipBuffer);
};

const enrichMarkdownDiagnostics = (diagnostics) => {
  for (const warning of diagnostics.warnings) {
    const estimated = /estimated_pages=(\d+)/.exec(warning);
    if (estimated) diagnostics.pageCount = Number(estimated[1]);
    const ocr = /requested_engine=([^\s]+).*ocr_pages_requested=(\d+).*ocr_pages_applied=(\d+)/.exec(warning);
    if (ocr) {
      diagnostics.engine = ocr[1];
      diagnostics.ocrPagesRequested = Number(ocr[2]);
      diagnostics.ocrPagesApplied = Number(ocr[3]);
    }
    const weakBefore = /weak_pages_before_pdfplumber=(\d+)/.exec(warning);
    const weakAfter = /weak_pages_after_pdfplumber=(\d+)/.exec(warning);
    if (weakBefore) diagnostics.weakPagesBeforeLayout = Number(weakBefore[1]);
    if (weakAfter) diagnostics.weakPagesAfterLayout = Number(weakAfter[1]);
  }
  if (!diagnostics.engine && diagnostics.ocrEngine && diagnostics.ocrEngine !== "none") diagnostics.engine = diagnostics.ocrEngine;
};


const runPdfToMarkdownJob = async (job, fields, file) => {
  const outputMode = fields.output === "zip" ? "zip" : "single";
  const outputBasePath = path.join(job.jobDir, "output.md");
  const pdftomdCwd = path.join(job.jobDir, "pdftomd-cwd");
  const diagnostics = {
    source: "pdftomd",
    warnings: [],
    outputFiles: [],
    progressEvents: [],
  };
  await fsp.mkdir(pdftomdCwd, { recursive: true });
  const { args, mode, ocrEngine, splitEvery } = mapPdfToMarkdownArgs(fields, file.path, outputBasePath);
  diagnostics.mode = mode;
  diagnostics.ocrEngine = ocrEngine;
  diagnostics.splitEvery = splitEvery;

  job.progress = { percent: 1, stage: "queued", message: "Starting pdftomd" };
  job.updatedAt = Date.now();

  const childEnv = {
    PATH: process.env.PATH || "",
    LANG: process.env.LANG || "C.UTF-8",
    LC_ALL: process.env.LC_ALL || "C.UTF-8",
    PYTHONUNBUFFERED: "1",
    HOME: pdftomdCwd,
  };

  const stderrLines = [];
  await new Promise((resolve, reject) => {
    const child = execFile(PYTHON_PATH, args, {
      cwd: pdftomdCwd,
      env: childEnv,
      timeout: PROCESS_TIMEOUT_MS * 3,
      maxBuffer: 16 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      if (stdout) diagnostics.stdout = stdout.slice(-4000);
      if (stderr) stderr.split(/\r?\n/).filter(Boolean).forEach((line) => stderrLines.push(line));
      if (error) {
        error.stderr = stderrLines.join("\n");
        reject(error);
        return;
      }
      resolve();
    });

    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk) => {
      for (const line of String(chunk).split(/\r?\n/).filter(Boolean)) {
        stderrLines.push(line);
        const event = parsePdftomdProgressLine(line);
        if (event) {
          const previous = typeof job.progress?.percent === "number" ? job.progress.percent : 0;
          const percent = typeof event.percent === "number" ? Math.max(previous, Math.min(99, event.percent)) : previous;
          job.progress = { percent, stage: event.stage, message: event.message };
          diagnostics.progressEvents.push(event.raw);
          job.updatedAt = Date.now();
        } else if (/warning|diagnostics|error|ocr|extractable/i.test(line)) {
          diagnostics.warnings.push(line);
        }
      }
    });
  });

  const outputs = await collectMarkdownOutputs(job.jobDir, outputBasePath);
  if (outputs.length === 0) {
    const error = new Error("pdftomd did not produce markdown output.");
    error.code = "SERVER_PROCESS_FAILED";
    throw error;
  }

  let outputPath;
  let resultFilename;
  if (outputMode === "zip" || outputs.length > 1) {
    outputPath = path.join(job.jobDir, "output.zip");
    await createMarkdownZip(outputs, outputPath);
    resultFilename = safeName(file.originalName).replace(/\.pdf$/i, ".zip");
  } else {
    outputPath = outputs[0].path;
    resultFilename = safeName(file.originalName).replace(/\.pdf$/i, ".md");
  }

  diagnostics.outputFiles = outputs.map((output) => output.filename);
  const reportPath = path.join(pdftomdCwd, "report", "perf_last_run.md");

  const report = await fsp.readFile(reportPath, "utf8").catch(() => "");
  if (report) diagnostics.performanceReport = report.slice(-8000);
  enrichMarkdownDiagnostics(diagnostics);
  job.diagnostics = diagnostics;
  await finishJob(job, { outputPath, resultFilename });
};
const runSearchablePdfJob = async (job, fields, file) => {
  const ocrmypdf = await commandAvailable(OCRMYPDF_PATH, ["--version"]);
  if (!ocrmypdf.available) {
    const error = new Error("ocrmypdf is not available.");
    error.code = "DEPENDENCY_UNAVAILABLE";
    throw Object.assign(error, { status: 503 });
  }

  const language = typeof fields.language === "string" && fields.language.trim()
    ? fields.language.trim()
    : "kor+eng";
  const optimize = typeof fields.optimize === "string" ? fields.optimize : "1";
  const outputPath = path.join(job.jobDir, "searchable.pdf");
  const tempOutput = path.join(job.jobDir, "searchable.tmp.pdf");

  job.progress = { percent: 5, stage: "ocr", message: "Creating searchable PDF with internal OCR." };
  job.updatedAt = Date.now();

  const args = [
    "--language",
    language,
    "--deskew",
    "--rotate-pages",
    "--skip-text",
    "--output-type",
    "pdf",
    "--optimize",
    optimize,
    "--jobs",
    "2",
    file.path,
    tempOutput,
  ];

  try {
    const result = await execFileChecked(OCRMYPDF_PATH, args, {
      timeout: PROCESS_TIMEOUT_MS * 8,
      maxBuffer: 16 * 1024 * 1024,
      env: {
        ...process.env,
        HOME: job.jobDir,
        LANG: process.env.LANG || "C.UTF-8",
        LC_ALL: process.env.LC_ALL || "C.UTF-8",
      },
    });
    await assertOutput(tempOutput);
    await fsp.rename(tempOutput, outputPath);
    await finishJob(job, {
      outputPath,
      resultFilename: appendSuffix(file.originalName, "_searchable"),
      diagnostics: {
        engine: "ocrmypdf",
        language,
        optimize,
        stdout: String(result.stdout || "").slice(-4000),
        stderr: String(result.stderr || "").slice(-4000),
      },
    });
  } catch (error) {
    await fsp.rm(tempOutput, { force: true }).catch(() => undefined);
    throw error;
  }
};


const renderHtmlFileToPdf = async (htmlPath, outputPath) => {
  const html = await fsp.readFile(htmlPath, "utf8");
  let context;
  try {
    const browser = await getBrowser();
    context = await browser.newContext();
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "14mm", right: "14mm", bottom: "14mm", left: "14mm" },
    });
    await fsp.writeFile(outputPath, Buffer.from(pdfBuffer));
  } finally {
    if (context) await context.close().catch(() => undefined);
  }
};

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "docuflow-pdf-server", time: nowIso() });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "docuflow-pdf-server", time: nowIso() });
});

app.get("/api/ready", async (_req, res) => {
  const [
    qpdf,
    ghostscript,
    ocrmypdf,
    python,
    pdftohtml,
    pdftotext,
    pdftoppm,
    rhwpIngestExporter,
    tesseract,
    rapidocr,
    pdf2image,
    pdftomdBaseDeps,
    soffice,
  ] = await Promise.all([
    commandAvailable(QPDF_PATH),
    commandAvailable(GHOSTSCRIPT_PATH),
    commandAvailable(OCRMYPDF_PATH, ["--version"], 15000),
    commandAvailable(PYTHON_PATH),
    commandAvailable(PDFTOHTML_PATH, ["-v"]),
    commandAvailable(PDFTOTEXT_PATH, ["-v"]),
    commandAvailable(PDFTOPPM_PATH, ["-h"]),
    commandAvailable(RHWP_INGEST_EXPORTER_PATH, ["--version"]),
    commandAvailable("tesseract", ["--version"]),
    commandAvailable(PYTHON_PATH, ["-c", "import rapidocr_onnxruntime"]),
    commandAvailable(PYTHON_PATH, ["-c", "import pdf2image"]),
    commandAvailable(PYTHON_PATH, ["-c", "import pypdf, pdfminer, pdfplumber"]),
    commandAvailable(SOFFICE_PATH, ["--version"]),
  ]);
  const pdftomdScriptExists = fs.existsSync(PDFTOMD_SCRIPT_PATH);
  const pdftomd = {
    requiredFor: ["/api/convert/pdf-to-markdown"],
    available: python.available && pdftomdScriptExists,
    command: `${PYTHON_PATH} ${PDFTOMD_SCRIPT_PATH}`,
    detail: pdftomdScriptExists ? python.detail : `pdftomd script missing at ${PDFTOMD_SCRIPT_PATH}`,
  };
  const ocr = {
    requiredFor: ["/api/convert/pdf-to-markdown", "/api/ocr/searchable-pdf"],
    tesseract,
    rapidocr,
    pdf2image,
    poppler: { pdftoppm },
    availableEngines: [
      tesseract.available && pdf2image.available && pdftoppm.available ? "tesseract" : undefined,
      rapidocr.available && pdf2image.available && pdftoppm.available ? "rapidocr" : undefined,
    ].filter(Boolean),
  };
  const searchablePdf = {
    requiredFor: ["/api/ocr/searchable-pdf"],
    available: ocrmypdf.available && tesseract.available,
    command: OCRMYPDF_PATH,
    detail: ocrmypdf.available ? ocrmypdf.detail : "ocrmypdf is required to preserve the original PDF layout while adding a searchable OCR text layer.",
    pipeline: { ocrmypdf, tesseract },
  };
  const hwpToPdf = {
    requiredFor: ["/api/convert/hwp-to-pdf"],
    available: soffice.available,
    command: SOFFICE_PATH,
    detail: soffice.available ? soffice.detail : "LibreOffice soffice is required for the current HWP/HWPX to PDF pipeline.",
    fallbackHints: {
      hwpx2html: fs.existsSync(HWPX2HTML_PATH),
      note: "Advanced HWP fallback pipelines require hwpforge/rhwp and are not enabled in this DocuFlow slice.",
    },
  };
  const pdfToHwp = {
    requiredFor: ["/api/convert/pdf-to-hwp"],
    available: rhwpIngestExporter.available && pdftohtml.available && pdftotext.available,
    command: RHWP_INGEST_EXPORTER_PATH,
    detail: rhwpIngestExporter.available ? rhwpIngestExporter.detail : "rhwp-ingest-exporter is required for real HWP output.",
    pipeline: {
      rhwpIngestExporter,
      pdftohtml,
      pdftotext,
      pdftoppm,
    },
  };
  const playwrightChromium = playwrightChromiumDependency();
  const ok = qpdf.available && ghostscript.available && playwrightChromium.available && pdftomd.available && hwpToPdf.available && searchablePdf.available;
  res.status(ok ? 200 : 503).json({
    ok,
    service: "docuflow-pdf-server",
    dependencies: {
      qpdf: { requiredFor: ["/api/pdf/encrypt", "/api/pdf/decrypt"], ...qpdf },
      ghostscript: { requiredFor: ["/api/pdf/compress"], ...ghostscript },
      pdftomd: { ...pdftomd, baseDeps: pdftomdBaseDeps, ocr },
      searchablePdf,
      playwrightChromium,
      hwpToPdf,
      pdfToHwp,
    },
  });
});

app.post("/api/render-pdf", async (req, res) => {
  let context;
  try {
    const html = typeof req.body?.html === "string" ? req.body.html : "";
    if (!html.trim()) {
      res.status(400).json({ error: "html is required" });
      return;
    }

    const browser = await getBrowser();
    context = await browser.newContext();
    const page = await context.newPage();

    await page.setContent(html, { waitUntil: "networkidle" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "14mm", right: "14mm", bottom: "14mm", left: "14mm" },
    });

    await context.close();
    context = undefined;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "no-store");
    res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    if (context) await context.close().catch(() => undefined);
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("Headless PDF render failed", error);

    const needsInstall = message.includes("Executable doesn't exist");
    const clientMessage = needsInstall
      ? "Playwright browser is missing. Run: pnpm exec playwright install chromium"
      : "Failed to render PDF";

    res.status(500).json({ error: clientMessage });
  }
});

app.post("/api/pdf/encrypt", processPdfRoute("pdf-encrypt", async (job, fields, file) => {
  const password = typeof fields.password === "string" ? fields.password : "";
  if (!password) {
    const error = new Error("Password is required.");
    error.code = "PASSWORD_REQUIRED";
    throw Object.assign(error, { status: 400 });
  }
  const qpdf = await commandAvailable(QPDF_PATH);
  if (!qpdf.available) {
    const error = new Error("qpdf is not available.");
    error.code = "DEPENDENCY_UNAVAILABLE";
    throw Object.assign(error, { status: 503 });
  }

  const tempOutput = path.join(job.jobDir, "encrypted.tmp.pdf");
  const outputPath = path.join(job.jobDir, "encrypted.pdf");
  try {
    await execFileChecked(QPDF_PATH, ["--encrypt", password, password, "256", "--", file.path, tempOutput], { timeout: 30_000 });
    await assertOutput(tempOutput);
    await fsp.rename(tempOutput, outputPath);
  } catch (error) {
    await fsp.rm(tempOutput, { force: true }).catch(() => undefined);
    throw error;
  }

  return {
    jobFields: { outputPath, resultFilename: appendSuffix(file.originalName, "_encrypted") },
    response: {},
  };
}));

app.post("/api/pdf/decrypt", processPdfRoute("pdf-decrypt", async (job, fields, file) => {
  const password = typeof fields.password === "string" ? fields.password : "";
  if (!password) {
    const error = new Error("Password is required.");
    error.code = "PASSWORD_REQUIRED";
    throw Object.assign(error, { status: 400 });
  }
  const qpdf = await commandAvailable(QPDF_PATH);
  if (!qpdf.available) {
    const error = new Error("qpdf is not available.");
    error.code = "DEPENDENCY_UNAVAILABLE";
    throw Object.assign(error, { status: 503 });
  }

  const tempOutput = path.join(job.jobDir, "decrypted.tmp.pdf");
  const outputPath = path.join(job.jobDir, "decrypted.pdf");
  try {
    await execFileChecked(QPDF_PATH, [`--password=${password}`, "--decrypt", file.path, tempOutput], { timeout: 30_000 });
    await assertOutput(tempOutput);
    await fsp.rename(tempOutput, outputPath);
  } catch (error) {
    await fsp.rm(tempOutput, { force: true }).catch(() => undefined);
    throw error;
  }

  return {
    jobFields: { outputPath, resultFilename: appendSuffix(file.originalName, "_decrypted") },
    response: {},
  };
}));

app.post("/api/pdf/compress", processPdfRoute("pdf-compress", async (job, fields, file) => {
  const preset = typeof fields.preset === "string" && fields.preset ? fields.preset : "ebook";
  if (!COMPRESS_PRESETS.has(preset)) {
    const error = new Error("Compression preset must be one of screen, ebook, printer, prepress.");
    error.code = "INVALID_COMPRESS_PRESET";
    throw Object.assign(error, { status: 400 });
  }
  const ghostscript = await commandAvailable(GHOSTSCRIPT_PATH);
  if (!ghostscript.available) {
    const error = new Error("Ghostscript is not available.");
    error.code = "DEPENDENCY_UNAVAILABLE";
    throw Object.assign(error, { status: 503 });
  }

  const tempOutput = path.join(job.jobDir, "compressed.tmp.pdf");
  const outputPath = path.join(job.jobDir, "compressed.pdf");
  try {
    try {
      await execFileChecked(GHOSTSCRIPT_PATH, [
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        `-dPDFSETTINGS=/${preset}`,
        "-dDetectDuplicateImages=true",
        "-dCompressFonts=true",
        "-dSubsetFonts=true",
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        `-sOutputFile=${tempOutput}`,
        file.path,
      ], { timeout: PROCESS_TIMEOUT_MS });
    } catch (error) {
      const stat = await fsp.stat(tempOutput).catch(() => undefined);
      if (!stat || stat.size === 0) throw error;
      console.warn("[COMPRESS] Ghostscript returned non-zero but produced a PDF; continuing.");
    }
    const outputStat = await assertOutput(tempOutput);
    await fsp.rename(tempOutput, outputPath);
    const originalSize = file.size;
    const compressedSize = outputStat.size;
    const reductionPercent = originalSize > 0 ? Math.max(0, Math.round((1 - compressedSize / originalSize) * 100)) : 0;
    return {
      jobFields: { outputPath, resultFilename: appendSuffix(file.originalName, "_compressed") },
      response: { originalSize, compressedSize, reductionPercent, preset },
    };
  } catch (error) {
    await fsp.rm(tempOutput, { force: true }).catch(() => undefined);
    throw error;
  }
}));

app.post("/api/convert/pdf-to-markdown", async (req, res) => {
  const job = await createJob("pdf-to-markdown", req);
  try {
    const upload = await parseMultipart(req, { limitBytes: MARKDOWN_UPLOAD_LIMIT, jobDir: job.jobDir });
    job.inputPath = upload.file.path;
    job.originalName = upload.file.originalName;
    job.progress = { percent: 1, stage: "queued", message: "PDF to Markdown job queued" };
    job.updatedAt = Date.now();
    res.json({ ok: true, ...publicJob(job, true), message: "PDF to Markdown job queued." });
    void runPdfToMarkdownJob(job, upload.fields, upload.file).catch(async (error) => {
      const mapped = mapProcessError(error);
      const stderr = String(error?.stderr || "");
      if (/password|encrypted/i.test(stderr)) {
        await failJob(job, "PDF_ENCRYPTED_UNSUPPORTED", "Encrypted PDF cannot be converted without a password.");
      } else if (/module|not found|no such file|dependency/i.test(stderr)) {
        await failJob(job, "DEPENDENCY_UNAVAILABLE", "pdftomd dependency is unavailable.");
      } else {
        await failJob(job, mapped.code, mapped.message);
      }
    });
  } catch (error) {
    if (await handleUploadError(res, job, error)) return;
    const mapped = mapProcessError(error);
    await failJob(job, mapped.code, mapped.message);
    jsonError(res, mapped.status, mapped.code, mapped.message);
  }
});

app.post("/api/ocr/searchable-pdf", async (req, res) => {
  const job = await createJob("ocr-searchable-pdf", req);
  try {
    const upload = await parseMultipart(req, { limitBytes: MARKDOWN_UPLOAD_LIMIT, jobDir: job.jobDir });
    if (!/\.pdf$/i.test(upload.file.originalName)) {
      await failJob(job, "INVALID_FILE", "PDF file is required for searchable PDF OCR.");
      jsonError(res, 400, "INVALID_FILE", "PDF file is required for searchable PDF OCR.");
      return;
    }
    job.inputPath = upload.file.path;
    job.originalName = upload.file.originalName;
    job.progress = { percent: 1, stage: "queued", message: "Searchable PDF OCR job queued" };
    job.updatedAt = Date.now();
    res.json({ ok: true, ...publicJob(job, true), message: "Searchable PDF OCR job queued." });
    void runSearchablePdfJob(job, upload.fields, upload.file).catch(async (error) => {
      const mapped = mapProcessError(error);
      const stderr = String(error?.stderr || "");
      if (/EncryptedPdfError|password|encrypted/i.test(stderr)) {
        await failJob(job, "PDF_ENCRYPTED_UNSUPPORTED", "Encrypted PDF cannot be OCR-processed without a password.");
      } else if (/ocrmypdf|tesseract|not found|dependency/i.test(stderr)) {
        await failJob(job, "DEPENDENCY_UNAVAILABLE", "Searchable PDF OCR dependency is unavailable.");
      } else {
        await failJob(job, mapped.code, mapped.message);
      }
    });
  } catch (error) {
    if (await handleUploadError(res, job, error)) return;
    const mapped = mapProcessError(error);
    await failJob(job, mapped.code, mapped.message);
    jsonError(res, mapped.status, mapped.code, mapped.message);
  }
});

app.post("/api/convert/hwp-to-pdf", async (req, res) => {
  const job = await createJob("hwp-to-pdf", req);
  try {
    const upload = await parseMultipart(req, { limitBytes: HWP_UPLOAD_LIMIT, jobDir: job.jobDir });
    const originalName = upload.file.originalName;
    if (!/\.(hwp|hwpx)$/i.test(originalName)) {
      await failJob(job, "INVALID_FILE", "HWP or HWPX file is required.");
      jsonError(res, 400, "INVALID_FILE", "HWP or HWPX file is required.");
      return;
    }
    const soffice = await commandAvailable(SOFFICE_PATH, ["--version"]);
    if (!soffice.available) {
      await failJob(job, "DEPENDENCY_UNAVAILABLE", "LibreOffice soffice is required for HWP/HWPX to PDF conversion.");
      jsonError(res, 503, "DEPENDENCY_UNAVAILABLE", "LibreOffice soffice is required for HWP/HWPX to PDF conversion.", { missing: ["soffice"] });
      return;
    }

    job.inputPath = upload.file.path;
    job.originalName = originalName;
    job.progress = { percent: 10, stage: "converting", message: "Starting LibreOffice HWP/HWPX to PDF conversion." };
    job.updatedAt = Date.now();

    const outputPath = path.join(job.jobDir, "output.pdf");
    try {
      await execFileChecked(SOFFICE_PATH, [
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        job.jobDir,
        upload.file.path,
      ], {
        timeout: PROCESS_TIMEOUT_MS,
        env: { ...process.env, HOME: "/tmp", LANG: "ko_KR.UTF-8", LC_ALL: "ko_KR.UTF-8", OOO_LOCALE: "ko" },
      });
      const generatedPdfs = (await fsp.readdir(job.jobDir)).filter((entry) => entry.toLowerCase().endsWith(".pdf"));
      const generatedPath = generatedPdfs.map((entry) => path.join(job.jobDir, entry)).find((candidate) => candidate !== upload.file.path);
      if (!generatedPath) {
        const error = new Error("LibreOffice did not produce a PDF.");
        error.code = "SERVER_PROCESS_FAILED";
        throw error;
      }
      if (generatedPath !== outputPath) await fsp.rename(generatedPath, outputPath);
      await assertOutput(outputPath);
      await finishJob(job, {
        outputPath,
        resultFilename: safeName(originalName).replace(/\.(hwp|hwpx)$/i, ".pdf"),
        diagnostics: { engine: "libreoffice", command: SOFFICE_PATH },
      });
      res.json({ ok: true, ...publicJob(job, true) });
    } catch (error) {
      const isHwpx = /\.hwpx$/i.test(originalName);
      if (isHwpx && fs.existsSync(HWPX2HTML_PATH)) {
        try {
          const htmlPath = path.join(job.jobDir, "output.html");
          job.progress = { percent: 60, stage: "fallback", message: "LibreOffice failed; rendering HWPX through HTML fallback." };
          job.updatedAt = Date.now();
          await execFileChecked(PYTHON_PATH, [HWPX2HTML_PATH, upload.file.path, htmlPath], { timeout: 60_000 });
          await renderHtmlFileToPdf(htmlPath, outputPath);
          await assertOutput(outputPath);
          await finishJob(job, {
            outputPath,
            resultFilename: safeName(originalName).replace(/\.hwpx$/i, ".pdf"),
            diagnostics: { engine: "hwpx2html+chrome", command: `${PYTHON_PATH} ${HWPX2HTML_PATH}` },
          });
          res.json({ ok: true, ...publicJob(job, true) });
          return;
        } catch (fallbackError) {
          const mapped = mapProcessError(fallbackError);
          await failJob(job, mapped.code, mapped.message);
          jsonError(res, mapped.status, mapped.code, mapped.message);
          return;
        }
      }
      const mapped = mapProcessError(error);
      await failJob(job, mapped.code, mapped.message);
      jsonError(res, mapped.status, mapped.code, mapped.message);
    }
  } catch (error) {
    if (await handleUploadError(res, job, error)) return;
    const mapped = mapProcessError(error);
    await failJob(job, mapped.code, mapped.message);
    jsonError(res, mapped.status, mapped.code, mapped.message);
  }
});

app.post("/api/convert/pdf-to-hwp", async (req, res) => {
  const job = await createJob("pdf-to-hwp", req);
  try {
    const upload = await parseMultipart(req, { limitBytes: HWP_UPLOAD_LIMIT, jobDir: job.jobDir });
    if (!/\.pdf$/i.test(upload.file.originalName)) {
      await failJob(job, "INVALID_FILE", "PDF file is required.");
      jsonError(res, 400, "INVALID_FILE", "PDF file is required.");
      return;
    }
    const [rhwpIngestExporter, pdftohtml, pdftotext] = await Promise.all([
      commandAvailable(RHWP_INGEST_EXPORTER_PATH, ["--version"]),
      commandAvailable(PDFTOHTML_PATH, ["-v"]),
      commandAvailable(PDFTOTEXT_PATH, ["-v"]),
    ]);
    const missing = [
      !rhwpIngestExporter.available ? "rhwp-ingest-exporter" : undefined,
      !pdftohtml.available ? "pdftohtml" : undefined,
      !pdftotext.available ? "pdftotext" : undefined,
    ].filter(Boolean);
    if (missing.length > 0) {
      await failJob(job, "DEPENDENCY_UNAVAILABLE", `PDF to HWP conversion requires: ${missing.join(", ")}.`);
      jsonError(res, 503, "DEPENDENCY_UNAVAILABLE", `PDF to HWP conversion requires: ${missing.join(", ")}.`, { missing });
      return;
    }

    const textPath = path.join(job.jobDir, "text.txt");
    const ingestPath = path.join(job.jobDir, "ingest.json");
    const outputPath = path.join(job.jobDir, "output.hwp");
    await execFileChecked(PDFTOTEXT_PATH, ["-layout", upload.file.path, textPath], { timeout: 60_000 });
    const rawText = await fsp.readFile(textPath, "utf8").catch(() => "");
    const pages = rawText.split("\f").map((page) => page.trim()).filter(Boolean);
    const questions = (pages.length > 0 ? pages : ["PDF에서 추출 가능한 텍스트가 없습니다. 스캔 이미지 PDF는 OCR 단계가 필요합니다."]).map((pageText, index) => ({
      number: index + 1,
      stem: pageText,
      stem_blocks: pageText.split(/\n{2,}/).map((text) => ({ type: "text", text: text.trim() })).filter((block) => block.text),
      choices: [],
      media: [],
      auto_number: false,
    }));
    const ingest = {
      version: "1",
      page_size: { width_mm: 210, height_mm: 297 },
      default_font: "함초롬바탕",
      questions,
    };
    await fsp.writeFile(ingestPath, JSON.stringify(ingest, null, 2), "utf8");
    await execFileChecked(RHWP_INGEST_EXPORTER_PATH, [
      ingestPath,
      "--media-dir",
      job.jobDir,
      "-o",
      outputPath,
      "--format",
      "hwp",
    ], { timeout: PROCESS_TIMEOUT_MS, env: { ...process.env, LANG: "ko_KR.UTF-8", LC_ALL: "ko_KR.UTF-8" } });
    await assertOutput(outputPath);
    await finishJob(job, {
      outputPath,
      resultFilename: safeName(upload.file.originalName).replace(/\.pdf$/i, ".hwp"),
      diagnostics: { engine: "pdftotext+rhwp-ingest-exporter", pages: questions.length },
    });
    res.json({ ok: true, ...publicJob(job, true) });
  } catch (error) {
    if (await handleUploadError(res, job, error)) return;
    const mapped = mapProcessError(error);
    await failJob(job, mapped.code, mapped.message);
    jsonError(res, mapped.status, mapped.code, mapped.message);
  }
});

app.get("/api/jobs/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    jsonError(res, 404, "JOB_NOT_FOUND", "Job was not found or has expired.");
    return;
  }
  if (!authorizeJob(req, job)) {
    jsonError(res, 403, "DOWNLOAD_TOKEN_REQUIRED", "A valid download token or owner session is required.");
    return;
  }
  res.json({ ok: true, ...publicJob(job, false) });
});

app.get("/api/download/:jobId", async (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    jsonError(res, 404, "JOB_NOT_FOUND", "Job was not found or has expired.");
    return;
  }
  if (!authorizeJob(req, job)) {
    jsonError(res, 403, "DOWNLOAD_TOKEN_REQUIRED", "A valid download token or owner session is required.");
    return;
  }
  if (job.status !== "completed" || !job.outputPath) {
    jsonError(res, 409, "JOB_NOT_COMPLETE", "Job output is not ready for download.");
    return;
  }

  const stat = await fsp.stat(job.outputPath).catch(() => undefined);
  if (!stat || stat.size === 0) {
    jsonError(res, 500, "SERVER_PROCESS_FAILED", "Job output is missing.");
    return;
  }

  const lowerName = String(job.resultFilename || "").toLowerCase();
  const contentType = lowerName.endsWith(".zip")
    ? "application/zip"
    : lowerName.endsWith(".md")
      ? "text/markdown; charset=utf-8"
      : lowerName.endsWith(".hwp")
        ? "application/x-hwp"
        : lowerName.endsWith(".hwpx")
          ? "application/vnd.hancom.hwpx"
          : "application/pdf";
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Length", String(stat.size));
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Disposition", attachmentDisposition(job.resultFilename));
  await pipeline(fs.createReadStream(job.outputPath), res);
});

app.use((error, _req, res, _next) => {
  if (error?.type === "entity.too.large") {
    jsonError(res, 413, "JSON_TOO_LARGE", "JSON body exceeds the 60MB /api/render-pdf limit.");
    return;
  }
  console.error("Unhandled PDF server error", error);
  jsonError(res, error?.status || 500, error?.code || "SERVER_ERROR", "Unexpected server error.");
});

await cleanupStartupOrphans();
const cleanupTimer = setInterval(() => {
  cleanupJobs().catch((error) => console.error("Job cleanup failed", error));
}, CLEANUP_INTERVAL_MS);
cleanupTimer.unref();

const server = app.listen(PORT, () => {
  console.log(`Headless PDF server listening on :${PORT}`);
});

const shutdown = async () => {
  clearInterval(cleanupTimer);
  try {
    if (browserPromise) {
      const browser = await browserPromise;
      await browser.close();
    }
  } finally {
    server.close(() => process.exit(0));
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
