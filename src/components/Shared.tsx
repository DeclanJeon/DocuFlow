import React from "react";
import { Link } from "react-router-dom";
import { UploadCloud } from "lucide-react";

export const ToolCard = ({
  icon: Icon,
  title,
  description,
  to,
  colorClass,
}: any) => (
  <Link
    to={to}
    className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-brand-200 hover:-translate-y-1 transition-all duration-300"
  >
    <div
      className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colorClass} group-hover:scale-110 transition-transform`}
    >
      <Icon size={24} className="text-white" />
    </div>
    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-brand-600 transition-colors">
      {title}
    </h3>
    <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
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
