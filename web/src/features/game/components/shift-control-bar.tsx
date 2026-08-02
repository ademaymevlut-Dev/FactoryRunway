"use client";

import { useActionState, useEffect, type CSSProperties } from "react";
import { CheckCircle2, Clock3, LoaderCircle, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { advanceFactoryDayAction } from "@/features/game/actions/advance-factory-day-action";

import { useGameUiStore } from "../store/game-ui-store";
import { gameCopy } from "../game-copy";
import {
  formatShiftPlaybackTime,
  getShiftPlaybackMinute,
} from "../shift-playback";
import {
  resolveShiftControlState,
  type ShiftControlState,
} from "../shift-control-state";
import type { AdvanceFactoryDayActionResult, GameSnapshot } from "../types";
import styles from "./shift-control-bar.module.css";

const COMPACT_DOCK_BUTTON_WIDTH_PX = 40;
const COMPACT_DOCK_GAP_PX = 4;
const COMPACT_DOCK_HORIZONTAL_PADDING_PX = 8;
const DESKTOP_DOCK_BUTTON_WIDTH_PX = 74;
const DESKTOP_DOCK_GAP_PX = 8;
const DESKTOP_DOCK_HORIZONTAL_PADDING_PX = 20;
const DESKTOP_GUIDE_WIDTH_PX = 112;
const DESKTOP_GUIDE_GAP_PX = 12;
const COMPACT_SHIFT_GAP_PX = 8;
const DESKTOP_SHIFT_GAP_PX = 12;

export function ShiftControlBar({ snapshot }: { snapshot: GameSnapshot }) {
  const [actionResult, formAction, pending] = useActionState<
    AdvanceFactoryDayActionResult | null,
    FormData
  >(advanceFactoryDayAction, null);
  const {
    activeShiftPlayback,
    isShiftPlaybackActive: playbackIsActive,
    setActiveShiftPlayback,
    shiftPlaybackNowMs,
  } = useGameUiStore();

  useEffect(() => {
    if (actionResult?.ok === true) {
      setActiveShiftPlayback(actionResult.playback);
    }
  }, [actionResult, setActiveShiftPlayback]);

  return (
    <section
      className={`game-bottom-control ${styles.layer}`}
      data-mobile-primary-action="shift"
      style={getShiftControlPositionStyle(snapshot.dock.items.length)}
    >
      <div className="pointer-events-auto">
        <form action={formAction}>
          <ShiftStartButton
            currentDay={snapshot.factory.currentDay}
            hasPlayback={activeShiftPlayback !== null}
            locale={snapshot.locale}
            pending={pending}
            playbackIsActive={playbackIsActive}
            playbackTime={
              activeShiftPlayback
                ? formatShiftPlaybackTime(
                    getShiftPlaybackMinute(
                      activeShiftPlayback,
                      shiftPlaybackNowMs,
                    ),
                  )
                : null
            }
          />
        </form>
      </div>
    </section>
  );
}

function ShiftStartButton({
  currentDay,
  hasPlayback,
  locale,
  pending,
  playbackIsActive,
  playbackTime,
}: {
  currentDay: number;
  hasPlayback: boolean;
  locale: GameSnapshot["locale"];
  pending: boolean;
  playbackIsActive: boolean;
  playbackTime: string | null;
}) {
  const copy = gameCopy[locale].shiftControl;
  const state = resolveShiftControlState({
    hasPlayback,
    isPlaybackActive: playbackIsActive,
    pending,
  });
  const actionLabel = getShiftControlLabel({
    completed: copy.completed,
    pending: copy.pending,
    playing: copy.playing,
    playbackTime,
    start: copy.start,
    state,
  });
  const disabled = state !== "idle";

  return (
    <Button
      aria-label={actionLabel}
      aria-busy={pending}
      className={`group/shift relative isolate overflow-hidden border border-primary/35 bg-[#232429]/90 text-primary shadow-[inset_0_0_24px_hsl(var(--primary)/0.14),0_14px_32px_rgba(0,0,0,0.42)] backdrop-blur-xl transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/65 hover:bg-[#232429]/95 hover:text-primary hover:shadow-[0_0_24px_hsl(var(--primary)/0.28),0_18px_42px_rgba(0,0,0,0.48)] focus-visible:ring-primary/50 disabled:pointer-events-auto ${styles.button}`}
      data-map-control="true"
      data-shift-control-state={state}
      disabled={disabled}
      onPointerDown={(event) => event.stopPropagation()}
      type="submit"
      variant="ghost"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent xl:inset-x-5"
      />
      <span
        aria-hidden="true"
        className={`grid shrink-0 place-items-center rounded-full bg-primary/12 text-primary shadow-[0_0_14px_hsl(var(--primary)/0.28)] transition-transform duration-200 group-hover/shift:scale-110 ${styles.iconSurface}`}
      >
        <ShiftControlIcon className={styles.icon} state={state} />
      </span>
      <span
        className={`font-mono font-semibold leading-none tabular-nums text-muted-foreground ${styles.day}`}
      >
        {copy.day(currentDay)}
      </span>
      <strong
        className={`max-w-full truncate whitespace-nowrap font-semibold leading-none text-primary ${styles.label}`}
      >
        {actionLabel}
      </strong>
    </Button>
  );
}

function ShiftControlIcon({
  className,
  state,
}: {
  className: string;
  state: ShiftControlState;
}) {
  if (state === "pending") {
    return <LoaderCircle className={`${className} motion-safe:animate-spin`} />;
  }

  if (state === "running") {
    return <Clock3 className={className} />;
  }

  if (state === "completed") {
    return <CheckCircle2 className={className} />;
  }

  return <Play className={`${className} fill-current`} />;
}

function getShiftControlLabel({
  completed,
  pending,
  playing,
  playbackTime,
  start,
  state,
}: {
  completed: string;
  pending: string;
  playing: string;
  playbackTime: string | null;
  start: string;
  state: ShiftControlState;
}) {
  if (state === "pending") return pending;
  if (state === "completed") return completed;
  if (state === "running") {
    return playbackTime ? `${playing} · ${playbackTime}` : playing;
  }

  return start;
}

function getShiftControlPositionStyle(dockItemCount: number): CSSProperties {
  const compactDockWidth =
    COMPACT_DOCK_HORIZONTAL_PADDING_PX +
    dockItemCount * COMPACT_DOCK_BUTTON_WIDTH_PX +
    Math.max(0, dockItemCount - 1) * COMPACT_DOCK_GAP_PX;
  const desktopDockWidth =
    DESKTOP_DOCK_HORIZONTAL_PADDING_PX +
    dockItemCount * DESKTOP_DOCK_BUTTON_WIDTH_PX +
    Math.max(0, dockItemCount - 1) * DESKTOP_DOCK_GAP_PX;
  const desktopBottomClusterWidth =
    DESKTOP_GUIDE_WIDTH_PX + DESKTOP_GUIDE_GAP_PX + desktopDockWidth;

  return {
    "--shift-control-left-compact": `${compactDockWidth / 2 + COMPACT_SHIFT_GAP_PX}px`,
    "--shift-control-left-desktop": `${desktopBottomClusterWidth / 2 + DESKTOP_SHIFT_GAP_PX}px`,
  } as CSSProperties;
}
