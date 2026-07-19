"use client";

import Image from "next/image";
import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  ClipboardList,
  Gauge,
  LogOut,
  Sparkles,
  UserRound,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { logoutAction } from "@/app/user-actions";

import { useGameUiStore } from "../store/game-ui-store";
import type { GameSnapshot } from "../types";
import styles from "./top-status-bar.module.css";

const VALUE_ANIMATION_MS = 4_200;
const SMALL_METRIC_ANIMATION_MS = 900;

const metricIcons: Record<string, LucideIcon> = {
  cash: Wallet,
  capacity: Boxes,
  day: CalendarDays,
  late: AlertTriangle,
  level: Sparkles,
  orders: ClipboardList,
  staff: UserRound,
  xp: Zap,
};

export function TopStatusBar({
  position = "absolute",
  snapshot,
}: {
  position?: "absolute" | "fixed";
  snapshot: GameSnapshot;
}) {
  const displayedSnapshot = useDelayedHudSnapshot(snapshot);
  const stagePulse = usePulseOnChange(
    displayedSnapshot.factory.operatingStageName,
    1_600,
  );

  return (
    <header
      className={`pointer-events-none inset-x-0 top-0 z-30 px-4 pt-4 sm:px-6 ${position}`}
    >
      <div className="pointer-events-auto mx-auto flex max-w-[1500px] items-center gap-3 rounded-lg bg-background/88 p-3 shadow-2xl backdrop-blur">
        <div className="flex min-w-0 items-center gap-3 border-r border-card pr-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Image
              alt="Factory Runway"
              className="h-7 w-7 object-contain"
              height={28}
              priority
              src="/factoryRunway.svg"
              width={28}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-widest text-primary">
              {displayedSnapshot.factory.sectorName}
            </p>
            <h1 className="truncate text-lg font-semibold text-white">
              {displayedSnapshot.factory.name}
            </h1>
            <p
              className={`truncate text-xs text-muted-foreground ${
                stagePulse ? styles.stageChanged : ""
              }`}
            >
              {displayedSnapshot.factory.operatingStageName}
            </p>
          </div>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-2 divide-x divide-card md:grid-cols-4 2xl:grid-cols-7">
          {displayedSnapshot.metrics.map((metric) => {
            const Icon = metricIcons[metric.id] ?? Gauge;

            if (metric.id === "cash") {
              return (
                <AnimatedCashMetric
                  currencyCode={displayedSnapshot.factory.currencyCode}
                  currentCents={Number(displayedSnapshot.factory.cashBalanceCents)}
                  icon={Icon}
                  key={metric.id}
                  label={metric.label}
                />
              );
            }

            if (metric.id === "xp") {
              return (
                <AnimatedXpMetric
                  currentXp={displayedSnapshot.factory.currentXp}
                  icon={Icon}
                  key={metric.id}
                  label={metric.label}
                />
              );
            }

            if (metric.id === "level") {
              return (
                <AnimatedLevelMetric
                  currentLevel={displayedSnapshot.factory.currentLevel}
                  icon={Icon}
                  key={metric.id}
                  label={metric.label}
                />
              );
            }

            return <AnimatedMetric metric={metric} icon={Icon} key={metric.id} />;
          })}
        </div>

        <form action={logoutAction} className="border-l border-card pl-3">
          <button
            aria-label="Çıkış yap"
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-card hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
            title="Çıkış yap"
            type="submit"
          >
            <LogOut size={17} />
          </button>
        </form>
      </div>
    </header>
  );
}

function useDelayedHudSnapshot(snapshot: GameSnapshot) {
  const { activeShiftPlayback, isShiftPlaybackActive } = useGameUiStore();
  const [displayedSnapshot, setDisplayedSnapshot] = useState(snapshot);
  const pendingSnapshotRef = useRef<GameSnapshot | null>(null);
  const shouldHoldStatusUpdate =
    isShiftPlaybackActive ||
    Boolean(!activeShiftPlayback && snapshot.activeShiftPlayback?.isActive);

  useEffect(() => {
    if (shouldHoldStatusUpdate) {
      pendingSnapshotRef.current = snapshot;
      return;
    }

    const pendingSnapshot = pendingSnapshotRef.current;

    if (pendingSnapshot) {
      pendingSnapshotRef.current = null;
      setDisplayedSnapshot(pendingSnapshot);
      return;
    }

    setDisplayedSnapshot(snapshot);
  }, [shouldHoldStatusUpdate, snapshot]);

  return displayedSnapshot;
}

