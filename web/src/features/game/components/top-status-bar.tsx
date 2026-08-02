"use client";

import Image from "next/image";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  Coins,
  Factory,
  Gauge,
  Languages,
  LogOut,
  Mail,
  Sparkles,
  Trophy,
  UserRound,
  Wallet,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { logoutAction } from "@/app/user-actions";
import { GameLocaleSwitcher } from "@/components/game-locale-switcher";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useGameUiStore } from "../store/game-ui-store";
import { gameCopy } from "../game-copy";
import {
  getCriticalFactoryNotificationCount,
  MOBILE_FACTORY_STATUS_SHEET_EDGE_GAP_PX,
  MOBILE_FACTORY_STATUS_SHEET_MAX_WIDTH_PX,
  MOBILE_FACTORY_STATUS_SHEET_TOP_GAP_PX,
  getMobileFactoryNamePresentation,
} from "../mobile-factory-header";
import type { GamePanelKey, GameSnapshot } from "../types";
import styles from "./top-status-bar.module.css";

const VALUE_ANIMATION_MS = 4_200;
const SMALL_METRIC_ANIMATION_MS = 900;
const MOBILE_FACTORY_STATUS_SHEET_ID = "mobile-factory-status-sheet";
const topStatusBarPositionStyle = {
  top: "calc(env(safe-area-inset-top, 0px) + var(--game-header-block-offset, 0.5rem))",
  right:
    "calc(env(safe-area-inset-right, 0px) + var(--game-header-inline-offset, 0.5rem))",
  left: "calc(env(safe-area-inset-left, 0px) + var(--game-header-inline-offset, 0.5rem))",
} satisfies CSSProperties;

const mobileBottomSheetTokensStyle = {
  "--factory-status-sheet-edge-gap":
    `${MOBILE_FACTORY_STATUS_SHEET_EDGE_GAP_PX}px`,
  "--factory-status-sheet-max-width":
    `${MOBILE_FACTORY_STATUS_SHEET_MAX_WIDTH_PX}px`,
  "--factory-status-sheet-top-gap":
    `${MOBILE_FACTORY_STATUS_SHEET_TOP_GAP_PX}px`,
} as CSSProperties;

const metricIcons: Record<string, LucideIcon> = {
  cash: Wallet,
  day: CalendarDays,
  late: AlertTriangle,
  level: Sparkles,
  orders: ClipboardList,
  rt: Coins,
  staff: UserRound,
  xp: Zap,
};

const compactHeaderMetricIds = new Set(["cash", "xp", "rt"]);

export function TopStatusBar({
  position = "absolute",
  snapshot,
}: {
  position?: "absolute" | "fixed";
  snapshot: GameSnapshot;
}) {
  const { activePanel, closePanel, openPanel } = useGameUiStore();
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const displayedSnapshot = useDelayedHudSnapshot(snapshot);
  const stagePulse = usePulseOnChange(
    displayedSnapshot.factory.operatingStageName,
    1_600,
  );
  const copy = gameCopy[displayedSnapshot.locale].topStatus;

  return (
    <header
      className={`game-top-status-bar pointer-events-none z-30 ${position}`}
      style={topStatusBarPositionStyle}
    >
      <DesktopHeaderContent
        activePanelKey={activePanel?.key ?? null}
        closePanel={closePanel}
        copy={copy}
        openPanel={openPanel}
        snapshot={displayedSnapshot}
        stagePulse={stagePulse}
      />
      <MobileHeaderContent
        alertCount={getCriticalFactoryNotificationCount(
          displayedSnapshot.notifications,
        )}
        copy={copy}
        onOpenPanel={(panelKey) => {
          setMobileSheetOpen(false);
          openPanel(panelKey);
        }}
        onSheetOpenChange={setMobileSheetOpen}
        sheetOpen={mobileSheetOpen}
        snapshot={displayedSnapshot}
      />
    </header>
  );
}

