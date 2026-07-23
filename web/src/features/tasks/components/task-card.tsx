"use client";

import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Trophy,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CurrencyCode } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

import type { TaskSnapshot } from "../types";
import { TaskRewardPreview } from "./task-reward-preview";

export function TaskCard({
  currencyCode,
  isPending,
  isSettling = false,
  onClaim,
  onCta,
  positionLabel,
  task,
}: {
  currencyCode: CurrencyCode;
  isPending: boolean;
  isSettling?: boolean;
  onClaim: (task: TaskSnapshot) => void;
  onCta: (task: TaskSnapshot) => void;
  positionLabel: string;
  task: TaskSnapshot;
}) {
  const isCompleted = task.status === "COMPLETED";
  const canUseCta = Boolean(task.cta && task.status === "ACTIVE");

  return (
    <Card
      className={cn(
        "border border-border bg-card shadow-[0_24px_70px_rgba(0,0,0,0.28)] transition-all duration-500 ease-out motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-3",
        isCompleted && "border-emerald-400/25 shadow-emerald-950/30",
        isSettling && "translate-x-5 scale-[0.96] opacity-0 blur-[1px]",
      )}
      size="sm"
    >
      <CardHeader className="border-b border-border/70 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-full border",
                isCompleted
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                  : "border-primary/25 bg-primary/10 text-primary",
              )}
            >
              {isCompleted ? <Trophy size={18} /> : <Sparkles size={17} />}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {positionLabel}
              </p>
              <CardTitle className="mt-1 line-clamp-2 text-base leading-5 text-foreground">
                {task.title}
              </CardTitle>
            </div>
          </div>
          {isCompleted ? (
            <span className="shrink-0 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-100">
              Hazır
            </span>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isCompleted ? (
          <div className="flex items-start gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-50">
            <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-200" size={16} />
            <span>
              {task.completionMessage ??
                "Tebrikler, görev tamamlandı. Ödülün alınmaya hazır."}
            </span>
          </div>
        ) : null}

        <div className="p-1">
          <p className="text-sm leading-6 text-muted-foreground">
            {task.description}
          </p>
        </div>

        {!isCompleted ? (
          <div className="space-y-2 rounded-xl border border-border/70 bg-background/35 p-3">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                İlerleme
              </span>
              <span className="font-semibold tabular-nums text-foreground">
                {task.currentValue} / {task.targetValue}
              </span>
            </div>
            <Progress
              aria-label={`${task.title} ilerlemesi`}
              className="h-2"
              value={task.progressBps / 100}
            />
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-3 border-t border-border/70 pt-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Ödül
          </span>
          <TaskRewardPreview currencyCode={currencyCode} reward={task.reward} />
        </div>
        {isCompleted ? (
          <Button
            className="mx-auto"
            disabled={isPending || isSettling}
            onClick={() => onClaim(task)}
            type="button"
            variant="secondary"
          >
            <Trophy size={16} />
            {isPending || isSettling ? "Alınıyor..." : "Ödülü al"}
          </Button>
        ) : canUseCta ? (
          <Button
            className="mx-auto"
            disabled={isPending}
            onClick={() => onCta(task)}
            type="button"
            variant="secondary"
          >
            {task.cta?.label}
            <ArrowRight size={16} />
          </Button>
        ) : (
          <Button className="mx-auto" disabled type="button" variant="secondary">
            Görev bekliyor
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
