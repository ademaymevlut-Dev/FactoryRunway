"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ListChecks,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { advanceFactoryDayAction } from "@/features/game/actions/advance-factory-day-action";
import { useGameUiStore } from "@/features/game/store/game-ui-store";
import type { GameSnapshot } from "@/features/game/types";
import { claimTaskRewardAction } from "../actions/claim-task-reward-action";
import type { TaskSnapshot, TasksSnapshot } from "../types";

import { TaskCard } from "./task-card";

const claimExitDelayMs = 380;
const claimResetDelayMs = 950;

export function TasksPanel({
  currencyCode,
  tasks,
}: {
  currencyCode: GameSnapshot["factory"]["currencyCode"];
  tasks: TasksSnapshot;
}) {
  const router = useRouter();
  const { openPanel, setActiveShiftPlayback } = useGameUiStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [settlingTaskId, setSettlingTaskId] = useState<string | null>(null);
  const claimExitTimerRef = useRef<number | null>(null);
  const claimResetTimerRef = useRef<number | null>(null);
  const carouselTasks = buildTaskCarousel(tasks);
  const completedCount =
    tasks.summary.claimedCount + tasks.summary.completedUnclaimedCount;
  const safeIndex =
    carouselTasks.length === 0
      ? 0
      : Math.min(currentIndex, carouselTasks.length - 1);
  const activeTask = carouselTasks[safeIndex] ?? null;
  const hasMultipleTasks = carouselTasks.length > 1;

  useEffect(() => {
    return () => {
      if (claimExitTimerRef.current !== null) {
        window.clearTimeout(claimExitTimerRef.current);
      }
      if (claimResetTimerRef.current !== null) {
        window.clearTimeout(claimResetTimerRef.current);
      }
    };
  }, []);

  function claimTask(task: TaskSnapshot) {
    setMessage(null);
    startTransition(async () => {
      const result = await claimTaskRewardAction(task.id);

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setSettlingTaskId(task.id);
      setCurrentIndex(0);
      clearClaimTimers();

      claimExitTimerRef.current = window.setTimeout(() => {
        router.refresh();
      }, claimExitDelayMs);
      claimResetTimerRef.current = window.setTimeout(() => {
        setSettlingTaskId(null);
      }, claimResetDelayMs);
    });
  }

  function followTask(task: TaskSnapshot) {
    if (!task.cta) return;

    setMessage(null);
    if (task.cta.kind === "PANEL") {
      openPanel(task.cta.panel, task.cta.payload);
      return;
    }

    startTransition(async () => {
      const result = await advanceFactoryDayAction(null, new FormData());

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setActiveShiftPlayback(result.playback);
      router.refresh();
    });
  }

  function goToTask(direction: -1 | 1) {
    if (!hasMultipleTasks) return;
    setMessage(null);
    setCurrentIndex((index) =>
      (index + direction + carouselTasks.length) % carouselTasks.length,
    );
  }

  function clearClaimTimers() {
    if (claimExitTimerRef.current !== null) {
      window.clearTimeout(claimExitTimerRef.current);
      claimExitTimerRef.current = null;
    }
    if (claimResetTimerRef.current !== null) {
      window.clearTimeout(claimResetTimerRef.current);
      claimResetTimerRef.current = null;
    }
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-primary">
          <span className="grid size-8 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10">
            <ListChecks size={16} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              Fabrika gündemi
            </p>
            <p className="text-xs text-muted-foreground">
              Bir sonraki net adım
            </p>
          </div>
        </div>
        <Badge
          className="shrink-0 border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
          variant="outline"
        >
          <CheckCircle2 size={13} />
          Tamamlanan {completedCount}
        </Badge>
      </header>

      {hasMultipleTasks ? (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-2 py-1.5">
          <Button
            aria-label="Önceki görev"
            disabled={isPending}
            onClick={() => goToTask(-1)}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="text-xs font-semibold text-muted-foreground">
            {safeIndex + 1} / {carouselTasks.length}
          </span>
          <Button
            aria-label="Sonraki görev"
            disabled={isPending}
            onClick={() => goToTask(1)}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      ) : null}

      {message ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 shrink-0" size={16} />
          <span>{message}</span>
        </div>
      ) : null}

      {activeTask ? (
        <TaskCard
          currencyCode={currencyCode}
          isPending={isPending}
          isSettling={settlingTaskId === activeTask.id}
          onClaim={claimTask}
          onCta={followTask}
          positionLabel={
            hasMultipleTasks
              ? `${safeIndex + 1} / ${carouselTasks.length}`
              : "Görev"
          }
          task={activeTask}
        />
      ) : (
        <EmptyTasksState completedCount={completedCount} />
      )}
    </div>
  );
}

function buildTaskCarousel(tasks: TasksSnapshot) {
  const seenTaskIds = new Set<string>();
  const carouselTasks: TaskSnapshot[] = [];

  function pushTask(task: TaskSnapshot | null) {
    if (!task || seenTaskIds.has(task.id)) return;
    seenTaskIds.add(task.id);
    carouselTasks.push(task);
  }

  for (const task of tasks.completedUnclaimedTasks) {
    pushTask(task);
  }
  pushTask(tasks.activeStoryTask);
  for (const task of tasks.activeTasks) {
    pushTask(task);
  }

  return carouselTasks;
}

function EmptyTasksState({ completedCount }: { completedCount: number }) {
  return (
    <Card className="border border-dashed border-border bg-card" size="sm">
      <CardContent className="grid min-h-[260px] place-items-center text-center">
        <div>
          <CheckCircle2 className="mx-auto text-emerald-300" size={30} />
          <h3 className="mt-3 font-semibold text-foreground">
            Açık görev yok
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tamamlanan görev sayısı: {completedCount}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
