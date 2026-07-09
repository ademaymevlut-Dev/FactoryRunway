"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Factory,
  PackageCheck,
  Play,
  Scissors,
  Shirt,
  Sparkles,
  Trophy,
} from "lucide-react";

import CountUp from "@/components/ui/CountUp";
import { cn } from "@/lib/utils";

import { completeFirstSimulationAction } from "./simulation-actions";

export type SimulationLineView = {
  id: string;
  key: string;
  departmentKey: string;
  departmentName: string;
  segmentLabel: string;
  imageUrl: string | null;
  dailyCounts: [number, number, number];
};

export type FirstOrderSimulationView = {
  factoryName: string;
  orderNo: string;
  productName: string;
  plannedQuantity: number;
  startDay: number;
  rewardXp: number;
  lines: SimulationLineView[];
};

type FirstOrderSimulationClientProps = {
  simulation: FirstOrderSimulationView;
};

type HeaderMetricView = {
  label: string;
  value: number;
  fromValue: number;
  isCounting: boolean;
};

const simulationDurationSeconds = 25;
const dayCopy = [
  {
    eyebrow: "DAY 1",
    title: "Kesim başlıyor",
    body: "İlk vardiya kumaşı üretime hazır parçalara ayırır.",
  },
  {
    eyebrow: "DAY 2",
    title: "Kesim ve dikim birlikte çalışır",
    body: "Kesilen parçalar dikime akar; iki hat aynı anda üretim sayar.",
  },
  {
    eyebrow: "DAY 3",
    title: "Ütü / paket devreye girer",
    body: "Dikimden çıkan ürünler son operasyona girer; sipariş kuyruğu gerçek kapasiteyle ilerler.",
  },
];

export function FirstOrderSimulationClient({
  simulation,
}: FirstOrderSimulationClientProps) {
  const [completedDays, setCompletedDays] = useState(0);
  const [runningDay, setRunningDay] = useState<number | null>(null);
  const [lineTotals, setLineTotals] = useState<Record<string, number>>(() =>
    Object.fromEntries(simulation.lines.map((line) => [line.id, 0])),
  );
  const isRunning = runningDay !== null;
  const isComplete = completedDays >= 3;
  const activeDayIndex = runningDay ?? Math.min(completedDays, 2);
  const activeCopy = dayCopy[activeDayIndex] ?? dayCopy[2];
  const activeGameDay = simulation.startDay + activeDayIndex;
  const headerMetrics = buildHeaderMetrics({
    lineTotals,
    runningDay,
    simulation,
  });

  useEffect(() => {
    if (runningDay === null) return;

    const timeoutId = setTimeout(() => {
      setLineTotals((current) => {
        const next = { ...current };

        for (const line of simulation.lines) {
          next[line.id] = (next[line.id] ?? 0) + line.dailyCounts[runningDay];
        }

        return next;
      });
      setCompletedDays((current) => Math.min(3, current + 1));
      setRunningDay(null);
    }, simulationDurationSeconds * 1000);

    return () => clearTimeout(timeoutId);
  }, [runningDay, simulation.lines]);

  const progressText = useMemo(() => {
    if (isComplete) return "3 / 3 gün tamamlandı";
    if (isRunning) return `${runningDay + 1}. gün vardiyası çalışıyor`;

    return `${completedDays} / 3 gün tamamlandı`;
  }, [completedDays, isComplete, isRunning, runningDay]);

  return (
    <main className="shift-game">
      <div className="factory-map-viewport pointer-events-none cursor-default">
        <div className="factory-map-canvas h-full w-full">
          <div className="factory-map-landscape" />
        </div>
      </div>

      <section className="relative z-30 flex min-h-screen flex-col px-5 py-5">
        <header className="game-card mx-auto flex w-full max-w-6xl items-center justify-between gap-5 rounded-[24px] px-6 py-4">
          <div className="flex min-w-0 items-center gap-4">
            <Image
              alt="Factory Runway"
              className="h-11 w-auto shrink-0"
              height={52}
              priority
              src="/factoryRunway.svg"
              width={220}
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                FIRST SHIFT SIMULATION
              </p>
              <h1 className="mt-1 truncate text-2xl font-semibold leading-none text-foreground">
                {simulation.factoryName}
              </h1>
            </div>
          </div>
          <div className="hidden min-w-0 items-center gap-2 xl:flex">
            {headerMetrics.map((metric) => (
              <HeaderMetric key={metric.label} metric={metric} />
            ))}
          </div>
        </header>

        <div className="mx-auto mt-4 flex w-full max-w-6xl flex-1 flex-col gap-4 pb-28">
          <div className="game-card mx-auto w-full max-w-3xl rounded-[24px] px-5 py-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              {activeCopy.eyebrow} · Day {activeGameDay}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              {activeCopy.title}
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {activeCopy.body}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {simulation.lines.map((line, index) => (
              <SimulationLineCard
                activeCount={runningDay === null ? 0 : line.dailyCounts[runningDay]}
                completedTotal={lineTotals[line.id] ?? 0}
                index={index}
                isActive={runningDay !== null && line.dailyCounts[runningDay] > 0}
                isEnabled={index <= completedDays || (runningDay !== null && index <= runningDay)}
                key={line.id}
                line={line}
                runKey={`${runningDay ?? "idle"}-${line.id}`}
              />
            ))}
          </div>
        </div>

        <footer className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center">
          <div className="pointer-events-auto game-card flex items-center gap-4 rounded-[24px] px-5 py-4">
            <div className="hidden min-w-[170px] text-sm font-semibold text-muted-foreground sm:block">
              {progressText}
            </div>

            {isComplete ? (
              <form action={completeFirstSimulationAction}>
                <button
                  className="game-button-primary min-h-[76px] rounded-2xl px-5 shadow-lg shadow-primary/20"
                  type="submit"
                >
                  <Trophy size={24} />
                  <span className="flex flex-col items-start leading-tight">
                    <strong>Dashboard ekranına geç</strong>
                    <small>+{simulation.rewardXp} XP cüzdana eklenir</small>
                  </span>
                </button>
              </form>
            ) : (
              <button
                className="game-button-primary size-[92px] flex-col rounded-2xl p-0 text-center shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isRunning}
                onClick={() => setRunningDay(completedDays)}
                type="button"
              >
                {isRunning ? <Sparkles size={26} /> : <Play size={28} fill="currentColor" />}
                <span className="text-[11px] font-black uppercase leading-tight tracking-[0.08em]">
                  {isRunning ? "Çalışıyor" : "Vardiya Başlat"}
                </span>
              </button>
            )}
          </div>
        </footer>
      </section>
    </main>
  );
}

