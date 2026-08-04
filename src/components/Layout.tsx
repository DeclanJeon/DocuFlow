import React, { ComponentType, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FileText, ArrowLeft, Home, BookOpen } from "lucide-react";
import { TOOL_GROUPS } from "../data/tools";

import {
  ProgressSteps,
  ProgressStep,
  SimpleProgressBar,
  ProgressInsight,
} from "./ProgressSteps";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const DEFAULT_PROFILE: Record<
  string,
  {
    estimatedSeconds: number;
    totalUnits: number;
    unitLabel: string;
  }
> = {
  "Merge Files": { estimatedSeconds: 20, totalUnits: 3, unitLabel: "steps" },
  "Split PDF": { estimatedSeconds: 18, totalUnits: 4, unitLabel: "steps" },
  "PDF to JPG": { estimatedSeconds: 24, totalUnits: 5, unitLabel: "pages" },
  "JPG to PDF": { estimatedSeconds: 22, totalUnits: 5, unitLabel: "images" },
  "Add Page Numbers": { estimatedSeconds: 14, totalUnits: 3, unitLabel: "steps" },
  "Annotate Document": { estimatedSeconds: 12, totalUnits: 3, unitLabel: "steps" },
  "OCR Text Extractor": { estimatedSeconds: 35, totalUnits: 6, unitLabel: "batches" },
  "Compress PDF": { estimatedSeconds: 20, totalUnits: 4, unitLabel: "steps" },
  "Organize PDF": { estimatedSeconds: 22, totalUnits: 5, unitLabel: "steps" },
  "Add Watermark": { estimatedSeconds: 18, totalUnits: 4, unitLabel: "steps" },
  "Protect PDF": { estimatedSeconds: 14, totalUnits: 3, unitLabel: "steps" },
  "Unlock PDF": { estimatedSeconds: 12, totalUnits: 3, unitLabel: "steps" },
  "Sign PDF": { estimatedSeconds: 16, totalUnits: 4, unitLabel: "steps" },
  "PDF to Word": { estimatedSeconds: 28, totalUnits: 5, unitLabel: "stages" },
  "Word to PDF": { estimatedSeconds: 24, totalUnits: 4, unitLabel: "stages" },
  "PDF to Markdown": { estimatedSeconds: 45, totalUnits: 8, unitLabel: "stages" },
  "EPUB to PDF": { estimatedSeconds: 24, totalUnits: 5, unitLabel: "chapters" },
};

const pickUnitFromText = (text?: string) => {
  if (!text) return null;

  if (/image/i.test(text)) return "images";
  if (/page/i.test(text)) return "pages";
  if (/file/i.test(text)) return "files";
  if (/batch/i.test(text)) return "batches";
  return null;
};

