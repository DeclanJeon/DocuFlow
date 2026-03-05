// src/pages/WelcomePanel.tsx
import React from "react";
import { Link } from "react-router-dom";
import { FileText, Zap } from "lucide-react";
import { TOOL_GROUPS, ALL_TOOLS } from "../data/tools";

const POPULAR_ROUTES = ["/merge", "/ocr", "/pdf-to-docx", "/protect", "/pdf-to-md", "/epub-to-pdf"];

export const WelcomePanel = () => {
  const popular = POPULAR_ROUTES.map((r) => ALL_TOOLS.find((t) => t.to === r)).filter(Boolean);

  return (
    <div className="min-h-full p-8">
      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <FileText size={22} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">DocuFlow</h1>
            <p className="text-sm text-slate-500">All your document tools, one place</p>
          </div>
        </div>
        <p className="text-slate-600 max-w-lg">
          Process PDFs, convert documents, extract text with OCR, and secure your files — all in your browser, no upload to server required.
        </p>
      </div>

      {/* Popular Tools */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={15} className="text-amber-500" />
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Popular</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {popular.map((tool) => {
            if (!tool) return null;
            const Icon = tool.icon;
            return (
              <Link
                key={tool.to}
                to={tool.to}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all shadow-sm"
              >
                <span className={`w-5 h-5 rounded flex items-center justify-center ${tool.colorClass}`}>
                  <Icon size={12} className="text-white" />
                </span>
                {tool.title}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Tool Groups */}
      <div className="space-y-8">
        {TOOL_GROUPS.map((group) => (
          <div key={group.label}>
            <h2 className="text-base font-bold text-slate-800 mb-3">{group.label}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {group.tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.to}
                    to={tool.to}
                    className="group flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tool.colorClass} group-hover:scale-110 transition-transform`}>
                      <Icon size={18} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">{tool.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{tool.shortDesc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
