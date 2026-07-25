"use client";

import { ShiftProgressView } from "@/components/game-presentation/shift-progress-view";
import type { SupportedLocale } from "@/lib/i18n/locales";

import { shiftPlaybackCopy } from "../shift-playback-copy";

export function ShiftProgressBar({
  currentTime,
  isFinal = false,
  locale,
  progress,
  simulatedGameDay,
}: {
  currentTime: string;
  isFinal?: boolean;
  locale: SupportedLocale;
  progress: number;
  simulatedGameDay: number;
}) {
  const copy = shiftPlaybackCopy[locale].hud;
  const progressPercent = Math.round(progress * 100);

  return (
    <ShiftProgressView
      ariaLabel={copy.progressAria(progressPercent)}
      completed={isFinal}
      currentTimeLabel={currentTime}
      endLabel="17:00"
      label={copy.progressDayLabel(simulatedGameDay, isFinal)}
      progress={progress}
      progressLabel={`%${progressPercent}`}
      startLabel="08:00"
    />
  );
}
