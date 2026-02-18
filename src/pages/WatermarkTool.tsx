import React, { useState } from "react";
import { Stamp, Upload, Image as ImageIcon } from "lucide-react";
import { ToolLayout } from "../components/Layout";
import { FileUpload } from "../components/Shared";
import * as pdfUtils from "../../services/pdfUtils";

const uint8ArrayToBlob = (
  bytes: Uint8Array,
  mimeType: string = "application/pdf"
): Blob => {
  // Convert Uint8Array to a new ArrayBuffer to ensure type compatibility
  const arrayBuffer = new ArrayBuffer(bytes.length);
  const view = new Uint8Array(arrayBuffer);
  view.set(bytes);
  return new Blob([arrayBuffer], { type: mimeType });
};

export const WatermarkTool = () => {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("CONFIDENTIAL");
  const [isTile, setIsTile] = useState(true);
  const [watermarkType, setWatermarkType] = useState<"text" | "image">("text");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [textSize, setTextSize] = useState(32);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setImageFile(file);
  };

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
      try {
        let bytes: Uint8Array;

      try {
        if (watermarkType === "image" && imageFile) {
          // 이미지 워터마크 처리
          const img = new Image();
          img.crossOrigin = "anonymous"; // CORS 문제 방지

          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error("이미지 로드 실패"));
            img.src = URL.createObjectURL(imageFile);
          });

          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas context not available");

          ctx.drawImage(img, 0, 0);
          const imageData = canvas.toDataURL("image/png");

          // 이미지 워터마크를 위한 임시 처리
          const tempImageBytes = await fetch(imageData).then((res) =>
            res.arrayBuffer()
          );
          bytes = await pdfUtils.addImageWatermark(file, tempImageBytes, {
            opacity: 0.3,
            isTile: isTile,
            size: textSize * 3, // 이미지 워터마크는 텍스트 크기의 3배로 설정
          });
        } else if (watermarkType === "text") {
          // 텍스트 워터마크 처리
          // 텍스트를 이미지로 변환하여 워터마크로 사용
          try {
            const textImageBytes = await pdfUtils.textToImage(text, textSize);
            bytes = await pdfUtils.addImageWatermark(file, textImageBytes, {
              opacity: 0.3,
              isTile: isTile,
            });
          } catch (e) {
            console.error("텍스트를 이미지로 변환하는 데 실패했습니다:", e);
            // 실패시 기존 방식으로 fallback
            bytes = await pdfUtils.addWatermark(file, text, {
              opacity: 0.3,
              size: textSize,
              isTile: isTile,
            });
          }
        } else {
          // 기본 텍스트 워터마크 처리 (기존 방식)
          bytes = await pdfUtils.addWatermark(file, text, {
            opacity: 0.3,
            size: textSize,
            isTile: isTile,
          });
        }
      } catch (e) {
        console.error("워터마크 처리 중 오류 발생:", e);
        throw e;
      }

      const blob = uint8ArrayToBlob(bytes);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `watermarked_${file.name}`;
      link.click();
    } catch (e) {
      console.error(e);
      alert("Error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout
      title="Add Watermark"
      isProcessing={processing}
      progressLabel="Applying Watermark..."
      progressSubLabel={`Preparing and writing watermark to ${file ? 1 : 0} file`}
    >
      {!file ? (
        <FileUpload onFilesSelected={(f) => setFile(f[0])} accept=".pdf" />
      ) : (
        <div className="max-w-md mx-auto bg-white p-6 rounded-xl border">
          <div className="mb-6">
            <p className="block text-sm font-bold mb-2">
              워터마크 종류
            </p>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="text"
                  checked={watermarkType === "text"}
                  onChange={() => setWatermarkType("text")}
                  className="mr-2"
                />
                <span className="text-sm">텍스트 워터마크</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="image"
                  checked={watermarkType === "image"}
                  onChange={() => setWatermarkType("image")}
                  className="mr-2"
                />
                <span className="text-sm">이미지 워터마크</span>
              </label>
            </div>
          </div>

          {watermarkType === "text" && (
            <div>
              <label htmlFor="watermark-text" className="block text-sm font-bold mb-2">
                워터마크 텍스트
              </label>
              <input
                id="watermark-text"
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="CONFIDENTIAL, 기밀, 초안 등"
                className="w-full border p-2 rounded mb-4"
              />
              <div className="mb-4">
                <label htmlFor="watermark-size" className="block text-sm font-bold mb-2">
                  텍스트 크기: {textSize}px
                </label>
                <input
                  id="watermark-size"
                  type="range"
                  min="12"
                  max="72"
                  value={textSize}
                  onChange={(e) => setTextSize(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>12px</span>
                  <span>72px</span>
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-200 mb-4">
                <p className="text-sm text-green-800">
                  <strong>다국어 지원:</strong> 한글, 일본어, 중국어 등 모든
                  언어를 지원합니다. 텍스트를 이미지로 변환하여 워터마크로
                  적용합니다.
                </p>
              </div>
            </div>
          )}

          {watermarkType === "image" && (
            <div>
              <label htmlFor="image-upload" className="block text-sm font-bold mb-2">
                이미지 워터마크
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50"
                >
                  <Upload size={24} className="text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">
                    클릭하여 이미지 선택
                  </span>
                  <span className="text-xs text-gray-400">PNG, JPG 지원</span>
                </label>
              </div>
              {imageFile && (
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <ImageIcon size={16} className="text-gray-600" />
                  <span className="text-sm text-gray-700">
                    {imageFile.name}
                  </span>
                    <button
                      type="button"
                      onClick={() => setImageFile(null)}
                      className="ml-auto text-red-500 hover:text-red-700"
                    >
                      삭제
                    </button>
                </div>
              )}
            </div>
          )}

          <label className="flex items-center mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={isTile}
              onChange={(e) => setIsTile(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">타일 패턴 (페이지 전체에 반복)</span>
          </label>

          <button
            type="button"
            onClick={handleProcess}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold"
          >
            워터마크 적용
          </button>
        </div>
      )}
    </ToolLayout>
  );
};
