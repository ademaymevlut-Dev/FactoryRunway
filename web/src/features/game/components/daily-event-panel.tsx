"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import {
  DailyEventRowView,
  type DailyEventIconKey,
  type DailyEventTone,
} from "@/components/game-presentation/daily-event-row-view";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  numberLocale as resolveNumberLocale,
  type NumberLocale,
  type SupportedLocale,
} from "@/lib/i18n/locales";

import { formatShiftPlaybackTime, getShiftPlaybackMinute } from "../shift-playback";
import {
  getFinanceCategoryLabel,
  shiftPlaybackCopy,
  type ShiftPlaybackCopy,
} from "../shift-playback-copy";
import {
  setStoredString,
  useGameUiStore,
  useStoredString,
} from "../store/game-ui-store";
import type { GameSnapshot, ShiftPlaybackTimelineEvent } from "../types";

const CLOSED_DAILY_EVENT_PANEL_KEY = "factory-runway:closed-daily-events";

export function DailyEventPanel({
  currencyCode,
  locale,
}: {
  currencyCode: GameSnapshot["factory"]["currencyCode"];
  locale: SupportedLocale;
}) {
  const copy = shiftPlaybackCopy[locale].dailyEvents;
  const numberLocale = resolveNumberLocale(locale);
  const { activeShiftPlayback, shiftPlaybackNowMs } = useGameUiStore();
  const closedShiftId = useStoredString(CLOSED_DAILY_EVENT_PANEL_KEY);
  const [closingShiftId, setClosingShiftId] = useState<string | null>(null);
  const [revealState, setRevealState] = useState({ count: 0, shiftId: "" });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pinnedToBottomRef = useRef(true);

  const shiftMinute = activeShiftPlayback
    ? getShiftPlaybackMinute(activeShiftPlayback, shiftPlaybackNowMs)
    : 0;
  const displayableEvents = useMemo(() => {
    if (!activeShiftPlayback) return [];

    return activeShiftPlayback.timelineEvents.filter(shouldShowDailyEvent);
  }, [activeShiftPlayback]);
  const eligibleEvents = useMemo(() => {
    if (!activeShiftPlayback) return [];

    return displayableEvents.filter(
      (event) => event.minute <= shiftMinute,
    );
  }, [activeShiftPlayback, displayableEvents, shiftMinute]);
  const revealCount =
    activeShiftPlayback && revealState.shiftId === activeShiftPlayback.shiftId
      ? revealState.count
      : 0;
  const visibleEvents = eligibleEvents.slice(0, revealCount);

  useEffect(() => {
    if (!activeShiftPlayback) return;
    if (
      revealState.shiftId === activeShiftPlayback.shiftId &&
      revealState.count >= eligibleEvents.length
    ) {
      return;
    }

    const timeoutId = window.setTimeout(
      () => {
        setRevealState((current) => {
          if (current.shiftId !== activeShiftPlayback.shiftId) {
            return { count: 0, shiftId: activeShiftPlayback.shiftId };
          }

          return {
            count: Math.min(current.count + 1, eligibleEvents.length),
            shiftId: current.shiftId,
          };
        });
      },
      revealState.shiftId === activeShiftPlayback.shiftId
        ? revealState.count === 0
          ? 180
          : 620
        : 0,
    );

    return () => window.clearTimeout(timeoutId);
  }, [
    activeShiftPlayback,
    eligibleEvents.length,
    revealState.count,
    revealState.shiftId,
  ]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !pinnedToBottomRef.current) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
  }, [visibleEvents.length]);

  if (!activeShiftPlayback) return null;
  if (closedShiftId === activeShiftPlayback.shiftId) return null;

  const isClosing = closingShiftId === activeShiftPlayback.shiftId;
  const close = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finalizeClose(activeShiftPlayback.shiftId);
      return;
    }
    setClosingShiftId(activeShiftPlayback.shiftId);
  };
  const finalizeClose = (shiftId: string) => {
    setStoredString(CLOSED_DAILY_EVENT_PANEL_KEY, shiftId);
  };

  return (
    <aside
      aria-label={copy.panelAria}
      className={[
        "pointer-events-auto absolute right-4 top-6 z-[55] flex h-[min(760px,calc(100dvh-48px))] w-[400px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:slide-in-from-right-12 motion-safe:duration-500",
        isClosing
          ? "motion-safe:animate-out motion-safe:fade-out-0 motion-safe:zoom-out-95 motion-safe:slide-out-to-right-10 motion-safe:duration-300"
          : "",
      ].join(" ")}
      data-daily-event-panel
      onAnimationEnd={() => {
        if (isClosing) finalizeClose(activeShiftPlayback.shiftId);
      }}
    >
      <header className="flex items-start gap-3 border-b border-white/10 bg-background/45 p-4 backdrop-blur-md">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
            {copy.title}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            {copy.dayLabel(activeShiftPlayback.simulatedGameDay)}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {copy.countLabel(visibleEvents.length, displayableEvents.length)}
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label={copy.closeAria}
              onClick={close}
              className="border border-white/15 bg-white/10 text-white shadow-sm hover:bg-white/20 hover:text-white"
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">{copy.closeTooltip}</TooltipContent>
        </Tooltip>
      </header>
      <div
        className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3"
        onScroll={(event) => {
          const target = event.currentTarget;
          pinnedToBottomRef.current =
            target.scrollHeight - target.scrollTop - target.clientHeight < 24;
        }}
        ref={viewportRef}
      >
        {visibleEvents.map((event, index) => (
          <DailyEventRowView
            animationDelayMs={Math.min(index, 8) * 70}
            categoryKey={event.category}
            categoryLabel={copy.categories[event.category]}
            description={renderEventDescription({
              copy,
              currencyCode,
              event,
              numberLocale,
            })}
            iconKey={getEventIconKey(event)}
            key={event.id}
            severity={event.severity}
            timestampLabel={formatShiftPlaybackTime(event.minute)}
            title={renderEventTitle({
              copy,
              event,
              numberLocale,
            })}
            tone={getEventTone(event)}
          />
        ))}
      </div>
    </aside>
  );
}

