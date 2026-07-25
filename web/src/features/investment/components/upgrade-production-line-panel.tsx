"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  Factory,
  Gauge,
  Maximize2,
  Ruler,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useGameUiStore } from "@/features/game/store/game-ui-store";
import type { FactoryMapItem } from "@/features/game/types";
import { upgradeProductionLineAction } from "@/features/investment/actions/upgrade-production-line-action";
import type {
  ProductionLineInvestmentTemplate,
  UpgradeProductionLineResult,
} from "@/features/investment/types";
import type { CurrencyCode, ProductionGrade } from "@/generated/prisma/enums";
import {
  numberLocale as resolveNumberLocale,
  type NumberLocale,
  type SupportedLocale,
} from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

import {
  investmentCopy,
  type InvestmentUpgradeCopy,
} from "../investment-copy";

type ProductionLineMapItem = Extract<
  FactoryMapItem,
  { kind: "productionLine" }
>;

export function UpgradeProductionLinePanel({
  currencyCode,
  factoryId,
  line,
  locale,
  nextTemplate,
}: {
  currencyCode: CurrencyCode;
  factoryId: string;
  line: ProductionLineMapItem;
  locale: SupportedLocale;
  nextTemplate: ProductionLineInvestmentTemplate | null;
}) {
  const router = useRouter();
  const copy = investmentCopy[locale];
  const upgradeCopy = copy.upgrade;
  const numberLocale = resolveNumberLocale(locale);
  const { isShiftPlaybackActive } = useGameUiStore();
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const pricing = useMemo(
    () =>
      nextTemplate
        ? calculateUpgradePricing({
            currentPurchaseCostCents: line.purchaseCostCents,
            nextPurchaseCostCents: nextTemplate.purchaseCostCents,
          })
        : null,
    [line.purchaseCostCents, nextTemplate],
  );
  const runUpgrade = useCallback(
    async (
      previousState: UpgradeProductionLineResult | null,
      formData: FormData,
    ) => {
      const result = await upgradeProductionLineAction(
        previousState,
        formData,
      );

      if (result.ok) {
        setRequestId(crypto.randomUUID());
        router.refresh();
      }

      return result;
    },
    [router],
  );
  const [result, upgradeAction, pending] = useActionState(runUpgrade, null);
  const lockedByLeasing = line.hasActiveLeasingContract;
  const reachedMaxGrade = line.grade === "SMART";
  const locked = lockedByLeasing || reachedMaxGrade || !nextTemplate;
  const capacityIncreaseBps = nextTemplate
    ? calculateCapacityIncreaseBps({
        currentDailyPointCapacity: line.dailyPointCapacity,
        nextDailyPointCapacity: nextTemplate.dailyPointCapacity,
      })
    : 0;
  const capacityProgress = Math.max(
    0,
    Math.min(100, 50 + capacityIncreaseBps / 200),
  );
  const errorMessage =
    result?.ok === false ? upgradeCopy.errors[result.code] : null;

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <section className="rounded-lg border border-white/10 bg-background/35 p-3">
        <div className="grid gap-3 sm:grid-cols-[128px_minmax(0,1fr)]">
          <LineImagePreview copy={upgradeCopy} line={line} />
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                  {line.departmentName}
                </p>
                <h3 className="mt-1 truncate text-base font-semibold text-white">
                  {line.title}
                </h3>
              </div>
              <Badge className="shrink-0" variant="outline">{line.code}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <CompactDatum
                label={upgradeCopy.labels.standard}
                value={copy.gradeLabels[line.grade]}
              />
              <CompactDatum
                label={upgradeCopy.labels.capacity}
                value={upgradeCopy.labels.points(
                  formatNumber(line.dailyPointCapacity, numberLocale),
                )}
              />
              <CompactDatum
                label={upgradeCopy.labels.staff}
                value={`${line.assignedStaff}/${line.idealStaff}`}
              />
              <CompactDatum
                label={upgradeCopy.labels.area}
                value={`${formatNumber(line.areaM2, numberLocale)} m²`}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-background/35 p-3">
        <div className="flex items-center justify-between gap-3">
          <GradePill grade={line.grade} gradeLabels={copy.gradeLabels} />
          <ArrowRight className="size-4 text-muted-foreground" />
          <GradePill
            grade={nextTemplate?.grade ?? line.grade}
            gradeLabels={copy.gradeLabels}
            muted={!nextTemplate}
          />
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-medium text-white">
              <Gauge size={15} />
              {upgradeCopy.labels.capacityIncrease}
            </span>
            <strong className="font-mono text-lg text-emerald-300">
              {nextTemplate
                ? formatSignedPercentBps(capacityIncreaseBps, numberLocale)
                : "-"}
            </strong>
          </div>
          <Progress value={nextTemplate ? capacityProgress : 0} />
        </div>
      </section>

      <dl className="grid grid-cols-3 gap-2">
        <Metric
          icon={<Users size={14} />}
          label={upgradeCopy.labels.staff}
          value={
            nextTemplate
              ? formatSignedNumber(
                  nextTemplate.idealStaff - line.idealStaff,
                  numberLocale,
                )
              : "-"
          }
        />
        <Metric
          icon={<Ruler size={14} />}
          label={upgradeCopy.labels.area}
          value={
            nextTemplate
              ? `${formatSignedNumber(
                  nextTemplate.areaM2 - line.areaM2,
                  numberLocale,
                )} m²`
              : "-"
          }
        />
        <Metric
          icon={<Zap size={14} />}
          label={upgradeCopy.labels.electricity}
          value={
            nextTemplate
              ? formatSignedMoney(
                  nextTemplate.monthlyElectricityBaseCents -
                    line.monthlyElectricityBaseCents,
                  currencyCode,
                  numberLocale,
                )
              : "-"
          }
        />
      </dl>

      {pricing ? (
        <section className="rounded-lg border border-white/10 bg-card/70 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
            {upgradeCopy.budgetTitle}
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <SummaryRow
              label={upgradeCopy.budgetRows.gross}
              value={formatMoney(
                pricing.grossUpgradeCostCents,
                currencyCode,
                numberLocale,
              )}
            />
            <SummaryRow
              label={upgradeCopy.budgetRows.refund}
              tone="positive"
              value={`-${formatMoney(
                pricing.tradeInRefundCents,
                currencyCode,
                numberLocale,
              )}`}
            />
            <div className="border-t border-white/10 pt-2">
              <SummaryRow
                label={upgradeCopy.budgetRows.net}
                strong
                value={formatMoney(
                  pricing.netUpgradeCostCents,
                  currencyCode,
                  numberLocale,
                )}
              />
            </div>
          </dl>
        </section>
      ) : null}

      {lockedByLeasing ? (
        <Alert>
          <AlertTitle>{upgradeCopy.alerts.leasingTitle}</AlertTitle>
          <AlertDescription>
            {upgradeCopy.alerts.leasingBody}
          </AlertDescription>
        </Alert>
      ) : reachedMaxGrade ? (
        <Alert>
          <AlertTitle>{upgradeCopy.alerts.maxTitle}</AlertTitle>
          <AlertDescription>
            {upgradeCopy.alerts.maxBody}
          </AlertDescription>
        </Alert>
      ) : !nextTemplate ? (
        <Alert variant="destructive">
          <AlertTitle>{upgradeCopy.alerts.missingTitle}</AlertTitle>
          <AlertDescription>
            {upgradeCopy.alerts.missingBody}
          </AlertDescription>
        </Alert>
      ) : null}

      {result?.ok ? (
        <Alert className="border-emerald-500/30 bg-emerald-500/10">
          <Sparkles className="size-4" />
          <AlertTitle>{upgradeCopy.alerts.successTitle}</AlertTitle>
          <AlertDescription>
            {upgradeCopy.alerts.successBody(
              result.xpAwarded,
              copy.gradeLabels[result.nextGrade],
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>{upgradeCopy.alerts.errorTitle}</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <form action={upgradeAction} className="sticky bottom-0 mt-auto border-t border-white/10 bg-card/95 pt-3 backdrop-blur">
        <input name="factoryId" type="hidden" value={factoryId} />
        <input
          name="factoryProductionLineId"
          type="hidden"
          value={line.lineId}
        />
        <input
          name="targetProductionLineTemplateId"
          type="hidden"
          value={nextTemplate?.id ?? ""}
        />
        <input name="requestId" type="hidden" value={requestId} />
        <Button
          className="w-full"
          disabled={
            pending ||
            isShiftPlaybackActive ||
            locked ||
            result?.ok === true
          }
          type="submit"
        >
          {pending
            ? upgradeCopy.buttonPending
            : pricing
              ? upgradeCopy.buttonAction(
                  formatMoney(
                    pricing.netUpgradeCostCents,
                    currencyCode,
                    numberLocale,
                  ),
                )
              : upgradeCopy.buttonClosed}
        </Button>
      </form>
    </div>
  );
}

function LineImagePreview({
  copy,
  line,
}: {
  copy: InvestmentUpgradeCopy;
  line: ProductionLineMapItem;
}) {
  const previewImageUrl = line.imageUrl ?? line.detailImageUrl;
  const detailImageUrl = line.detailImageUrl ?? line.imageUrl;
  const imageAlt = copy.imageAlt(line.title);

  if (!previewImageUrl) {
    return (
      <div className="grid h-28 rounded-lg border border-white/10 bg-black/25 text-muted-foreground sm:h-full">
        <Factory className="m-auto" size={38} />
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          aria-label={copy.expandAria(line.title)}
          className="group relative h-28 overflow-hidden rounded-lg border border-white/10 bg-black/25 outline-none transition hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/60 sm:h-full"
          type="button"
        >
          <Image
            alt={imageAlt}
            className="object-contain p-2.5 transition-transform duration-200 group-hover:scale-[1.03]"
            fill
            priority
            sizes="128px"
            src={previewImageUrl}
          />
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full border border-white/15 bg-background/80 px-2 py-1 text-[10px] font-semibold text-white shadow-lg backdrop-blur">
            <Maximize2 size={12} />
            {copy.expandLabel}
          </span>
        </button>
      </DialogTrigger>
      <DialogContent
        className="max-w-[calc(100vw-1.5rem)] gap-4 rounded-lg border-white/10 bg-background/95 p-4 sm:max-w-[min(1180px,calc(100vw-4rem))]"
      >
        <DialogHeader className="pr-10">
          <DialogTitle>{line.title}</DialogTitle>
          <DialogDescription>
            {line.departmentName} · {line.code}
          </DialogDescription>
        </DialogHeader>
        <div className="relative h-[min(74vh,760px)] min-h-[320px] w-full overflow-hidden rounded-lg border border-white/10 bg-black/30">
          <Image
            alt={imageAlt}
            className="object-contain p-3"
            fill
            priority
            sizes="(min-width: 1180px) 1120px, calc(100vw - 4rem)"
            src={detailImageUrl ?? previewImageUrl}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CompactDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-card/55 px-2 py-1.5">
      <dt className="truncate text-[10px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-xs font-semibold text-white">{value}</dd>
    </div>
  );
}

function GradePill({
  grade,
  gradeLabels,
  muted = false,
}: {
  grade: ProductionGrade;
  gradeLabels: Record<ProductionGrade, string>;
  muted?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex min-w-0 flex-1 items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold",
        muted
          ? "border-white/10 bg-card/35 text-muted-foreground"
          : "border-primary/30 bg-primary/10 text-white",
      )}
    >
      {gradeLabels[grade]}
    </span>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-background/35 p-2">
      <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 truncate font-mono text-xs font-semibold text-white">
        {value}
      </dd>
    </div>
  );
}

function SummaryRow({
  label,
  strong = false,
  tone,
  value,
}: {
  label: string;
  strong?: boolean;
  tone?: "positive";
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "font-mono",
          strong && "text-lg font-semibold text-white",
          tone === "positive" && "text-emerald-300",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function calculateUpgradePricing(input: {
  currentPurchaseCostCents: string;
  nextPurchaseCostCents: string;
}) {
  const currentPurchaseCostCents = BigInt(input.currentPurchaseCostCents);
  const nextPurchaseCostCents = BigInt(input.nextPurchaseCostCents);
  const tradeInRefundCents = currentPurchaseCostCents / BigInt(2);
  const netUpgradeCostCents =
    nextPurchaseCostCents > tradeInRefundCents
      ? nextPurchaseCostCents - tradeInRefundCents
      : BigInt(0);

  return {
    grossUpgradeCostCents: nextPurchaseCostCents.toString(),
    netUpgradeCostCents: netUpgradeCostCents.toString(),
    tradeInRefundCents: tradeInRefundCents.toString(),
  };
}

function calculateCapacityIncreaseBps(input: {
  currentDailyPointCapacity: number;
  nextDailyPointCapacity: number;
}) {
  if (input.currentDailyPointCapacity <= 0) return 0;

  return Math.round(
    ((input.nextDailyPointCapacity - input.currentDailyPointCapacity) * 10_000) /
      input.currentDailyPointCapacity,
  );
}

function formatMoney(
  valueCents: string | number,
  currencyCode: CurrencyCode,
  numberLocale: NumberLocale,
) {
  return new Intl.NumberFormat(numberLocale, {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(BigInt(valueCents)) / 100);
}

function formatSignedMoney(
  valueCents: number,
  currencyCode: CurrencyCode,
  numberLocale: NumberLocale,
) {
  const prefix = valueCents > 0 ? "+" : "";

  return `${prefix}${formatMoney(valueCents, currencyCode, numberLocale)}`;
}

function formatSignedNumber(value: number, numberLocale: NumberLocale) {
  return `${value > 0 ? "+" : ""}${new Intl.NumberFormat(numberLocale).format(value)}`;
}

function formatNumber(value: number, numberLocale: NumberLocale) {
  return new Intl.NumberFormat(numberLocale).format(value);
}

function formatSignedPercentBps(valueBps: number, numberLocale: NumberLocale) {
  const value = valueBps / 100;
  const prefix = value > 0 ? "+" : "";

  return `${prefix}${new Intl.NumberFormat(numberLocale, {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}
