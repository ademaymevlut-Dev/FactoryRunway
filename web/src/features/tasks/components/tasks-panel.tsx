"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, ListChecks, Ticket, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { advanceFactoryDayAction } from "@/features/game/actions/advance-factory-day-action";
import { useGameUiStore } from "@/features/game/store/game-ui-store";
import type { GameSnapshot } from "@/features/game/types";
import { claimTaskRewardAction } from "../actions/claim-task-reward-action";
import type { TaskSnapshot, TasksSnapshot } from "../types";

import { TaskCard } from "./task-card";

export function TasksPanel({
  currencyCode,
  tasks,
}: {
  currencyCode: GameSnapshot["factory"]["currencyCode"];
  tasks: TasksSnapshot;
}) {
  const router = useRouter();
  const {
    openPanel,
    setActiveShiftPlayback,
    setTasksView,
    tasksView,
  } = useGameUiStore();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function claimTask(task: TaskSnapshot) {
    setMessage(null);
    startTransition(async () => {
      const result = await claimTaskRewardAction(task.id);

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setTasksView("active");
      router.refresh();
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

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <header className="rounded-2xl border border-primary/20 bg-primary/[0.07] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <ListChecks size={18} />
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">Fabrika gündemi</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-white">Büyüme yol haritan</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Müdürün, fabrikanın bir sonraki anlamlı kararını takipte tutuyor.
            </p>
          </div>
          <Badge className="border-cyan-400/25 bg-cyan-400/10 text-cyan-100" variant="outline">
            <Ticket size={13} />
            {tasks.tokenBalance} Runway Token
          </Badge>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <SummaryValue label="Aktif" value={tasks.summary.activeCount} />
          <SummaryValue label="Ödül bekliyor" value={tasks.summary.completedUnclaimedCount} />
          <SummaryValue label="Tamamlanan" value={tasks.summary.claimedCount} />
        </div>
      </header>

      {message ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 shrink-0" size={16} />
          <span>{message}</span>
        </div>
      ) : null}

      <Tabs
        className="min-h-0 flex-1"
        onValueChange={(value) => setTasksView(value === "history" ? "history" : "active")}
        value={tasksView}
      >
        <TabsList className="w-full" variant="line">
          <TabsTrigger className="flex-1" value="active">
            Aktif görevler
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="history">
            Ödül geçmişi
          </TabsTrigger>
        </TabsList>
        <TabsContent className="mt-3 h-[calc(100%-2.75rem)]" value="active">
          <ScrollArea className="h-full pr-2">
            <div className="space-y-3 pb-2">
              {tasks.activeStoryTask ? (
                <TaskCard
                  currencyCode={currencyCode}
                  highlighted
                  isPending={isPending}
                  onClaim={claimTask}
                  onCta={followTask}
                  task={tasks.activeStoryTask}
                />
              ) : null}
              {tasks.completedUnclaimedTasks.length > 0 ? (
                <TaskSection title="Ödülünü bekleyenler">
                  {tasks.completedUnclaimedTasks.map((task) => (
                    <TaskCard
                      currencyCode={currencyCode}
                      isPending={isPending}
                      key={task.id}
                      onClaim={claimTask}
                      onCta={followTask}
                      task={task}
                    />
                  ))}
                </TaskSection>
              ) : null}
              {tasks.activeTasks.filter((task) => task.id !== tasks.activeStoryTask?.id).length > 0 ? (
                <TaskSection title="Sıradaki adımlar">
                  {tasks.activeTasks
                    .filter((task) => task.id !== tasks.activeStoryTask?.id)
                    .map((task) => (
                      <TaskCard
                        currencyCode={currencyCode}
                        isPending={isPending}
                        key={task.id}
                        onClaim={claimTask}
                        onCta={followTask}
                        task={task}
                      />
                    ))}
                </TaskSection>
              ) : null}
              {tasks.activeStoryTask === null &&
              tasks.completedUnclaimedTasks.length === 0 &&
              tasks.activeTasks.length === 0 ? (
                <EmptyTasksState />
              ) : null}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent className="mt-3 h-[calc(100%-2.75rem)]" value="history">
          <ScrollArea className="h-full pr-2">
            <div className="space-y-3 pb-2">
              {tasks.claimedTaskHistory.length > 0 ? (
                tasks.claimedTaskHistory.map((task) => (
                  <TaskCard
                    currencyCode={currencyCode}
                    isPending={isPending}
                    key={task.id}
                    onClaim={claimTask}
                    onCta={followTask}
                    task={task}
                  />
                ))
              ) : (
                <EmptyHistoryState />
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryValue({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-background/35 px-2 py-2">
      <strong className="block text-lg text-white">{value}</strong>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}

function TaskSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Trophy className="text-amber-300" size={15} />
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function EmptyTasksState() {
  return (
    <div className="grid min-h-[260px] place-items-center rounded-2xl border border-dashed border-white/15 bg-card/40 p-6 text-center">
      <div>
        <ListChecks className="mx-auto text-muted-foreground" size={30} />
        <h3 className="mt-3 font-semibold text-white">Şu an açık görev yok</h3>
        <p className="mt-1 text-sm text-muted-foreground">Yeni bir oyun günü ilerlettiğinde görev akışın güncellenecek.</p>
      </div>
    </div>
  );
}

function EmptyHistoryState() {
  return (
    <div className="grid min-h-[260px] place-items-center rounded-2xl border border-dashed border-white/15 bg-card/40 p-6 text-center">
      <div>
        <Trophy className="mx-auto text-muted-foreground" size={30} />
        <h3 className="mt-3 font-semibold text-white">Henüz ödül geçmişi yok</h3>
        <p className="mt-1 text-sm text-muted-foreground">Tamamladığın görevlerin ödülleri burada görünecek.</p>
      </div>
    </div>
  );
}
