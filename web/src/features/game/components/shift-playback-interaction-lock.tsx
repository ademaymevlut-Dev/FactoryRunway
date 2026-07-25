"use client";

import { useGameUiStore } from "../store/game-ui-store";
import type { GameSnapshot } from "../types";
import { shiftPlaybackCopy } from "../shift-playback-copy";

export function ShiftPlaybackInteractionLock({
  locale,
}: {
  locale: GameSnapshot["locale"];
}) {
  const { activeShiftPlayback } = useGameUiStore();
  const copy = shiftPlaybackCopy[locale].hud;

  if (!activeShiftPlayback) return null;

  return (
    <div
      aria-label={copy.lockAria}
      className="absolute inset-x-0 bottom-0 top-24 z-50 cursor-wait"
      data-shift-playback-lock
      role="status"
    />
  );
}