function AnimatedCashMetric({
  currencyCode,
  currentCents,
  icon,
  label,
}: {
  currencyCode: GameSnapshot["factory"]["currencyCode"];
  currentCents: number;
  icon: LucideIcon;
  label: string;
}) {
  const transition = useNumericTransition(currentCents, VALUE_ANIMATION_MS);
  const isPositive = (transition.change?.delta ?? 0) > 0;
  const isNegative = (transition.change?.delta ?? 0) < 0;

  return (
    <MetricFrame
      className={
        isPositive
          ? styles.cashPositive
          : isNegative
            ? styles.cashNegative
            : undefined
      }
      icon={icon}
      label={label}
    >
      <div className="flex min-w-0 items-center gap-2">
        <strong
          className={`block truncate font-mono text-sm font-semibold leading-tight tabular-nums text-white ${
            isPositive
              ? styles.valuePositive
              : isNegative
                ? styles.valueNegative
                : ""
          }`}
        >
          {formatMoneyFromCents(transition.displayValue, currencyCode)}
        </strong>
        {transition.change ? (
          <span
            className={`${styles.deltaBadge} ${
              isPositive ? styles.deltaPositive : styles.deltaNegative
            }`}
          >
            {formatSignedMoneyFromCents(transition.change.delta, currencyCode)}
          </span>
        ) : null}
      </div>
    </MetricFrame>
  );
}

function AnimatedXpMetric({
  currentXp,
  icon,
  label,
}: {
  currentXp: number;
  icon: LucideIcon;
  label: string;
}) {
  const transition = useNumericTransition(currentXp, VALUE_ANIMATION_MS);
  const isPositive = (transition.change?.delta ?? 0) > 0;
  const isNegative = (transition.change?.delta ?? 0) < 0;

  return (
    <MetricFrame
      className={isPositive ? styles.xpPositive : undefined}
      icon={icon}
      label={label}
    >
      <div className="flex min-w-0 items-center gap-2">
        <strong
          className={`block truncate font-mono text-sm font-semibold leading-tight tabular-nums text-white ${
            isPositive ? styles.valueXp : isNegative ? styles.valueNegative : ""
          }`}
        >
          {formatNumber(transition.displayValue)} XP
        </strong>
        {transition.change ? (
          <span
            className={`${styles.deltaBadge} ${
              isPositive ? styles.deltaXp : styles.deltaNegative
            }`}
          >
            {formatSignedNumber(transition.change.delta)} XP
          </span>
        ) : null}
      </div>
    </MetricFrame>
  );
}

function AnimatedLevelMetric({
  currentLevel,
  icon,
  label,
}: {
  currentLevel: number;
  icon: LucideIcon;
  label: string;
}) {
  const transition = useNumericTransition(currentLevel, VALUE_ANIMATION_MS);
  const leveledUp = (transition.change?.delta ?? 0) > 0;

  return (
    <MetricFrame
      className={leveledUp ? styles.levelPulse : undefined}
      icon={icon}
      label={label}
    >
      <div className="flex min-w-0 items-center gap-2">
        <strong
          className={`block truncate font-mono text-sm font-semibold leading-tight tabular-nums text-white ${
            leveledUp ? styles.valueLevel : ""
          }`}
        >
          Lv. {formatNumber(transition.displayValue)}
        </strong>
        {transition.change ? (
          <span
            className={`${styles.deltaBadge} ${
              leveledUp ? styles.deltaLevel : styles.deltaNegative
            }`}
          >
            {formatSignedLevel(transition.change.delta)}
          </span>
        ) : null}
      </div>
    </MetricFrame>
  );
}

