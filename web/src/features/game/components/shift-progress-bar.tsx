"use client";

import { ShiftProgressView } from "@/components/game-presentation/shift-progress-view";

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
  const progressPercent = Math.round(progress * 100);

  return (
    <ShiftProgressView
      ariaLabel={`Vardiya yüzde ${progressPercent} tamamlandı`}
      completed={isFinal}
      currentTimeLabel={currentTime}
      endLabel="17:00"
      label={
        isFinal
          ? `${simulatedGameDay}. gün vardiyası tamamlandı`
          : `${simulatedGameDay}. gün vardiyası`
      }
      progress={progress}
      progressLabel={`%${progressPercent}`}
      startLabel="08:00"
    />
  );
}
