"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { numberLocale as resolveNumberLocale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import { skipShiftPlaybackAction } from "../actions/skip-shift-playback-action";
import {
  formatShiftPlaybackTime,
  getShiftPlaybackMinute,
  getShiftPlaybackProgress,
  getShiftQuantityAtMinute,
  SKIPPED_SHIFT_PLAYBACK_DURATION_SECONDS,
} from "../shift-playback";
import { dismissShiftPlayback, useGameUiStore } from "../store/game-ui-store";
import type { GameSnapshot, ShiftPlayback } from "../types";
import { shiftPlaybackCopy } from "../shift-playback-copy";
import { ShiftDepartmentCard } from "./shift-department-card";
import { ShiftProgressBar } from "./shift-progress-bar";

type ShiftPlaybackHudPresentation = "default" | "mobileCompact";

export function ShiftPlaybackHud({
  locale,
  onCompletedClose,
  presentation = "default",
}: {
  locale: GameSnapshot["locale"];
  onCompletedClose?: () => void;
  presentation?: ShiftPlaybackHudPresentation;
}) {
  const router = useRouter();
  const copy = shiftPlaybackCopy[locale].hud;
  const numberLocale = resolveNumberLocale(locale);
  const isMobileCompact = presentation === "mobileCompact";
  const {
    activeShiftPlayback,
    finishActiveShiftPlayback,
    isShiftPlaybackActive,
    setActiveShiftPlayback,
    shiftPlaybackNowMs,
  } = useGameUiStore();
  const [closingShiftId, setClosingShiftId] = useState<string | null>(null);
  const [skipError, setSkipError] = useState<string | null>(null);
  const [isSkipping, startSkipTransition] = useTransition();
  const closeFinalizedRef = useRef<string | null>(null);

  const finalizeClose = useCallback(() => {
    if (!activeShiftPlayback) return;
    if (closeFinalizedRef.current === activeShiftPlayback.shiftId) return;

    closeFinalizedRef.current = activeShiftPlayback.shiftId;
    if (onCompletedClose) {
      onCompletedClose();
      return;
    }

    dismissShiftPlayback(activeShiftPlayback);
    setActiveShiftPlayback(null);
    router.refresh();
  }, [
    activeShiftPlayback,
    onCompletedClose,
    router,
    setActiveShiftPlayback,
  ]);

  const requestClose = useCallback(() => {
    if (!activeShiftPlayback || isShiftPlaybackActive) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finalizeClose();
      return;
    }
    setClosingShiftId(activeShiftPlayback.shiftId);
  }, [activeShiftPlayback, finalizeClose, isShiftPlaybackActive]);

  const requestSkip = useCallback(() => {
    if (!activeShiftPlayback || !isShiftPlaybackActive || isSkipping) return;

    const shiftId = activeShiftPlayback.shiftId;
    setSkipError(null);

    startSkipTransition(async () => {
      try {
        const result = await skipShiftPlaybackAction(shiftId);

        if (!result.ok) {
          setSkipError(result.message);
          return;
        }

        finishActiveShiftPlayback(shiftId);
      } catch {
        setSkipError(copy.skipAnimationError);
      }
    });
  }, [
    activeShiftPlayback,
    copy.skipAnimationError,
    finishActiveShiftPlayback,
    isShiftPlaybackActive,
    isSkipping,
  ]);

  useEffect(() => {
    if (!activeShiftPlayback) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || isShiftPlaybackActive) return;
      event.preventDefault();
      requestClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeShiftPlayback, isShiftPlaybackActive, requestClose]);

  if (!activeShiftPlayback) return null;

  const progress = getShiftPlaybackProgress(
    activeShiftPlayback,
    shiftPlaybackNowMs,
  );
  const shiftMinute = getShiftPlaybackMinute(
    activeShiftPlayback,
    shiftPlaybackNowMs,
  );
  const isFinal = progress >= 1;
  const isClosing = closingShiftId === activeShiftPlayback.shiftId;
  const isSkipped =
    activeShiftPlayback.playbackDurationSeconds ===
    SKIPPED_SHIFT_PLAYBACK_DURATION_SECONDS;
  const skipControlId = `skip-shift-playback-${activeShiftPlayback.shiftId}`;
  const skipErrorId = `${skipControlId}-error`;

  return (
    <aside
      aria-live="polite"
      className="pointer-events-none flex size-full min-h-0 items-start"
      data-shift-playback-hud
    >
      <div
        className={cn(
          "pointer-events-auto mx-auto flex max-h-full w-full max-w-[820px] flex-col overflow-hidden rounded-lg border border-white/10 bg-background/50 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:slide-in-from-top-2 motion-safe:duration-300 min-[1180px]:max-h-[min(680px,100%)] min-[1440px]:max-h-[min(760px,100%)] min-[1440px]:max-w-5xl min-[1440px]:rounded-xl",
          isMobileCompact &&
            "h-full max-w-none rounded-xl bg-background/88 backdrop-blur-xl",
          isClosing &&
            "motion-safe:animate-out motion-safe:fade-out-0 motion-safe:zoom-out-95 motion-safe:slide-out-to-top-2 motion-safe:duration-200",
        )}
        onAnimationEnd={(event) => {
          if (event.currentTarget !== event.target) return;
          if (isClosing) finalizeClose();
        }}
      >
        <div
          className={cn(
            "flex items-start gap-2 border-b border-white/10 p-2.5 min-[1440px]:gap-3 min-[1440px]:p-4",
            isMobileCompact && "bg-background/45",
          )}
        >
          <div className="min-w-0 flex-1">
            <ShiftProgressBar
              currentTime={formatShiftPlaybackTime(shiftMinute)}
              isFinal={isFinal}
              locale={locale}
              progress={progress}
              simulatedGameDay={activeShiftPlayback.simulatedGameDay}
            />
            {isMobileCompact && isFinal ? (
              <div className="mt-2 flex min-h-8 items-center justify-between gap-3 rounded-md border border-emerald-300/15 bg-emerald-400/8 px-2.5 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {copy.mobileTotalProducedLabel}
                </span>
                <strong className="font-mono text-base font-semibold tabular-nums text-emerald-300">
                  {new Intl.NumberFormat(numberLocale).format(
                    activeShiftPlayback.summary.totalProducedQuantity,
                  )}
                </strong>
              </div>
            ) : (
              <div className="mt-2 flex min-h-5 items-center gap-2">
                <Checkbox
                  aria-describedby={skipError ? skipErrorId : undefined}
                  checked={isSkipping || isSkipped}
                  disabled={isFinal || isSkipping || isClosing}
                  id={skipControlId}
                  onCheckedChange={(checked) => {
                    if (checked === true) requestSkip();
                  }}
                />
                <label
                  className="cursor-pointer text-[11px] font-medium text-white/90 drop-shadow-sm transition-colors hover:text-white peer-disabled:cursor-not-allowed peer-disabled:text-white/60 min-[1440px]:text-xs"
                  htmlFor={skipControlId}
                >
                  {isSkipping
                    ? copy.skipAnimationPending
                    : copy.skipAnimationLabel}
                </label>
              </div>
            )}
            {skipError ? (
              <p
                className="mt-1 text-[11px] text-destructive min-[1440px]:text-xs"
                id={skipErrorId}
                role="alert"
              >
                {skipError}
              </p>
            ) : null}
          </div>
          {!isMobileCompact || isFinal ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label={
                    isMobileCompact ? copy.showDailyEventsAria : copy.closeAria
                  }
                  className={
                    isMobileCompact
                      ? "h-9 shrink-0 gap-1.5 border border-primary/25 bg-primary/10 px-3 text-primary hover:bg-primary/15 hover:text-primary"
                      : undefined
                  }
                  disabled={!isFinal || isClosing}
                  onClick={requestClose}
                  size={isMobileCompact ? "lg" : "icon-lg"}
                  type="button"
                  variant="ghost"
                >
                  {isMobileCompact ? (
                    <>
                      <span className="text-[11px] font-semibold">
                        {copy.showDailyEventsLabel}
                      </span>
                      <ArrowRight className="size-4" />
                    </>
                  ) : (
                    <X className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                {isMobileCompact ? copy.showDailyEventsAria : copy.closeAria}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>

        <div
          className={cn(
            "min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-2.5 min-[1440px]:space-y-3 min-[1440px]:p-4",
            isMobileCompact && "p-2",
          )}
        >
          <div
            className={cn(
              "grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-2",
              isMobileCompact && "grid-cols-1 gap-1.5",
            )}
          >
            {activeShiftPlayback.departmentResults.map((department) => (
              <ShiftDepartmentCard
                throughputBps={
                  isFinal
                    ? getDepartmentThroughputBps(department)
                    : Math.round(
                        getDepartmentThroughputBps(department) * progress,
                      )
                }
                department={department}
                isFinal={isFinal}
                key={department.departmentId}
                locale={locale}
                producedQuantity={getShiftQuantityAtMinute(
                  department.producedTimeline,
                  shiftMinute,
                )}
                productResults={getDepartmentProductResults({
                  departmentId: department.departmentId,
                  productResults: activeShiftPlayback.productResults,
                })}
                presentation={presentation}
                queueEnteredQuantity={getShiftQuantityAtMinute(
                  department.queueEnteredTimeline,
                  shiftMinute,
                )}
                shiftMinute={shiftMinute}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

function getDepartmentThroughputBps(
  department: ShiftPlayback["departmentResults"][number],
) {
  const nominalCapacity = Math.max(0, department.performance.nominalCapacityPoints);

  if (nominalCapacity <= 0) return 0;

  return Math.max(
    0,
    Math.min(
      10_000,
      Math.round((department.performance.usedPoints * 10_000) / nominalCapacity),
    ),
  );
}

function getDepartmentProductResults({
  departmentId,
  productResults,
}: {
  departmentId: string;
  productResults: ShiftPlayback["productResults"];
}) {
  return productResults.flatMap((product) => {
    const department = product.departments.find(
      (item) => item.departmentId === departmentId,
    );

    if (!department || department.processedQuantity <= 0) return [];

    return {
      orderCode: product.orderCode,
      orderId: product.orderId,
      processedQuantity: department.processedQuantity,
      productId: product.productId,
      productImageUrl: product.productImageUrl,
      productName: product.productName,
    };
  });
}
