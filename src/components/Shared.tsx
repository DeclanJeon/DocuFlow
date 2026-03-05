import React from "react";
import { Link } from "react-router-dom";
import { UploadCloud } from "lucide-react";

interface ToolCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  to: string;
  colorClass: string;
}

export const ToolCard: React.FC<ToolCardProps> = ({
  icon: Icon,
  title,
  description,
  to,
  colorClass,
}) => (
  <Link
    to={to}
    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl"
  >
    <div className="pointer-events-none absolute inset-x-0 -top-12 h-24 bg-gradient-to-b from-brand-50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    <div
      className={`relative z-10 mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${colorClass} transition-transform group-hover:scale-110`}
    >
      <Icon size={24} className="text-white" />
    </div>
    <h3 className="relative z-10 mb-2 text-lg font-bold text-slate-900 transition-colors group-hover:text-brand-600">
      {title}
    </h3>
    <p className="relative z-10 text-sm leading-relaxed text-slate-600">{description}</p>
  </Link>
);

export const FileUpload = ({
  onFilesSelected,
  accept,
  multiple = false,
  description,
}: {
  onFilesSelected: (files: File[]) => void;
  accept: string;
  multiple?: boolean;
  description?: string;
}) => {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files: File[] = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFilesSelected(files);
  };

  const getSupportedFormats = (acceptStr: string) => {
    return acceptStr.split(",").map((f) => {
      const c = f.trim().replace(".", "").toUpperCase();
      if (f === "image/*") return "JPG, PNG, GIF…";
      return c;
    }).join(" · ");
  };

  return (
    <div
      className={`relative w-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 py-16 ${
        isDragging
          ? "border-blue-400 bg-blue-50 scale-[1.01]"
          : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50"
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        onChange={handleFileChange}
        accept={accept}
        multiple={multiple}
      />
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-200 ${isDragging ? "bg-blue-500 scale-110" : "bg-white shadow-md border border-slate-100"}`}>
        <UploadCloud size={32} className={isDragging ? "text-white" : "text-blue-500"} />
      </div>
      <p className="text-base font-semibold text-slate-700 mb-1">
        {isDragging ? "Drop files here" : "Click to upload or drag and drop"}
      </p>
      <p className="text-sm text-slate-400">
        {description || `Supported: ${getSupportedFormats(accept)}`}
      </p>
    </div>
  );
};