function getEventIconKey(
  event: ShiftPlaybackTimelineEvent,
): DailyEventIconKey {
  if (event.eventKey === "shift.started") return "play";
  if (event.eventKey === "shift.completed") return "flag";
  if (event.eventKey.startsWith("xp.")) return "sparkles";
  if (event.category === "FINANCE" || event.category === "PAYMENT") {
    return event.eventKey === "operating_expense.paid"
      ? "receipt"
      : "banknote";
  }
  if (event.category === "SHIPPING") return "truck";
  if (event.category === "OUTSOURCING") return "boxes";
  if (event.category === "STAFF") return "user";
  if (event.category === "MACHINE") return "wrench";
  if (event.severity === "SUCCESS") return "check";
  if (event.category === "PRODUCTION") return "package";

  return "info";
}

function getEventTone(event: ShiftPlaybackTimelineEvent): DailyEventTone {
  if (event.eventKey.startsWith("xp.")) {
    return "violet";
  }
  if (event.eventKey.startsWith("penalty.")) {
    return "danger";
  }
  if (event.eventKey.startsWith("customer.relationship_")) {
    return event.eventKey === "customer.relationship_gained"
      ? "success"
      : "orange";
  }
  if (event.eventKey === "shift.started") {
    return "sky";
  }
  if (event.eventKey === "shift.completed") {
    return "success";
  }
  if (event.category === "PAYMENT") {
    return "success";
  }
  if (event.category === "FINANCE") {
    return "warning";
  }
  if (event.category === "OUTSOURCING") {
    return "fuchsia";
  }
  if (event.category === "SHIPPING") {
    return "cyan";
  }
  if (event.category === "STAFF") {
    return "orange";
  }
  if (event.category === "MACHINE") {
    return "machine";
  }
  if (event.eventKey.startsWith("chaos.")) {
    return "warning";
  }
  if (event.severity === "WARNING") {
    return "orange";
  }
  if (event.severity === "CRITICAL") {
    return "danger";
  }

  return "info";
}

