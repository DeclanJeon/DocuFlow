import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import JSZip from 'jszip';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const API_BASE = process.env.DOCUFLOW_API_BASE || 'http://127.0.0.1:4177';
const FIXTURE_DIR = path.resolve('server-runtime', 'fixtures');
const PASSWORD = 'secret123';
const CHROME_CANDIDATES = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  process.env.CHROME_PATH,
  process.env.CHROME_BINARY_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/brave-browser',
].filter(Boolean);

const existingChrome = async () => {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {}
  }
  return undefined;
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const createFixture = async () => {
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page1 = pdf.addPage([420, 300]);
  page1.drawText('DocuFlow regression smoke page 1', { x: 40, y: 230, size: 18, font, color: rgb(0, 0, 0) });
  page1.drawText('Email: smoke@example.com', { x: 40, y: 190, size: 12, font });
  const page2 = pdf.addPage([420, 300]);
  page2.drawText('DocuFlow regression smoke page 2', { x: 40, y: 230, size: 18, font, color: rgb(0, 0, 0) });
  page2.drawText('Phone: 010-1234-5678', { x: 40, y: 190, size: 12, font });
  const bytes = Buffer.from(await pdf.save());
  const filePath = path.join(FIXTURE_DIR, 'regression-smoke.pdf');
  await fs.writeFile(filePath, bytes);
  return { filePath, bytes };
};

const createHwpxFixture = async () => {
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const zip = new JSZip();
  zip.file('Contents/section0.xml', `<?xml version="1.0" encoding="UTF-8"?>
<hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph">
  <hp:p><hp:run><hp:t>DocuFlow HWPX fallback smoke</hp:t></hp:run></hp:p>
  <hp:p><hp:run><hp:t>한글 문서 변환 테스트</hp:t></hp:run></hp:p>
</hs:sec>`);
  const bytes = await zip.generateAsync({ type: 'nodebuffer' });
  const filePath = path.join(FIXTURE_DIR, 'regression-smoke.hwpx');
  await fs.writeFile(filePath, bytes);
  return { filePath, bytes };
};

const createOcrFixture = async () => {
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: await existingChrome(),
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage({ viewport: { width: 1600, height: 520, deviceScaleFactor: 2 } });
    await page.setContent('<html><body style="margin:0;background:white"><main style="width:1600px;height:520px;display:flex;flex-direction:column;justify-content:center;align-items:center;font-family:Arial,sans-serif;color:#000"><div style="font-size:156px;font-weight:900;letter-spacing:4px">DOCUFLOW OCR 12345</div><div style="font-size:96px;font-weight:800">SCANNED PDF FALLBACK</div></main></body></html>');
    const png = await page.screenshot({ type: 'png' });
    const pdf = await PDFDocument.create();
    const pdfPage = pdf.addPage([800, 260]);
    const image = await pdf.embedPng(png);
    pdfPage.drawImage(image, { x: 0, y: 0, width: 800, height: 260 });
    const bytes = Buffer.from(await pdf.save());
    const filePath = path.join(FIXTURE_DIR, 'regression-ocr-scanned.pdf');
    await fs.writeFile(filePath, bytes);
    return { filePath, bytes };
  } catch {
    return null;
  } finally {
    await browser?.close();
  }
};

const postPdf = async (route, fields, bytes, filename = 'regression-smoke.pdf') => {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: 'application/pdf' }), filename);
  for (const [key, value] of Object.entries(fields)) form.append(key, String(value));
  const response = await fetch(`${API_BASE}${route}`, { method: 'POST', body: form });
  const text = await response.text();
  let payload;
  try { payload = JSON.parse(text); } catch { payload = { raw: text }; }
  assert(response.ok, `${route} failed with ${response.status}: ${text}`);
  assert(payload.jobId && payload.downloadToken, `${route} did not return jobId/downloadToken`);
  return payload;
};

