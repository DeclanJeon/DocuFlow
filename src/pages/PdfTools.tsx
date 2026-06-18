import React, { useState, useEffect } from "react";
import {
  FileText,
  ImageIcon,
  X,
  Plus,
  Download,
  AlertCircle,
  CheckCircle2,
  GripVertical,
  Minimize2,
  Grid,
  RotateCw,
  Trash2,
  Stamp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ToolLayout } from "../components/Layout";
import { getToolByRoute } from "../data/tools";
import { FileUpload } from "../components/Shared";
import * as pdfUtils from "../../services/pdfUtils";
import { PDFDocument } from "pdf-lib";
import {
  downloadPdfToMarkdownResult,
  pollPdfToMarkdownJob,
  submitPdfToMarkdownJob,
  type PdfMarkdownDiagnostics,
  type PdfMarkdownOcrAccuracy,
  type PdfMarkdownOcrProfile,
} from "../../services/api/markdownApi";
import {
  createSearchablePdfOnServer,
  compressPdfOnServer,
  downloadBlob,
  downloadCompletedPdfJob,
  pollCompletedPdfJob,
} from "../../services/api/pdfJobApi";
import { Annotation } from "../../types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * Utility function to convert Uint8Array to Blob with proper type compatibility
 * This fixes TypeScript issues with ArrayBufferLike vs ArrayBuffer
 */
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

// SortableItem 컴포넌트
const SortableFileItem: React.FC<{
  file: File;
  idx: number;
  onRemove: (index: number) => void;
  key?: React.Key;
}> = ({ file, idx, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: idx.toString() });

  const getFileIcon = (file: File) => {
    if (file.type === "application/pdf") {
      return { Icon: FileText, color: "text-rose-500" };
    } else if (file.type.startsWith("image/")) {
      return { Icon: ImageIcon, color: "text-emerald-500" };
    } else {
      return { Icon: FileText, color: "text-gray-500" };
    }
  };

  const { Icon, color } = getFileIcon(file);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative p-4 border rounded-xl bg-gray-50 flex flex-col items-center text-center cursor-move"
    >
      <div
        className="absolute top-2 left-2 p-1 bg-white rounded-full shadow text-gray-400 hover:text-gray-600"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </div>

      {file.type.startsWith("image/") ? (
        <div className="w-16 h-16 mb-2 rounded-lg overflow-hidden border border-gray-200">
          <img
            src={URL.createObjectURL(file)}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <Icon size={40} className={`${color} mb-2`} />
      )}
      <p className="text-sm font-medium text-gray-700 truncate w-full">
        {file.name}
      </p>
      <p className="text-xs text-gray-400 w-full truncate">
        {file.type.replace("image/", "").toUpperCase()}
      </p>
      <button
        type="button"
        onClick={() => onRemove(idx)}
        className="absolute top-2 right-2 p-2 bg-white rounded-full shadow hover:bg-red-50 text-red-500 transition-all active:scale-95"
        title="Remove file"
      >
        <X size={16} />
      </button>
    </div>
  );
};

