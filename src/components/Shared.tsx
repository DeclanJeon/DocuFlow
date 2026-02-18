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
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  const getSupportedFormats = (acceptStr: string) => {
    const formats = acceptStr.split(",");
    return formats
      .map((format) => {
        const cleanFormat = format.trim().replace(".", "").toUpperCase();
        if (format === "image/*") return "Images (JPG, PNG, etc.)";
        if (format === ".pdf") return "PDF";
        if (format === ".docx") return "DOCX";
        if (format === ".epub") return "EPUB";
        return cleanFormat;
      })
      .join(", ");
  };

  return (
    <div className="w-full h-64 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center bg-gray-50 hover:bg-brand-50 hover:border-brand-300 transition-all cursor-pointer group relative overflow-hidden">
      <input
        type="file"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        onChange={handleFileChange}
        accept={accept}
        multiple={multiple}
      />
      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
        <UploadCloud size={32} className="text-brand-500" />
      </div>
      <p className="text-lg font-semibold text-gray-700 mb-1">
        Click to upload or drag and drop
      </p>
      <p className="text-sm text-gray-400">
        {description || `Supported: ${getSupportedFormats(accept)}`}
      </p>
    </div>
  );
};