function shouldShowDailyEvent(event: ShiftPlaybackTimelineEvent) {
  return !event.eventKey.startsWith("department.");
}

function renderEventTitle({
  copy,
  event,
  numberLocale,
}: {
  copy: ShiftPlaybackCopy["dailyEvents"];
  event: ShiftPlaybackTimelineEvent;
  numberLocale: NumberLocale;
}) {
  const payload = event.payload;
  const xp = formatNumber(Number(payload.amountXp ?? 0), numberLocale);

  if (event.eventKey.startsWith("xp.") && payload.leveledUp === true) {
    return copy.titles.levelUp(
      formatNumber(Number(payload.currentLevel ?? 0), numberLocale),
    );
  }

  switch (event.eventKey) {
    case "chaos.staff_absence.small":
    case "chaos.staff_absence.minor":
    case "chaos.staff_absence":
      return copy.titles.chaosStaffAbsence;
    case "chaos.staff_absence.regular":
      return copy.titles.chaosStaffAbsenceDepartment;
    case "chaos.staff.flu_wave":
    case "chaos.flu_wave":
      return copy.titles.chaosFluWave;
    case "chaos.machine.minor_issue":
    case "chaos.machine_breakdown":
      return copy.titles.chaosMachine;
    case "chaos.power.flicker":
    case "chaos.power_issue":
      return copy.titles.chaosPowerIssue;
    case "chaos.material.delay":
    case "chaos.material_delay":
      return copy.titles.chaosMaterialDelay;
    case "chaos.weather.bad_weather":
    case "chaos.bad_weather":
      return copy.titles.chaosBadWeather;
    case "shift.started":
      return copy.titles.shiftStarted;
    case "shift.completed":
      return copy.titles.shiftCompleted;
    case "xp.shift_completed":
      return copy.titles.shiftCompletedXp(xp);
    case "xp.order_completed":
      return copy.titles.orderCompletedXp(xp);
    case "xp.on_time_delivery":
      return copy.titles.onTimeDeliveryXp(xp);
    case "xp.premium_order":
      return copy.titles.premiumBonus(xp);
    case "xp.luxury_order":
      return copy.titles.luxuryBonus(xp);
    case "department.production_completed":
      return copy.titles.departmentProductionCompleted(
        String(payload.departmentName ?? ""),
      );
    case "department.completed_early":
      return copy.titles.completedEarly(String(payload.departmentName ?? ""));
    case "department.no_wip":
      return copy.titles.departmentNoWip(String(payload.departmentName ?? ""));
    case "department.capacity_used":
      return copy.titles.capacityUsed(String(payload.departmentName ?? ""));
    case "shipping.order_shipped":
      return copy.titles.orderShipped;
    case "payment.customer_received":
      return copy.titles.paymentReceived;
    case "customer.relationship_gained":
      return copy.titles.customerRelationshipGained;
    case "customer.relationship_lost":
      return copy.titles.customerRelationshipLost;
    case "penalty.order_late_paid":
      return copy.titles.penaltyPaid;
    case "penalty.order_late_partial":
      return copy.titles.penaltyPartial;
    case "penalty.order_late_overdue":
      return copy.titles.penaltyOverdue;
    case "leasing.down_payment_paid":
      return copy.titles.leasingDownPaymentPaid;
    case "leasing.payment_paid":
      return copy.titles.leasingPaymentPaid;
    case "leasing.payment_partial":
      return copy.titles.leasingPaymentPartial;
    case "leasing.payment_overdue":
      return copy.titles.leasingPaymentOverdue;
    case "leasing.contract_completed":
      return copy.titles.leasingContractCompleted;
    case "payroll.paid":
      return copy.titles.payrollPaid;
    case "operating_expense.paid":
      return copy.titles.financeExpensePaid(
        getFinanceCategoryLabel(copy, payload.category),
      );
    case "outsource.completed":
      return copy.titles.outsourceCompleted;
    case "outsource.payment_paid":
      return copy.titles.outsourcePaymentPaid;
    default:
      if (event.eventKey.startsWith("chaos.")) {
        return copy.titles.chaosDefault;
      }
      return event.eventKey;
  }
}

