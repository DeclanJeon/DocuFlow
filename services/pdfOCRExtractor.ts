import * as pdfUtils from "./pdfUtils";
import {
  performOCRWithOpenRouter,
  OpenRouterConfig,
  OpenRouterOcrError,
  OcrFailureReason,
} from "./openRouterService";

interface FailedBatchDetail {
  range: string;
  reason: OcrFailureReason;
  pageIndex: number;
}

export interface PdfOcrExtractionResult {
  markdown: string;
  failedBatchCount: number;
  failedBatchRanges: string[];
  failedBatchDetails: FailedBatchDetail[];
  failedReasonCounts: Partial<Record<OcrFailureReason, number>>;
  weakPageCount: number;
  weakPageRanges: string[];
  ocrAttemptedPages: number;
  ocrAttemptedPageRanges: string[];
  ocrAppliedPages: number;
  ocrAppliedPageRanges: string[];
  diagnosticsMessage: string;
}

const MAX_REASON_RETRIES = 2;
const WAIT_RATE_LIMIT_MS = 2200;
const WAIT_SERVER_MS = 1500;
const WAIT_NETWORK_MS = 1200;

const PDF_TEXT_CHAR_THRESHOLD = 20;
const PDF_TEXT_PRINTABLE_RATIO_THRESHOLD = 0.85;
const WEAK_OCR_CONCURRENCY = 2;

const PDF_TEXT_SEPARATOR = "\n\n---\n\n";

const waitByReason = async (reason: OcrFailureReason) => {
  const delayMap: Record<OcrFailureReason, number> = {
    rate_limit: WAIT_RATE_LIMIT_MS,
    server: WAIT_SERVER_MS,
    network: WAIT_NETWORK_MS,
    timeout: 0,
    unauthorized: 0,
    unknown: 0,
  };
  const delay = delayMap[reason];
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
};

const chunkIndices = (indices: number[], size: number) => {
  const chunks: number[][] = [];
  for (let i = 0; i < indices.length; i += size) {
    chunks.push(indices.slice(i, i + size));
  }
  return chunks;
};

const normalizeText = (value: string) => value.replace(/\u0000/g, "").replace(/\s+/g, " ").trim();

const isPrintableChar = (char: string) => {
  const codePoint = char.codePointAt(0) ?? 0;
  return (
    char === "\n" ||
    char === "\r" ||
    char === "\t" ||
    char === " " ||
    (codePoint >= 0x20 && codePoint < 0x7f) ||
    codePoint >= 0xa0
  );
};

const calculatePrintableRatio = (text: string) => {
  const normalized = normalizeText(text);
  if (!normalized) return 0;

  let printableCount = 0;
  for (const char of normalized) {
    if (isPrintableChar(char)) printableCount += 1;
  }

  return printableCount / normalized.length;
};

const isWeakPageText = (text: string) => {
  const normalized = normalizeText(text);
  if (!normalized) return true;
  if (normalized.length < PDF_TEXT_CHAR_THRESHOLD) return true;
  return calculatePrintableRatio(normalized) < PDF_TEXT_PRINTABLE_RATIO_THRESHOLD;
};

const toPageRange = (pageIndices: number[]) => {
  if (pageIndices.length === 0) return [];

  const sorted = [...pageIndices].sort((a, b) => a - b);
  const ranges: string[] = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];

  for (let i = 1; i < sorted.length; i += 1) {
    const page = sorted[i];
    if (page === rangeEnd + 1) {
      rangeEnd = page;
    } else {
      ranges.push(rangeStart === rangeEnd ? `${rangeStart + 1}` : `${rangeStart + 1}-${rangeEnd + 1}`);
      rangeStart = page;
      rangeEnd = page;
    }
  }

  ranges.push(rangeStart === rangeEnd ? `${rangeStart + 1}` : `${rangeStart + 1}-${rangeEnd + 1}`);
  return ranges;
};

