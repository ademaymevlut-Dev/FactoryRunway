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
    <section aria-label="Vardiya ilerlemesi" className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
            {isFinal
              ? `${simulatedGameDay}. gün vardiyası tamamlandı`
              : `${simulatedGameDay}. gün vardiyası`}
          </p>
          <strong className="font-mono text-xl tabular-nums text-white">
            {currentTime}
          </strong>
        </div>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          %{Math.round(progress * 100)}
        </span>
      </div>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <span className="font-mono text-xs text-muted-foreground">08:00</span>
        <Progress
          aria-label={`Vardiya yüzde ${Math.round(progress * 100)} tamamlandı`}
          className="h-2 bg-white/10 [&_[data-slot=progress-indicator]]:bg-emerald-400 [&_[data-slot=progress-indicator]]:transition-none"
          value={progress * 100}
        />
        <span className="font-mono text-xs text-muted-foreground">17:00</span>
      </div>
    </section>
  );
}