function DesktopHeaderContent({
  activePanelKey,
  closePanel,
  copy,
  openPanel,
  snapshot,
  stagePulse,
}: {
  activePanelKey: GamePanelKey | null;
  closePanel: () => void;
  copy: GameCopyTopStatus;
  openPanel: (key: "playerFeedback" | "ranking") => void;
  snapshot: GameSnapshot;
  stagePulse: boolean;
}) {
  return (
    <div
      className={`pointer-events-auto mx-auto flex max-w-[1500px] items-center gap-1.5 rounded-lg bg-background/88 p-1.5 shadow-2xl backdrop-blur sm:gap-2 sm:p-2 xl:gap-3 xl:p-3 ${styles.desktopHeaderContent}`}
      data-desktop-game-header
    >
      <div className="flex min-w-0 items-center gap-2 border-r border-card pr-2 sm:gap-2.5 sm:pr-3 xl:gap-3 xl:pr-4">
        <FactoryLogo desktop />
        <div className="min-w-0 max-w-[9.5rem] sm:max-w-[11rem] xl:max-w-[16rem]">
          <p className="truncate text-[8px] font-semibold uppercase tracking-widest text-primary sm:text-[9px] xl:text-[11px]">
            {snapshot.factory.sectorName}
          </p>
          <h1 className="truncate text-xs font-semibold text-white sm:text-sm xl:text-lg">
            {snapshot.factory.name}
          </h1>
          <p
            className={`hidden truncate text-xs text-muted-foreground xl:block ${
              stagePulse ? styles.stageChanged : ""
            }`}
          >
            {snapshot.factory.operatingStageName}
          </p>
        </div>
      </div>

      <div className="grid min-w-0 flex-1 grid-cols-3 divide-x divide-card xl:grid-cols-7">
        {snapshot.metrics.map((metric) => {
          const Icon = metricIcons[metric.id] ?? Gauge;
          const metricVisibilityClassName = compactHeaderMetricIds.has(metric.id)
            ? ""
            : "hidden xl:block";
          let metricNode: ReactNode;

          if (metric.id === "cash") {
            metricNode = (
              <AnimatedCashMetric
                currencyCode={snapshot.factory.currencyCode}
                currentCents={Number(snapshot.factory.availableBalanceCents)}
                icon={Icon}
                label={metric.label}
                numberLocale={snapshot.numberLocale}
              />
            );
          } else if (metric.id === "xp") {
            metricNode = (
              <AnimatedXpMetric
                currentXp={snapshot.factory.currentXp}
                icon={Icon}
                label={metric.label}
                numberLocale={snapshot.numberLocale}
              />
            );
          } else if (metric.id === "rt") {
            metricNode = (
              <AnimatedRunwayTokenMetric
                balance={snapshot.factory.runwayTokenBalance}
                icon={Icon}
                label={metric.label}
                numberLocale={snapshot.numberLocale}
              />
            );
          } else if (metric.id === "level") {
            metricNode = (
              <AnimatedLevelMetric
                currentLevel={snapshot.factory.currentLevel}
                icon={Icon}
                label={metric.label}
                numberLocale={snapshot.numberLocale}
              />
            );
          } else {
            metricNode = (
              <AnimatedMetric
                metric={metric}
                icon={Icon}
                numberLocale={snapshot.numberLocale}
              />
            );
          }

          return (
            <div className={metricVisibilityClassName} key={metric.id}>
              {metricNode}
            </div>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-0.5 border-l border-card pl-1.5 sm:gap-1 sm:pl-2 xl:pl-3">
        <button
          aria-label={copy.openRankingAria}
          aria-pressed={activePanelKey === "ranking"}
          className={cn(
            "flex h-7 items-center justify-center rounded-lg px-2 text-primary transition-colors hover:bg-card hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 sm:h-8 xl:h-9",
            activePanelKey === "ranking" && "bg-primary/12 text-primary",
          )}
          onClick={() => {
            if (activePanelKey === "ranking") {
              closePanel();
              return;
            }

            openPanel("ranking");
          }}
          title="Player Ranking"
          type="button"
        >
          <Trophy className="size-3.5 text-primary xl:size-4" />
        </button>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              aria-label={copy.messagesAria}
              aria-pressed={activePanelKey === "playerFeedback"}
              className={cn(
                "flex h-7 items-center justify-center rounded-lg px-2 text-primary transition-colors hover:bg-card hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 sm:h-8 xl:h-9",
                activePanelKey === "playerFeedback" &&
                  "bg-primary/12 text-primary",
              )}
              onClick={() => {
                if (activePanelKey === "playerFeedback") {
                  closePanel();
                  return;
                }

                openPanel("playerFeedback");
              }}
              type="button"
            >
              <Mail className="size-3.5 text-primary xl:size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{copy.messagesTooltip}</TooltipContent>
        </Tooltip>

        <GameLocaleSwitcher locale={snapshot.locale} variant="hud" />

        <form action={logoutAction}>
          <button
            aria-label={copy.logoutAria}
            className="flex h-7 items-center justify-center rounded-lg px-2 text-primary transition-colors hover:bg-card hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 sm:h-8 xl:h-9"
            title={copy.logoutTitle}
            type="submit"
          >
            <LogOut className="size-3.5 text-primary xl:size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function MobileHeaderContent({
  alertCount,
  copy,
  onOpenPanel,
  onSheetOpenChange,
  sheetOpen,
  snapshot,
}: {
  alertCount: number;
  copy: GameCopyTopStatus;
  onOpenPanel: (key: "playerFeedback" | "ranking") => void;
  onSheetOpenChange: (open: boolean) => void;
  sheetOpen: boolean;
  snapshot: GameSnapshot;
}) {
  const factoryName = getMobileFactoryNamePresentation(snapshot.factory.name);

  return (
    <Dialog onOpenChange={onSheetOpenChange} open={sheetOpen}>
      <div
        className={`pointer-events-auto mx-auto items-center rounded-xl border border-white/10 bg-background/90 px-2 shadow-2xl backdrop-blur-xl ${styles.mobileHeaderContent}`}
        data-mobile-game-header
      >
        <FactoryLogo />
        <div className={styles.mobileFactoryIdentity}>
          <p className="truncate text-[9px] font-semibold uppercase leading-none tracking-[0.18em] text-primary">
            {snapshot.factory.sectorName}
          </p>
          <h1
            aria-label={factoryName.accessibleName}
            className={`mt-1 text-sm font-semibold leading-none text-white ${styles.mobileFactoryName}`}
          >
            {factoryName.text}
          </h1>
        </div>

        <DialogTrigger asChild>
          <button
            aria-controls={MOBILE_FACTORY_STATUS_SHEET_ID}
            aria-expanded={sheetOpen}
            aria-label={copy.mobile.factoryStatus}
            className={`relative grid size-11 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary outline-none transition-colors hover:border-primary/50 hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-primary/55 ${styles.mobileStatusTrigger}`}
            data-map-control="true"
            onPointerDown={(event) => event.stopPropagation()}
            type="button"
          >
            <Factory aria-hidden="true" className="size-5" />
            {alertCount > 0 ? (
              <span
                aria-label={copy.mobile.alerts(alertCount)}
                className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full border border-amber-100/70 bg-amber-400 text-[8px] font-black leading-none text-amber-950 shadow-[0_0_12px_rgba(251,191,36,0.55)]"
              >
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            ) : null}
          </button>
        </DialogTrigger>
      </div>

      <MobileFactoryStatusSheet
        copy={copy}
        onOpenPanel={onOpenPanel}
        snapshot={snapshot}
      />
    </Dialog>
  );
}

function MobileFactoryStatusSheet({
  copy,
  onOpenPanel,
  snapshot,
}: {
  copy: GameCopyTopStatus;
  onOpenPanel: (key: "playerFeedback" | "ranking") => void;
  snapshot: GameSnapshot;
}) {
  return (
    <DialogContent
      className={`z-[51] max-w-none gap-0 overflow-hidden rounded-b-none rounded-t-3xl border border-b-0 border-white/10 bg-background/96 p-0 shadow-[0_-24px_70px_rgba(0,0,0,0.55)] outline-none backdrop-blur-xl ${styles.mobileSheetContent}`}
      data-factory-status-bottom-sheet
      id={MOBILE_FACTORY_STATUS_SHEET_ID}
      layout="custom"
      overlayClassName="game-modal-backdrop z-50 bg-background/70 backdrop-blur-sm motion-reduce:animate-none"
      showCloseButton={false}
      style={mobileBottomSheetTokensStyle}
    >
      <div className={`shrink-0 border-b border-white/10 px-4 pb-3 pt-2 ${styles.mobileSheetFixedHeader}`}>
        <div
          aria-hidden="true"
          className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/25"
        />
        <div className="flex items-center justify-between gap-4">
          <DialogTitle className="text-base font-semibold text-white">
            {copy.mobile.factoryStatus}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {copy.mobile.description}
          </DialogDescription>
          <DialogClose asChild>
            <Button
              aria-label={copy.mobile.close}
              className="size-11 shrink-0 rounded-xl"
              size="icon-lg"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" className="size-5" />
            </Button>
          </DialogClose>
        </div>
        <div className="mt-1 flex items-start gap-3">
          <FactoryLogo />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              {snapshot.factory.sectorName}
            </p>
            <p className={`mt-1 text-base font-semibold text-white ${styles.fullFactoryName}`}>
              {snapshot.factory.name}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {snapshot.factory.operatingStageName}
            </p>
          </div>
        </div>
      </div>

      <div className={styles.mobileSheetScroll}>
        <section className="border-b border-white/10 px-4 py-3">
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {copy.mobile.metrics}
          </h2>
          <dl className="space-y-1.5">
            {snapshot.metrics.map((metric) => (
              <MobileMetricRow
                icon={metricIcons[metric.id] ?? Gauge}
                key={metric.id}
                label={metric.label}
                subLabel={metric.subLabel}
                value={metric.value}
              />
            ))}
            <MobileMetricRow
              icon={UserRound}
              label={copy.mobile.staff}
              value={`${formatNumber(snapshot.map.totals.assignedStaff, snapshot.numberLocale)}/${formatNumber(snapshot.map.totals.idealStaff, snapshot.numberLocale)}`}
            />
          </dl>
        </section>

        <section className="px-4 py-3">
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {copy.mobile.management}
          </h2>
          <div className="space-y-1.5">
            <MobileManagementAction
              icon={Trophy}
              label={copy.mobile.ranking}
              onClick={() => onOpenPanel("ranking")}
            />
            <MobileManagementAction
              icon={Mail}
              label={copy.mobile.messages}
              onClick={() => onOpenPanel("playerFeedback")}
            />
            <div className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-card/45 px-3">
              <Languages aria-hidden="true" className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 text-sm font-medium text-white">
                {copy.mobile.language}
              </span>
              <GameLocaleSwitcher locale={snapshot.locale} variant="sheet" />
            </div>
            <form action={logoutAction}>
              <button
                aria-label={copy.logoutAria}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-3 text-left text-sm font-medium text-destructive outline-none transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive/45"
                type="submit"
              >
                <LogOut aria-hidden="true" className="size-4 shrink-0" />
                <span>{copy.mobile.logout}</span>
              </button>
            </form>
          </div>
        </section>
      </div>
    </DialogContent>
  );
}

function MobileMetricRow({
  icon: Icon,
  label,
  subLabel,
  value,
}: {
  icon: LucideIcon;
  label: string;
  subLabel?: string;
  value: string;
}) {
  return (
    <div className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-card/45 px-3 py-2">
      <Icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
      <dt className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-white">
          {label}
        </span>
        {subLabel ? (
          <span className="block text-[10px] text-muted-foreground">
            {subLabel}
          </span>
        ) : null}
      </dt>
      <dd className="max-w-[55%] shrink-0 text-right font-mono text-sm font-semibold tabular-nums text-white">
        {value}
      </dd>
    </div>
  );
}

function MobileManagementAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-white/10 bg-card/45 px-3 text-left text-sm font-medium text-white outline-none transition-colors hover:border-primary/30 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/45"
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
      <span>{label}</span>
    </button>
  );
}

function FactoryLogo({ desktop = false }: { desktop?: boolean }) {
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-lg bg-primary/10 text-primary",
        desktop ? "size-8 xl:size-11" : "size-9",
      )}
    >
      <Image
        alt="Factory Runway"
        className={cn(
          "object-contain",
          desktop ? "size-5 xl:size-7" : "size-5",
        )}
        height={28}
        priority
        src="/factoryRunway.svg"
        width={28}
      />
    </div>
  );
}

