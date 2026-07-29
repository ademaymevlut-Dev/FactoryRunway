import { CalendarDays } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type {
  FinanceCashCalendar,
  FinanceTone,
} from "@/features/finance/types";
import type { CurrencyCode } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const moneyFormatters = new Map<CurrencyCode, Intl.NumberFormat>();

export function FinanceCashCalendar({
  calendar,
  currencyCode,
}: {
  calendar: FinanceCashCalendar;
  currencyCode: CurrencyCode;
}) {
  const riskPresentation = getRiskPresentation(calendar, currencyCode);

  return (
    <section className="rounded-lg border border-border bg-card/70 p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-md border border-primary/25 bg-primary/10 text-primary">
            <CalendarDays size={14} />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-xs font-semibold text-foreground">
              Nakit takvimi
            </h3>
            <p className="truncate text-[10px] text-muted-foreground">
              Bugün–{calendar.endDay}. gün · kesin vadeler ve planlanan siparişler
            </p>
          </div>
        </div>
        <Badge className="h-5 px-1.5 text-[10px]" variant="outline">
          7 gün görünümü
        </Badge>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 lg:grid-cols-4">
        <CashCalendarMetric
          caption={
            calendar.firstIncome
              ? `${formatMoney(
                  calendar.firstIncome.amountCents,
                  currencyCode,
                )} · ${
                  calendar.firstIncome.certainty === "CONFIRMED"
                    ? "kesin"
                    : "plan"
                }`
              : "Beklenen kayıt yok"
          }
          label="İlk para"
          tone={calendar.firstIncome ? "positive" : "neutral"}
          value={
            calendar.firstIncome
              ? calendar.firstIncome.day === calendar.currentDay
                ? "Bugün"
                : `${calendar.firstIncome.day}. gün`
              : "—"
          }
        />
        <CashCalendarMetric
          caption="Yakın dönem giriş"
          label="7 gün tahsilat"
          tone="positive"
          value={formatMoney(calendar.incomingCents, currencyCode)}
        />
        <CashCalendarMetric
          caption="Borç + planlanan gider"
          label="7 gün ödeme"
          tone="warning"
          value={formatMoney(calendar.outgoingCents, currencyCode)}
        />
        <CashCalendarMetric
          caption={formatSignedMoney(calendar.netCents, currencyCode)}
          label="Tahmini kasa"
          tone={balanceTone(calendar)}
          value={formatMoney(
            calendar.estimatedEndBalanceCents,
            currencyCode,
          )}
        />
      </div>

      <div
        className={cn(
          "mt-1.5 flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px]",
          riskPresentation.className,
        )}
      >
        <span className="size-1.5 shrink-0 rounded-full bg-current" />
        <span className="truncate">{riskPresentation.text}</span>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1 sm:grid-cols-8">
        {calendar.days.map((day) => {
          const incomeCents = BigInt(day.incomeCents);
          const expenseCents = BigInt(day.expenseCents);
          const hasMovement =
            incomeCents > BigInt(0) || expenseCents > BigInt(0);

          return (
            <div
              className={cn(
                "min-w-0 rounded-md border p-1.5",
                day.day === calendar.currentDay
                  ? "border-primary/35 bg-primary/8"
                  : "border-border bg-background/40",
              )}
              key={day.day}
            >
              <p className="truncate text-[9px] font-semibold text-muted-foreground">
                {day.day === calendar.currentDay
                  ? "BUGÜN"
                  : `${day.day}. GÜN`}
              </p>
              <div className="mt-1 min-h-7 space-y-0.5 font-mono text-[9px] leading-3">
                {incomeCents > BigInt(0) ? (
                  <p className="truncate text-emerald-300">
                    +{formatMoney(day.incomeCents, currencyCode)}
                  </p>
                ) : null}
                {expenseCents > BigInt(0) ? (
                  <p className="truncate text-amber-300">
                    -{formatMoney(day.expenseCents, currencyCode)}
                  </p>
                ) : null}
                {!hasMovement ? (
                  <p className="text-muted-foreground/60">—</p>
                ) : null}
              </div>
              <p
                className={cn(
                  "mt-1 truncate border-t border-border/60 pt-1 font-mono text-[9px]",
                  toneTextClass(moneyTone(day.projectedBalanceCents)),
                )}
                title={`Tahmini kasa: ${formatMoney(
                  day.projectedBalanceCents,
                  currencyCode,
                )}`}
              >
                {formatMoney(day.projectedBalanceCents, currencyCode)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-2">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Yaklaşan hareketler
          </p>
          <span className="text-[10px] text-muted-foreground">
            Kesin / plan
          </span>
        </div>
        {calendar.upcomingEntries.length > 0 ? (
          <div className="grid gap-1.5 lg:grid-cols-2">
            {calendar.upcomingEntries.map((entry) => (
              <div
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border bg-background/40 px-2 py-1.5"
                key={entry.id}
              >
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-md border text-[10px]",
                    entry.direction === "INCOME"
                      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                      : "border-amber-400/25 bg-amber-400/10 text-amber-300",
                  )}
                >
                  {entry.direction === "INCOME" ? "+" : "−"}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-foreground">
                    {entry.label} · {entry.description}
                  </p>
                  <p className="truncate text-[9px] text-muted-foreground">
                    {entry.timing === "OVERDUE"
                      ? `${entry.day}. günden gecikmiş`
                      : entry.timing === "TODAY"
                        ? "Bugün"
                        : `${entry.day}. gün`}
                    {" · "}
                    {entry.certainty === "CONFIRMED" ? "Kesin" : "Planlanan"}
                  </p>
                </div>
                <strong
                  className={cn(
                    "max-w-28 truncate font-mono text-[11px]",
                    entry.direction === "INCOME"
                      ? "text-emerald-300"
                      : "text-amber-300",
                  )}
                >
                  {entry.direction === "INCOME" ? "+" : "−"}
                  {formatMoney(entry.amountCents, currencyCode)}
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border bg-background/30 px-2 py-2 text-center text-[10px] text-muted-foreground">
            Planlanan tahsilat veya ödeme bulunmuyor.
          </p>
        )}
      </div>
    </section>
  );
}

function CashCalendarMetric({
  caption,
  label,
  tone,
  value,
}: {
  caption: string;
  label: string;
  tone: FinanceTone;
  value: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-md border bg-background/40 px-2 py-1.5",
        toneBorderClass(tone),
      )}
    >
      <p className="truncate text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 truncate font-mono text-xs font-semibold",
          toneTextClass(tone),
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-[9px] text-muted-foreground">
        {caption}
      </p>
    </div>
  );
}

function balanceTone(calendar: FinanceCashCalendar): FinanceTone {
  if (BigInt(calendar.estimatedEndBalanceCents) < BigInt(0)) {
    return "negative";
  }
  if (BigInt(calendar.netCents) < BigInt(0)) {
    return "warning";
  }

  return "positive";
}

function getRiskPresentation(
  calendar: FinanceCashCalendar,
  currencyCode: CurrencyCode,
) {
  if (calendar.risk === "SHORTFALL") {
    return {
      className:
        "border-rose-400/25 bg-rose-400/8 text-rose-300",
      text: `${calendar.shortfallDay ?? calendar.currentDay}. gün nakit açığı riski · en düşük kasa ${formatMoney(
        calendar.lowestProjectedBalanceCents,
        currencyCode,
      )}.`,
    };
  }
  if (calendar.risk === "TIGHT") {
    return {
      className:
        "border-amber-400/25 bg-amber-400/8 text-amber-300",
      text: "Yakın dönem ödemeleri tahsilatlardan yüksek.",
    };
  }
  if (calendar.risk === "POSITIVE") {
    return {
      className:
        "border-emerald-400/25 bg-emerald-400/8 text-emerald-300",
      text: "Yakın dönem nakit akışı mevcut planla dengeli.",
    };
  }

  return {
    className: "border-border bg-background/35 text-muted-foreground",
    text: "7 gün içinde kesinleşmiş veya planlanmış hareket yok.",
  };
}

function formatMoney(
  valueCents: bigint | number | string,
  currencyCode: CurrencyCode,
) {
  let formatter = moneyFormatters.get(currencyCode);

  if (!formatter) {
    formatter = new Intl.NumberFormat("tr-TR", {
      currency: currencyCode,
      maximumFractionDigits: 0,
      style: "currency",
    });
    moneyFormatters.set(currencyCode, formatter);
  }

  return formatter.format(Number(BigInt(valueCents)) / 100);
}

function formatSignedMoney(valueCents: string, currencyCode: CurrencyCode) {
  const value = BigInt(valueCents);
  const prefix = value > BigInt(0) ? "+" : "";

  return `${prefix}${formatMoney(value, currencyCode)}`;
}

function moneyTone(valueCents: string): FinanceTone {
  const value = BigInt(valueCents);

  if (value > BigInt(0)) return "positive";
  if (value < BigInt(0)) return "negative";

  return "neutral";
}

function toneBorderClass(tone: FinanceTone) {
  const classes: Record<FinanceTone, string> = {
    info: "border-sky-400/25",
    negative: "border-rose-400/30",
    neutral: "border-border",
    positive: "border-emerald-400/30",
    warning: "border-amber-400/30",
  };

  return classes[tone];
}

function toneTextClass(tone: FinanceTone) {
  const classes: Record<FinanceTone, string> = {
    info: "text-sky-200",
    negative: "text-rose-300",
    neutral: "text-foreground",
    positive: "text-emerald-300",
    warning: "text-amber-300",
  };

  return classes[tone];
}
