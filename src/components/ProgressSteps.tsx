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
    <div className="mt-6 border-t border-gray-100 pt-5">
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-brand-600 h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.max(5, Math.min(100, insight.progressPercent))}%` }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 text-xs">
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
          <p className="text-gray-500">Progress</p>
          <p className="font-semibold text-gray-800">{percent}%</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
          <p className="text-gray-500">Done / Total</p>
          <p className="font-semibold text-gray-800">
            {insight.completedUnits} / {insight.totalUnits} {insight.unitLabel}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
          <p className="text-gray-500">ETA</p>
          <p className="font-semibold text-gray-800">
            {insight.etaSeconds === null ? "Calculating..." : formatDuration(insight.etaSeconds)}
          </p>
        </div>
      </div>

      <div className="flex justify-between text-[11px] text-gray-500 mt-2">
        <span>Elapsed {formatDuration(insight.elapsedSeconds)}</span>
        {insight.statusMessage ? <span>{insight.statusMessage}</span> : <span>&nbsp;</span>}
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
    <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100 animate-in fade-in zoom-in duration-300">
      <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
        {title}
      </h3>
      <div className="space-y-4">
        {steps.map((step) => (
          <div key={step.id} className="flex items-start gap-4">
            <div className="mt-1">
              {step.status === "completed" && (
                <CheckCircle2 className="text-emerald-500" size={20} />
              )}
              {step.status === "processing" && (
                <Loader2 className="text-brand-600 animate-spin" size={20} />
              )}
              {step.status === "pending" && (
                <Circle className="text-gray-300" size={20} />
              )}
              {step.status === "error" && (
                <Circle className="text-red-500" size={20} />
              )}
            </div>
            <div className="flex-1">
              <p
                className={`font-medium ${
                  step.status === "processing"
                    ? "text-brand-600"
                    : step.status === "completed"
                    ? "text-gray-900"
                    : "text-gray-400"
                }`}
              >
                {step.label}
              </p>
              {step.detail && (
                <p className="text-xs text-gray-500 mt-1">{step.detail}</p>
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
    <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100 animate-in fade-in zoom-in duration-300">
      <div className="flex flex-col items-center mb-6">
        <Loader2 size={40} className="text-brand-600 animate-spin mb-4" />
        <h3 className="text-xl font-bold text-gray-900">{label || "Processing..."}</h3>
        {subLabel && <p className="text-gray-500 text-sm mt-2">{subLabel}</p>}
      </div>
      
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
        <div 
          className="bg-brand-600 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.max(5, Math.min(100, progress))}%` }}
        />
      </div>
      <p className="text-right text-xs font-mono text-gray-400 mt-2">{Math.round(progress)}%</p>
      {insight && <ProgressInsightPanel insight={insight} />}
    </div>
  );
};
