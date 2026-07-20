"use client";

import {
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
  Play,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

import type { TaskSnapshot } from "../types";
import { TaskRewardPreview } from "./task-reward-preview";

export function TaskCard({
  currencyCode,
  highlighted = false,
  isPending,
  onClaim,
  onCta,
  task,
}: {
  currencyCode: "EUR" | "USD";
  highlighted?: boolean;
  isPending: boolean;
  onClaim: (task: TaskSnapshot) => void;
  onCta: (task: TaskSnapshot) => void;
  task: TaskSnapshot;
}) {
  const isCompleted = task.status === "COMPLETED";
  const isClaimed = task.status === "CLAIMED";
  const isLocked = task.status === "LOCKED";

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card/65 p-4 transition-colors",
        highlighted && "border-primary/50 bg-primary/[0.08] shadow-[0_0_28px_hsl(var(--primary)/0.12)]",
        isCompleted && "border-amber-400/35 bg-amber-400/[0.06]",
        isClaimed && "border-emerald-400/20 bg-emerald-400/[0.04] opacity-80",
        isLocked && "border-white/10 opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {highlighted ? (
              <Badge className="border-primary/30 bg-primary/10 text-primary" variant="outline">
                Ana hikâye
              </Badge>
            ) : null}
            <StatusBadge status={task.status} />
          </div>
          <h3 className="mt-2 text-base font-semibold text-white">{task.title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{task.description}</p>
        </div>
        {isCompleted ? (
          <Trophy className="shrink-0 text-amber-300" size={20} />
        ) : isClaimed ? (
          <CheckCircle2 className="shrink-0 text-emerald-300" size={20} />
        ) : isLocked ? (
          <LockKeyhole className="shrink-0 text-muted-foreground" size={19} />
        ) : (
          <Play className="shrink-0 text-primary" size={19} />
        )}
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>İlerleme</span>
          <span className="font-semibold text-white">
            {task.currentValue} / {task.targetValue}
          </span>
        </div>
        <Progress
          aria-label={`${task.title} ilerlemesi`}
          className="h-2 bg-white/10"
          value={task.progressBps / 100}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <TaskRewardPreview currencyCode={currencyCode} reward={task.reward} />
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isCompleted ? (
            <Button disabled={isPending} onClick={() => onClaim(task)} size="sm" type="button">
              <Trophy size={14} />
              {isPending ? "Alınıyor..." : "Ödülü Al"}
            </Button>
          ) : null}
          {task.cta && !isClaimed && !isLocked ? (
            <Button disabled={isPending} onClick={() => onCta(task)} size="sm" type="button" variant="outline">
              {task.cta.label}
              <ArrowRight size={14} />
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: TaskSnapshot["status"] }) {
  const copy = {
    ACTIVE: "Aktif",
    CLAIMED: "Ödül alındı",
    COMPLETED: "Tamamlandı",
    DISMISSED: "Kapatıldı",
    EXPIRED: "Süresi doldu",
    LOCKED: "Kilitli",
  }[status];

  return (
    <Badge
      className={cn(
        "border-white/10 bg-white/5 text-muted-foreground",
        status === "ACTIVE" && "border-primary/25 bg-primary/10 text-primary",
        status === "COMPLETED" && "border-amber-400/25 bg-amber-400/10 text-amber-100",
        status === "CLAIMED" && "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
      )}
      variant="outline"
    >
      {copy}
    </Badge>
  );
}