function buildHeaderMetrics({
  simulation,
  lineTotals,
  runningDay,
}: {
  simulation: FirstOrderSimulationView;
  lineTotals: Record<string, number>;
  runningDay: number | null;
}): HeaderMetricView[] {
  const labels = ["Kesilen ad.", "Dikilen ad.", "Ütülenen ad."];
  const lineMetrics = labels.map((label, index) => {
    const line = simulation.lines[index];
    const fromValue = line ? (lineTotals[line.id] ?? 0) : 0;
    const runningValue = line && runningDay !== null ? line.dailyCounts[runningDay] : 0;

    return {
      label,
      fromValue,
      value: fromValue + runningValue,
      isCounting: runningValue > 0,
    };
  });

  return [
    {
      label: "Sip Ad.",
      fromValue: simulation.plannedQuantity,
      value: simulation.plannedQuantity,
      isCounting: false,
    },
    ...lineMetrics,
  ];
}

function HeaderMetric({ metric }: { metric: HeaderMetricView }) {
  return (
    <div className="min-w-[104px] rounded-2xl border border-border bg-card/70 px-3 py-2 text-right">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
        {metric.label}
      </p>
      <strong className="mt-1 block text-base font-black leading-none text-foreground">
        {metric.isCounting ? (
          <CountUp
            key={`${metric.label}-${metric.fromValue}-${metric.value}`}
            duration={25}
            from={metric.fromValue}
            separator="."
            startWhen
            step={10}
            to={metric.value}
          />
        ) : (
          formatNumber(metric.value)
        )}
      </strong>
    </div>
  );
}

function SimulationLineCard({
  line,
  index,
  isActive,
  isEnabled,
  activeCount,
  completedTotal,
  runKey,
}: {
  line: SimulationLineView;
  index: number;
  isActive: boolean;
  isEnabled: boolean;
  activeCount: number;
  completedTotal: number;
  runKey: string;
}) {
  return (
    <article
      className={cn(
        "game-card relative overflow-hidden rounded-[22px] p-3 transition duration-300",
        isEnabled ? "opacity-100" : "opacity-55",
        isActive && "border-primary/55 shadow-primary/20",
      )}
    >
      <div className="flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-border bg-card/80 px-3 text-foreground">
        <LineIcon departmentKey={line.departmentKey} lineKey={line.key} />
        <h3 className="truncate text-lg font-black leading-none">
          {line.departmentName}
        </h3>
      </div>

      <div className="relative mt-3 h-[360px] overflow-hidden rounded-[18px] border border-border bg-background/20">
        {line.imageUrl ? (
          <Image
            alt={`${line.departmentName} üretim hattı`}
            className="scale-[1.18] object-contain p-0 drop-shadow-[0_18px_30px_rgba(0,0,0,0.34)]"
            fill
            sizes="(min-width: 1024px) 380px, 90vw"
            src={line.imageUrl}
          />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            <Factory size={54} />
          </div>
        )}

        {(isActive || completedTotal > 0) ? (
          <div className="absolute inset-x-3 bottom-3 z-10 rounded-[16px] bg-black/70 px-4 py-3 text-white shadow-lg">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
                  {isActive ? "Vardiya üretimi" : "Toplam üretim"}
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black leading-none">
                    {isActive ? (
                      <CountUp
                        key={runKey}
                        duration={25}
                        from={0}
                        separator="."
                        startWhen={isActive}
                        step={10}
                        to={activeCount}
                      />
                    ) : (
                      formatNumber(completedTotal)
                    )}
                  </span>
                  <span className="text-sm font-bold text-white/75">adet</span>
                </div>
              </div>
              {!isActive && completedTotal > 0 ? (
                <CheckCircle2 className="mb-1 text-primary" size={22} />
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-[16px] border border-border bg-secondary/45 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Segment
        </span>
        <strong className="truncate text-sm text-foreground">{line.segmentLabel}</strong>
      </div>

      <span className="absolute left-4 top-4 grid size-7 place-items-center rounded-full border border-primary/25 bg-primary/10 text-xs font-black text-primary">
        {index + 1}
      </span>
    </article>
  );
}

function LineIcon({
  departmentKey,
  lineKey,
}: {
  departmentKey: string,
  lineKey: string,
}) {
  const key = `${departmentKey} ${lineKey}`.toLowerCase();
  const className = "size-5 text-primary";

  if (key.includes("cut")) return <Scissors className={className} />;
  if (key.includes("sew") || key.includes("dikim")) {
    return <Shirt className={className} />;
  }
  if (key.includes("iron") || key.includes("pack") || key.includes("utu")) {
    return <PackageCheck className={className} />;
  }

  return <Factory className={className} />;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}
