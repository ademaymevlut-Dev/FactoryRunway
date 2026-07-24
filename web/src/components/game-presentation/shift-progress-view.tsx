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
      className="space-y-1.5 xl:space-y-2"
      data-completed={completed}
      data-progress={progress}
      data-shift-progress-view
    >
      <div className="flex items-end justify-between gap-2 xl:gap-3">
        <div>
          <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-primary xl:text-[10px] xl:tracking-[0.22em]">
            {label}
          </p>
          <strong
            className="font-mono text-base tabular-nums text-white xl:text-xl"
            data-shift-current-time
          >
            {currentTimeLabel}
          </strong>
        </div>
        <span
          className="font-mono text-[10px] tabular-nums text-muted-foreground xl:text-xs"
          data-shift-progress-label
        >
          {progressLabel}
        </span>
      </div>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 xl:gap-3">
        <span className="font-mono text-[10px] text-muted-foreground xl:text-xs">
          {startLabel}
        </span>
        <Progress
          aria-label={ariaLabel}
          className="h-1.5 bg-white/10 [&_[data-slot=progress-indicator]]:bg-emerald-400 [&_[data-slot=progress-indicator]]:transition-none xl:h-2"
          value={progress * 100}
        />
        <span className="font-mono text-[10px] text-muted-foreground xl:text-xs">
          {endLabel}
        </span>
      </div>
    </section>
  );
}
