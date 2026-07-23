"use client";

import { Progress } from "@/components/ui/progress";

export function ShiftProgressBar({
  currentTime,
  isFinal = false,
  progress,
  simulatedGameDay,
}: {
  currentTime: string;
  isFinal?: boolean;
  progress: number;
  simulatedGameDay: number;
}) {
  return (
    <section aria-label="Vardiya ilerlemesi" className="space-y-1.5 xl:space-y-2">
      <div className="flex items-end justify-between gap-2 xl:gap-3">
        <div>
          <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-primary xl:text-[10px] xl:tracking-[0.22em]">
            {isFinal
              ? `${simulatedGameDay}. gün vardiyası tamamlandı`
              : `${simulatedGameDay}. gün vardiyası`}
          </p>
          <strong className="font-mono text-base tabular-nums text-white xl:text-xl">
            {currentTime}
          </strong>
        </div>
        <span className="font-mono text-[10px] tabular-nums text-muted-foreground xl:text-xs">
          %{Math.round(progress * 100)}
        </span>
      </div>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 xl:gap-3">
        <span className="font-mono text-[10px] text-muted-foreground xl:text-xs">08:00</span>
        <Progress
          aria-label={`Vardiya yüzde ${Math.round(progress * 100)} tamamlandı`}
          className="h-1.5 bg-white/10 [&_[data-slot=progress-indicator]]:bg-emerald-400 [&_[data-slot=progress-indicator]]:transition-none xl:h-2"
          value={progress * 100}
        />
        <span className="font-mono text-[10px] text-muted-foreground xl:text-xs">17:00</span>
      </div>
    </section>
  );
}
