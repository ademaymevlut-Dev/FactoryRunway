"use client";

import { useGameUiStore } from "../store/game-ui-store";

export function ShiftPlaybackInteractionLock() {
  const { activeShiftPlayback } = useGameUiStore();

  if (!activeShiftPlayback) return null;

  return (
    <div
      aria-label="Vardiya sonucu kapatılana kadar planlama işlemleri kilitli"
      className="absolute inset-x-0 bottom-0 top-24 z-50 cursor-wait"
      data-shift-playback-lock
      role="status"
    />
  );
}