type GameCopyTopStatus = (typeof gameCopy)[GameSnapshot["locale"]]["topStatus"];

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
  numberLocale,
}: {
  currencyCode: GameSnapshot["factory"]["currencyCode"];
  currentCents: number;
  icon: LucideIcon;
  label: string;
  numberLocale: GameSnapshot["numberLocale"];
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
          className={`block truncate font-mono text-[11px] font-semibold leading-tight tabular-nums text-white sm:text-xs xl:text-sm ${
            isPositive
              ? styles.valuePositive
              : isNegative
                ? styles.valueNegative
                : ""
          }`}
        >
          {formatMoneyFromCents(transition.displayValue, currencyCode, numberLocale)}
        </strong>
        {transition.change ? (
          <span
            className={`hidden xl:inline-flex ${styles.deltaBadge} ${
              isPositive ? styles.deltaPositive : styles.deltaNegative
            }`}
          >
            {formatSignedMoneyFromCents(
              transition.change.delta,
              currencyCode,
              numberLocale,
            )}
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
  numberLocale,
}: {
  currentXp: number;
  icon: LucideIcon;
  label: string;
  numberLocale: GameSnapshot["numberLocale"];
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
          className={`block truncate font-mono text-[11px] font-semibold leading-tight tabular-nums text-white sm:text-xs xl:text-sm ${
            isPositive ? styles.valueXp : isNegative ? styles.valueNegative : ""
          }`}
        >
          {formatNumber(transition.displayValue, numberLocale)} XP
        </strong>
        {transition.change ? (
          <span
            className={`hidden xl:inline-flex ${styles.deltaBadge} ${
              isPositive ? styles.deltaXp : styles.deltaNegative
            }`}
          >
            {formatSignedNumber(transition.change.delta, numberLocale)} XP
          </span>
        ) : null}
      </div>
    </MetricFrame>
  );
}

function AnimatedRunwayTokenMetric({
  balance,
  icon,
  label,
  numberLocale,
}: {
  balance: number;
  icon: LucideIcon;
  label: string;
  numberLocale: GameSnapshot["numberLocale"];
}) {
  const transition = useNumericTransition(balance, VALUE_ANIMATION_MS);
  const isPositive = (transition.change?.delta ?? 0) > 0;
  const isNegative = (transition.change?.delta ?? 0) < 0;

  return (
    <MetricFrame
      className={isPositive ? styles.tokenPositive : undefined}
      icon={icon}
      iconClassName="text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.55)]"
      label={label}
    >
      <div className="flex min-w-0 items-center gap-2">
        <strong
          className={`block truncate font-mono text-[10px] font-semibold leading-tight tabular-nums text-amber-100 sm:text-[11px] xl:text-xs ${
            isPositive
              ? styles.valueToken
              : isNegative
                ? styles.valueNegative
                : ""
          }`}
        >
          {formatNumber(transition.displayValue, numberLocale)} RT
        </strong>
        {transition.change ? (
          <span
            className={`hidden xl:inline-flex ${styles.deltaBadge} ${
              isPositive ? styles.deltaToken : styles.deltaNegative
            }`}
          >
            {formatSignedNumber(transition.change.delta, numberLocale)} RT
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
  numberLocale,
}: {
  currentLevel: number;
  icon: LucideIcon;
  label: string;
  numberLocale: GameSnapshot["numberLocale"];
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
          className={`block truncate font-mono text-[11px] font-semibold leading-tight tabular-nums text-white sm:text-xs xl:text-sm ${
            leveledUp ? styles.valueLevel : ""
          }`}
        >
          Lv. {formatNumber(transition.displayValue, numberLocale)}
        </strong>
        {transition.change ? (
          <span
            className={`hidden xl:inline-flex ${styles.deltaBadge} ${
              leveledUp ? styles.deltaLevel : styles.deltaNegative
            }`}
          >
            {formatSignedLevel(transition.change.delta, numberLocale)}
          </span>
        ) : null}
      </div>
    </MetricFrame>
  );
}

function AnimatedMetric({
  icon,
  metric,
  numberLocale,
}: {
  icon: LucideIcon;
  metric: GameSnapshot["metrics"][number];
  numberLocale: GameSnapshot["numberLocale"];
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
      : formatNumber(transition.displayValue, numberLocale);
  const isDayMetric = metric.id === "day";

  return (
    <MetricFrame
      className={shouldAnimate ? styles.metricFlip : undefined}
      icon={icon}
      label={metric.label}
    >
      <strong
        className="block truncate font-mono text-[11px] font-semibold leading-tight tabular-nums text-white sm:text-xs xl:text-sm"
      >
        {displayValue}
      </strong>
      {isDayMetric ? (
        <span className="mt-0.5 block truncate text-[9px] font-semibold leading-tight text-primary xl:text-[10px]">
          {metric.subLabel}
        </span>
      ) : null}
    </MetricFrame>
  );
}

function MetricFrame({
  children,
  className,
  iconClassName,
  icon: Icon,
  label,
}: {
  children: ReactNode;
  className?: string;
  iconClassName?: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-1 overflow-visible px-1.5 py-0.5 text-muted-foreground sm:gap-1.5 sm:px-2 xl:gap-2 xl:px-3 xl:py-1 ${styles.metricTile} ${
        className ?? ""
      }`}
    >
      <Icon className={cn("size-3.5 shrink-0 text-primary xl:size-4", iconClassName)} />
      <div className="min-w-0">
        <span className="block truncate text-[8px] font-semibold uppercase tracking-widest text-muted-foreground xl:text-[10px]">
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
  const normalizedValue = value.replace(/[.,\s\u00a0]/g, "");
  const match = normalizedValue.match(/^-?\d+/);

  return match ? Number(match[0]) : null;
}

function formatMoneyFromCents(
  cents: number,
  currencyCode: GameSnapshot["factory"]["currencyCode"],
  numberLocale: GameSnapshot["numberLocale"],
) {
  return new Intl.NumberFormat(numberLocale, {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(cents / 100);
}

function formatSignedMoneyFromCents(
  cents: number,
  currencyCode: GameSnapshot["factory"]["currencyCode"],
  numberLocale: GameSnapshot["numberLocale"],
) {
  const sign = cents >= 0 ? "+" : "-";

  return `${sign}${formatMoneyFromCents(Math.abs(cents), currencyCode, numberLocale)}`;
}

function formatNumber(value: number, numberLocale: GameSnapshot["numberLocale"]) {
  return new Intl.NumberFormat(numberLocale, {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSignedNumber(
  value: number,
  numberLocale: GameSnapshot["numberLocale"],
) {
  const sign = value >= 0 ? "+" : "-";

  return `${sign}${formatNumber(Math.abs(value), numberLocale)}`;
}

function formatSignedLevel(
  value: number,
  numberLocale: GameSnapshot["numberLocale"],
) {
  const sign = value >= 0 ? "+" : "-";

  return `${sign}Lv.${formatNumber(Math.abs(value), numberLocale)}`;
}
