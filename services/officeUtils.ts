import {
  Paragraph,
  Document as DocxDocument,
  Packer,
  TextRun,
} from "docx";
import { saveAs } from "file-saver";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import { configurePdfJs } from "./pdf/pdfLoader";
import JSZip from "jszip";

export type ProgressCallback = (current: number, total: number, message?: string) => void;

type EpubConversionDiagnostics = {
  chapterSkips: Map<string, number>;
  imageSkips: Map<string, number>;
};

type ManifestEntry = {
  href: string;
  mediaType: string;
};

const EPUB_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const EPUB_IMAGE_TOTAL_MAX_BYTES = 18 * 1024 * 1024;

configurePdfJs();

/**
 * PDF to DOCX: 텍스트 추출 기반의 단순 변환
 * (복잡한 레이아웃/이미지는 제외하고 텍스트 위주로 변환)
 */
export const pdfToDocx = async (
  file: File,
  option: "preserve-layout" | "extract-text" = "preserve-layout",
  onProgress?: ProgressCallback
): Promise<void> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    const docChildren: Paragraph[] = [];
    const totalPages = pdf.numPages;

    for (let i = 1; i <= totalPages; i++) {
      onProgress?.(i, totalPages, `Converting page ${i} of ${totalPages}`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(option === "extract-text" ? " " : "\n")
        .trim();

      if (!pageText) {
        continue;
      }

      // DOCX 단락 생성
      docChildren.push(
        new Paragraph({
          children: [new TextRun(pageText)],
          spacing: { after: 200 }, // 단락 간 간격
        })
      );

      if (option === "preserve-layout" && i < pdf.numPages) {
        docChildren.push(new Paragraph({ text: "--- Page Break ---" }));
      }
    }

    const doc = new DocxDocument({
      sections: [{ properties: {}, children: docChildren }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${file.name.replace(".pdf", "")}.docx`);
  } catch (error) {
    console.error("PDF to DOCX Error:", error);
    throw new Error("PDF를 DOCX로 변환하는데 실패했습니다.");
  }
};

const dirname = (path: string) => {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.slice(0, idx + 1);
};

const incrementBucket = (buckets: Map<string, number>, key: string) => {
  buckets.set(key, (buckets.get(key) || 0) + 1);
};

const safeDecodeURIComponent = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const getElementsByLocalName = (root: Document | Element, localName: string) => {
  const direct = Array.from(root.getElementsByTagName(localName));
  if (direct.length > 0) {
    return direct;
  }

  return Array.from(root.getElementsByTagName("*")).filter(
    (node) => node.localName?.toLowerCase() === localName
  );
};

const normalizePath = (path: string) => {
  const output: string[] = [];
  for (const segment of path.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      output.pop();
      continue;
    }
    output.push(segment);
  }
  return output.join("/");
};

const resolvePath = (baseDir: string, relativePath: string) => {
  const decoded = safeDecodeURIComponent(relativePath);
  if (!baseDir) return normalizePath(decoded);
  return normalizePath(`${baseDir}${decoded}`);
};

const sanitizeHref = (value: string) => value.split("#")[0].split("?")[0];

const toAssetMimeType = (path: string): string | null => {
  const lower = path.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".bmp")) return "image/bmp";
  if (lower.endsWith(".avif")) return "image/avif";
  return null;
};

const XLINK_NS = "http://www.w3.org/1999/xlink";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getSvgImageHref = (node: Element) =>
  node.getAttributeNS(XLINK_NS, "href") ||
  node.getAttribute("href") ||
  node.getAttribute("xlink:href");

const setSvgImageHref = (node: Element, href: string) => {
  node.setAttribute("href", href);
  if (node.hasAttribute("xlink:href")) {
    node.setAttribute("xlink:href", href);
  }
  try {
    node.setAttributeNS(XLINK_NS, "href", href);
  } catch {
    // Some browsers reject namespaced writes on HTML-parsed nodes.
  }
};

const stripCssQuotes = (value: string) => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const toBase64 = (bytes: Uint8Array) => {
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

const replaceImageWithPlaceholder = (imageNode: Element, imagePath: string) => {
  const doc = imageNode.ownerDocument;
  if (!doc) {
    imageNode.remove();
    return;
  }

  const placeholder = doc.createElement("p");
  placeholder.className = "epub-image-placeholder";
  const altText = imageNode.getAttribute("alt")?.trim();
  placeholder.textContent = altText
    ? `[Image omitted: ${altText}]`
    : `[Image omitted: ${imagePath}]`;
  imageNode.replaceWith(placeholder);
};

const toDataUrlFromBytes = (bytes: Uint8Array, mimeType: string) => {
  if (mimeType === "image/svg+xml") {
    const svgText = new TextDecoder("utf-8").decode(bytes);
    return `data:${mimeType};charset=utf-8,${encodeURIComponent(svgText)}`;
  }
  return `data:${mimeType};base64,${toBase64(bytes)}`;
};

const createZipAssetLoader = (
  zip: JSZip,
  diagnostics: EpubConversionDiagnostics
) => {
  let embeddedImageBytes = 0;
  let loadChain: Promise<void> = Promise.resolve();
  const cache = new Map<string, Promise<string | null>>();

  const loadDataUrl = (assetPath: string): Promise<string | null> => {
    const normalized = normalizePath(assetPath);
    const cached = cache.get(normalized);
    if (cached) {
      return cached;
    }

    const pending = new Promise<string | null>((resolve) => {
      loadChain = loadChain
        .then(async () => {
          try {
            const mimeType = toAssetMimeType(normalized);
            const imageFile = zip.file(normalized);
            if (!mimeType || !imageFile) {
              incrementBucket(diagnostics.imageSkips, "image-file-missing");
              resolve(null);
              return;
            }

            const bytes = new Uint8Array(await imageFile.async("arraybuffer"));
            if (bytes.byteLength > EPUB_IMAGE_MAX_BYTES) {
              incrementBucket(diagnostics.imageSkips, "image-too-large");
              resolve(null);
              return;
            }

            if (embeddedImageBytes + bytes.byteLength > EPUB_IMAGE_TOTAL_MAX_BYTES) {
              incrementBucket(diagnostics.imageSkips, "image-budget-exceeded");
              resolve(null);
              return;
            }

            embeddedImageBytes += bytes.byteLength;
            resolve(toDataUrlFromBytes(bytes, mimeType));
          } catch {
            incrementBucket(diagnostics.imageSkips, "image-load-failed");
            resolve(null);
          }
        })
        .catch(() => {
          incrementBucket(diagnostics.imageSkips, "image-load-failed");
          resolve(null);
        });
    });

    cache.set(normalized, pending);
    return pending;
  };

  const inlineCssUrls = async (cssText: string, cssDir: string) => {
    const matches = Array.from(
      cssText.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi)
    );
    if (!matches.length) {
      return cssText;
    }

    const replacements = new Map<string, string>();
    for (const match of matches) {
      const rawUrl = stripCssQuotes(match[2] || "");
      if (
        !rawUrl ||
        rawUrl.startsWith("data:") ||
        /^[a-z][a-z0-9+.-]*:/i.test(rawUrl)
      ) {
        continue;
      }

      const assetPath = resolvePath(cssDir, sanitizeHref(rawUrl));
      if (replacements.has(assetPath)) {
        continue;
      }

      const dataUrl = await loadDataUrl(assetPath);
      if (dataUrl) {
        replacements.set(assetPath, dataUrl);
      }
    }

    if (!replacements.size) {
      return cssText;
    }

    return cssText.replace(
      /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi,
      (full, _quote: string, value: string) => {
        const rawUrl = stripCssQuotes(String(value || ""));
        if (
          !rawUrl ||
          rawUrl.startsWith("data:") ||
          /^[a-z][a-z0-9+.-]*:/i.test(rawUrl)
        ) {
          return full;
        }

        const assetPath = resolvePath(cssDir, sanitizeHref(rawUrl));
        const dataUrl = replacements.get(assetPath);
        return dataUrl ? `url("${dataUrl}")` : full;
      }
    );
  };

  const inlineDocumentAssets = async (doc: Document, chapterDir: string) => {
    const imageNodes = Array.from(doc.querySelectorAll("img")).filter(
      (node): node is HTMLImageElement => node instanceof HTMLImageElement
    );

    for (const imageNode of imageNodes) {
      const src =
        imageNode.getAttribute("src") ||
        imageNode.getAttribute("xlink:href") ||
        imageNode.getAttributeNS(XLINK_NS, "href");
      if (!src || src.startsWith("data:") || /^[a-z][a-z0-9+.-]*:/i.test(src)) {
        continue;
      }

      const imagePath = resolvePath(chapterDir, sanitizeHref(src));
      const dataUrl = await loadDataUrl(imagePath);
      if (!dataUrl) {
        replaceImageWithPlaceholder(imageNode, imagePath);
        continue;
      }

      imageNode.setAttribute("src", dataUrl);
    }

    const svgImageNodes = Array.from(doc.getElementsByTagName("image"));
    for (const imageNode of svgImageNodes) {
      const href = getSvgImageHref(imageNode);
      if (!href || href.startsWith("data:") || /^[a-z][a-z0-9+.-]*:/i.test(href)) {
        continue;
      }

      const imagePath = resolvePath(chapterDir, sanitizeHref(href));
      const dataUrl = await loadDataUrl(imagePath);
      if (!dataUrl) {
        replaceImageWithPlaceholder(imageNode, imagePath);
        continue;
      }

      setSvgImageHref(imageNode, dataUrl);
    }
  };

  return {
    inlineCssUrls,
    inlineDocumentAssets,
  };
};

const parseChapterDocument = (markup: string, parser: DOMParser) => {
  const xhtmlDoc = parser.parseFromString(markup, "application/xhtml+xml");
  const hasParseError =
    xhtmlDoc.getElementsByTagName("parsererror").length > 0 ||
    Boolean(xhtmlDoc.querySelector?.("parsererror"));

  if (!hasParseError && (xhtmlDoc.body || xhtmlDoc.documentElement)) {
    return xhtmlDoc;
  }

  return parser.parseFromString(markup, "text/html");
};

const extractChapterBodyMarkup = (doc: Document) => {
  if (doc.body?.innerHTML?.trim()) {
    return doc.body.innerHTML.trim();
  }

  const root = doc.documentElement;
  if (!root) {
    return "";
  }

  // XHTML cover documents sometimes expose content without a HTMLBodyElement.
  const cloned = root.cloneNode(true) as Element;
  for (const child of Array.from(cloned.children)) {
    if (child.tagName.toLowerCase() === "head") {
      child.remove();
    }
  }
  return (cloned.innerHTML || "").trim();
};

const stripFileExtension = (name: string) => name.replace(/\.[^.]+$/, "");

const mapWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
  if (!items.length) {
    return [];
  }

  const results: R[] = new Array(items.length);
  let cursor = 0;

  const runWorker = async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) {
        return;
      }

      results[index] = await worker(items[index], index);
    }
  };

  const poolSize = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: poolSize }, () => runWorker()));
  return results;
};

const getRootfilePath = (containerDoc: Document) => {
  const rootfiles = getElementsByLocalName(containerDoc, "rootfile");
  if (!rootfiles.length) {
    return null;
  }

  const preferred = rootfiles.find(
    (node) =>
      (node.getAttribute("media-type") || "").trim().toLowerCase() ===
      "application/oebps-package+xml"
  );

  return (
    preferred?.getAttribute("full-path") ||
    rootfiles[0].getAttribute("full-path") ||
    null
  );
};

const getOpfTitle = (opfDoc: Document, fallbackName: string) => {
  const metadata = getElementsByLocalName(opfDoc, "metadata")[0];
  if (!metadata) {
    return fallbackName;
  }

  const titleNode = getElementsByLocalName(metadata, "title")[0];
  return titleNode?.textContent?.trim() || fallbackName;
};

const getManifestMap = (opfDoc: Document) => {
  const manifestMap = new Map<string, ManifestEntry>();
  const manifest = getElementsByLocalName(opfDoc, "manifest")[0];
  if (!manifest) {
    return manifestMap;
  }

  const items = getElementsByLocalName(manifest, "item");
  for (const item of items) {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    const mediaType = item.getAttribute("media-type") || "";
    if (id && href) {
      manifestMap.set(id, { href, mediaType });
    }
  }

  return manifestMap;
};

const getSpineIds = (opfDoc: Document) => {
  const spine = getElementsByLocalName(opfDoc, "spine")[0];
  if (!spine) {
    return [];
  }

  return getElementsByLocalName(spine, "itemref")
    .map((node) => node.getAttribute("idref"))
    .filter((id): id is string => Boolean(id));
};

export const epubToPdf = async (
  file: File,
  onProgress?: ProgressCallback
): Promise<void> => {
  try {
    const diagnostics: EpubConversionDiagnostics = {
      chapterSkips: new Map(),
      imageSkips: new Map(),
    };

    let lastProgress = -1;
    const emitProgress = (value: number, message: string) => {
      const normalized = Math.max(0, Math.min(100, Math.round(value)));
      if (normalized !== lastProgress || normalized === 100) {
        lastProgress = normalized;
        onProgress?.(normalized, 100, message);
      }
    };

    emitProgress(0, "Loading EPUB archive");
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const containerXml = await zip.file("META-INF/container.xml")?.async("string");

    if (!containerXml) {
      throw new Error("Invalid EPUB: container.xml not found");
    }

    const parser = new DOMParser();
    const containerDoc = parser.parseFromString(containerXml, "application/xml");
    const rootfilePath = getRootfilePath(containerDoc);

    if (!rootfilePath) {
      throw new Error("Invalid EPUB: OPF rootfile path missing");
    }

    const opfText = await zip.file(rootfilePath)?.async("string");
    if (!opfText) {
      throw new Error("Invalid EPUB: package file not found");
    }

    const opfDoc = parser.parseFromString(opfText, "application/xml");
    const title = getOpfTitle(opfDoc, stripFileExtension(file.name));

    const manifestMap = getManifestMap(opfDoc);
    const spineIds = getSpineIds(opfDoc);

    if (!spineIds.length) {
      throw new Error("EPUB 변환 실패: spine 항목을 찾지 못했습니다.");
    }

    emitProgress(20, "Indexing EPUB chapters");
    const baseDir = dirname(rootfilePath);
    const chapterPaths: string[] = [];
    const sharedStyleTexts: string[] = [];
    const assets = createZipAssetLoader(zip, diagnostics);

    for (const entry of manifestMap.values()) {
      if (!/css/i.test(entry.mediaType)) {
        continue;
      }

      const cssPath = resolvePath(baseDir, entry.href);
      const cssText = await zip.file(cssPath)?.async("string");
      if (cssText) {
        sharedStyleTexts.push(await assets.inlineCssUrls(cssText, dirname(cssPath)));
      }
    }

    for (let spineIndex = 0; spineIndex < spineIds.length; spineIndex++) {
      const id = spineIds[spineIndex];
      emitProgress(
        20 + Math.round((spineIndex / spineIds.length) * 32),
        `Indexing chapter ${spineIndex + 1} of ${spineIds.length}`
      );

      const entry = manifestMap.get(id);
      if (!entry?.href) {
        incrementBucket(diagnostics.chapterSkips, "manifest-href-missing");
        continue;
      }

      chapterPaths.push(resolvePath(baseDir, entry.href));
    }

    if (!chapterPaths.length) {
      throw new Error("EPUB 변환 실패: 유효한 chapter 항목을 찾지 못했습니다.");
    }

    emitProgress(52, "Preparing chapter HTML in parallel");
    const chapterCount = chapterPaths.length;
    let preparedCount = 0;

    const chapterHtmlSections = await mapWithConcurrency<
      string,
      { bodyMarkup: string; styleText: string }
    >(chapterPaths, 4, async (chapterPath) => {
      const chapterMarkup = await zip.file(chapterPath)?.async("string");
      if (!chapterMarkup) {
        incrementBucket(diagnostics.chapterSkips, "chapter-file-missing");
        preparedCount += 1;
        emitProgress(
          52 + Math.round((preparedCount / chapterCount) * 28),
          `Prepared chapter ${preparedCount} of ${chapterCount}`
        );
        return { bodyMarkup: "", styleText: "" };
      }

      const chapterParser = new DOMParser();
      const chapterDoc = parseChapterDocument(chapterMarkup, chapterParser);
      const chapterDir = dirname(chapterPath);

      const chapterStyleTexts: string[] = [];
      const styleNodes = Array.from(chapterDoc.querySelectorAll("style"));
      for (const styleNode of styleNodes) {
        const text = styleNode.textContent?.trim();
        if (text) {
          chapterStyleTexts.push(await assets.inlineCssUrls(text, chapterDir));
        }
      }

      const linkNodes = Array.from(
        chapterDoc.querySelectorAll("link[rel~='stylesheet'][href], link[rel='stylesheet'][href]")
      );
      for (const linkNode of linkNodes) {
        const href = linkNode.getAttribute("href");
        if (!href) continue;
        const cssPath = resolvePath(chapterDir, sanitizeHref(href));
        const cssText = await zip.file(cssPath)?.async("string");
        if (cssText) {
          chapterStyleTexts.push(await assets.inlineCssUrls(cssText, dirname(cssPath)));
        }
      }

      await assets.inlineDocumentAssets(chapterDoc, chapterDir);

      const bodyMarkup = extractChapterBodyMarkup(chapterDoc);
      if (!bodyMarkup) {
        incrementBucket(diagnostics.chapterSkips, "chapter-extraction-empty");
      }

      preparedCount += 1;
      emitProgress(
        52 + Math.round((preparedCount / chapterCount) * 28),
        `Prepared chapter ${preparedCount} of ${chapterCount}`
      );

      return {
        bodyMarkup,
        styleText: chapterStyleTexts.join("\n"),
      };
    });

    const validSections = chapterHtmlSections.filter(
      (section) => section.bodyMarkup.length > 0
    );
    if (!validSections.length) {
      const details = Array.from(diagnostics.chapterSkips.entries())
        .map(([reason, count]) => `${reason}:${count}`)
        .join(", ");
      throw new Error(
        details
          ? `EPUB 변환 실패: 본문 콘텐츠를 찾지 못했습니다. (${details})`
          : "EPUB 변환 실패: 본문 콘텐츠를 찾지 못했습니다."
      );
    }

    if (diagnostics.chapterSkips.size > 0 || diagnostics.imageSkips.size > 0) {
      console.warn("EPUB conversion partial warnings", {
        chapterSkips: Object.fromEntries(diagnostics.chapterSkips),
        imageSkips: Object.fromEntries(diagnostics.imageSkips),
      });
    }

    emitProgress(82, "Composing layout");
    const chapterMarkup = validSections
      .map(
        (section, index) =>
          `<article class="epub-chapter" data-index="${index}">${section.bodyMarkup}</article>`
      )
      .join("\n");

    const chapterStyleBlock = validSections
      .map((section) => section.styleText)
      .join("\n");
    const sharedStyleBlock = sharedStyleTexts.join("\n");
    const safeTitle = escapeHtml(title);

    const printHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      @page { size: A4; margin: 14mm; }
      html, body { margin: 0; padding: 0; background: #fff; }
      body {
        font-family: "Noto Serif", "Apple SD Gothic Neo", "Noto Sans CJK KR",
          "Noto Sans CJK JP", "Noto Sans CJK SC", "Noto Sans KR", serif;
        color: #111;
        line-height: 1.55;
        font-size: 12pt;
      }
      .epub-book { max-width: 900px; margin: 0 auto; }
      .epub-title {
        font-size: 28px;
        font-weight: 700;
        margin: 0 0 24px;
        page-break-after: avoid;
      }
      /* Allow multi-page chapters; only break between spine items. */
      .epub-chapter {
        break-inside: auto;
        page-break-inside: auto;
        page-break-after: always;
        margin: 0 0 24px;
      }
      .epub-chapter:last-child { page-break-after: auto; }
      img, svg { max-width: 100%; height: auto; }
      svg image { max-width: 100%; }
      .epub-image-placeholder {
        border: 1px dashed #94a3b8;
        border-radius: 8px;
        color: #64748b;
        font-size: 12px;
        margin: 12px 0;
        padding: 10px;
      }
      table { width: 100%; border-collapse: collapse; }
      pre { white-space: pre-wrap; word-break: break-word; }
      ${sharedStyleBlock}
      ${chapterStyleBlock}
    </style>
  </head>
  <body>
    <main class="epub-book">
      <h1 class="epub-title">${safeTitle}</h1>
      ${chapterMarkup}
    </main>
  </body>
</html>`;

    emitProgress(92, "Rendering PDF headlessly");
    const formData = new FormData();
    formData.append(
      "html",
      new Blob([printHtml], { type: "text/html;charset=utf-8" }),
      "epub.html"
    );

    const response = await fetch("/api/render-pdf", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      let serverError = "헤드리스 PDF 렌더링에 실패했습니다.";
      try {
        const payload = await response.json();
        if (payload && typeof payload.error === "string") {
          serverError = payload.error;
        } else if (payload && typeof payload.message === "string") {
          serverError = payload.message;
        }
      } catch {
        // Keep the default error when the body is not JSON.
      }
      throw new Error(serverError);
    }

    emitProgress(98, "Downloading file");
    const pdfBlob = await response.blob();
    if (!pdfBlob.size) {
      throw new Error("EPUB 변환 실패: 빈 PDF가 반환되었습니다.");
    }

    const header = new Uint8Array(await pdfBlob.slice(0, 5).arrayBuffer());
    const magic = String.fromCharCode(...header);
    if (magic !== "%PDF-") {
      throw new Error("EPUB 변환 실패: 서버가 PDF가 아닌 응답을 반환했습니다.");
    }

    saveAs(pdfBlob, `${stripFileExtension(file.name)}.pdf`);
    emitProgress(100, "Done");
  } catch (error) {
    console.error("EPUB to PDF Error:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("EPUB를 PDF로 변환하는데 실패했습니다.");
  }
};

/**
 * DOCX to PDF: Mammoth HTML conversion, then headless render via /api/render-pdf.
 */
export const docxToPdf = async (
  file: File,
  onProgress?: ProgressCallback
): Promise<void> => {
  try {
    onProgress?.(10, 100, "Converting DOCX to HTML");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const bodyHtml = result.value?.trim();
    if (!bodyHtml) {
      throw new Error("DOCX에서 변환 가능한 본문을 찾지 못했습니다.");
    }

    const safeTitle = escapeHtml(stripFileExtension(file.name) || "document");
    const printHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${safeTitle}</title>
    <style>
      @page { size: A4; margin: 16mm; }
      html, body { margin: 0; padding: 0; background: #fff; }
      body {
        font-family: "Noto Sans CJK KR", "Apple SD Gothic Neo", "Noto Sans KR",
          "Malgun Gothic", sans-serif;
        color: #111;
        line-height: 1.6;
        font-size: 12pt;
        padding: 0;
      }
      .docx-root { max-width: 900px; margin: 0 auto; }
      img { max-width: 100%; height: auto; }
      table { width: 100%; border-collapse: collapse; }
      td, th { border: 1px solid #d1d5db; padding: 6px 8px; vertical-align: top; }
      pre { white-space: pre-wrap; word-break: break-word; }
      h1, h2, h3, h4 { page-break-after: avoid; }
      p { margin: 0 0 0.75em; }
    </style>
  </head>
  <body>
    <main class="docx-root">${bodyHtml}</main>
  </body>
</html>`;

    onProgress?.(70, 100, "Rendering PDF");
    const formData = new FormData();
    formData.append(
      "html",
      new Blob([printHtml], { type: "text/html;charset=utf-8" }),
      "docx.html"
    );

    const response = await fetch("/api/render-pdf", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      let serverError = "DOCX PDF 렌더링에 실패했습니다.";
      try {
        const payload = await response.json();
        if (payload && typeof payload.error === "string") {
          serverError = payload.error;
        } else if (payload && typeof payload.message === "string") {
          serverError = payload.message;
        }
      } catch {
        // Keep default message.
      }
      throw new Error(serverError);
    }

    onProgress?.(95, 100, "Downloading PDF");
    const pdfBlob = await response.blob();
    if (!pdfBlob.size) {
      throw new Error("DOCX 변환 실패: 빈 PDF가 반환되었습니다.");
    }
    const header = new Uint8Array(await pdfBlob.slice(0, 5).arrayBuffer());
    const magic = String.fromCharCode(...header);
    if (magic !== "%PDF-") {
      throw new Error("DOCX 변환 실패: 서버가 PDF가 아닌 응답을 반환했습니다.");
    }

    saveAs(pdfBlob, `${stripFileExtension(file.name)}.pdf`);
    onProgress?.(100, 100, "Done");
  } catch (error) {
    console.error("DOCX to PDF Error:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("DOCX 변환에 실패했습니다.");
  }
};

