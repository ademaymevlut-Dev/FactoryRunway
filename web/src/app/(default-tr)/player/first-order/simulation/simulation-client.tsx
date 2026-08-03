"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
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
import { GameLocaleSwitcher } from "@/components/game-locale-switcher";
import { useVisualViewportBottomInset } from "@/hooks/use-visual-viewport-bottom-inset";
import {
  numberLocale,
  thousandsSeparator,
  type SupportedLocale,
} from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

import { completeFirstSimulationAction } from "./simulation-actions";
import { FIRST_ORDER_SIMULATION_DURATION_SECONDS } from "./simulation-config";
import { firstOrderCopy } from "../first-order-copy";

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
  locale: SupportedLocale;
  simulation: FirstOrderSimulationView;
};

type HeaderMetricView = {
  label: string;
  value: number;
  fromValue: number;
  isCounting: boolean;
};

type FirstOrderSimulationCopy = (typeof firstOrderCopy)[SupportedLocale]["simulation"];

export function FirstOrderSimulationClient({
  locale,
  simulation,
}: FirstOrderSimulationClientProps) {
  const copy = firstOrderCopy[locale].simulation;
  const simulationRef = useRef<HTMLElement>(null);
  const [completedDays, setCompletedDays] = useState(0);
  const [runningDay, setRunningDay] = useState<number | null>(null);
  const [selectedLineIndex, setSelectedLineIndex] = useState(0);
  const [lineTotals, setLineTotals] = useState<Record<string, number>>(() =>
    Object.fromEntries(simulation.lines.map((line) => [line.id, 0])),
  );
  const isRunning = runningDay !== null;
  const isComplete = completedDays >= 3;
  const activeDayIndex = runningDay ?? Math.min(completedDays, 2);
  const activeCopy = copy.dayCopy[activeDayIndex] ?? copy.dayCopy[2];
  const activeGameDay = simulation.startDay + activeDayIndex;
  const headerMetrics = buildHeaderMetrics({
    copy,
    lineTotals,
    runningDay,
    simulation,
  });
  useVisualViewportBottomInset(simulationRef);

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
      setSelectedLineIndex(
        Math.min(runningDay + 1, Math.max(0, simulation.lines.length - 1)),
      );
      setRunningDay(null);
    }, FIRST_ORDER_SIMULATION_DURATION_SECONDS * 1000);

    return () => clearTimeout(timeoutId);
  }, [runningDay, simulation.lines]);

  const progressText = useMemo(() => {
    if (isComplete) return copy.completeProgress;
    if (isRunning) return copy.runningProgress((runningDay ?? 0) + 1);

    return copy.progress(completedDays);
  }, [completedDays, copy, isComplete, isRunning, runningDay]);

  return (
    <main className="first-order-simulation shift-game">
      <div className="factory-map-viewport pointer-events-none cursor-default">
        <div className="factory-map-canvas h-full w-full">
          <div className="factory-map-landscape" />
        </div>
      </div>

      <section
        className="relative z-30 flex min-h-dvh flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)] md:min-h-screen md:px-5 md:py-5"
        ref={simulationRef}
      >
        <header className="game-card mx-auto flex w-full max-w-6xl items-center justify-between gap-3 rounded-[20px] px-3 py-2.5 md:gap-5 md:rounded-[24px] md:px-6 md:py-4">
          <div className="flex min-w-0 items-center gap-2.5 md:gap-4">
            <Image
              alt="Factory Runway"
              className="h-8 w-auto shrink-0 md:h-11"
              height={52}
              priority
              src="/factoryRunway.svg"
              width={220}
            />
            <div className="min-w-0">
              <p className="hidden text-xs font-semibold uppercase tracking-[0.24em] text-primary md:block">
                {copy.headerKicker}
              </p>
              <h1 className="mt-1 truncate text-lg font-semibold leading-none text-foreground md:text-2xl">
                {simulation.factoryName}
              </h1>
              <p className="mt-1 truncate text-[10px] text-muted-foreground md:hidden">
                {simulation.orderNo} · {simulation.productName}
              </p>
            </div>
          </div>
          <div className="hidden min-w-0 items-center gap-2 xl:flex">
            {headerMetrics.map((metric) => (
              <HeaderMetric key={metric.label} locale={locale} metric={metric} />
            ))}
          </div>
          <GameLocaleSwitcher locale={locale} />
        </header>

        <div className="mx-auto mt-3 flex w-full max-w-6xl flex-1 flex-col gap-3 md:mt-4 md:gap-4 md:pb-28">
          <div className="game-card mx-auto w-full max-w-3xl rounded-[20px] px-3 py-3 md:rounded-[24px] md:px-5 md:py-4 md:text-center">
            <div className="md:hidden">
              <MobileDayStepper
                completedDays={completedDays}
                copy={copy}
                runningDay={runningDay}
              />
              <p
                aria-live="polite"
                className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary"
              >
                {copy.shiftProgress(activeDayIndex + 1, activeGameDay)}
              </p>
              <h2 className="mt-1.5 text-[21px] font-semibold leading-tight text-foreground">
                {activeCopy.title}
              </h2>
              <p className="mt-1 line-clamp-2 text-[12px] leading-[1.5] text-muted-foreground">
                {activeCopy.body}
              </p>
            </div>
            <div className="hidden md:block">
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
          </div>

          <MobileSimulationWorkspace
            completedDays={completedDays}
            copy={copy}
            lineTotals={lineTotals}
            locale={locale}
            onSelectLine={setSelectedLineIndex}
            runningDay={runningDay}
            selectedLineIndex={selectedLineIndex}
            simulation={simulation}
          />

          <div className="hidden grid-cols-1 gap-3 md:grid lg:grid-cols-3">
            {simulation.lines.map((line, index) => (
              <SimulationLineCard
                activeCount={runningDay === null ? 0 : line.dailyCounts[runningDay]}
                completedTotal={lineTotals[line.id] ?? 0}
                index={index}
                isActive={runningDay !== null && line.dailyCounts[runningDay] > 0}
                isEnabled={index <= completedDays || (runningDay !== null && index <= runningDay)}
                key={line.id}
                line={line}
                copy={copy}
                locale={locale}
                runKey={`${runningDay ?? "idle"}-${line.id}`}
              />
            ))}
          </div>
        </div>

        <footer className="pointer-events-none fixed inset-x-0 bottom-[var(--visual-viewport-bottom,0px)] z-40 flex justify-center border-t border-border bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:bottom-6 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
          <div className="game-card pointer-events-auto flex w-full max-w-md items-center gap-4 rounded-[20px] border-0 bg-transparent p-0 shadow-none backdrop-blur-none md:w-auto md:max-w-none md:rounded-[24px] md:border md:bg-card md:px-5 md:py-4 md:shadow-[var(--shadow-md)] md:backdrop-blur-[18px]">
            <div className="hidden min-w-[170px] text-sm font-semibold text-muted-foreground md:block">
              {progressText}
            </div>

            {isComplete ? (
              <form action={completeFirstSimulationAction} className="w-full md:w-auto">
                <button
                  className="game-button-primary min-h-12 w-full rounded-full px-5 shadow-lg shadow-primary/20 md:min-h-[76px] md:w-auto md:rounded-2xl"
                  type="submit"
                >
                  <Trophy size={24} />
                  <span className="flex flex-col items-start leading-tight">
                    <strong>{copy.dashboardCta}</strong>
                    <small>{copy.xpAdded(simulation.rewardXp)}</small>
                  </span>
                </button>
              </form>
            ) : (
              <button
                className="game-button-primary min-h-12 w-full rounded-full px-5 text-center shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-70 md:size-[92px] md:flex-col md:rounded-2xl md:p-0"
                disabled={isRunning}
                onClick={() => {
                  setSelectedLineIndex(
                    Math.min(completedDays, Math.max(0, simulation.lines.length - 1)),
                  );
                  setRunningDay(completedDays);
                }}
                type="button"
              >
                {isRunning ? <Sparkles size={26} /> : <Play size={28} fill="currentColor" />}
                <span className="text-[12px] font-black uppercase leading-tight tracking-[0.08em] md:text-[11px]">
                  {isRunning ? (
                    copy.running
                  ) : (
                    <>
                      <span className="md:hidden">{copy.startDay(completedDays + 1)}</span>
                      <span className="hidden md:inline">{copy.startShift}</span>
                    </>
                  )}
                </span>
              </button>
            )}
          </div>
        </footer>
      </section>
    </main>
  );
}