const downloadJob = async (job) => {
  const response = await fetch(`${API_BASE}/api/download/${job.jobId}?token=${encodeURIComponent(job.downloadToken)}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert(response.ok, `download ${job.jobId} failed with ${response.status}`);
  assert(bytes.subarray(0, 5).toString() === '%PDF-' || bytes.subarray(0, 2).toString() === 'PK' || bytes.subarray(0, 8).toString('hex') === 'd0cf11e0a1b11ae1' || response.headers.get('content-type')?.includes('markdown') || response.headers.get('content-type')?.includes('zip'), `download ${job.jobId} returned unexpected bytes`);
  return { bytes, contentType: response.headers.get('content-type') || '' };
};

const waitJob = async (job) => {
  for (let attempt = 0; attempt < 480; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const response = await fetch(`${API_BASE}/api/jobs/${job.jobId}?token=${encodeURIComponent(job.downloadToken)}`);
    const payload = await response.json();
    if (payload.status === 'completed') return payload;
    if (payload.status === 'failed') throw new Error(`job ${job.jobId} failed: ${JSON.stringify(payload.error)}`);
  }
  throw new Error(`job ${job.jobId} did not complete in time`);
};

const main = async () => {
  const ready = await fetch(`${API_BASE}/api/ready`);
  const readyPayload = await ready.json();
  assert(readyPayload.dependencies?.qpdf?.available, 'qpdf unavailable');
  assert(readyPayload.dependencies?.ghostscript?.available, 'Ghostscript unavailable');
  assert(readyPayload.dependencies?.pdftomd?.available, 'pdftomd unavailable');
  assert(readyPayload.dependencies?.playwrightChromium?.available, 'browser executable unavailable');

  const fixture = await createFixture();
  const hwpxFixture = await createHwpxFixture();
  const ocrFixture = await createOcrFixture();

  const renderResponse = await fetch(`${API_BASE}/api/render-pdf`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ html: '<html><body><h1>DocuFlow render regression</h1></body></html>' }),
  });
  const renderBytes = Buffer.from(await renderResponse.arrayBuffer());
  assert(renderResponse.ok && renderBytes.subarray(0, 5).toString() === '%PDF-', 'render-pdf JSON did not return a PDF');

  const multipartRenderForm = new FormData();
  multipartRenderForm.append('html', new Blob(['<html><body><h1>DocuFlow multipart render regression</h1></body></html>'], { type: 'text/html' }), 'render.html');
  const multipartRenderResponse = await fetch(`${API_BASE}/api/render-pdf`, { method: 'POST', body: multipartRenderForm });
  const multipartRenderBytes = Buffer.from(await multipartRenderResponse.arrayBuffer());
  assert(multipartRenderResponse.ok && multipartRenderBytes.subarray(0, 5).toString() === '%PDF-', 'render-pdf multipart did not return a PDF');

  const encryptedJob = await postPdf('/api/pdf/encrypt', { password: PASSWORD }, fixture.bytes);
  const encrypted = await downloadJob(encryptedJob);
  const wrongForm = new FormData();
  wrongForm.append('file', new Blob([encrypted.bytes], { type: 'application/pdf' }), 'protected.pdf');
  wrongForm.append('password', 'wrong');
  const wrongResponse = await fetch(`${API_BASE}/api/pdf/decrypt`, { method: 'POST', body: wrongForm });
  const wrongPayload = await wrongResponse.json();
  assert(wrongResponse.status === 401 && wrongPayload.code === 'PDF_PASSWORD_INCORRECT', 'wrong password path did not return PDF_PASSWORD_INCORRECT');
  const decryptedJob = await postPdf('/api/pdf/decrypt', { password: PASSWORD }, encrypted.bytes, 'protected.pdf');
  await downloadJob(decryptedJob);

  const compressedJob = await postPdf('/api/pdf/compress', { preset: 'ebook' }, fixture.bytes);
  const compressed = await downloadJob(compressedJob);
  assert(compressed.contentType.includes('pdf'), 'compression download did not return PDF');

  const markdownJob = await postPdf('/api/convert/pdf-to-markdown', { mode: 'fast', output: 'single' }, fixture.bytes);
  await waitJob(markdownJob);
  const markdown = await downloadJob(markdownJob);
  assert(markdown.contentType.includes('markdown'), 'markdown download did not return markdown');

  const splitJob = await postPdf('/api/convert/pdf-to-markdown', { mode: 'fast', output: 'zip', splitEvery: 1 }, fixture.bytes);
  await waitJob(splitJob);
  const zip = await downloadJob(splitJob);
  assert(zip.contentType.includes('zip'), 'split markdown did not return zip');

  if (ocrFixture && readyPayload.dependencies?.pdftomd?.ocr?.availableEngines?.includes('rapidocr')) {
    const ocrJob = await postPdf('/api/convert/pdf-to-markdown', { mode: 'accurate', output: 'single', ocrEngine: 'rapidocr', ocrProfile: 'none', ocrAccuracy: 'balanced' }, ocrFixture.bytes, 'regression-ocr-scanned.pdf');
    const ocrCompleted = await waitJob(ocrJob);
    const ocrMarkdown = await downloadJob(ocrJob);
    const normalizedOcrMarkdown = ocrMarkdown.bytes.toString('utf8').replace(/\s+/g, ' ').toUpperCase();
    assert(normalizedOcrMarkdown.includes('12345') && normalizedOcrMarkdown.includes('FALLBACK'), 'OCR markdown did not include scanned text markers');
    assert(ocrCompleted.diagnostics?.ocrProfile === 'none', 'OCR diagnostics did not preserve general profile');
    assert(ocrCompleted.diagnostics?.ocrAccuracy === 'balanced', 'OCR diagnostics did not preserve accuracy selection');
    if (ocrCompleted.diagnostics?.ocrEngine === 'tesseract') {
      assert(typeof ocrCompleted.diagnostics?.meanConfidence === 'number', 'OCR diagnostics did not include mean confidence');
    }
  }

  const hwpPdfJob = await postPdf('/api/convert/hwp-to-pdf', {}, hwpxFixture.bytes, 'regression-smoke.hwpx');
  const hwpPdf = await downloadJob(hwpPdfJob);
  assert(hwpPdf.contentType.includes('pdf'), 'HWPX to PDF download did not return PDF');

  const pdfToHwpJob = await postPdf('/api/convert/pdf-to-hwp', {}, fixture.bytes, 'regression-smoke.pdf');
  const hwp = await downloadJob(pdfToHwpJob);
  assert(hwp.contentType.includes('hwp'), 'PDF to HWP download did not return HWP content type');
  assert(hwp.bytes.subarray(0, 8).toString('hex') === 'd0cf11e0a1b11ae1', 'PDF to HWP did not return an HWP5/OLE file');

  console.log('PDF regression smoke passed', JSON.stringify({ render: renderBytes.length, multipartRender: multipartRenderBytes.length, encrypted: encrypted.bytes.length, compressed: compressed.bytes.length, hwpPdf: hwpPdf.bytes.length, hwp: hwp.bytes.length }));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