const pickTotalFromText = (text?: string) => {
  if (!text) return null;
  const match = text.match(/(\d+)/);
  if (!match) return null;

  const parsed = Number.parseInt(match[1], 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

export const Sidebar = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`shrink-0 flex flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 h-screen sticky top-0 overflow-y-auto transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Brand */}
      <div className={`px-5 py-5 border-b border-white/5 ${collapsed ? "px-0 flex justify-center" : ""}`}>
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <FileText size={18} className="text-white" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <span className="text-white font-bold text-lg tracking-tight">DocuFlow</span>
          )}
        </Link>
      </div>

      {/* Tool Groups */}
      <nav className="flex-1 px-3 py-4 space-y-6">
        {TOOL_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400/60">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.tools.map((tool) => {
                const isActive = location.pathname === tool.to;
                const Icon = tool.icon;
                return (
                  <li key={tool.to}>
                    <Link
                      to={tool.to}
                      className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-all duration-200 ${
                        collapsed ? "justify-center px-0" : ""
                      } ${
                        isActive
                          ? "bg-indigo-500/15 text-white ring-1 ring-indigo-500/30"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon
                        size={15}
                        className={`transition-colors duration-200 ${
                          isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-white"
                        }`}
                      />
                      {!collapsed && <span className="font-medium">{tool.title}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="mx-3 mb-3 flex items-center justify-center rounded-lg py-2 text-xs text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all"
      >
        {collapsed ? "→" : "← 접기"}
      </button>

      {/* Footer */}
      <div className={`px-5 py-3 border-t border-white/5 ${collapsed ? "px-0 text-center" : ""}`}>
        <p className="text-[10px] text-slate-500/60">© 2026 DocuFlow</p>
      </div>
    </aside>
  );
};

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen bg-surface-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative">
        {children}
      </main>
    </div>
  );
};

export const Navbar = () => (
  <nav className="bg-white/90 backdrop-blur-xl border-b border-gray-200/60 sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-16">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-200 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-indigo-300 group-hover:scale-105">
              <FileText size={18} strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900">
              DocuFlow
            </span>
          </Link>
          <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 shadow-sm">
            FREE
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            to="/"
            className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 rounded-lg transition-all hover:bg-gray-50"
          >
            Tools
          </Link>
          <Link
            to="/guide"
            className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 rounded-lg transition-all hover:bg-gray-50"
          >
            Guide
          </Link>
          <Link
            to="/privacy"
            className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 rounded-lg transition-all hover:bg-gray-50"
          >
            Privacy
          </Link>
        </div>
      </div>
    </div>
  </nav>
);

export const Footer = () => (
  <footer className="bg-white border-t border-gray-100 mt-auto">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-md flex items-center justify-center text-white shadow-sm">
            <FileText size={14} strokeWidth={2.5} />
          </div>
          <span className="text-sm font-bold tracking-tight text-gray-900">DocuFlow</span>
          <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
            FREE
          </span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/guide" className="text-sm text-gray-400 hover:text-indigo-600 transition-colors duration-200">
            이용 가이드
          </Link>
          <Link to="/privacy" className="text-sm text-gray-400 hover:text-indigo-600 transition-colors duration-200">
            개인정보처리방침
          </Link>
          <Link to="/terms" className="text-sm text-gray-400 hover:text-indigo-600 transition-colors duration-200">
            이용약관
          </Link>
        </div>
      </div>
      <div className="mt-8 pt-6 border-t border-gray-100/60">
        <p className="text-center text-xs text-gray-400">
          © 2026 DocuFlow. All rights reserved. All document processing tools are provided free of charge.
        </p>
      </div>
    </div>
  </footer>
);

interface ToolLayoutProps {
  title: string;
  description?: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  iconColorClass?: string;
  children: React.ReactNode;
  isProcessing?: boolean;
  progressSteps?: ProgressStep[];
  progressValue?: number; // 0-100
  progressEtaSeconds?: number | null;
  progressLabel?: string;
  progressSubLabel?: string;
}

const transitionClasses = "transition-all duration-200 ease-out";

export const ToolLayout = ({
  title,
  description,
  icon,
  iconColorClass,
  children,
  isProcessing,
  progressSteps,
  progressValue,
  progressEtaSeconds,
  progressLabel,
  progressSubLabel,
}: ToolLayoutProps) => {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (isProcessing) {
      setStartedAt(Date.now());
      setTick(0);
      return;
    }

    setStartedAt(null);
    setTick(0);
  }, [isProcessing]);

  useEffect(() => {
    if (!isProcessing || startedAt === null) return;

    const id = window.setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(id);
  }, [isProcessing, startedAt]);

  const insight = useMemo<ProgressInsight | undefined>(() => {
    if (!isProcessing || startedAt === null) return undefined;

    const elapsedSeconds = Math.max(1, Math.floor((Date.now() - startedAt) / 1000));
    const baseProfile = DEFAULT_PROFILE[title] || {
      estimatedSeconds: 20,
      totalUnits: 4,
      unitLabel: "steps",
    };

    const stepCount = progressSteps?.length || 0;
    const completedSteps =
      progressSteps?.filter((step) => step.status === "completed").length || 0;
    const activeStep = progressSteps?.find((step) => step.status === "processing");

    const inferredTotal =
      stepCount || pickTotalFromText(progressSubLabel) || baseProfile.totalUnits;
    const inferredUnitLabel =
      pickUnitFromText(progressSubLabel) ||
      pickUnitFromText(progressLabel) ||
      baseProfile.unitLabel;

    let percent = 0;
    let completedUnits = 0;

    if (progressValue !== undefined) {
      percent = clamp(progressValue, 0, 100);
      completedUnits = Math.round((percent / 100) * inferredTotal);
    } else if (stepCount > 0) {
      const activeContribution = activeStep ? 0.5 : 0;
      const ratio = clamp((completedSteps + activeContribution) / stepCount, 0, 1);
      percent = ratio * 100;
      completedUnits = Math.round(ratio * inferredTotal);
    } else {
      const seeded = clamp((elapsedSeconds / baseProfile.estimatedSeconds) * 85 + 10, 10, 96);
      percent = seeded;
      completedUnits = Math.max(1, Math.round((seeded / 100) * inferredTotal));
    }

    const safePercent = clamp(percent, 1, 99);
    const etaSeconds =
      progressEtaSeconds !== undefined
        ? progressEtaSeconds
        : Math.max(0, Math.round((elapsedSeconds * (100 - safePercent)) / safePercent));

    const activeDetail = activeStep?.detail;
    const statusMessage =
      activeDetail ||
      (progressSubLabel
        ? progressSubLabel
        : `${completedUnits}/${inferredTotal} ${inferredUnitLabel} completed`);

    void tick;

    return {
      progressPercent: percent,
      completedUnits: clamp(completedUnits, 0, inferredTotal),
      totalUnits: inferredTotal,
      unitLabel: inferredUnitLabel,
      elapsedSeconds,
      etaSeconds,
      statusMessage,
    };
  }, [
    isProcessing,
    progressLabel,
    progressEtaSeconds,
    progressSteps,
    progressSubLabel,
    progressValue,
    startedAt,
    tick,
    title,
  ]);

  return (
    <div className="min-h-full flex flex-col">
      {/* Tool Header */}
      <div className="px-8 pt-6 pb-6 border-b border-gray-200/70 bg-white/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-5 animate-fade-in-down">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 shadow-sm"
            >
              <ArrowLeft size={14} />
              뒤로
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 shadow-sm"
            >
              <Home size={14} />
              홈
            </Link>
          </div>
          <div className="animate-fade-in-up">
            {icon && (
              <div className={`inline-flex w-10 h-10 rounded-xl items-center justify-center mb-3 ${iconColorClass || "bg-indigo-600"} shadow-md shadow-indigo-200/50`}>
                {React.createElement(icon, { size: 20, className: "text-white" })}
              </div>
            )}
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
            {description && (
              <p className="mt-1 text-sm text-gray-500 max-w-xl">{description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative px-8 py-8">
        <div className="max-w-5xl mx-auto animate-fade-in">
          {isProcessing && (
            <div className="absolute inset-0 bg-surface-50/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade-in">
              {progressSteps ? (
                <ProgressSteps steps={progressSteps} title={progressLabel} insight={insight} />
              ) : progressValue !== undefined ? (
                <SimpleProgressBar progress={progressValue} label={progressLabel} subLabel={progressSubLabel} insight={insight} />
              ) : (
                <SimpleProgressBar progress={insight?.progressPercent || 12} label={progressLabel || "Processing..."} subLabel={progressSubLabel} insight={insight} />
              )}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
};