// --- Merge Tool ---
export const MergePdfTool = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progressValue, setProgressValue] = useState<number | undefined>(undefined);

  // dnd-kit 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 드래그 앤 드롭 핸들러
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setFiles((items) => {
        const oldIndex = parseInt(active.id.toString());
        const newIndex = parseInt(over?.id.toString() || "0");

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleMerge = async () => {
    if (files.length < 2) return alert("Please select at least 2 files.");
    setProcessing(true);
    setProgressValue(0);
    try {
      const mergedPdfBytes = await pdfUtils.mergePdfs(files, (current, total, message) => {
        const percent = Math.round((current / total) * 100);
        setProgressValue(percent);
        console.log(`Merge progress: ${percent}% - ${message}`);
      });
      const blob = uint8ArrayToBlob(mergedPdfBytes);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "merged_document.pdf";
      link.click();
    } catch (e) {
      console.error(e);
      alert("Error merging files");
    } finally {
      setProcessing(false);
      setProgressValue(undefined);
    }
  };

  return (
    <ToolLayout 
      title="Merge Files"
      icon={getToolByRoute("/merge")?.icon}
      iconColorClass={getToolByRoute("/merge")?.colorClass}
      description={getToolByRoute("/merge")?.shortDesc} 
      isProcessing={processing}
      progressValue={progressValue}
      progressLabel="Merging Documents..."
      progressSubLabel={`Combining ${files.length} files into a single PDF`}
    >
      {files.length === 0 ? (
        <div className="max-w-2xl mx-auto text-center">
          <FileUpload
            onFilesSelected={setFiles}
            accept=".pdf,image/*"
            multiple
          />
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-sm text-blue-700">
              <strong>Merge PDFs and Images:</strong> Combine multiple PDF
              documents, JPG, PNG, and other image files into a single PDF
              document.
            </p>
            <p className="text-sm text-blue-700 mt-2">
              <strong>Drag & Drop:</strong> After uploading files, you can drag
              to reorder them before merging.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={files.map((_, idx) => idx.toString())}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {files.map((file, idx) => (
                  <SortableFileItem
                    key={idx}
                    idx={idx}
                    file={file}
                    onRemove={(index) =>
                      setFiles(files.filter((_, i) => i !== index))
                    }
                  />
                ))}
                <div className="border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center min-h-[120px] hover:bg-gray-50 cursor-pointer">
                  <label htmlFor="merge-files-input" className="cursor-pointer flex flex-col items-center">
                    <Plus size={24} className="text-gray-400" />
                    <span className="text-xs text-gray-500 mt-1">Add more</span>
                    <input
                      id="merge-files-input"
                      type="file"
                      multiple
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files &&
                        setFiles([...files, ...Array.from(e.target.files)])
                      }
                    />
                  </label>
                </div>
              </div>
            </SortableContext>
          </DndContext>
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => setFiles([])}
              className="px-6 py-4 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors min-w-[120px]"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleMerge}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5 min-w-[200px]"
            >
              Merge Files
            </button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

// --- Split Tool ---
export const SplitPdfTool = () => {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"range" | "count">("range");
  const [value, setValue] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleSplit = async () => {
    if (!file || !value) return;
    setProcessing(true);
    try {
      const pdfBytesArray = await pdfUtils.splitPdf(file, mode, value);
      pdfBytesArray.forEach((bytes, idx) => {
        const blob = uint8ArrayToBlob(bytes);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `split_${mode}_${idx + 1}.pdf`;
        link.click();
      });
    } catch (e) {
      console.error(e);
      alert("Error splitting PDF. Please check your input.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout 
      title="Split PDF"
      icon={getToolByRoute("/split")?.icon}
      iconColorClass={getToolByRoute("/split")?.colorClass}
      description={getToolByRoute("/split")?.shortDesc} 
      isProcessing={processing}
      progressLabel="Splitting PDF..."
      progressSubLabel={`Applying ${mode} mode to ${file ? 1 : 0} file`}
    >
      {!file ? (
        <FileUpload
          onFilesSelected={(files) => setFile(files[0])}
          accept=".pdf"
        />
      ) : (
        <div className="max-w-xl mx-auto">
          <div className="mb-8 p-6 bg-orange-50 rounded-2xl border border-orange-100 flex items-center gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <FileText size={32} className="text-orange-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">{file.name}</h3>
              <p className="text-sm text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X />
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-8">
            <div className="flex gap-4 mb-6">
              <button
                type="button"
                onClick={() => setMode("range")}
                className={`flex-1 py-3 rounded-xl font-medium border-2 transition-all ${
                  mode === "range"
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-transparent bg-gray-100 text-gray-600"
                }`}
              >
                Extract Pages
              </button>
              <button
                type="button"
                onClick={() => setMode("count")}
                className={`flex-1 py-3 rounded-xl font-medium border-2 transition-all ${
                  mode === "count"
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-transparent bg-gray-100 text-gray-600"
                }`}
              >
                Split into Parts
              </button>
            </div>

            <div className="mb-6">
              <label htmlFor="split-value-input" className="block text-sm font-semibold text-gray-700 mb-2">
                {mode === "range"
                  ? "Page Range (e.g. 1-5)"
                  : "Number of Parts (e.g. 2, 4, 10)"}
              </label>
              <input
                id="split-value-input"
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={mode === "range" ? "1-5" : "2"}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
              <p className="text-xs text-gray-500 mt-2">
                {mode === "range"
                  ? "Creates one PDF with the selected pages."
                  : "Divides the PDF into N equal files."}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSplit}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all text-lg"
            >
              Split PDF
            </button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

// --- PDF to Image Tool ---
export const PdfToImgTool = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [resultImages, setResultImages] = useState<string[]>([]);

  const handleConvert = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const images = await pdfUtils.pdfToImages(file);
      setResultImages(images);
    } catch (e) {
      console.error(e);
      alert("Conversion failed.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout 
      title="PDF to JPG"
      icon={getToolByRoute("/pdf-to-img")?.icon}
      iconColorClass={getToolByRoute("/pdf-to-img")?.colorClass}
      description={getToolByRoute("/pdf-to-img")?.shortDesc} 
      isProcessing={processing}
      progressLabel="Converting PDF to Images..."
      progressSubLabel={`Rasterizing ${file ? 1 : 0} document into page images`}
    >
      {!file ? (
        <FileUpload
          onFilesSelected={(files) => setFile(files[0])}
          accept=".pdf"
        />
      ) : !resultImages.length ? (
        <div className="flex flex-col items-center justify-center h-full">
          <FileText size={64} className="text-amber-500 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-6">{file.name}</h3>
          <button
            type="button"
            onClick={handleConvert}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 text-lg"
          >
            Convert to Images
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {resultImages.map((img, idx) => (
            <div key={idx} className="group relative">
              <img
                src={img}
                alt={`Page ${idx + 1}`}
                className="w-full rounded-xl shadow-md border border-gray-100"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                <a
                  href={img}
                  download={`page-${idx + 1}.jpg`}
                  className="p-3 bg-white rounded-full text-indigo-600 hover:scale-110 transition-transform"
                >
                  <Download size={24} />
                </a>
              </div>
              <p className="text-center mt-2 font-medium text-gray-600">
                Page {idx + 1}
              </p>
            </div>
          ))}
        </div>
      )}
    </ToolLayout>
  );
};

// SortableImageItem 컴포넌트
const SortableImageItem: React.FC<{
  file: File;
  idx: number;
  onRemove: (index: number) => void;
  key?: React.Key;
}> = ({ file, idx, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: idx.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200 cursor-move"
    >
      <div
        className="absolute top-2 left-2 p-1 bg-white/90 backdrop-blur rounded-full shadow text-gray-400 hover:text-gray-600 z-10"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </div>
      <img
        src={URL.createObjectURL(file)}
        className="w-full h-full object-cover"
        alt="preview"
      />
      <button
        type="button"
        onClick={() => onRemove(idx)}
        className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur rounded-full shadow hover:bg-red-50 text-red-500 z-10 transition-all active:scale-95"
        title="Remove image"
      >
        <X size={16} />
      </button>
    </div>
  );
};

// --- Image to PDF Tool ---
export const ImgToPdfTool = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progressValue, setProgressValue] = useState<number | undefined>(undefined);

  // dnd-kit 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 드래그 앤 드롭 핸들러
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setFiles((items) => {
        const oldIndex = parseInt(active.id.toString());
        const newIndex = parseInt(over?.id.toString() || "0");

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleConvert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgressValue(0);
    try {
      const pdfBytes = await pdfUtils.imagesToPdf(files, (current, total, message) => {
        const percent = Math.round((current / total) * 100);
        setProgressValue(percent);
        console.log(`Image to PDF progress: ${percent}% - ${message}`);
      });
      const blob = uint8ArrayToBlob(pdfBytes);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "images_converted.pdf";
      link.click();
    } catch (e) {
      console.error(e);
      alert("Conversion failed.");
    } finally {
      setProcessing(false);
      setProgressValue(undefined);
    }
  };

  return (
    <ToolLayout 
      title="JPG to PDF"
      icon={getToolByRoute("/img-to-pdf")?.icon}
      iconColorClass={getToolByRoute("/img-to-pdf")?.colorClass}
      description={getToolByRoute("/img-to-pdf")?.shortDesc} 
      isProcessing={processing}
      progressValue={progressValue}
      progressLabel="Converting Images to PDF..."
      progressSubLabel={`Processing ${files.length} images`}
    >
      {files.length === 0 ? (
        <div className="max-w-2xl mx-auto text-center">
          <FileUpload onFilesSelected={setFiles} accept="image/*" multiple />
          <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-sm text-emerald-700">
              <strong>Images to PDF:</strong> Convert multiple images into a
              single PDF document.
            </p>
            <p className="text-sm text-emerald-700 mt-2">
              <strong>Drag & Drop:</strong> After uploading images, you can drag
              to reorder them before converting.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={files.map((_, idx) => idx.toString())}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {files.map((file, idx) => (
                  <SortableImageItem
                    key={idx}
                    idx={idx}
                    file={file}
                    onRemove={(index) =>
                      setFiles(files.filter((_, i) => i !== index))
                    }
                  />
                ))}
                <div className="border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center aspect-square hover:bg-gray-50 cursor-pointer">
                  <label htmlFor="add-images-input" className="cursor-pointer flex flex-col items-center">
                    <Plus size={24} className="text-gray-400" />
                    <input
                      id="add-images-input"
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files &&
                        setFiles([...files, ...Array.from(e.target.files)])
                      }
                    />
                  </label>
                </div>
              </div>
            </SortableContext>
          </DndContext>
          <div className="flex justify-end gap-4 mt-auto">
            <button
              type="button"
              onClick={() => setFiles([])}
              className="px-6 py-4 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors min-w-[120px]"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleConvert}
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 min-w-[200px]"
            >
              Convert to PDF
            </button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

// --- Page Number Tool ---
export const PageNumberTool = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const pdfBytes = await pdfUtils.addPageNumbers(file);
      const blob = uint8ArrayToBlob(pdfBytes);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "numbered.pdf";
      link.click();
    } catch (e) {
      console.error(e);
      alert("Failed to add page numbers");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout 
      title="Add Page Numbers"
      icon={getToolByRoute("/page-numbers")?.icon}
      iconColorClass={getToolByRoute("/page-numbers")?.colorClass}
      description={getToolByRoute("/page-numbers")?.shortDesc} 
      isProcessing={processing}
      progressLabel="Adding Page Numbers..."
      progressSubLabel={`Updating ${file ? 1 : 0} PDF with numbered footer`}
    >
      {!file ? (
        <FileUpload
          onFilesSelected={(files) => setFile(files[0])}
          accept=".pdf"
        />
      ) : (
        <div className="max-w-xl mx-auto text-center">
          <div className="mb-8 p-6 bg-cyan-50 rounded-2xl border border-cyan-100 flex items-center gap-4 text-left">
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <FileText size={32} className="text-cyan-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">{file.name}</h3>
            </div>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X />
            </button>
          </div>
          <p className="text-gray-600 mb-8">
            Click below to insert page numbers (e.g. "1 / 10") at the bottom
            center of every page.
          </p>
          <button
            type="button"
            onClick={handleProcess}
            className="w-full py-5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl shadow-lg shadow-cyan-200 transition-all text-lg"
          >
            Add Page Numbers
          </button>
        </div>
      )}
    </ToolLayout>
  );
};

// --- Annotation Tool ---
export const AnnotateTool = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pageImage, setPageImage] = useState<string>("");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [newAnnotation, setNewAnnotation] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [tempText, setTempText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

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

  const handleImageClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (newAnnotation) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setNewAnnotation({ x, y });
  };

  const saveAnnotation = () => {
    if (newAnnotation && tempText) {
      setAnnotations([
        ...annotations,
        {
          id: Date.now().toString(),
          x: newAnnotation.x,
          y: newAnnotation.y,
          text: tempText,
          pageIndex: currentPageIndex,
        },
      ]);
      setNewAnnotation(null);
      setTempText("");
    } else {
      setNewAnnotation(null);
    }
  };

  const handleDownload = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const pdfBytes = await pdfUtils.saveAnnotationsToPdf(file, annotations);
      const blob = uint8ArrayToBlob(pdfBytes);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "annotated.pdf";
      link.click();
    } catch (e) {
      console.error(e);
      alert("Failed to save annotation");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout 
      title="Annotate Document"
      icon={getToolByRoute("/annotate")?.icon}
      iconColorClass={getToolByRoute("/annotate")?.colorClass}
      description={getToolByRoute("/annotate")?.shortDesc} 
      isProcessing={processing}
      progressLabel="Saving Annotations..."
      progressSubLabel={`Committing ${annotations.length || 1} annotation item(s)`}
    >
      {!file ? (
        <FileUpload
          onFilesSelected={(files) => setFile(files[0])}
          accept=".pdf"
        />
      ) : (
        <div className="flex flex-col items-center">
          <div className="bg-blue-50 p-4 rounded-xl mb-6 text-sm text-blue-700 border border-blue-100 flex items-center gap-2">
            <AlertCircle size={16} />
            <span>Click anywhere on the current page to add a comment.</span>
          </div>

          <div className="w-full max-w-3xl bg-white border border-gray-200 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between">
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

          <div
            className="relative inline-block shadow-2xl border border-gray-200"
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
                  onClick={handleImageClick}
                  className="absolute inset-0"
                  aria-label="Add annotation"
                />
              </>
            )}

            {annotations
              .filter((ann) => ann.pageIndex === currentPageIndex)
              .map((ann) => (
              <div
                key={ann.id}
                className="absolute bg-yellow-100 border border-yellow-300 p-2 rounded shadow-md text-xs max-w-[200px]"
                style={{
                  left: `${ann.x}%`,
                  top: `${ann.y}%`,
                  transform: "translate(-50%, -100%) mt-2",
                }}
              >
                {ann.text}
                <div className="w-2 h-2 bg-yellow-100 border-r border-b border-yellow-300 absolute bottom-0 left-1/2 transform translate-y-1/2 -translate-x-1/2 rotate-45"></div>
              </div>
            ))}

            {newAnnotation && (
              <div
                className="absolute z-10"
                style={{
                  left: `${newAnnotation.x}%`,
                  top: `${newAnnotation.y}%`,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <div className="bg-white p-3 rounded-lg shadow-xl border border-gray-200 w-64">
                  <textarea
                    className="w-full text-sm border border-gray-200 rounded p-2 mb-2 outline-none focus:border-indigo-500"
                    placeholder="Enter your comment..."
                    rows={3}
                    value={tempText}
                    onChange={(e) => setTempText(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setNewAnnotation(null)}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveAnnotation}
                      className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                    >
                      Add
                    </button>
                  </div>
                </div>
                <div className="w-3 h-3 bg-indigo-600 rounded-full border-2 border-white shadow-sm absolute bottom-[-6px] left-1/2 -translate-x-1/2 translate-y-full"></div>
              </div>
            )}
          </div>

          <div className="mt-8 flex gap-4 w-full justify-center">
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setAnnotations([]);
              }}
              className="px-8 py-4 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors min-w-[120px]"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 min-w-[200px] transition-all transform hover:-translate-y-0.5"
            >
              Save Document
            </button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

// --- OCR Tool ---
import { ProgressStep } from "../components/ProgressSteps";

const imageFileToSinglePagePdf = async (file: File) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await PDFDocument.create();
  const image =
    file.type === "image/jpeg" || file.name.toLowerCase().match(/\.jpe?g$/)
      ? await pdf.embedJpg(bytes)
      : await pdf.embedPng(bytes);
  const maxWidth = 900;
  const maxHeight = 1200;
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
  const width = image.width * scale;
  const height = image.height * scale;
  const page = pdf.addPage([width, height]);
  page.drawImage(image, { x: 0, y: 0, width, height });
  return new File([await pdf.save()], `${file.name.replace(/\.[^.]+$/, "")}.pdf`, {
    type: "application/pdf",
  });
};

export const OcrTool = () => {
  const [file, setFile] = useState<File | null>(null);
  const [resultText, setResultText] = useState("");
  const [outputMode, setOutputMode] = useState<"text" | "searchable-pdf">("text");
  const [ocrProfile, setOcrProfile] = useState<PdfMarkdownOcrProfile>("none");
  const [ocrAccuracy, setOcrAccuracy] = useState<PdfMarkdownOcrAccuracy>("accurate");
  const [ocrDiagnostics, setOcrDiagnostics] = useState<PdfMarkdownDiagnostics | undefined>();
  const [resultNotice, setResultNotice] = useState("");
  const [processing, setProcessing] = useState(false);
  
  const [ocrSteps, setOcrSteps] = useState<ProgressStep[]>([
    { id: "prep", label: "Preparing document", status: "pending" },
    { id: "server", label: "Internal OCR", status: "pending" },
    { id: "done", label: "Finalizing", status: "pending" },
  ]);

  const updateStep = (id: string, status: ProgressStep["status"]) => {
    setOcrSteps((prev) => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleOcr = async () => {
    if (!file) return;
    setProcessing(true);
    
    setResultText("");
    setResultNotice("");
    setOcrDiagnostics(undefined);
    setOcrSteps([
      { id: "prep", label: "Preparing document", status: "processing" },
      { id: "server", label: outputMode === "searchable-pdf" ? "Preserving layout with OCRmyPDF" : "Extracting text with Tesseract", status: "pending" },
      { id: "done", label: "Finalizing", status: "pending" },
    ]);

    try {
      const fileToSend =
        file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
          ? file
          : await imageFileToSinglePagePdf(file);

      updateStep("prep", "completed");
      updateStep("server", "processing");

      if (outputMode === "searchable-pdf") {
        const job = await createSearchablePdfOnServer(fileToSend);
        const completed = await pollCompletedPdfJob(job.jobId, job.downloadToken, () => undefined, 1000);
        const resultBlob = await downloadCompletedPdfJob({
          ...completed,
          downloadToken: job.downloadToken,
          downloadUrl: completed.downloadUrl || job.downloadUrl,
        });
        const filename =
          completed.resultFilename ||
          fileToSend.name.replace(/\.pdf$/i, "_searchable.pdf");
        downloadBlob(resultBlob, filename);
        updateStep("server", "completed");
        updateStep("done", "processing");
        setResultNotice("Searchable PDF created and downloaded. The original page layout is preserved with an invisible OCR text layer.");
        updateStep("done", "completed");
      } else {
        const job = await submitPdfToMarkdownJob(fileToSend, {
          mode: ocrAccuracy === "fast" ? "balanced" : "accurate",
          ocrEngine: "tesseract",
          output: "single",
          ocrProfile,
          ocrAccuracy,
        });
        const completed = await pollPdfToMarkdownJob(job.jobId, job.downloadToken, () => undefined, 1000);
        if (completed.status !== "completed") {
          throw new Error(completed.error || completed.message || "Internal OCR job failed.");
        }
        const resultBlob = await downloadPdfToMarkdownResult(
          job.jobId,
          job.downloadToken,
          completed.downloadUrl
        );
        const text = await resultBlob.text();

        updateStep("server", "completed");
        updateStep("done", "processing");

        setResultText(text);
        setOcrDiagnostics(completed.diagnostics);
        updateStep("done", "completed");
      }
    } catch (e) {
      console.error(e);
      updateStep("server", "error");
      alert("OCR failed. The internal OCR server could not process this file.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout
      title="Internal OCR Text Extractor"
      icon={getToolByRoute("/ocr")?.icon}
      iconColorClass={getToolByRoute("/ocr")?.colorClass}
      description="Extract Korean, Chinese, and English text with DocuFlow's internal Tesseract OCR or preserve the original layout as a searchable PDF."
      isProcessing={processing}
      progressSteps={ocrSteps}
      progressLabel="Internal OCR Processing"
      progressSubLabel={`Scanning ${file ? 1 : 0} file with local server OCR stages`}
    >
      {!file ? (
        <FileUpload
          onFilesSelected={(files) => setFile(files[0])}
          accept=".pdf,.png,.jpg,.jpeg"
        />
      ) : (
        <div className="flex flex-col lg:flex-row gap-8 h-full min-h-[500px]">
          <div className="flex-1 flex flex-col">
            <div className="bg-violet-50 p-4 rounded-xl border border-violet-100 flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileText className="text-violet-600" />
                <span className="font-semibold text-gray-700">{file.name}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setResultText("");
                  setResultNotice("");
                  setOcrDiagnostics(undefined);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setOutputMode("text")}
                disabled={processing}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  outputMode === "text"
                    ? "border-violet-300 bg-violet-50 text-violet-900"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                <p className="text-sm font-bold">Text / Markdown</p>
                <p className="mt-1 text-xs">Extract Korean/Chinese/English text for copy/paste or Markdown workflows.</p>
              </button>
              <button
                type="button"
                onClick={() => setOutputMode("searchable-pdf")}
                disabled={processing}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  outputMode === "searchable-pdf"
                    ? "border-violet-300 bg-violet-50 text-violet-900"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                <p className="text-sm font-bold">Searchable PDF</p>
                <p className="mt-1 text-xs">Keep the original page layout and add an invisible OCR text layer.</p>
              </button>
            </div>

            {outputMode === "text" && !resultText && !resultNotice && (
              <div className="mb-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <label className="text-sm font-medium text-gray-700">
                    OCR accuracy
                    <select
                      value={ocrAccuracy}
                      onChange={(event) => setOcrAccuracy(event.target.value as PdfMarkdownOcrAccuracy)}
                      disabled={processing}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                    >
                      <option value="fast">Fast — minimum OCR candidate budget</option>
                      <option value="balanced">Balanced — light DPI retry</option>
                      <option value="accurate">Accurate — default OCR candidate set</option>
                      <option value="max">Max — highest candidate budget</option>
                    </select>
                  </label>
                  <p className="mt-2 text-xs text-gray-500">
                    Higher accuracy tries more renderer/DPI candidates and takes longer.
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <label className="text-sm font-medium text-gray-700">
                    Document profile
                    <select
                      value={ocrProfile}
                      onChange={(event) => setOcrProfile(event.target.value as PdfMarkdownOcrProfile)}
                      disabled={processing}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                    >
                      <option value="none">General document — no document-specific corrections</option>
                      <option value="korean-public-document">Korean public document — opt-in form cleanup</option>
                      <option value="receipt">Receipt</option>
                      <option value="contract">Contract</option>
                      <option value="book-scan">Book scan</option>
                      <option value="table-heavy">Table-heavy document</option>
                    </select>
                  </label>
                  <p className="mt-2 text-xs text-gray-500">
                    General mode keeps OCR document-neutral. Use a profile only when the document type is known.
                  </p>
                </div>
              </div>
            )}
            {!resultText && !resultNotice && (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 p-8 text-center">
                <p className="text-gray-500 mb-2">
                  {outputMode === "searchable-pdf"
                    ? "Ready to preserve the original layout with OCRmyPDF and CJK OCR."
                    : "Ready to scan with DocuFlow's internal Korean/Chinese/English Tesseract OCR."}
                </p>
                <p className="text-xs text-gray-400 mb-6">
                  {outputMode === "searchable-pdf"
                    ? "Best for scanned PDFs when you need search/copy while keeping the page appearance."
                    : "PDF, PNG, and JPG files are processed through the same internal server OCR pipeline."}
                </p>
                <button
                  type="button"
                  onClick={handleOcr}
                  className="px-10 py-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-lg shadow-violet-200 transition-all text-lg transform hover:-translate-y-0.5"
                >
                  {outputMode === "searchable-pdf" ? "Create Searchable PDF" : "Start Internal OCR"}
                </button>
              </div>
            )}

            {resultNotice && (
              <div className="flex-1 flex flex-col items-center justify-center border border-emerald-200 rounded-2xl bg-emerald-50 p-8 text-center">
                <CheckCircle2 className="mb-4 text-emerald-600" size={40} />
                <p className="max-w-xl text-sm leading-relaxed text-emerald-800">{resultNotice}</p>
              </div>
            )}

            {ocrDiagnostics && (
              <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                <p className="font-semibold text-gray-900 mb-2">OCR diagnostics</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <p>Profile: {ocrDiagnostics.ocrProfile || ocrProfile}</p>
                  <p>Accuracy: {ocrDiagnostics.ocrAccuracy || ocrAccuracy}</p>
                  <p>Renderer: {ocrDiagnostics.renderer || "unknown"}</p>
                  <p>Confidence: {typeof ocrDiagnostics.meanConfidence === "number" ? `${ocrDiagnostics.meanConfidence.toFixed(1)}%` : "unknown"}</p>
                  <p>Low-confidence lines: {ocrDiagnostics.lowConfidenceLineCount ?? "unknown"}</p>
                  <p>DPI candidates: {ocrDiagnostics.dpiCandidates?.join(", ") || "unknown"}</p>
                </div>
                {ocrDiagnostics.lowConfidenceLinePreview?.length ? (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Low-confidence preview</p>
                    <ul className="mt-1 list-disc list-inside text-xs text-amber-800">
                      {ocrDiagnostics.lowConfidenceLinePreview.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
            {resultText && (
              <div className="flex-1 relative">
                <label htmlFor="ocr-result-text" className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                  Extracted Text
                </label>
                <textarea
                  id="ocr-result-text"
                  className="w-full h-[400px] p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-mono text-sm leading-relaxed outline-none focus:border-violet-500 resize-none"
                  value={resultText}
                  readOnly
                />
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(resultText)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
                  >
                    <CheckCircle2 size={16} /> Copy to Clipboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

// --- Compress PDF Tool ---
export const CompressPdfTool = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<"screen" | "ebook" | "printer" | "prepress">("ebook");
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleCompress = async () => {
    if (!file) return;
    setProcessing(true);
    setStatus(null);
    try {
      const job = await compressPdfOnServer(file, preset);
      const blob = await downloadCompletedPdfJob(job);
      downloadBlob(blob, job.resultFilename || `compressed_${file.name}`);
      const reduction = typeof job.reductionPercent === "number" ? ` (${job.reductionPercent}% smaller)` : "";
      setStatus(`Ghostscript compression complete${reduction}.`);
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : "압축 중 오류가 발생했습니다.";
      setStatus(message);
      alert(message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout 
      title="Compress PDF"
      icon={getToolByRoute("/compress")?.icon}
      iconColorClass={getToolByRoute("/compress")?.colorClass}
      description={getToolByRoute("/compress")?.shortDesc} 
      isProcessing={processing}
      progressLabel="Compressing PDF..."
      progressSubLabel={`Server Ghostscript preset: ${preset}`}
    >
      {!file ? (
        <FileUpload onFilesSelected={(f) => setFile(f[0])} accept=".pdf" />
      ) : (
        <div className="max-w-xl mx-auto">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm text-center">
            <h3 className="text-lg font-bold mb-4">{file.name}</h3>
            <div className="mb-8 text-left">
              <label htmlFor="compression-preset" className="block text-sm font-medium text-gray-700 mb-2">
                Ghostscript compression preset
              </label>
              <select
                id="compression-preset"
                value={preset}
                onChange={(e) => setPreset(e.target.value as "screen" | "ebook" | "printer" | "prepress")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
                disabled={processing}
              >
                <option value="screen">Screen - smallest file</option>
                <option value="ebook">Ebook - balanced</option>
                <option value="printer">Printer - high quality</option>
                <option value="prepress">Prepress - highest quality</option>
              </select>
              <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
                This uploads the PDF to the DocuFlow server and uses Ghostscript. It does not use the old browser raster fallback.
              </p>
              {status && <p className="mt-3 text-sm text-gray-600">{status}</p>}
            </div>
            <button
              type="button"
              onClick={handleCompress}
              disabled={processing}
              className="w-full py-5 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-300 text-white font-bold rounded-xl shadow-lg text-lg transition-all"
            >
              Compress PDF
            </button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

// Organize용 썸네일 컴포넌트
const SortablePageThumbnail = ({ page, onRotate, onRemove }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group bg-gray-100 p-2 rounded-lg border border-gray-200"
    >
      <div className="relative aspect-[1/1.4] bg-white shadow-sm overflow-hidden flex items-center justify-center">
        <img
          src={page.img}
          alt={`PDF page ${parseInt(page.id) + 1} thumbnail`}
          className="max-w-full max-h-full object-contain transition-transform duration-300"
          style={{ transform: `rotate(${page.rotation}deg)` }}
        />
        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            type="button"
            onMouseDown={(e) => {
              e.stopPropagation();
              onRotate();
            }}
            className="p-2 bg-white rounded-full text-gray-700 hover:text-indigo-600"
          >
            <RotateCw size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-2 bg-white rounded-full text-red-500 hover:bg-red-50"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div
        className="absolute top-2 left-2 cursor-move p-1 bg-white/80 rounded"
        {...attributes}
        {...listeners}
      >
        <Grid size={14} className="text-gray-500" />
      </div>
      <div className="text-center text-xs text-gray-500 mt-2">
        Page {parseInt(page.id) + 1}
      </div>
    </div>
  );
};

// --- Organize PDF Tool ---
export const OrganizePdfTool = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<
    { id: string; img: string; rotation: number; deleted: boolean }[]
  >([]);
  const [processing, setProcessing] = useState(false);

  // 센서 설정 (기존과 동일)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (file) {
      setProcessing(true);
      pdfUtils.pdfToImages(file).then((imgs) => {
        setPages(
          imgs.map((img, i) => ({
            id: i.toString(),
            img,
            rotation: 0,
            deleted: false,
          }))
        );
        setProcessing(false);
      });
    }
  }, [file]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setPages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const rotatePage = (id: string) => {
    setPages(
      pages.map((p) =>
        p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p
      )
    );
  };

  const removePage = (id: string) => {
    // 실제 삭제 대신 필터링만 UI에서 하고 나중에 처리
    setPages(pages.filter((p) => p.id !== id));
  };

  const handleSave = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      // 현재 pages 배열 순서가 곧 새로운 순서
      // 원본 인덱스(id)를 추적해야 함
      const pageOrders = pages.map((p) => ({
        oldIndex: parseInt(p.id),
        rotation: p.rotation,
        deleted: false,
      }));

      const bytes = await pdfUtils.reorderPdf(file, pageOrders);
      const blob = uint8ArrayToBlob(bytes);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `organized_${file.name}`;
      link.click();
    } catch (e) {
      console.error(e);
      alert("저장 실패");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout 
      title="Organize PDF"
      icon={getToolByRoute("/organize")?.icon}
      iconColorClass={getToolByRoute("/organize")?.colorClass}
      description={getToolByRoute("/organize")?.shortDesc} 
      isProcessing={processing}
      progressLabel="Saving PDF..."
      progressSubLabel={`Writing ${pages.length || 1} page operation(s)`}
    >
      {!file ? (
        <FileUpload onFilesSelected={(f) => setFile(f[0])} accept=".pdf" />
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex justify-between mb-4">
            <p className="text-sm text-gray-500">
              Drag to reorder, click rotate to fix orientation.
            </p>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all font-medium"
            >
              Save Changes
            </button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={pages.map((p) => p.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {pages.map((page) => (
                  <SortablePageThumbnail
                    key={page.id}
                    page={page}
                    onRotate={() => rotatePage(page.id)}
                    onRemove={() => removePage(page.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </ToolLayout>
  );
};
