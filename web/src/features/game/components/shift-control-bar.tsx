"use client";

import { useActionState, useEffect } from "react";
import { Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { advanceFactoryDayAction } from "@/features/game/actions/advance-factory-day-action";

import { useGameUiStore } from "../store/game-ui-store";
import type { AdvanceFactoryDayActionResult, GameSnapshot } from "../types";

export function ShiftControlBar({ snapshot }: { snapshot: GameSnapshot }) {
  const [actionResult, formAction, pending] = useActionState<
    AdvanceFactoryDayActionResult | null,
    FormData
  >(advanceFactoryDayAction, null);
  const {
    isShiftPlaybackActive: playbackIsActive,
    setActiveShiftPlayback,
  } = useGameUiStore();

  useEffect(() => {
    if (actionResult?.ok === true) {
      setActiveShiftPlayback(actionResult.playback);
    }
  }, [actionResult, setActiveShiftPlayback]);

  return (
    <section className="pointer-events-none absolute bottom-2 right-2 z-30 hidden sm:block xl:bottom-4 xl:right-4">
      <div className="pointer-events-auto">
        <form action={formAction}>
          <ShiftStartButton
            currentDay={snapshot.factory.currentDay}
            disabled={playbackIsActive}
            pending={pending}
          />
        </form>
      </div>
    </section>
  );
}

function ShiftStartButton({
  currentDay,
  disabled,
  pending,
}: {
  currentDay: number;
  disabled: boolean;
  pending: boolean;
}) {
  const actionLabel = pending
    ? "Çalışıyor"
    : disabled
      ? "Oynatılıyor"
      : "Vardiyayı başlat";

  return (
    <Button
      aria-label={actionLabel}
      className="group/shift relative isolate h-[58px] w-[76px] flex-col gap-0.5 overflow-hidden rounded-[20px] border border-primary/35 bg-[#232429]/85 px-1 py-1 text-primary shadow-[inset_0_0_24px_hsl(var(--primary)/0.14),0_14px_32px_rgba(0,0,0,0.42)] backdrop-blur-xl transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/65 hover:bg-[#232429]/90 hover:text-primary hover:shadow-[0_0_24px_hsl(var(--primary)/0.28),0_18px_42px_rgba(0,0,0,0.48)] focus-visible:ring-primary/50 xl:h-[88px] xl:w-[112px] xl:gap-1 xl:rounded-[24px]"
      disabled={pending || disabled}
      type="submit"
      variant="ghost"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent xl:inset-x-5"
      />
      <span className="grid size-6 place-items-center rounded-full bg-primary/12 text-primary shadow-[0_0_14px_hsl(var(--primary)/0.28)] transition-transform duration-200 group-hover/shift:scale-110 xl:size-9">
        <Play className="size-3.5 fill-current xl:size-5" />
      </span>
      <span className="mt-0.5 font-mono text-[8px] font-semibold leading-none tabular-nums text-muted-foreground xl:text-[10px]">
        {currentDay}. gün
      </span>
      <strong className="max-w-full truncate text-[8px] font-semibold leading-none text-primary xl:text-[11px]">
        {actionLabel}
      </strong>
    </Button>
  );
}
