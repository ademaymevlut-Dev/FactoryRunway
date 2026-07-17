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
import { cn } from "@/lib/utils";

type ProductionLineMapItem = Extract<
  FactoryMapItem,
  { kind: "productionLine" }
>;

export function UpgradeProductionLinePanel({
  currencyCode,
  factoryId,
  line,
  nextTemplate,
}: {
  currencyCode: CurrencyCode;
  factoryId: string;
  line: ProductionLineMapItem;
  nextTemplate: ProductionLineInvestmentTemplate | null;
}) {
  const router = useRouter();
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
    result?.ok === false ? upgradeErrorLabels[result.code] : null;

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <section className="rounded-lg border border-white/10 bg-background/35 p-3">
        <div className="grid gap-3 sm:grid-cols-[128px_minmax(0,1fr)]">
          <LineImagePreview line={line} />
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
              <CompactDatum label="Standart" value={gradeLabels[line.grade]} />
              <CompactDatum label="Kapasite" value={`${formatNumber(line.dailyPointCapacity)} puan`} />
              <CompactDatum label="Personel" value={`${line.assignedStaff}/${line.idealStaff}`} />
              <CompactDatum label="Alan" value={`${formatNumber(line.areaM2)} m²`} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-background/35 p-3">
        <div className="flex items-center justify-between gap-3">
          <GradePill grade={line.grade} />
          <ArrowRight className="size-4 text-muted-foreground" />
          <GradePill grade={nextTemplate?.grade ?? line.grade} muted={!nextTemplate} />
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-medium text-white">
              <Gauge size={15} />
              İş gücü artışı
            </span>
            <strong className="font-mono text-lg text-emerald-300">
              {nextTemplate ? formatSignedPercentBps(capacityIncreaseBps) : "-"}
            </strong>
          </div>
          <Progress value={nextTemplate ? capacityProgress : 0} />
        </div>
      </section>

      <dl className="grid grid-cols-3 gap-2">
        <Metric
          icon={<Users size={14} />}
          label="Personel"
          value={nextTemplate ? formatSignedNumber(nextTemplate.idealStaff - line.idealStaff) : "-"}
        />
        <Metric
          icon={<Ruler size={14} />}
          label="Alan"
          value={nextTemplate ? `${formatSignedNumber(nextTemplate.areaM2 - line.areaM2)} m²` : "-"}
        />
        <Metric
          icon={<Zap size={14} />}
          label="Elektrik"
          value={
            nextTemplate
              ? formatSignedMoney(
                  nextTemplate.monthlyElectricityBaseCents -
                    line.monthlyElectricityBaseCents,
                  currencyCode,
                )
              : "-"
          }
        />
      </dl>

      {pricing ? (
        <section className="rounded-lg border border-white/10 bg-card/70 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
            Upgrade Bütçesi
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <SummaryRow
              label="Yeni hat bedeli"
              value={formatMoney(pricing.grossUpgradeCostCents, currencyCode)}
            />
            <SummaryRow
              label="2. el hat iadesi"
              tone="positive"
              value={`-${formatMoney(pricing.tradeInRefundCents, currencyCode)}`}
            />
            <div className="border-t border-white/10 pt-2">
              <SummaryRow
                label="Kasadan çıkacak"
                strong
                value={formatMoney(pricing.netUpgradeCostCents, currencyCode)}
              />
            </div>
          </dl>
        </section>
      ) : null}

      {lockedByLeasing ? (
        <Alert>
          <AlertTitle>Leasing sözleşmesi aktif</AlertTitle>
          <AlertDescription>
            Leasing süresi tamamlanmadan bu hat yükseltilemez.
          </AlertDescription>
        </Alert>
      ) : reachedMaxGrade ? (
        <Alert>
          <AlertTitle>SMART teknoloji</AlertTitle>
          <AlertDescription>
            Bu üretim hattı en yüksek teknoloji seviyesinde.
          </AlertDescription>
        </Alert>
      ) : !nextTemplate ? (
        <Alert variant="destructive">
          <AlertTitle>Upgrade seçeneği yok</AlertTitle>
          <AlertDescription>
            Bu departman için sıradaki aktif üretim hattı bulunamadı.
          </AlertDescription>
        </Alert>
      ) : null}

      {result?.ok ? (
        <Alert className="border-emerald-500/30 bg-emerald-500/10">
          <Sparkles className="size-4" />
          <AlertTitle>Upgrade tamamlandı</AlertTitle>
          <AlertDescription>
            +{result.xpAwarded} XP eklendi. Yeni teknoloji seviyesi{" "}
            {gradeLabels[result.nextGrade]}.
          </AlertDescription>
        </Alert>
      ) : null}

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Upgrade tamamlanamadı</AlertTitle>
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
            ? "Upgrade uygulanıyor..."
            : pricing
              ? `Upgrade Et · ${formatMoney(pricing.netUpgradeCostCents, currencyCode)}`
              : "Upgrade kapalı"}
        </Button>
      </form>
    </div>
  );
}

