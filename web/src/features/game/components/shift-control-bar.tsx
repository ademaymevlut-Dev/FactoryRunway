"use client";

import { useActionState, useEffect } from "react";
import { Clock3, Play, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
    <section className="pointer-events-none absolute bottom-4 right-4 z-30 hidden sm:block">
      <div className="pointer-events-auto flex items-center gap-3 rounded-lg border border-white/10 bg-background/90 p-2 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-2 px-2">
          <span className="grid size-8 place-items-center rounded-lg border border-amber-400/20 bg-amber-400/10 text-amber-200">
            <Clock3 size={16} />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Vardiya
            </p>
            <strong className="text-sm text-white">{snapshot.factory.currentDay}. gün</strong>
          </div>
        </div>
        <Badge className="hidden border-emerald-400/20 bg-emerald-400/10 text-emerald-100 md:inline-flex">
          <Zap size={12} />
          {snapshot.map.totals.productionLineCount} hat hazır
        </Badge>
        <form action={formAction}>
          <ShiftStartButton
            disabled={playbackIsActive}
            pending={pending}
          />
        </form>
      </div>
    </section>
  );
}

function ShiftStartButton({
  disabled,
  pending,
}: {
  disabled: boolean;
  pending: boolean;
}) {
  return (
    <Button disabled={pending || disabled} size="sm" type="submit">
      <Play size={15} />
      {pending
        ? "Çalışıyor..."
        : disabled
          ? "Vardiya oynatılıyor"
          : "Başlat"}
    </Button>
  );
}
