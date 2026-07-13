"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatShiftPlaybackTime,
  getShiftPlaybackMinute,
  getShiftPlaybackProgress,
  getShiftQuantityAtMinute,
} from "../shift-playback";
import { dismissShiftPlayback, useGameUiStore } from "../store/game-ui-store";
import type { ShiftPlayback } from "../types";
import { ShiftDepartmentCard } from "./shift-department-card";
import { ShiftProgressBar } from "./shift-progress-bar";

export function ShiftPlaybackHud() {
  const router = useRouter();
  const {
    activeShiftPlayback,
    isShiftPlaybackActive,
    setActiveShiftPlayback,
    shiftPlaybackNowMs,
  } = useGameUiStore();
  const [closingShiftId, setClosingShiftId] = useState<string | null>(null);
  const closeFinalizedRef = useRef<string | null>(null);

  const finalizeClose = useCallback(() => {
    if (!activeShiftPlayback) return;
    if (closeFinalizedRef.current === activeShiftPlayback.shiftId) return;

    closeFinalizedRef.current = activeShiftPlayback.shiftId;
    dismissShiftPlayback(activeShiftPlayback);
    setActiveShiftPlayback(null);
    router.refresh();
  }, [activeShiftPlayback, router, setActiveShiftPlayback]);

  const requestClose = useCallback(() => {
    if (!activeShiftPlayback || isShiftPlaybackActive) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finalizeClose();
      return;
    }
    setClosingShiftId(activeShiftPlayback.shiftId);
  }, [activeShiftPlayback, finalizeClose, isShiftPlaybackActive]);

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

  return (
    <aside
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 top-24 z-[60] px-4 sm:px-6 lg:pr-[440px]"
      data-shift-playback-hud
    >
      <div
        className={[
          "pointer-events-auto mx-auto flex max-h-[min(760px,calc(100dvh-8rem))] max-w-5xl flex-col overflow-hidden rounded-xl border border-white/10 bg-background/94 shadow-2xl backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:slide-in-from-top-2 motion-safe:duration-300",
          isClosing
            ? "motion-safe:animate-out motion-safe:fade-out-0 motion-safe:zoom-out-95 motion-safe:slide-out-to-top-2 motion-safe:duration-200"
            : "",
        ].join(" ")}
        onAnimationEnd={() => {
          if (isClosing) finalizeClose();
        }}
      >
        <div className="flex items-start gap-3 border-b border-white/10 p-4">
          <div className="min-w-0 flex-1">
            <ShiftProgressBar
              currentTime={formatShiftPlaybackTime(shiftMinute)}
              isFinal={isFinal}
              progress={progress}
              simulatedGameDay={activeShiftPlayback.simulatedGameDay}
            />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Kapat"
                disabled={!isFinal || isClosing}
                onClick={requestClose}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <X className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Kapat</TooltipContent>
          </Tooltip>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {activeShiftPlayback.departmentResults.map((department) => (
              <ShiftDepartmentCard
                department={department}
                efficiencyBps={
                  isFinal
                    ? department.performance.efficiencyBps
                    : Math.round(department.performance.efficiencyBps * progress)
                }
                isFinal={isFinal}
                key={department.departmentId}
                producedQuantity={getShiftQuantityAtMinute(
                  department.producedTimeline,
                  shiftMinute,
                )}
                productResults={getDepartmentProductResults({
                  departmentId: department.departmentId,
                  productResults: activeShiftPlayback.productResults,
                })}
                queueEnteredQuantity={getShiftQuantityAtMinute(
                  department.queueEnteredTimeline,
                  shiftMinute,
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
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
      processedQuantity: department.processedQuantity,
      productName: product.productName,
    };
  });
}