function LineImagePreview({ line }: { line: ProductionLineMapItem }) {
  const previewImageUrl = line.imageUrl ?? line.detailImageUrl;
  const detailImageUrl = line.detailImageUrl ?? line.imageUrl;
  const imageAlt = `${line.title} üretim hattı`;

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
          aria-label={`${line.title} görselini büyüt`}
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
            Büyüt
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
  muted = false,
}: {
  grade: ProductionGrade;
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

function formatMoney(valueCents: string | number, currencyCode: CurrencyCode) {
  return new Intl.NumberFormat("tr-TR", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(BigInt(valueCents)) / 100);
}

function formatSignedMoney(valueCents: number, currencyCode: CurrencyCode) {
  const prefix = valueCents > 0 ? "+" : "";

  return `${prefix}${formatMoney(valueCents, currencyCode)}`;
}

function formatSignedNumber(value: number) {
  return `${value > 0 ? "+" : ""}${new Intl.NumberFormat("tr-TR").format(value)}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function formatSignedPercentBps(valueBps: number) {
  const value = valueBps / 100;
  const prefix = value > 0 ? "+" : "";

  return `${prefix}${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

const gradeLabels = {
  WORKSHOP: "Workshop",
  INDUSTRIAL: "Industrial",
  PRECISION: "Precision",
  SMART: "Smart",
} as const satisfies Record<ProductionGrade, string>;

const upgradeErrorLabels: Record<
  Extract<UpgradeProductionLineResult, { ok: false }>["code"],
  string
> = {
  DEPARTMENT_MISMATCH: "Seçilen upgrade aynı departmana ait değil.",
  DUPLICATE_REQUEST: "Bu upgrade isteği daha önce işlendi.",
  FACTORY_NOT_ACTIVE: "Fabrika şu anda upgrade için açık değil.",
  FACTORY_NOT_FOUND: "Fabrika kaydı bulunamadı.",
  INSUFFICIENT_FUNDS: "Bu upgrade için yeterli nakit bulunmuyor.",
  INVALID_REQUEST: "Upgrade isteği geçersiz.",
  INVALID_UPGRADE_PATH: "Seçilen teknoloji seviyesi sıradaki upgrade değil.",
  LEASING_ACTIVE: "Leasing sözleşmesi aktif olan hat yükseltilemez.",
  LINE_NOT_FOUND: "Üretim hattı bulunamadı.",
  LINE_NOT_UPGRADABLE: "Bu üretim hattı şu anda yükseltilemez.",
  MAX_GRADE_REACHED: "Bu üretim hattı en yüksek teknoloji seviyesinde.",
  PLAYBACK_ACTIVE: "Vardiya oynatılırken upgrade yapılamaz.",
  PRODUCTION_PLAN_ACTIVE: "Bugünün üretim planı varken upgrade yapılamaz.",
  SECTOR_MISMATCH: "Seçilen upgrade fabrikanın sektörüne ait değil.",
  TEMPLATE_NOT_ACTIVE: "Seçilen upgrade artık aktif değil.",
  TEMPLATE_NOT_FOUND: "Upgrade seçeneği bulunamadı.",
  UNAUTHORIZED: "Bu işlem için oturum açmalısınız.",
  UNKNOWN_ERROR: "Upgrade tamamlanamadı. Lütfen tekrar deneyin.",
};
