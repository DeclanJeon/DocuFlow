import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Upload,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ToolLayout } from "../components/Layout";
import { getToolByRoute } from "../data/tools";
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

// 서명 그리기용 캔버스 컴포넌트
const SignaturePad = ({
  onSave,
  onCancel,
}: {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);

  // 그리기 로직
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const { offsetX, offsetY } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { offsetX, offsetY } = getCoordinates(e, canvas);
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const getCoordinates = (
    e: React.MouseEvent | React.TouchEvent,
    canvas: HTMLCanvasElement
  ) => {
    // 터치/마우스 좌표 통합 처리
    let clientX: number;
    let clientY: number;

    if ("touches" in e) {
      const touch = (e as React.TouchEvent).touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      const mouseEvent = e as React.MouseEvent;
      clientX = mouseEvent.clientX;
      clientY = mouseEvent.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    return {
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top,
    };
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const handleSave = () => {
    if (canvasRef.current) {
      onSave(canvasRef.current.toDataURL("image/png"));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="font-bold text-lg mb-4">Draw Your Signature</h3>
        <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 mb-4 touch-none">
          <canvas
            ref={canvasRef}
            width={400}
            height={200}
            className="w-full h-[200px] cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700"
          >
            Save Signature
          </button>
        </div>
      </div>
    </div>
  );
};

export const SignTool = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pageImage, setPageImage] = useState<string>("");
  const [showPad, setShowPad] = useState(false);
  const [signatures, setSignatures] = useState<string[]>([]);
  const [selectedSig, setSelectedSig] = useState<string | null>(null);
  const [placedSigns, setPlacedSigns] = useState<
    { x: number; y: number; img: string; id: string; pageIndex: number }[]
  >([]);
  const [processing, setProcessing] = useState(false);
  const [draggedSign, setDraggedSign] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 로컬 스토리지에서 서명 불러오기
  useEffect(() => {
    const saved = localStorage.getItem("my_signatures");
    if (saved) {
      try {
        setSignatures(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load signatures:", e);
      }
    }
  }, []);

  useEffect(() => {
    const loadPageContext = async () => {
      if (!file) return;
      setProcessing(true);
      try {
        const pdf = await pdfUtils.getPdfDocument(file);
        setTotalPages(pdf.numPages || 1);
        const img = await pdfUtils.renderPageAsImage(file, currentPageIndex);
        setPageImage(img);
      } finally {
        setProcessing(false);
      }
    };

    loadPageContext();
  }, [file, currentPageIndex]);

  useEffect(() => {
    if (!file) {
      setCurrentPageIndex(0);
      setTotalPages(1);
    }
  }, [file]);

  const handleSaveSignature = (dataUrl: string) => {
    const newSigs = [...signatures, dataUrl];
    setSignatures(newSigs);
    localStorage.setItem("my_signatures", JSON.stringify(newSigs));
    setShowPad(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const newSigs = [...signatures, dataUrl];
        setSignatures(newSigs);
        localStorage.setItem("my_signatures", JSON.stringify(newSigs));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!selectedSig) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newSign = {
      x,
      y,
      img: selectedSig,
      id: Date.now().toString(),
      pageIndex: currentPageIndex,
    };
    setPlacedSigns([...placedSigns, newSign]);
    setSelectedSig(null); // 한 번 찍으면 선택 해제
  };

  // 드래그 시작
  const handleDragStart = (e: React.DragEvent, signId: string) => {
    setDraggedSign(signId);
    e.dataTransfer.effectAllowed = "move";
  };

  // 드래그 종료
  const handleDragEnd = () => {
    setDraggedSign(null);
  };

  // 드롭 처리
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedSign) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const signToMove = placedSigns.find((s) => s.id === draggedSign);
    if (signToMove) {
      const updatedSigns = placedSigns.map((s) =>
        s.id === draggedSign ? { ...s, x, y } : s
      );
      setPlacedSigns(updatedSigns);
    }
  };

  // 드래그 오버 처리
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDownload = async () => {
    if (!file || placedSigns.length === 0) return;
    setProcessing(true);
    try {
      const bytes = await pdfUtils.embedImagesOnPdf(file, placedSigns);
      const blob = uint8ArrayToBlob(bytes);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `signed_${file.name}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Error saving PDF");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout
      title="Sign PDF"
      icon={getToolByRoute("/sign")?.icon}
      iconColorClass={getToolByRoute("/sign")?.colorClass}
      description={getToolByRoute("/sign")?.shortDesc}
      isProcessing={processing}
      progressLabel="Preparing Signed PDF..."
      progressSubLabel={`Applying ${placedSigns.length || 1} signature item(s)`}
    >
      {showPad && (
        <SignaturePad
          onSave={handleSaveSignature}
          onCancel={() => setShowPad(false)}
        />
      )}

      {!file ? (
        <FileUpload onFilesSelected={(f) => setFile(f[0])} accept=".pdf" />
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[500px]">
          {/* 사용자 가이드 */}
          <div className="w-full lg:w-64 mb-4 lg:mb-0">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-2">
              <AlertCircle size={16} className="text-blue-600" />
              <span className="text-sm text-blue-700">
                {selectedSig
                  ? "PDF 페이지를 클릭하여 서명을 배치하세요"
                  : "서명을 선택한 후 PDF 페이지를 클릭하여 배치하세요"}
              </span>
            </div>
            <div className="mt-3 bg-white p-3 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPageIndex((prev) => Math.max(prev - 1, 0))}
                  disabled={currentPageIndex === 0 || processing}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-sm font-medium text-gray-700">
                  Page {currentPageIndex + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPageIndex((prev) => Math.min(prev + 1, totalPages - 1))
                  }
                  disabled={currentPageIndex >= totalPages - 1 || processing}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
          {/* 왼쪽: 서명 목록 */}
          <div className="w-full lg:w-64 flex flex-col gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <h3 className="font-bold text-gray-700 mb-3">My Signatures</h3>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {signatures.map((sig, i) => (
                  <button
                    type="button"
                    key={`${sig.slice(0, 24)}-${i}`}
                    onClick={() => setSelectedSig(sig)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, `sig-${i}`)}
                    onDragEnd={handleDragEnd}
                    className={`border rounded-lg p-2 cursor-pointer hover:bg-gray-50 ${
                      selectedSig === sig ? "ring-2 ring-brand-500" : ""
                    } ${selectedSig ? "" : "cursor-move"}`}
                  >
                    <img
                      src={sig}
                      className="max-h-full max-w-full"
                      alt="signature"
                    />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowPad(true)}
                  className="border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center p-2 hover:bg-gray-50 cursor-pointer"
                >
                  <Plus size={24} className="text-gray-400" />
                </button>
              </div>

              {/* 이미지 업로드 버튼 */}
              <div className="mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Upload size={16} />
                  <span>이미지 서명 업로드</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleDownload}
                className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg"
              >
                Download Signed PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPlacedSigns([]);
                }}
                className="text-gray-500 text-sm py-2"
              >
                Reset
              </button>
            </div>
          </div>

          {/* 오른쪽: 문서 프리뷰 */}
          <div className="flex-1 bg-gray-100 rounded-xl overflow-auto p-4 flex justify-center items-start min-h-[500px]">
            <div
              className="relative shadow-xl border border-gray-200 inline-block"
            >
              {pageImage && (
                <>
                  <img
                    src={pageImage}
                    alt="PDF Page"
                    className="max-w-full md:max-w-3xl"
                  />
                  <button
                    type="button"
                    className="absolute inset-0"
                    onClick={handleCanvasClick}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    aria-label="Place signature"
                  />
                </>
              )}

              {/* 배치된 서명들 */}
              {placedSigns
                .filter((ps) => ps.pageIndex === currentPageIndex)
                .map((ps) => (
                <button
                  type="button"
                  key={ps.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, ps.id)}
                  onDragEnd={handleDragEnd}
                  onDoubleClick={() =>
                    setPlacedSigns((prev) => prev.filter((item) => item.id !== ps.id))
                  }
                  className="absolute w-32 cursor-move"
                  style={{
                    left: `${ps.x}%`,
                    top: `${ps.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <img src={ps.img} className="w-full" alt="placed signature" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};
