import React, { useState } from "react";
import { Link } from "react-router-dom";
import { UploadCloud, ArrowRight } from "lucide-react";

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
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      to={to}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo-200/80 hover:shadow-lg hover:shadow-indigo-100/50"
    >
      {/* Shimmer overlay on hover */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-indigo-50/60 to-transparent transition-all duration-700 ${
          isHovered ? "translate-x-full opacity-0" : "-translate-x-full opacity-0"
        }`}
        style={{
          backgroundSize: "200% 100%",
          animation: isHovered ? "none" : "shimmer 3s ease-in-out infinite",
        }}
      />

      {/* Decorative gradient blob */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 transition-all duration-500 group-hover:opacity-30"
        style={{
          background: `radial-gradient(circle, ${colorClass.replace('bg-', '').replace('-500', '')} 0%, transparent 70%)`,
        }}
      />

      {/* Icon */}
      <div
        className={`relative z-10 mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${colorClass} shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}
      >
        <Icon size={20} className="text-white" />
      </div>

      {/* Title + Arrow */}
      <div className="relative z-10 flex items-center justify-between">
        <h3 className="text-base font-semibold tracking-tight text-gray-900 transition-colors duration-200 group-hover:text-indigo-700">
          {title}
        </h3>
        <ArrowRight
          size={16}
          className={`text-indigo-400 transition-all duration-300 ${
            isHovered ? "translate-x-0.5 opacity-100" : "opacity-0"
          }`}
        />
      </div>

      {/* Description */}
      <p className="relative z-10 mt-1.5 text-sm leading-relaxed text-gray-500">{description}</p>
    </Link>
  );
};

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
  const [isHovered, setIsHovered] = React.useState(false);

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
      className={`relative max-w-2xl mx-auto border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 py-16 overflow-hidden ${
        isDragging
          ? "border-indigo-400 bg-indigo-50/80 scale-[1.02] shadow-lg shadow-indigo-100/50"
          : isHovered
            ? "border-indigo-300 bg-indigo-50/40"
            : "border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/40"
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Decorative dots pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, #6366f1 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      <input
        type="file"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        onChange={handleFileChange}
        accept={accept}
        multiple={multiple}
      />

      {/* Upload icon with ring */}
      <div className="relative mb-5">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
          isDragging
            ? "bg-indigo-500 scale-110 shadow-lg shadow-indigo-200"
            : "bg-white shadow-md border border-slate-100 group-hover:shadow-lg"
        }`}>
          <UploadCloud size={32} className={`transition-all duration-300 ${
            isDragging ? "text-white" : "text-indigo-500"
          }`} />
        </div>
        {isDragging && (
          <span className="absolute -inset-2 rounded-full border-2 border-indigo-200 animate-ping opacity-50" />
        )}
      </div>

      <p className="text-base font-semibold text-slate-700 mb-1">
        {isDragging ? "📂 파일을 여기에 놓으세요" : "파일을 업로드하려면 클릭하거나 드래그하세요"}
      </p>
      <p className="text-sm text-slate-400">
        {description || `지원 형식: ${getSupportedFormats(accept)}`}
      </p>
    </div>
  );
};
