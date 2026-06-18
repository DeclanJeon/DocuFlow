export interface ProgressEvent {
  current?: number;
  total?: number;
  value?: number;
  message?: string;
}

export type ProgressCallback = (event: ProgressEvent) => void;

export type LegacyProgressCallback = (
  current: number,
  total: number,
  message?: string
) => void;

export const toProgressValue = (event: ProgressEvent): number | undefined => {
  if (typeof event.value === "number") {
    return Math.max(0, Math.min(100, event.value));
  }

  if (
    typeof event.current !== "number" ||
    typeof event.total !== "number" ||
    event.total <= 0
  ) {
    return undefined;
  }

  return Math.max(0, Math.min(100, Math.round((event.current / event.total) * 100)));
};

export const legacyProgressAdapter = (
  cb?: ProgressCallback
): LegacyProgressCallback | undefined => {
  if (!cb) {
    return undefined;
  }

  return (current, total, message) => {
    const event: ProgressEvent = { current, total, message };
    event.value = toProgressValue(event);
    cb(event);
  };
};
