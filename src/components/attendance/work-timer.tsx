"use client";

import { formatDuration, formatDurationHms } from "@/lib/attendance/time";
import { IDEAL_BREAK_HOURS, IDEAL_WORKING_HOURS } from "@/lib/attendance/constants";
import { cn } from "@/lib/utils";

export function WorkTimer({
  workedMs,
  label = "Worked Today",
  showProgress = false,
  idealHours = IDEAL_WORKING_HOURS,
  className,
}: {
  workedMs: number;
  label?: string;
  showProgress?: boolean;
  idealHours?: number;
  className?: string;
}) {
  const idealMs = idealHours * 60 * 60 * 1000;
  const progress = Math.min(100, (workedMs / idealMs) * 100);
  const remainingMs = Math.max(0, idealMs - workedMs);

  if (!showProgress) {
    return (
      <div
        className={cn(
          "rounded-lg border border-ex-border bg-ex-surface px-4 py-3",
          className,
        )}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-ex-muted">
          {label}
        </p>
        <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-ex-primary">
          {formatDurationHms(workedMs)}
        </p>
      </div>
    );
  }

  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative size-40">
        <svg className="size-full -rotate-90" viewBox="0 0 120 120" aria-hidden>
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-ex-border"
          />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="text-ex-secondary transition-[stroke-dashoffset] duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ex-muted">
            {label}
          </p>
          <p className="mt-0.5 font-mono text-xl font-bold tabular-nums text-ex-primary">
            {formatDurationHms(workedMs)}
          </p>
          <p className="mt-1 text-[11px] text-ex-muted">
            {progress >= 100
              ? `${idealHours}h work done`
              : `${formatDuration(remainingMs)} work left`}
          </p>
          <p className="text-[10px] text-ex-muted/80">
            +{IDEAL_BREAK_HOURS}h break · {idealHours + IDEAL_BREAK_HOURS}h day
          </p>
        </div>
      </div>
    </div>
  );
}