const shouldUseOcrPageText = (baselineText: string, ocrText: string) => {
  const baselineNormalized = normalizeText(baselineText);
  const ocrNormalized = normalizeText(ocrText);

  if (!ocrNormalized) return false;
  if (calculatePrintableRatio(ocrNormalized) < 0.7) return false;

  if (!baselineNormalized) {
    return ocrNormalized.length >= PDF_TEXT_CHAR_THRESHOLD;
  }

  const minimumLength = Math.max(
    PDF_TEXT_CHAR_THRESHOLD,
    Math.floor(baselineNormalized.length * 0.75)
  );

  return ocrNormalized.length >= minimumLength;
};

const baselineTextToMarkdown = (text: string) => {
  const normalized = normalizeText(text);
  if (!normalized) return "";
  return text.trim();
};

const extractPdfPageTexts = async (
  pdf: Awaited<ReturnType<typeof pdfUtils.getPdfDocument>>
) => {
  const pageTexts: string[] = [];
  const pageCount = pdf.numPages;

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => {
        const maybeStr =
          typeof item === "object" && item !== null && "str" in item
            ? String((item as { str?: unknown }).str || "")
            : "";
        return maybeStr;
      })
      .join(" ");
    pageTexts.push(pageText);
  }

  return pageTexts;
};

const renderAndOcrPageGroup = async (
  pdf: Awaited<ReturnType<typeof pdfUtils.getPdfDocument>>,
  pageIndices: number[],
  config?: OpenRouterConfig
) => {
  const stitchedImageBlob = await pdfUtils.renderPagesToCombinedBlob(
    pdf,
    pageIndices,
    1.5,
    0.8
  );

  if (!stitchedImageBlob) {
    throw new OpenRouterOcrError(
      "OCR 배치 이미지 렌더링에 실패했습니다.",
      "unknown"
    );
  }

  const imageFile = new File(
    [stitchedImageBlob],
    `batch-${pageIndices[0] + 1}-${pageIndices[pageIndices.length - 1] + 1}.jpg`,
    { type: "image/jpeg" }
  );

  return performOCRWithOpenRouter(imageFile, config);
};

const processBatchWithRecovery = async (
  pdf: Awaited<ReturnType<typeof pdfUtils.getPdfDocument>>,
  pageIndices: number[],
  config?: OpenRouterConfig
) => {
  let groups = [pageIndices];
  let timeoutFallbackLevel = 0;
  let attempts = 0;

  while (true) {
    try {
      const results: string[] = [];
      for (const group of groups) {
        const markdown = await renderAndOcrPageGroup(pdf, group, config);
        results.push(markdown);
      }
      return results.filter(Boolean).join("\n\n---\n\n");
    } catch (error) {
      const reason =
        error instanceof OpenRouterOcrError ? error.reason : ("unknown" as OcrFailureReason);

      if (reason === "unauthorized") {
        throw new OpenRouterOcrError(
          "OpenRouter 인증에 실패했습니다. VITE_OPENROUTER_API_KEY와 계정 권한을 확인해주세요.",
          "unauthorized"
        );
      }

      if (reason === "timeout" && timeoutFallbackLevel < 2) {
        timeoutFallbackLevel += 1;
        const nextChunkSize = timeoutFallbackLevel === 1 ? 3 : 1;
        groups = chunkIndices(pageIndices, nextChunkSize);
        attempts = 0;
        continue;
      }

      if (
        (reason === "rate_limit" || reason === "server" || reason === "network") &&
        attempts < MAX_REASON_RETRIES
      ) {
        attempts += 1;
        await waitByReason(reason);
        continue;
      }

      throw error;
    }
  }
};

/**
 * PDF OCR 추출기 (약한 페이지 우선 보강)
 */