function renderEventDescription({
  copy,
  currencyCode,
  event,
  numberLocale,
}: {
  copy: ShiftPlaybackCopy["dailyEvents"];
  currencyCode: GameSnapshot["factory"]["currencyCode"];
  event: ShiftPlaybackTimelineEvent;
  numberLocale: NumberLocale;
}) {
  const payload = event.payload;
  const orderFallback = copy.fallbacks.order;
  const balanceAfterXp = formatNumber(
    Number(payload.balanceAfterXp ?? 0),
    numberLocale,
  );

  if (event.eventKey.startsWith("xp.") && payload.leveledUp === true) {
    return copy.descriptions.levelUp(
      formatNumber(Number(payload.amountXp ?? 0), numberLocale),
      balanceAfterXp,
    );
  }

  if (event.eventKey.startsWith("chaos.")) {
    return renderChaosDescription({ copy, event, numberLocale });
  }

  switch (event.eventKey) {
    case "shift.started":
      return copy.descriptions.shiftStarted(
        formatNumber(Number(payload.activeLineCount ?? 0), numberLocale),
      );
    case "shift.completed":
      return copy.descriptions.shiftCompleted(
        formatNumber(
          Number(payload.simulatedGameDay ?? event.gameDay),
          numberLocale,
        ),
      );
    case "xp.shift_completed":
      return copy.descriptions.shiftCompletedXp(balanceAfterXp);
    case "xp.order_completed":
      return copy.descriptions.orderCompletedXp(
        String(payload.orderNo ?? orderFallback),
        balanceAfterXp,
      );
    case "xp.on_time_delivery":
      return copy.descriptions.onTimeDeliveryXp(
        String(payload.orderNo ?? orderFallback),
        balanceAfterXp,
      );
    case "xp.premium_order":
      return copy.descriptions.premiumBonus(
        String(payload.orderNo ?? orderFallback),
        balanceAfterXp,
      );
    case "xp.luxury_order":
      return copy.descriptions.luxuryBonus(
        String(payload.orderNo ?? orderFallback),
        balanceAfterXp,
      );
    case "customer.relationship_gained":
      return copy.descriptions.customerRelationshipGained(
        String(payload.orderCode ?? orderFallback),
      );
    case "customer.relationship_lost":
      return copy.descriptions.customerRelationshipLost(
        String(payload.orderCode ?? orderFallback),
      );
    case "penalty.order_late_paid":
      return copy.descriptions.penaltyPaid(
        String(payload.orderNo ?? orderFallback),
        formatMoneyLike(
          String(payload.amountCents ?? "0"),
          currencyCode,
          numberLocale,
        ),
      );
    case "penalty.order_late_partial":
      return copy.descriptions.penaltyPartial(
        String(payload.orderNo ?? orderFallback),
        formatMoneyLike(
          String(payload.remainingCents ?? "0"),
          currencyCode,
          numberLocale,
        ),
      );
    case "penalty.order_late_overdue":
      return copy.descriptions.penaltyOverdue(
        String(payload.orderNo ?? orderFallback),
        formatMoneyLike(
          String(payload.remainingCents ?? payload.amountCents ?? "0"),
          currencyCode,
          numberLocale,
        ),
      );
    case "operating_expense.paid":
      return copy.descriptions.financeExpensePaid(
        getFinanceCategoryLabel(copy, payload.category),
        formatMoneyLike(
          String(payload.amountCents ?? "0"),
          currencyCode,
          numberLocale,
        ),
      );
    default:
      break;
  }

  if ("producedQuantity" in payload) {
    return copy.descriptions.processedQuantity(
      formatNumber(Number(payload.producedQuantity), numberLocale),
    );
  }
  if ("remainingQuantity" in payload) {
    return copy.descriptions.remainingQuantity(
      formatNumber(Number(payload.remainingQuantity), numberLocale),
    );
  }
  if ("shippedQuantity" in payload) {
    return copy.descriptions.shippedQuantity(
      String(payload.orderCode ?? orderFallback),
      formatNumber(Number(payload.shippedQuantity), numberLocale),
    );
  }
  if ("quantity" in payload) {
    return copy.descriptions.orderQuantity(
      String(payload.orderCode ?? orderFallback),
      formatNumber(Number(payload.quantity), numberLocale),
    );
  }
  if ("amountCents" in payload) {
    return copy.descriptions.amountRecorded(
      formatMoneyLike(String(payload.amountCents), currencyCode, numberLocale),
    );
  }
  if ("activeLineCount" in payload) {
    return copy.descriptions.activeLinesCalculated(
      formatNumber(Number(payload.activeLineCount), numberLocale),
    );
  }

  return copy.descriptions.timelineDefault;
}