function AnimatedMetric({
  icon,
  metric,
}: {
  icon: LucideIcon;
  metric: GameSnapshot["metrics"][number];
}) {
  const numericValue = parseIntegerMetric(metric.value);
  const transition = useNumericTransition(
    numericValue ?? 0,
    SMALL_METRIC_ANIMATION_MS,
  );
  const shouldAnimate =
    numericValue !== null &&
    metric.id !== "day" &&
    Boolean(transition.change);
  const displayValue =
    metric.id === "day" || numericValue === null
      ? metric.value
      : formatNumber(transition.displayValue);
  const isDayMetric = metric.id === "day";

  return (
    <MetricFrame
      className={shouldAnimate ? styles.metricFlip : undefined}
      icon={icon}
      label={metric.label}
    >
      <strong
        className="block truncate font-mono text-sm font-semibold leading-tight tabular-nums text-white"
      >
        {displayValue}
      </strong>
      {isDayMetric ? (
        <span className="mt-0.5 block truncate text-[10px] font-semibold leading-tight text-primary">
          {metric.subLabel}
        </span>
      ) : null}
    </MetricFrame>
  );
}

function MetricFrame({
  children,
  className,
  icon: Icon,
  label,
}: {
  children: ReactNode;
  className?: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 overflow-visible px-3 py-1 text-muted-foreground first:pl-0 ${styles.metricTile} ${
        className ?? ""
      }`}
    >
      <Icon className="shrink-0 text-primary" size={16} />
      <div className="min-w-0">
        <span className="block truncate text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        {children}
      </div>
    </div>
  );
}

type NumericChange = {
  delta: number;
  from: number;
  id: number;
  to: number;
};

function useNumericTransition(targetValue: number, durationMs: number) {
  const previousValueRef = useRef(targetValue);
  const [change, setChange] = useState<NumericChange | null>(null);
  const displayValue = useAnimatedNumber({
    change,
    durationMs,
    targetValue,
  });

  useEffect(() => {
    const previousValue = previousValueRef.current;
    if (previousValue === targetValue) return;

    const nextChange = {
      delta: targetValue - previousValue,
      from: previousValue,
      id: Date.now(),
      to: targetValue,
    };

    previousValueRef.current = targetValue;
    setChange(nextChange);

    const timeoutId = window.setTimeout(() => {
      setChange((currentChange) =>
        currentChange?.id === nextChange.id ? null : currentChange,
      );
    }, durationMs + 300);

    return () => window.clearTimeout(timeoutId);
  }, [durationMs, targetValue]);

  return { change, displayValue };
}

function useAnimatedNumber({
  change,
  durationMs,
  targetValue,
}: {
  change: NumericChange | null;
  durationMs: number;
  targetValue: number;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [displayValue, setDisplayValue] = useState(targetValue);

  useEffect(() => {
    if (!change || prefersReducedMotion) {
      const frameId = window.requestAnimationFrame(() => {
        setDisplayValue(targetValue);
      });

      return () => window.cancelAnimationFrame(frameId);
    }

    let frameId = 0;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(
        change.from + (change.to - change.from) * easedProgress,
      );

      setDisplayValue(nextValue);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame((now) => {
      setDisplayValue(change.from);
      tick(now);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [change, durationMs, prefersReducedMotion, targetValue]);

  return displayValue;
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

function usePulseOnChange(value: string, durationMs: number) {
  const previousValueRef = useRef(value);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (previousValueRef.current === value) return;

    previousValueRef.current = value;
    setIsPulsing(true);

    const timeoutId = window.setTimeout(() => setIsPulsing(false), durationMs);
    return () => window.clearTimeout(timeoutId);
  }, [durationMs, value]);

  return isPulsing;
}

function parseIntegerMetric(value: string) {
  const normalizedValue = value.replace(/\./g, "");
  const match = normalizedValue.match(/^-?\d+/);

  return match ? Number(match[0]) : null;
}

function formatMoneyFromCents(
  cents: number,
  currencyCode: GameSnapshot["factory"]["currencyCode"],
) {
  return new Intl.NumberFormat("tr-TR", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(cents / 100);
}

function formatSignedMoneyFromCents(
  cents: number,
  currencyCode: GameSnapshot["factory"]["currencyCode"],
) {
  const sign = cents >= 0 ? "+" : "-";

  return `${sign}${formatMoneyFromCents(Math.abs(cents), currencyCode)}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSignedNumber(value: number) {
  const sign = value >= 0 ? "+" : "-";

  return `${sign}${formatNumber(Math.abs(value))}`;
}

function formatSignedLevel(value: number) {
  const sign = value >= 0 ? "+" : "-";

  return `${sign}Lv.${formatNumber(Math.abs(value))}`;
}
