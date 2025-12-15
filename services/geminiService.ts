import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const performOCR = async (file: File): Promise<string> => {
  try {
    const base64Data = await fileToBase64(file);
    
    // Determine mime type (default to png if unknown, though browser File usually has it)
    const mimeType = file.type || 'image/png';

    const model = 'gemini-2.5-flash';

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: "Extract all text from this image or document. Format it cleanly. If there are tables, try to preserve the structure using Markdown. If it is a PDF page rendered as image, simply extract the text content accurately."
          }
        ]
      }
    });

    return response.text || "No text extracted.";
  } catch (error) {
    console.error("OCR Error:", error);
    throw new Error("Failed to extract text using Gemini API.");
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove Data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
