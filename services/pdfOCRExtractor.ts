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
}

export interface PdfOcrExtractionResult {
  markdown: string;
  failedBatchCount: number;
  failedBatchRanges: string[];
  failedBatchDetails: FailedBatchDetail[];
  failedReasonCounts: Partial<Record<OcrFailureReason, number>>;
}

const MAX_REASON_RETRIES = 2;

const waitByReason = async (reason: OcrFailureReason) => {
  const delayMap: Record<OcrFailureReason, number> = {
    rate_limit: 2200,
    server: 1500,
    network: 1200,
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
 * PDF OCR 추출기 (스마트 배치 스티칭 알고리즘 적용)
 * 
 * 최적화 전략: "Smart Batch Stitching"
 * 1. 페이지를 5장씩 묶어서 하나의 긴 이미지로 만듭니다. (Batch Size = 5)
 *    - 10장을 묶으면 높이가 12,000px을 넘어 AI 모델의 입력 해상도 제한(약 2048~4096px)에 걸려
 *      강제 리사이징으로 인한 가독성 저하가 발생합니다.
 *    - 따라서 5장이 속도와 정확도 사이의 최적의 타협점(Sweet Spot)입니다.
 * 2. 이렇게 하면 API 호출 횟수가 1/5로 줄어들어 속도가 매우 빨라집니다.
 * 3. 페이지 경계에 걸친 문장도 문맥을 유지하며 해석할 수 있습니다.
 */
export const extractMarkdownFromPdfWithOCR = async (
  file: File,
  config?: OpenRouterConfig,
  onProgress?: (current: number, total: number) => void
): Promise<PdfOcrExtractionResult> => {
  try {
    // 1. PDF 문서 로드
    const pdf = await pdfUtils.getPdfDocument(file);
    const totalPages = pdf.numPages;
    
    // 배치 사이즈 설정 (5장씩 묶음 - 최신 모델 성능 고려 상향 조정)
    const BATCH_SIZE = 5;
    const totalBatches = Math.ceil(totalPages / BATCH_SIZE);
    
    // 결과를 저장할 배열
    const batchResults: string[] = new Array(totalBatches).fill("");
    const failedBatchRanges: string[] = [];
    const failedBatchDetails: FailedBatchDetail[] = [];
    
    // 배치 인덱스 배열 생성
    const batchIndices = Array.from({ length: totalBatches }, (_, i) => i);
    
    // 동시 처리 배치 개수 (브라우저 메모리 부하 고려)
    const CONCURRENT_BATCHES = 2;
    
    let completedBatches = 0;

    let authError: Error | null = null;

    // 배치 단위 병렬 처리
    for (let i = 0; i < totalBatches; i += CONCURRENT_BATCHES) {
      if (authError) {
        break;
      }

      const currentBatchGroup = batchIndices.slice(i, i + CONCURRENT_BATCHES);
      
      await Promise.all(currentBatchGroup.map(async (batchIndex) => {
        try {
          const startPage = batchIndex * BATCH_SIZE;
          const endPage = Math.min(startPage + BATCH_SIZE, totalPages);
          
          // 해당 배치에 포함될 페이지 인덱스들
          const pageIndices = Array.from(
            { length: endPage - startPage }, 
            (_, k) => startPage + k
          );

          const batchMarkdown = await processBatchWithRecovery(pdf, pageIndices, config);
          
          // 결과 저장
          batchResults[batchIndex] = batchMarkdown;

        } catch (error) {
          const reason =
            error instanceof OpenRouterOcrError ? error.reason : ("unknown" as OcrFailureReason);

          if (reason === "unauthorized") {
            authError =
              error instanceof Error
                ? error
                : new Error(
                    "OpenRouter 인증에 실패했습니다. VITE_OPENROUTER_API_KEY와 계정 권한을 확인해주세요."
                  );
            return;
          }

          console.error(`Batch ${batchIndex + 1} failed:`, error);
          const startPage = batchIndex * BATCH_SIZE + 1;
          const endPage = Math.min((batchIndex + 1) * BATCH_SIZE, totalPages);
          const range = `${startPage}-${endPage}`;
          failedBatchRanges.push(range);
          failedBatchDetails.push({
            range,
            reason,
          });
          batchResults[batchIndex] = "";
        } finally {
          completedBatches++;
          // 진행률 업데이트
          if (onProgress) {
            const approximatePagesDone = Math.min(completedBatches * BATCH_SIZE, totalPages);
            onProgress(approximatePagesDone, totalPages);
          }
        }
      }));

      if (authError) {
        throw authError;
      }
    }

    // 4. 결과 병합
    const failedReasonCounts: Partial<Record<OcrFailureReason, number>> = {};
    for (const detail of failedBatchDetails) {
      failedReasonCounts[detail.reason] =
        (failedReasonCounts[detail.reason] || 0) + 1;
    }

    return {
      markdown: batchResults.filter(Boolean).join("\n\n"),
      failedBatchCount: failedBatchRanges.length,
      failedBatchRanges,
      failedBatchDetails,
      failedReasonCounts,
    };
  } catch (error) {
    console.error("PDF OCR Conversion Error:", error);
    throw error;
  }
};