function renderChaosDescription({
  copy,
  event,
  numberLocale,
}: {
  copy: ShiftPlaybackCopy["dailyEvents"];
  event: ShiftPlaybackTimelineEvent;
  numberLocale: NumberLocale;
}) {
  const payload = event.payload;
  const target = getChaosTargetLabel(payload, copy);
  const capacityLoss = formatBpsPercent(
    Number(payload.capacityLossBps ?? 0),
    numberLocale,
  );

  if (event.category === "STAFF") {
    const affectedStaffCount = Number(payload.affectedStaffCount ?? 0);
    const staffPart =
      affectedStaffCount > 0
        ? copy.descriptions.chaosStaffAffected(
            formatNumber(affectedStaffCount, numberLocale),
          )
        : "";

    return copy.descriptions.chaosStaff(target, staffPart, capacityLoss);
  }

  if (event.category === "MACHINE") {
    return copy.descriptions.chaosMachine(target, capacityLoss);
  }

  return copy.descriptions.chaosSystem(target, capacityLoss);
}

function getChaosTargetLabel(
  payload: ShiftPlaybackTimelineEvent["payload"],
  copy: ShiftPlaybackCopy["dailyEvents"],
) {
  const departmentName =
    typeof payload.departmentName === "string" ? payload.departmentName : null;
  const lineLabel = typeof payload.lineLabel === "string" ? payload.lineLabel : null;

  if (departmentName && lineLabel) return `${departmentName} / ${lineLabel}`;
  if (departmentName) return departmentName;
  if (lineLabel) return lineLabel;

  return copy.fallbacks.factoryWide;
}

function formatBpsPercent(value: number, numberLocale: NumberLocale) {
  const percent = Number.isFinite(value) ? Math.max(0, value) / 10_000 : 0;

  return new Intl.NumberFormat(numberLocale, {
    maximumFractionDigits: percent >= 0.1 ? 0 : 1,
    minimumFractionDigits: 0,
    style: "percent",
  }).format(percent);
}

function formatNumber(value: number, numberLocale: NumberLocale) {
  return new Intl.NumberFormat(numberLocale).format(value);
}

function formatMoneyLike(
  cents: string,
  currencyCode: GameSnapshot["factory"]["currencyCode"],
  numberLocale: NumberLocale,
) {
  const value = Number(cents) / 100;

  return new Intl.NumberFormat(numberLocale, {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number.isFinite(value) ? value : 0);
}
