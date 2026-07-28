"use client";

import { PanelRightOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { shiftPlaybackCopy } from "../shift-playback-copy";
import {
  removeStoredString,
  setStoredString,
  useGameUiStore,
  useStoredString,
} from "../store/game-ui-store";
import type { GameSnapshot } from "../types";
import { DailyEventPanel } from "./daily-event-panel";
import { ShiftPlaybackHud } from "./shift-playback-hud";

const CLOSED_DAILY_EVENT_PANEL_KEY =
  "factory-runway:closed-daily-events";

export function ShiftPlaybackOverlayLayout({
  currencyCode,
  locale,
}: {
  currencyCode: GameSnapshot["factory"]["currencyCode"];
  locale: GameSnapshot["locale"];
}) {
  const { activeShiftPlayback } = useGameUiStore();
  const closedDailyEventShiftId = useStoredString(
    CLOSED_DAILY_EVENT_PANEL_KEY,
  );

  if (!activeShiftPlayback) return null;

  const copy = shiftPlaybackCopy[locale].dailyEvents;
  const dailyEventsOpen =
    closedDailyEventShiftId !== activeShiftPlayback.shiftId;

  return (
    <section
      className={cn(
        "pointer-events-none absolute inset-x-3 bottom-3 top-3 z-[55] grid min-h-0 gap-2 pt-14",
        "min-[1180px]:inset-x-4 min-[1180px]:bottom-6 min-[1180px]:top-6 min-[1180px]:grid-rows-1 min-[1180px]:gap-4 min-[1180px]:pt-0",
        "min-[1440px]:inset-x-6 min-[1440px]:gap-6",
        dailyEventsOpen
          ? "grid-rows-[minmax(0,42dvh)_minmax(0,1fr)] min-[1180px]:grid-cols-[minmax(0,1fr)_360px] min-[1440px]:grid-cols-[minmax(0,1fr)_400px]"
          : "grid-rows-1 min-[1180px]:grid-cols-1",
      )}
      data-daily-events-open={dailyEventsOpen}
      data-shift-playback-overlay-layout
    >
      <div
        className="min-h-0 min-w-0 min-[1180px]:pt-[72px]"
        data-shift-overlay-progress-slot
      >
        <ShiftPlaybackHud locale={locale} />
      </div>

      {dailyEventsOpen ? (
        <div
          className="flex min-h-0 min-w-0 justify-center"
          data-shift-overlay-events-slot
        >
          <DailyEventPanel
            currencyCode={currencyCode}
            locale={locale}
            onCloseComplete={(shiftId) => {
              setStoredString(CLOSED_DAILY_EVENT_PANEL_KEY, shiftId);
            }}
          />
        </div>
      ) : (
        <div className="pointer-events-none absolute right-0 top-14 min-[1180px]:top-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={copy.openAria}
                className="pointer-events-auto h-10 border border-white/15 bg-background/88 px-3 text-primary shadow-xl backdrop-blur-xl hover:bg-card hover:text-primary"
                onClick={() => {
                  removeStoredString(CLOSED_DAILY_EVENT_PANEL_KEY);
                }}
                size="lg"
                type="button"
                variant="outline"
              >
                <PanelRightOpen className="size-4" />
                <span className="hidden sm:inline">{copy.title}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">{copy.openTooltip}</TooltipContent>
          </Tooltip>
        </div>
      )}
    </section>
  );
}