const simulationDayIndexes = [0, 1, 2] as const;

function MobileDayStepper({
  completedDays,
  copy,
  runningDay,
}: {
  completedDays: number;
  copy: FirstOrderSimulationCopy;
  runningDay: number | null;
}) {
  const activeDay = runningDay ?? Math.min(completedDays, 2);

  return (
    <div className="relative grid grid-cols-3" aria-label={copy.progress(completedDays)}>
      <span className="absolute left-[16.66%] right-[16.66%] top-3 h-px bg-border" />
      {simulationDayIndexes.map((dayIndex) => {
        const isCompleted = dayIndex < completedDays;
        const isActive = dayIndex === activeDay && completedDays < 3;

        return (
          <div className="relative z-10 flex flex-col items-center gap-1.5" key={dayIndex}>
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full border bg-card text-[10px] font-black",
                isCompleted && "border-primary bg-primary text-primary-foreground",
                isActive && !isCompleted && "border-primary text-primary shadow-sm shadow-primary/25",
                !isCompleted && !isActive && "border-border text-muted-foreground",
              )}
            >
              {isCompleted ? <Check size={13} /> : dayIndex + 1}
            </span>
            <span
              className={cn(
                "text-[9px] font-semibold uppercase tracking-[0.08em]",
                isCompleted || isActive ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {copy.dayCopy[dayIndex].eyebrow}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MobileSimulationWorkspace({
  completedDays,
  copy,
  lineTotals,
  locale,
  onSelectLine,
  runningDay,
  selectedLineIndex,
  simulation,
}: {
  completedDays: number;
  copy: FirstOrderSimulationCopy;
  lineTotals: Record<string, number>;
  locale: SupportedLocale;
  onSelectLine: (index: number) => void;
  runningDay: number | null;
  selectedLineIndex: number;
  simulation: FirstOrderSimulationView;
}) {
  const selectedLine = simulation.lines[selectedLineIndex] ?? simulation.lines[0];

  if (!selectedLine) return null;

  const selectedCompletedTotal = lineTotals[selectedLine.id] ?? 0;
  const selectedRunningCount = runningDay === null
    ? 0
    : selectedLine.dailyCounts[runningDay];
  const selectedIsActive = selectedRunningCount > 0;

  return (
    <div className="space-y-2.5 md:hidden">
      <div
        aria-label={copy.headerKicker}
        className="grid grid-cols-3 gap-2"
        role="tablist"
      >
        {simulation.lines.map((line, index) => {
          const isEnabled = index <= completedDays || (
            runningDay !== null && index <= runningDay
          );
          const isSelected = line.id === selectedLine.id;

          return (
            <button
              aria-controls={`mobile-line-panel-${line.id}`}
              aria-selected={isSelected}
              className={cn(
                "flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-[14px] border px-2 text-[11px] font-semibold transition",
                isSelected
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-border bg-card/75 text-muted-foreground",
                !isEnabled && "opacity-45",
              )}
              disabled={!isEnabled}
              key={line.id}
              onClick={() => onSelectLine(index)}
              role="tab"
              type="button"
            >
              <LineIcon departmentKey={line.departmentKey} lineKey={line.key} />
              <span className="truncate">{line.departmentName}</span>
            </button>
          );
        })}
      </div>

      <article
        aria-labelledby={`mobile-line-title-${selectedLine.id}`}
        className="game-card overflow-hidden rounded-[20px] p-2.5"
        id={`mobile-line-panel-${selectedLine.id}`}
        role="tabpanel"
      >
        <div className="flex min-h-9 items-center justify-between gap-3 px-1 pb-2">
          <div className="flex min-w-0 items-center gap-2">
            <LineIcon
              departmentKey={selectedLine.departmentKey}
              lineKey={selectedLine.key}
            />
            <h3
              className="truncate text-[16px] font-semibold text-foreground"
              id={`mobile-line-title-${selectedLine.id}`}
            >
              {selectedLine.departmentName}
            </h3>
          </div>
          <span className="shrink-0 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
            {selectedLine.segmentLabel}
          </span>
        </div>

        <div className="relative h-[190px] overflow-hidden rounded-[16px] border border-border bg-background/20">
          {selectedLine.imageUrl ? (
            <Image
              alt={copy.lineImageAlt(selectedLine.departmentName)}
              className="object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.32)]"
              fill
              sizes="calc(100vw - 44px)"
              src={selectedLine.imageUrl}
            />
          ) : (
            <div className="grid h-full place-items-center text-muted-foreground">
              <Factory size={44} />
            </div>
          )}

          <div className="absolute inset-x-2 bottom-2 rounded-[14px] bg-black/70 px-3 py-2.5 text-white shadow-lg">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/55">
                  {selectedIsActive ? copy.activeProduction : copy.totalProduction}
                </p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-[24px] font-black leading-none">
                    {selectedIsActive ? (
                      <CountUp
                        key={`mobile-${runningDay}-${selectedLine.id}`}
                        duration={FIRST_ORDER_SIMULATION_DURATION_SECONDS}
                        from={selectedCompletedTotal}
                        locale={numberLocale(locale)}
                        separator={thousandsSeparator(locale)}
                        startWhen
                        step={10}
                        to={selectedCompletedTotal + selectedRunningCount}
                      />
                    ) : (
                      formatNumber(selectedCompletedTotal, locale)
                    )}
                  </span>
                  <span className="text-xs font-bold text-white/70">{copy.pieceUnit}</span>
                </div>
              </div>
              {selectedCompletedTotal > 0 && !selectedIsActive ? (
                <CheckCircle2 className="mb-0.5 text-primary" size={20} />
              ) : null}
            </div>
          </div>
        </div>
      </article>

      <div className="grid grid-cols-3 gap-2" aria-label={copy.totalProduction}>
        {simulation.lines.map((line, index) => {
          const completedTotal = lineTotals[line.id] ?? 0;
          const runningCount = runningDay === null ? 0 : line.dailyCounts[runningDay];

          return (
            <MobileLineMetric
              completedTotal={completedTotal}
              copy={copy}
              isCounting={runningCount > 0}
              key={line.id}
              label={copy.metricLabels[index] ?? line.departmentName}
              lineId={line.id}
              locale={locale}
              runningCount={runningCount}
              runningDay={runningDay}
            />
          );
        })}
      </div>
    </div>
  );
}

function MobileLineMetric({
  completedTotal,
  copy,
  isCounting,
  label,
  lineId,
  locale,
  runningCount,
  runningDay,
}: {
  completedTotal: number;
  copy: FirstOrderSimulationCopy;
  isCounting: boolean;
  label: string;
  lineId: string;
  locale: SupportedLocale;
  runningCount: number;
  runningDay: number | null;
}) {
  return (
    <div className="min-w-0 rounded-[14px] border border-border bg-card/90 px-2.5 py-2.5 text-center">
      <p className="truncate text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <strong className="mt-1.5 block truncate text-[17px] font-black leading-none text-foreground">
        {isCounting ? (
          <CountUp
            key={`mobile-metric-${runningDay}-${lineId}`}
            duration={FIRST_ORDER_SIMULATION_DURATION_SECONDS}
            from={completedTotal}
            locale={numberLocale(locale)}
            separator={thousandsSeparator(locale)}
            startWhen
            step={10}
            to={completedTotal + runningCount}
          />
        ) : (
          formatNumber(completedTotal, locale)
        )}
      </strong>
      <span className="mt-1 block text-[9px] font-semibold text-muted-foreground">
        {copy.pieceUnit}
      </span>
    </div>
  );
}

function buildHeaderMetrics({
  copy,
  simulation,
  lineTotals,
  runningDay,
}: {
  copy: FirstOrderSimulationCopy;
  simulation: FirstOrderSimulationView;
  lineTotals: Record<string, number>;
  runningDay: number | null;
}): HeaderMetricView[] {
  const labels = copy.metricLabels;
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
      label: copy.orderQuantityMetric,
      fromValue: simulation.plannedQuantity,
      value: simulation.plannedQuantity,
      isCounting: false,
    },
    ...lineMetrics,
  ];
}

function HeaderMetric({
  locale,
  metric,
}: {
  locale: SupportedLocale;
  metric: HeaderMetricView;
}) {
  return (
    <div className="min-w-[104px] rounded-2xl border border-border bg-card/70 px-3 py-2 text-right">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
        {metric.label}
      </p>
      <strong className="mt-1 block text-base font-black leading-none text-foreground">
        {metric.isCounting ? (
          <CountUp
            key={`${metric.label}-${metric.fromValue}-${metric.value}`}
            duration={FIRST_ORDER_SIMULATION_DURATION_SECONDS}
            from={metric.fromValue}
            locale={numberLocale(locale)}
            separator={thousandsSeparator(locale)}
            startWhen
            step={10}
            to={metric.value}
          />
        ) : (
          formatNumber(metric.value, locale)
        )}
      </strong>
    </div>
  );
}

function SimulationLineCard({
  copy,
  line,
  locale,
  index,
  isActive,
  isEnabled,
  activeCount,
  completedTotal,
  runKey,
}: {
  copy: FirstOrderSimulationCopy;
  line: SimulationLineView;
  locale: SupportedLocale;
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
            alt={copy.lineImageAlt(line.departmentName)}
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
                  {isActive ? copy.activeProduction : copy.totalProduction}
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black leading-none">
                    {isActive ? (
                      <CountUp
                        key={runKey}
                        duration={FIRST_ORDER_SIMULATION_DURATION_SECONDS}
                        from={0}
                        locale={numberLocale(locale)}
                        separator={thousandsSeparator(locale)}
                        startWhen={isActive}
                        step={10}
                        to={activeCount}
                      />
                    ) : (
                      formatNumber(completedTotal, locale)
                    )}
                  </span>
                  <span className="text-sm font-bold text-white/75">{copy.pieceUnit}</span>
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
          {copy.segment}
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

function formatNumber(value: number, locale: SupportedLocale) {
  return new Intl.NumberFormat(numberLocale(locale)).format(value);
}
