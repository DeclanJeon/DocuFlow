import { GoogleGenAI } from "@google/genai";

// OpenRouter API 설정
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemma-3-27b-it:free";

export interface OpenRouterConfig {
  apiKey?: string;
  model?: string;
}

export type OcrFailureReason =
  | "timeout"
  | "rate_limit"
  | "server"
  | "unauthorized"
  | "network"
  | "unknown";

export class OpenRouterOcrError extends Error {
  reason: OcrFailureReason;
  status?: number;

  constructor(message: string, reason: OcrFailureReason, status?: number) {
    super(message);
    this.name = "OpenRouterOcrError";
    this.reason = reason;
    this.status = status;
  }
}

const REQUEST_TIMEOUT_MS = 45000;
const MAX_RETRIES = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetryStatus = (status: number) =>
  status === 408 || status === 429 || status >= 500;

const reasonFromStatus = (status: number): OcrFailureReason => {
  if (status === 429) return "rate_limit";
  if (status === 401 || status === 403) return "unauthorized";
  if (status >= 500) return "server";
  return "unknown";
};

// 로컬 스토리지 키
export const STORAGE_KEY_MODEL = "docuflow_openrouter_model";

const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;

/**
 * 모델 설정 가져오기 (우선순위: 환경변수 > 파라미터 > 로컬스토리지 > 기본값)
 */
export const getModel = (config?: OpenRouterConfig): string => {
  // 1. 파라미터로 전달된 모델
  if (config?.model) return config.model;

  // 2. 환경변수
  if (env?.VITE_OPENROUTER_MODEL) {
    return env.VITE_OPENROUTER_MODEL;
  }

  // 3. 로컬스토리지
  const localStorageModel = localStorage.getItem(STORAGE_KEY_MODEL);
  if (localStorageModel) return localStorageModel;

  // 4. 기본값
  return DEFAULT_MODEL;
};

/**
 * OpenRouter API를 사용하여 이미지에서 텍스트(Markdown) 추출
 */
export const performOCRWithOpenRouter = async (
  file: File,
  config?: OpenRouterConfig
): Promise<string> => {
  try {
    // 설정 가져오기 (우선순위: 파라미터 > 환경변수)
    const apiKey =
      config?.apiKey ||
      env?.VITE_OPENROUTER_API_KEY ||
      "";

    const model = getModel(config);

    if (!apiKey) {
      throw new Error(
        "OpenRouter API Key가 설정되지 않았습니다. .env 파일을 확인해주세요."
      );
    }

    const base64Data = await fileToBase64(file);
    const mimeType = file.type || "image/png";

    // 프롬프트: Markdown 변환에 최적화 (여러 페이지 인식 지원)
    const prompt = `
You are a professional document digitizer.
Analyze the provided image (which may contain multiple consecutive pages stitched together vertically) and extract ALL content into clean, well-formatted Markdown.

RULES:
1. **Multi-Page Handling**: The image may contain one or more pages. Process them in order from top to bottom. Do NOT stop after the first page.
2. **Layout**: Preserve visual structure. Use headers (#, ##), lists, and paragraphs to match the original document.
3. **Tables**: If there are tables, recreate them using Markdown table syntax. Do NOT skip tables.
4. **Text**: Extract all text accurately. Correct common OCR errors.
5. **Language**: Preserve the original language(s) of the document.
6. **Images/Diagrams**: If there are diagrams or charts, describe them briefly in italic text within brackets, e.g., *[Chart: Sales growth over 5 years]*.
7. **Code**: If there is code, format it with triple backticks and the correct language tag.
8. **Output**: Return ONLY Markdown text. Do not include introductory or concluding remarks.
9. **Page Breaks**: Use "---" to indicate where a new page likely begins if there is a clear visual separation.
`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => {
        controller.abort();
      }, REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(OPENROUTER_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": window.location.origin,
            "X-Title": "DocuFlow",
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: prompt,
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${mimeType};base64,${base64Data}`,
                    },
                  },
                ],
              },
            ],
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const message =
            errorData.error?.message ||
            `API 요청 실패: ${response.status} ${response.statusText}`;
          const shouldRetry =
            attempt < MAX_RETRIES - 1 && shouldRetryStatus(response.status);

          if (shouldRetry) {
            await sleep(800 * (attempt + 1));
            continue;
          }

          throw new OpenRouterOcrError(
            message,
            reasonFromStatus(response.status),
            response.status
          );
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "";
      } catch (error) {
        const timedOut = error instanceof DOMException && error.name === "AbortError";
        const canRetry = attempt < MAX_RETRIES - 1;

        if (timedOut) {
          lastError = new OpenRouterOcrError(
            "OpenRouter OCR 요청 시간이 초과되었습니다.",
            "timeout"
          );
        } else if (error instanceof OpenRouterOcrError) {
          lastError = error;
        } else if (error instanceof TypeError) {
          lastError = new OpenRouterOcrError(
            "OpenRouter OCR 네트워크 요청에 실패했습니다.",
            "network"
          );
        } else if (error instanceof Error) {
          lastError = new OpenRouterOcrError(error.message, "unknown");
        } else {
          lastError = new OpenRouterOcrError(
            "OpenRouter OCR 요청에 실패했습니다.",
            "unknown"
          );
        }

        if (canRetry) {
          await sleep(800 * (attempt + 1));
          continue;
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    throw (
      lastError ||
      new OpenRouterOcrError("OpenRouter OCR 요청에 실패했습니다.", "unknown")
    );
  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
};

/**
 * 파일을 Base64 문자열로 변환
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Data URL prefix 제거 (e.g., "data:image/png;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
