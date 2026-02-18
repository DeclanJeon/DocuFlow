import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, ChevronLeft, Loader2 } from "lucide-react";
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

export const Navbar = () => (
  <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-16">
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white">
              <FileText size={20} strokeWidth={3} />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              DocuFlow
            </span>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <a
            href="/"
            className="text-sm font-medium text-gray-500 hover:text-brand-600 transition-colors"
          >
            Tools
          </a>
          <a
            href="/#usage-guide"
            className="text-sm font-medium text-gray-500 hover:text-brand-600 transition-colors"
          >
            Guide
          </a>
        </div>
      </div>
    </div>
  </nav>
);

export const Footer = () => (
  <footer className="bg-white border-t border-gray-200 mt-auto py-12">
    <div className="max-w-7xl mx-auto px-4 text-center">
      <p className="text-gray-500 text-sm">
        © 2025 DocuFlow. All rights reserved.
      </p>
    </div>
  </footer>
);

interface ToolLayoutProps {
  title: string;
  children: React.ReactNode;
  isProcessing?: boolean;
  progressSteps?: ProgressStep[];
  progressValue?: number; // 0-100
  progressEtaSeconds?: number | null;
  progressLabel?: string;
  progressSubLabel?: string;
}

export const ToolLayout = ({
  title,
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex-1 max-w-5xl w-full mx-auto px-4 py-12">
        <div className="flex items-center mb-8">
          <Link
            to="/"
            className="p-2 rounded-full hover:bg-gray-200 transition-colors mr-4"
          >
            <ChevronLeft size={24} className="text-gray-600" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 min-h-[500px] relative overflow-hidden">
          {isProcessing && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-3xl animate-in fade-in duration-300">
              {progressSteps ? (
                <ProgressSteps
                  steps={progressSteps}
                  title={progressLabel}
                  insight={insight}
                />
              ) : progressValue !== undefined ? (
                <SimpleProgressBar 
                  progress={progressValue} 
                  label={progressLabel} 
                  subLabel={progressSubLabel} 
                  insight={insight}
                />
              ) : (
                <SimpleProgressBar
                  progress={insight?.progressPercent || 12}
                  label={progressLabel || "Processing..."}
                  subLabel={progressSubLabel}
                  insight={insight}
                />
              )}
            </div>
          )}
          {children}
        </div>
      </div>
      <Footer />
    </div>
  );
};
