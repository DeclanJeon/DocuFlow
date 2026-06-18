import { expandPdfRect } from "./coordinateService";
import type { PdfPointRect } from "./coordinateService";
import { getLocalPdfDocument } from "./pdfLoader";

type TextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
};

type CharPosition = {
  char: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type NormalizedText = {
  text: string;
  chars: CharPosition[];
};

export type SensitiveDataType = "rrn" | "phone" | "email" | "account" | "card" | "address";
export type DetectionConfidence = "high" | "medium" | "manual-review";

export interface SensitiveDetection {
  id: string;
  type: SensitiveDataType;
  text: string;
  maskedText: string;
  pageIndex: number;
  rect: PdfPointRect;
  confidence: DetectionConfidence;
  autoSelectable: boolean;
  verified?: boolean;
}

const PATTERNS: Record<SensitiveDataType, RegExp> = {
  rrn: /\d{6}-?\d{7}/g,
  phone: /(01[016789]-?\d{3,4}-?\d{4})|(0[2-6][1-5]?-?\d{3,4}-?\d{4})/g,
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  account: /\d{2,6}-\d{2,6}-\d{2,6}(-\d{1,3})?/g,
  card: /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g,
  address: /(?:[가-힣]{2,}(?:시|도)\s*)?(?:[가-힣]{1,}(?:시|군|구)\s*)?(?:[가-힣0-9]+(?:읍|면|동|로|길)\s*)\d{1,4}(?:-\d{1,4})?(?:\s*[가-힣A-Za-z0-9\-]+(?:아파트|빌라|오피스텔|동|호))?/g,
};

const BUSINESS_ID_CONTEXT = /(구직\s*등록\s*번\s*호|구직등록번호|발급\s*번\s*호|발급번호|등록\s*번\s*호|등록번호)$/;
const TYPE_PRIORITY: Record<SensitiveDataType, number> = {
  rrn: 6,
  phone: 5,
  card: 4,
  email: 3,
  account: 2,
  address: 1,
};

export const typeLabels: Record<SensitiveDataType, string> = {
  rrn: "Resident registration number",
  phone: "Phone number",
  email: "Email",
  account: "Account number",
  card: "Card number",
  address: "Address",
};

const hasBoundary = (text: string, index: number, length: number) => {
  const before = index === 0 ? "" : text[index - 1];
  const after = index + length >= text.length ? "" : text[index + length];
  return !/[A-Za-z0-9가-힣]/.test(before) && !/[A-Za-z0-9가-힣]/.test(after);
};

const createRegex = (type: SensitiveDataType) => new RegExp(PATTERNS[type].source, "g");

const normalizeTextItems = (items: TextItem[]): NormalizedText => {
  const chars: CharPosition[] = [];

  for (const item of items) {
    const raw = [...item.str];
    if (raw.length === 0) continue;

    const tx = item.transform;
    const widthPerChar = item.width > 0 ? item.width / raw.length : Math.abs(tx[0]) || 8;
    const height = Math.abs(tx[3]) || item.height || 12;

    raw.forEach((char, charIndex) => {
      if (/\s/.test(char)) return;
      chars.push({
        char,
        x: tx[4] + charIndex * widthPerChar,
        y: tx[5],
        width: widthPerChar,
        height,
      });
    });
  }

  return { text: chars.map((char) => char.char).join(""), chars };
};

const getMatchRect = (
  normalized: NormalizedText,
  pageIndex: number,
  matchIndex: number,
  matchLength: number
): PdfPointRect | null => {
  const matchChars = normalized.chars.slice(matchIndex, matchIndex + matchLength);
  if (matchChars.length === 0) return null;

  const xs = matchChars.map((char) => char.x);
  const ys = matchChars.map((char) => char.y);
  const x2s = matchChars.map((char) => char.x + char.width);
  const y2s = matchChars.map((char) => char.y + char.height);
  const x = Math.min(...xs);
  const y = Math.min(...ys);

  return expandPdfRect({
    pageIndex,
    x,
    y,
    width: Math.max(...x2s) - x,
    height: Math.max(...y2s) - y,
  }, 2);
};

const isLikelyBusinessIdentifier = (fullText: string, matchIndex: number, matchText: string) => {
  const before = fullText.slice(Math.max(0, matchIndex - 30), matchIndex);
  const after = fullText.slice(matchIndex + matchText.length, matchIndex + matchText.length + 5);
  if (/[A-Za-z]$/.test(before)) return true;
  if (/^[A-Za-z0-9]/.test(after)) return true;
  return BUSINESS_ID_CONTEXT.test(before) || BUSINESS_ID_CONTEXT.test(before.replace(/\s/g, ""));
};

const isLikelyDateAccountFalsePositive = (text: string) => {
  const [first, second, third] = text.split("-");
  if (!first || !second || !third) return false;
  const year = Number(first);
  const month = Number(second);
  const day = Number(third.slice(0, 2));
  return first.length === 4 && year >= 1900 && year <= 2099 && month >= 1 && month <= 12 && day >= 1 && day <= 31;
};

const isValidRRN = (rrn: string) => {
  const cleaned = rrn.replace("-", "");
  if (cleaned.length !== 13 || /\D/.test(cleaned)) return false;
  const digits = cleaned.split("").map(Number);
  const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
  const sum = digits.slice(0, 12).reduce((acc, digit, index) => acc + digit * weights[index], 0);
  return (11 - (sum % 11)) % 10 === digits[12];
};

const luhnCheck = (num: string) => {
  let sum = 0;
  let alternate = false;
  for (let i = num.length - 1; i >= 0; i -= 1) {
    let n = Number.parseInt(num[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
};

const maskText = (type: SensitiveDataType, text: string) => {
  if (type === "rrn") {
    const cleaned = text.replace("-", "");
    return cleaned.length === 13 ? `${cleaned.slice(0, 6)}-${cleaned[6]}******` : text;
  }
  if (type === "phone") {
    const digits = text.replace(/-/g, "");
    return digits.length === 11 ? `${digits.slice(0, 3)}-****-${digits.slice(7)}` : `${text.slice(0, -4)}****`;
  }
  if (type === "email") {
    const [local, domain] = text.split("@");
    if (!domain || !local) return text;
    const masked = local.length > 2 ? `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}` : `${local[0]}***`;
    return `${masked}@${domain}`;
  }
  if (type === "account") {
    const parts = text.split("-");
    return parts.length > 1 ? parts.map((part, index) => index === parts.length - 1 ? "****" : part).join("-") : `${text.slice(0, -4)}****`;
  }
  if (type === "card") return text.split(/[-\s]/).map((part, index) => index === 1 || index === 2 ? "****" : part).join("-");
  return text.length > 6 ? `${text.slice(0, 4)}${"*".repeat(Math.min(12, text.length - 4))}` : "******";
};

const getConfidence = (
  type: SensitiveDataType,
  text: string,
  fullText: string,
  index: number,
  hasRect: boolean
): { confidence: DetectionConfidence; autoSelectable: boolean; verified?: boolean } => {
  const boundary = hasBoundary(fullText, index, text.length);
  if (!hasRect) return { confidence: "manual-review", autoSelectable: false };

  if (type === "rrn") {
    const verified = isValidRRN(text);
    return { confidence: verified && boundary ? "high" : "medium", autoSelectable: verified && boundary, verified };
  }
  if (type === "card") {
    const verified = luhnCheck(text.replace(/[-\s]/g, ""));
    return { confidence: verified && boundary ? "high" : "medium", autoSelectable: verified && boundary, verified };
  }
  if (type === "email" || type === "phone") {
    return { confidence: boundary ? "high" : "medium", autoSelectable: boundary };
  }
  return { confidence: "manual-review", autoSelectable: false };
};

const detectOnPage = (pageIndex: number, items: TextItem[]) => {
  const normalized = normalizeTextItems(items);
  const detections: SensitiveDetection[] = [];

  (Object.keys(PATTERNS) as SensitiveDataType[]).forEach((type) => {
    const regex = createRegex(type);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(normalized.text)) !== null) {
      const text = match[0];
      if ((type === "rrn" || type === "phone") && isLikelyBusinessIdentifier(normalized.text, match.index, text)) continue;
      if (type === "account") {
        const digits = text.replace(/-/g, "");
        if (digits.length < 10 || isLikelyDateAccountFalsePositive(text)) continue;
      }
      if (type === "address" && text.length < 6) continue;

      const rect = getMatchRect(normalized, pageIndex, match.index, text.length);
      if (!rect) continue;
      const confidence = getConfidence(type, text, normalized.text, match.index, true);
      detections.push({
        id: `${pageIndex}-${type}-${match.index}-${text}`,
        type,
        text: type === "rrn" && text.replace("-", "").length === 13 ? `${text.replace("-", "").slice(0, 6)}-${text.replace("-", "").slice(6)}` : text,
        maskedText: maskText(type, text),
        pageIndex,
        rect,
        ...confidence,
      });
    }
  });

  return detections;
};

const overlaps = (a: PdfPointRect, b: PdfPointRect) => {
  const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  const area = a.width * a.height;
  return area > 0 && (overlapX * overlapY) / area > 0.5;
};

const deduplicateDetections = (items: SensitiveDetection[]) => {
  const result: SensitiveDetection[] = [];
  const byPage = new Map<number, SensitiveDetection[]>();
  items.forEach((item) => byPage.set(item.pageIndex, [...(byPage.get(item.pageIndex) || []), item]));

  for (const [, pageItems] of byPage) {
    const claimed: SensitiveDetection[] = [];
    const sorted = [...pageItems].sort((a, b) => TYPE_PRIORITY[b.type] - TYPE_PRIORITY[a.type]);
    for (const item of sorted) {
      if (!claimed.some((claim) => overlaps(item.rect, claim.rect))) {
        result.push(item);
        claimed.push(item);
      }
    }
  }

  return result.sort((a, b) => a.pageIndex - b.pageIndex || a.rect.y - b.rect.y || a.rect.x - b.rect.x);
};

export const detectSensitiveData = async (file: File | Blob | Uint8Array): Promise<SensitiveDetection[]> => {
  const pdf = await getLocalPdfDocument(file);
  try {
    const detections: SensitiveDetection[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const items: TextItem[] = [];
      for (const item of textContent.items) {
        if ("str" in item && item.str.trim()) {
          const transform = Array.from(item.transform as number[]);
          items.push({
            str: item.str,
            transform,
            width: item.width,
            height: item.height || (transform[0] !== 0 ? Math.abs(transform[0]) * 12 : 12),
            fontName: item.fontName || "",
          });
        }
      }
      detections.push(...detectOnPage(pageNumber - 1, items));
    }
    return deduplicateDetections(detections);
  } finally {
    await pdf.destroy();
  }
};

