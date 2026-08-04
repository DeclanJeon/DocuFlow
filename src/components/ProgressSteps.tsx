import React from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

export interface ProgressStep {
  id: string;
  label: string;
  status: "pending" | "processing" | "completed" | "error";
  detail?: string;
}

interface ProgressStepsProps {
  steps: ProgressStep[];
  currentStepId?: string;
  title?: string;
  insight?: ProgressInsight;
}

export interface ProgressInsight {
  progressPercent: number;
  completedUnits: number;
  totalUnits: number;
  unitLabel: string;
  elapsedSeconds: number;
  etaSeconds: number | null;
  statusMessage?: string;
}

const formatDuration = (seconds: number) => {
  const safe = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const secs = (safe % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

const ProgressInsightPanel: React.FC<{ insight: ProgressInsight }> = ({
  insight,
}) => {
  const percent = Math.round(insight.progressPercent);

  return (
    <div className="mt-6 border-t border-gray-100/80 pt-5">
      {/* Animated progress bar with gradient */}
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden shadow-inner">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${Math.max(5, Math.min(100, insight.progressPercent))}%`,
            background: 'linear-gradient(90deg, #6366f1, #818cf8, #a5b4fc)',
          }}
        />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 text-xs">
        <div className="rounded-xl border border-indigo-100/60 bg-indigo-50/50 px-3 py-2.5">
          <p className="text-indigo-500/70 font-medium">진행률</p>
          <p className="font-bold text-indigo-700 text-sm">{percent}%</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5">
          <p className="text-gray-500 font-medium">완료 / 전체</p>
          <p className="font-semibold text-gray-800 text-sm">
            {insight.completedUnits} / {insight.totalUnits} {insight.unitLabel}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5">
          <p className="text-gray-500 font-medium">예상 시간</p>
          <p className="font-semibold text-gray-800 text-sm">
            {insight.etaSeconds === null ? "계산 중..." : formatDuration(insight.etaSeconds)}
          </p>
        </div>
      </div>

      {/* Status message */}
      <div className="flex justify-between text-[11px] text-gray-400 mt-2">
        <span>경과 {formatDuration(insight.elapsedSeconds)}</span>
        {insight.statusMessage ? (
          <span className="text-gray-500 truncate ml-2">{insight.statusMessage}</span>
        ) : (
          <span>&nbsp;</span>
        )}
      </div>
    </div>
  );
};

export const ProgressSteps: React.FC<ProgressStepsProps> = ({
  steps,
  title = "Processing...",
  insight,
}) => {
  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100 animate-scale-in">
      {/* Spinning icon */}
      <div className="flex justify-center mb-5">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center ring-1 ring-indigo-100">
          <Loader2 size={28} className="text-indigo-600 animate-spin" />
        </div>
      </div>

      <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
        {title}
      </h3>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-start gap-4 p-3 rounded-xl transition-all duration-300 ${
              step.status === "processing"
                ? "bg-indigo-50/80 ring-1 ring-indigo-100"
                : step.status === "completed"
                  ? "bg-gray-50/50"
                  : ""
            }`}
          >
            <div className="mt-0.5">
              {step.status === "completed" && (
                <CheckCircle2 className="text-emerald-500" size={20} />
              )}
              {step.status === "processing" && (
                <Loader2 className="text-indigo-600 animate-spin" size={20} />
              )}
              {step.status === "pending" && (
                <div className="w-5 h-5 rounded-full border-2 border-gray-200 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-gray-300">{index + 1}</span>
                </div>
              )}
              {step.status === "error" && (
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-red-500">!</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-semibold ${
                  step.status === "processing"
                    ? "text-indigo-700"
                    : step.status === "completed"
                    ? "text-gray-900"
                    : "text-gray-400"
                }`}
              >
                {step.label}
              </p>
              {step.detail && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{step.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      {insight && <ProgressInsightPanel insight={insight} />}
    </div>
  );
};

export const SimpleProgressBar: React.FC<{
  progress: number; // 0 to 100
  label?: string;
  subLabel?: string;
  insight?: ProgressInsight;
}> = ({ progress, label, subLabel, insight }) => {
  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100 animate-scale-in">
      <div className="flex flex-col items-center mb-6">
        {/* Animated ring */}
        <div className="relative mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center ring-1 ring-indigo-200/50">
            <Loader2 size={32} className="text-indigo-600 animate-spin" />
          </div>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full animate-ping opacity-50" />
        </div>

        <h3 className="text-xl font-bold text-gray-900">{label || "Processing..."}</h3>
        {subLabel && <p className="text-gray-500 text-sm mt-2 text-center max-w-xs">{subLabel}</p>}
      </div>
      
      {/* Progress bar with gradient */}
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
        <div 
          className="h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
          style={{
            width: `${Math.max(5, Math.min(100, progress))}%`,
            background: 'linear-gradient(90deg, #6366f1, #818cf8, #a5b4fc)',
          }}
        >
          {/* Shimmer on bar */}
          <div className="absolute inset-0 animate-shimmer"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
            }}
          />
        </div>
      </div>

      <p className="text-right text-xs font-mono text-gray-400 mt-2 tabular-nums">{Math.round(progress)}%</p>
      {insight && <ProgressInsightPanel insight={insight} />}
    </div>
  );
};
