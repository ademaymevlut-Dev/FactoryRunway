"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  Boxes,
  CheckCircle2,
  Info,
  PackageCheck,
  Truck,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { formatShiftPlaybackTime, getShiftPlaybackMinute } from "../shift-playback";
import {
  setStoredString,
  useGameUiStore,
  useStoredString,
} from "../store/game-ui-store";
import type { ShiftPlaybackTimelineEvent } from "../types";

const CLOSED_DAILY_EVENT_PANEL_KEY = "factory-runway:closed-daily-events";

export function DailyEventPanel() {
  const { activeShiftPlayback, shiftPlaybackNowMs } = useGameUiStore();
  const closedShiftId = useStoredString(CLOSED_DAILY_EVENT_PANEL_KEY);
  const [closingShiftId, setClosingShiftId] = useState<string | null>(null);
  const [revealState, setRevealState] = useState({ count: 0, shiftId: "" });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pinnedToBottomRef = useRef(true);

  const shiftMinute = activeShiftPlayback
    ? getShiftPlaybackMinute(activeShiftPlayback, shiftPlaybackNowMs)
    : 0;
  const eligibleEvents = useMemo(() => {
    if (!activeShiftPlayback) return [];

    return activeShiftPlayback.timelineEvents.filter(
      (event) => event.minute <= shiftMinute,
    );
  }, [activeShiftPlayback, shiftMinute]);
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
      aria-label="Günlük olay paneli"
      className={[
        "pointer-events-auto absolute right-4 top-6 z-[55] flex h-[min(760px,calc(100dvh-48px))] w-[400px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-xl border border-white/10 bg-background/92 shadow-2xl backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:slide-in-from-right-12 motion-safe:duration-500",
        isClosing
          ? "motion-safe:animate-out motion-safe:fade-out-0 motion-safe:zoom-out-95 motion-safe:slide-out-to-right-10 motion-safe:duration-300"
          : "",
      ].join(" ")}
      data-daily-event-panel
      onAnimationEnd={() => {
        if (isClosing) finalizeClose(activeShiftPlayback.shiftId);
      }}
    >
      <header className="flex items-start gap-3 border-b border-white/10 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
            Günlük Olaylar
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            {activeShiftPlayback.simulatedGameDay}. Gün
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {visibleEvents.length} / {activeShiftPlayback.timelineEvents.length} olay
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label="Günlük olayları kapat"
              onClick={close}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Kapat</TooltipContent>
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
          <DailyEventRow event={event} index={index} key={event.id} />
        ))}
      </div>
    </aside>
  );
}

function DailyEventRow({
  event,
  index,
}: {
  event: ShiftPlaybackTimelineEvent;
  index: number;
}) {
  return (
    <article
      className="grid grid-cols-[auto_1fr] gap-3 rounded-lg border border-white/10 bg-card/72 p-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-4 motion-safe:duration-300"
      data-event-category={event.category}
      data-event-severity={event.severity}
      style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
    >
      <div className="mt-0.5 grid size-8 place-items-center rounded-full border border-white/10 bg-background/80 text-primary">
        <EventIcon event={event} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {formatShiftPlaybackTime(event.minute)}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {event.category}
          </span>
        </div>
        <p className="mt-1 text-sm font-medium text-white">
          {renderEventTitle(event)}
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {renderEventDescription(event)}
        </p>
      </div>
    </article>
  );
}

function EventIcon({ event }: { event: ShiftPlaybackTimelineEvent }) {
  if (event.category === "FINANCE" || event.category === "PAYMENT") {
    return <Banknote className="size-4" />;
  }
  if (event.category === "SHIPPING") return <Truck className="size-4" />;
  if (event.category === "OUTSOURCING") return <Boxes className="size-4" />;
  if (event.severity === "SUCCESS") return <CheckCircle2 className="size-4" />;
  if (event.category === "PRODUCTION") return <PackageCheck className="size-4" />;

  return <Info className="size-4" />;
}

function renderEventTitle(event: ShiftPlaybackTimelineEvent) {
  const payload = event.payload;

  switch (event.eventKey) {
    case "shift.started":
      return "Vardiya başladı";
    case "shift.completed":
      return "Vardiya tamamlandı";
    case "department.production_completed":
      return `${payload.departmentName} üretimi tamamladı`;
    case "department.completed_early":
      return `${payload.departmentName} erken tamamladı`;
    case "department.no_wip":
      return `${payload.departmentName} için hazır WIP yok`;
    case "department.capacity_used":
      return `${payload.departmentName} kapasitesi kullanıldı`;
    case "shipping.order_shipped":
      return "Sipariş sevk edildi";
    case "payment.customer_received":
      return "Müşteri ödemesi alındı";
    case "leasing.down_payment_paid":
      return "Leasing peşinatı ödendi";
    case "leasing.payment_paid":
      return "Leasing taksiti ödendi";
    case "leasing.payment_partial":
      return "Leasing taksiti kısmi ödendi";
    case "leasing.payment_overdue":
      return "Leasing taksiti gecikti";
    case "leasing.contract_completed":
      return "Leasing sözleşmesi tamamlandı";
    case "payroll.paid":
      return "Maaş ödemesi yapıldı";
    case "operating_expense.paid":
      return "İşletme gideri ödendi";
    case "outsource.completed":
      return "Fason işlem tamamlandı";
    case "outsource.payment_paid":
      return "Fason ödeme yapıldı";
    default:
      return event.eventKey;
  }
}

function renderEventDescription(event: ShiftPlaybackTimelineEvent) {
  const payload = event.payload;

  if ("producedQuantity" in payload) {
    return `${formatNumber(Number(payload.producedQuantity))} adet işlendi.`;
  }
  if ("remainingQuantity" in payload) {
    return `${formatNumber(Number(payload.remainingQuantity))} adet yarına kaldı.`;
  }
  if ("shippedQuantity" in payload) {
    return `${payload.orderCode ?? "Sipariş"} için ${formatNumber(Number(payload.shippedQuantity))} adet sevk edildi.`;
  }
  if ("quantity" in payload) {
    return `${payload.orderCode ?? "Sipariş"} için ${formatNumber(Number(payload.quantity))} adet.`;
  }
  if ("amountCents" in payload) {
    return `${formatMoneyLike(String(payload.amountCents))} tutarında kayıt oluştu.`;
  }
  if ("activeLineCount" in payload) {
    return `${formatNumber(Number(payload.activeLineCount))} aktif hat ile üretim hesaplandı.`;
  }

  return "Günlük vardiya zaman çizelgesine işlendi.";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function formatMoneyLike(cents: string) {
  const value = Number(cents) / 100;

  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "EUR",
  }).format(Number.isFinite(value) ? value : 0);
}