export const extractMarkdownFromPdfWithOCR = async (
  file: File,
  config?: OpenRouterConfig,
  onProgress?: (current: number, total: number) => void
): Promise<PdfOcrExtractionResult> => {
  try {
    const pdf = await pdfUtils.getPdfDocument(file);
    const totalPages = pdf.numPages;

    onProgress?.(0, totalPages);

    const pageTextResults = await extractPdfPageTexts(pdf);
    const weakPageIndices = pageTextResults
      .map((pageText, pageIndex) => ({ pageText, pageIndex }))
      .filter((entry) => isWeakPageText(entry.pageText))
      .map((entry) => entry.pageIndex);

    const weakPageRanges = toPageRange(weakPageIndices);

    const pageMarkdowns = pageTextResults.map((text) => baselineTextToMarkdown(text));
    const attemptedOcrRanges: number[] = [];
    const successfulOcrRanges: number[] = [];
    const failedBatchRanges: string[] = [];
    const failedBatchDetails: FailedBatchDetail[] = [];

    let completedPages = totalPages - weakPageIndices.length;
    const updateProgress = () => {
      const safeCompletedPages = Math.min(completedPages, totalPages);
      onProgress?.(safeCompletedPages, totalPages);
    };

    updateProgress();

    let authError: Error | null = null;

    for (let i = 0; i < weakPageIndices.length; i += WEAK_OCR_CONCURRENCY) {
      const batch = weakPageIndices.slice(i, i + WEAK_OCR_CONCURRENCY);
      const pageGroups = chunkIndices(batch, 1);

      await Promise.all(
        pageGroups.map(async (pageIndices) => {
          const pageIndex = pageIndices[0];
          if (pageIndex === undefined) return;

          try {
            const ocrText = await processBatchWithRecovery(pdf, pageIndices, config);
            attemptedOcrRanges.push(pageIndex);

            const baselineText = pageTextResults[pageIndex] || "";
            const shouldUseOcr = shouldUseOcrPageText(baselineText, ocrText);

            if (shouldUseOcr || !normalizeText(baselineText)) {
              pageMarkdowns[pageIndex] = ocrText;
              successfulOcrRanges.push(pageIndex);
            }
          } catch (error) {
            const reason =
              error instanceof OpenRouterOcrError
                ? error.reason
                : ("unknown" as OcrFailureReason);

            if (reason === "unauthorized") {
              authError =
                error instanceof Error
                  ? error
                  : new Error(
                      "OpenRouter 인증에 실패했습니다. VITE_OPENROUTER_API_KEY와 계정 권한을 확인해주세요."
                    );
              return;
            }

            const range = `${pageIndex + 1}`;
            failedBatchRanges.push(range);
            failedBatchDetails.push({
              pageIndex,
              range,
              reason,
            });
          } finally {
            completedPages += 1;
            updateProgress();
          }
        })
      );

      if (authError) {
        throw authError;
      }
    }

    const failedReasonCounts: Partial<Record<OcrFailureReason, number>> = {};
    for (const detail of failedBatchDetails) {
      failedReasonCounts[detail.reason] = (failedReasonCounts[detail.reason] || 0) + 1;
    }

    const failedRanges = toPageRange(failedBatchDetails.map((detail) => detail.pageIndex));
    const failedBatchCount = failedBatchDetails.length;
    const attemptedCount = attemptedOcrRanges.length;
    const appliedCount = successfulOcrRanges.length;
    const finalMarkdown = pageMarkdowns.filter((value) => Boolean(value)).join(PDF_TEXT_SEPARATOR);

    const diagnosticsMessage =
      `OCR diagnostics: weak=${weakPageIndices.length}, ` +
      `attempted=${attemptedCount}, ` +
      `applied=${appliedCount}, ` +
      `failed=${failedBatchCount}`;

    return {
      markdown: finalMarkdown,
      failedBatchCount,
      failedBatchRanges: failedRanges,
      failedBatchDetails,
      failedReasonCounts,
      weakPageCount: weakPageIndices.length,
      weakPageRanges,
      ocrAttemptedPages: attemptedCount,
      ocrAttemptedPageRanges: toPageRange(attemptedOcrRanges),
      ocrAppliedPages: appliedCount,
      ocrAppliedPageRanges: toPageRange(successfulOcrRanges),
      diagnosticsMessage,
    };
  } catch (error) {
    console.error("PDF OCR Conversion Error:", error);
    throw error;
  }
};
