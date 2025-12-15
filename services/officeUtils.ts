import {
  Paragraph,
  Document as DocxDocument,
  Packer,
  TextRun,
  ImageRun,
} from "docx";
import { saveAs } from "file-saver";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";

// PDF.js 워커 설정 (pdfUtils.ts와 동일하게 설정)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

/**
 * PDF to DOCX: 텍스트 추출 기반의 단순 변환
 * (복잡한 레이아웃/이미지는 제외하고 텍스트 위주로 변환)
 */
export const pdfToDocx = async (
  file: File,
  option: "preserve-layout" | "extract-text" = "preserve-layout"
): Promise<void> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    const docChildren: Paragraph[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // 페이지의 텍스트 아이템들을 하나의 문자열로 결합 (단순화된 로직)
      const pageText = textContent.items.map((item: any) => item.str).join(" ");

      // DOCX 단락 생성
      docChildren.push(
        new Paragraph({
          children: [new TextRun(pageText)],
          spacing: { after: 200 }, // 단락 간 간격
        })
      );

      // 페이지 구분선 추가 (선택 사항)
      if (i < pdf.numPages) {
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

/**
 * DOCX to PDF: Mammoth를 이용한 HTML 변환 -> 인쇄/PDF 저장 유도
 * (클라이언트 사이드에서 완벽한 바이너리 변환은 불가능하므로, 미리보기를 띄우고 인쇄를 유도합니다)
 */
export const mdToPdf = async (file: File): Promise<void> => {
  try {
    const text = await file.text();

    // Simple Markdown to HTML conversion
    const html = text
      // Headers
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      // Bold
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Line breaks
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>")
      // Lists
      .replace(/^\* (.+)$/gim, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
      // Paragraphs
      .replace(/^(?!<[h|u|l|p])(.+)$/gim, "<p>$1</p>");

    // Wrap in HTML structure
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=1200, initial-scale=1.0">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap');
          body { font-family: 'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; line-height: 1.6; color: #333; width: 1160px; max-width: 1160px; margin: 0 auto; padding: 20px; box-sizing: border-box; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
          h1, h2, h3 { color: #2563eb; margin-top: 24px; margin-bottom: 16px; }
          h1 { font-size: 2em; }
          h2 { font-size: 1.5em; }
          h3 { font-size: 1.25em; }
          ul { margin: 16px 0; }
          li { margin: 8px 0; }
          p { margin: 16px 0; }
          strong { font-weight: bold; }
          em { font-style: italic; }
        </style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `;

    // Create blob and download
    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name.replace(/\.(md|markdown|txt)$/, ".pdf");
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Markdown to PDF conversion error:", error);
    throw new Error("Markdown을 PDF로 변환하는 데 실패했습니다.");
  }
};

export const docxToPdf = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return result.value; // 변환된 HTML 문자열 반환
  } catch (error) {
    console.error("DOCX to PDF Error:", error);
    throw new Error("DOCX 변환에 실패했습니다.");
  }
};
