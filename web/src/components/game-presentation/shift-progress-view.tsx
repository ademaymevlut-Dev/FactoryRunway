"use client";

import { Progress } from "@/components/ui/progress";

export type ShiftProgressViewProps = {
  ariaLabel: string;
  completed?: boolean;
  currentTimeLabel: string;
  endLabel: string;
  label: string;
  progress: number;
  progressLabel: string;
  startLabel: string;
};

export function ShiftProgressView({
  ariaLabel,
  completed = false,
  currentTimeLabel,
  endLabel,
  label,
  progress,
  progressLabel,
  startLabel,
}: ShiftProgressViewProps) {
  return (
    <section
      aria-label={ariaLabel}
      className="space-y-1.5 min-[1440px]:space-y-2"
      data-completed={completed}
      data-progress={progress}
      data-shift-progress-view
    >
      <div className="flex items-end justify-between gap-2 min-[1440px]:gap-3">
        <div>
          <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-primary min-[1440px]:text-[10px] min-[1440px]:tracking-[0.22em]">
            {label}
          </p>
          <strong
            className="font-mono text-base tabular-nums text-white min-[1440px]:text-xl"
            data-shift-current-time
          >
            {currentTimeLabel}
          </strong>
        </div>
        <span
          className="font-mono text-[10px] tabular-nums text-white min-[1440px]:text-xs"
          data-shift-progress-label
        >
          {progressLabel}
        </span>
      </div>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 min-[1440px]:gap-3">
        <span className="font-mono text-[10px] text-white min-[1440px]:text-xs">
          {startLabel}
        </span>
        <Progress
          aria-label={ariaLabel}
          className="h-1.5 bg-white/10 [&_[data-slot=progress-indicator]]:bg-emerald-400 [&_[data-slot=progress-indicator]]:transition-none min-[1440px]:h-2"
          value={progress * 100}
        />
        <span className="font-mono text-[10px] text-white min-[1440px]:text-xs">
          {endLabel}
        </span>
      </div>
    </section>
  );
}
