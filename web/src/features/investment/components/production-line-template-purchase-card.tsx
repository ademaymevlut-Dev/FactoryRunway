"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useState, type ReactNode } from "react";
import { Factory, Gauge, Ruler, Users, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGameUiStore } from "@/features/game/store/game-ui-store";
import { leaseProductionLineAction } from "@/features/investment/actions/lease-production-line-action";
import { purchaseProductionLineAction } from "@/features/investment/actions/purchase-production-line-action";
import type {
  LeaseProductionLineResult,
  ProductionLineInvestmentTemplate,
  PurchaseProductionLineResult,
} from "@/features/investment/types";
import type { CurrencyCode } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

type PaymentMode = "CASH" | "LEASING";

export function ProductionLineTemplatePurchaseCard({
  currencyCode,
  factoryId,
  template,
}: {
  currencyCode: CurrencyCode;
  factoryId: string;
  template: ProductionLineInvestmentTemplate;
}) {
  const router = useRouter();
  const { closePanel, isShiftPlaybackActive } = useGameUiStore();
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  const [selectedOfferId, setSelectedOfferId] = useState(
    template.leasingOffers[0]?.id ?? "",
  );
  const [purchaseRequestId] = useState(() => crypto.randomUUID());
  const [leaseRequestId] = useState(() => crypto.randomUUID());
  const selectedOffer =
    template.leasingOffers.find((offer) => offer.id === selectedOfferId) ??
    template.leasingOffers[0];
  const complete = useCallback(() => {
    router.refresh();
    closePanel();
  }, [closePanel, router]);
  const runPurchase = useCallback(
    async (
      previousState: PurchaseProductionLineResult | null,
      formData: FormData,
    ) => {
      const result = await purchaseProductionLineAction(previousState, formData);
      if (result.ok) complete();
      return result;
    },
    [complete],
  );
  const runLease = useCallback(
    async (
      previousState: LeaseProductionLineResult | null,
      formData: FormData,
    ) => {
      const result = await leaseProductionLineAction(previousState, formData);
      if (result.ok) complete();
      return result;
    },
    [complete],
  );
  const [purchaseResult, purchaseAction, purchasePending] = useActionState(
    runPurchase,
    null,
  );
  const [leaseResult, leaseAction, leasePending] = useActionState(
    runLease,
    null,
  );
  const errorMessage =
    paymentMode === "CASH"
      ? purchaseResult?.ok === false
        ? purchaseErrorLabels[purchaseResult.code]
        : null
      : leaseResult?.ok === false
        ? leaseErrorLabels[leaseResult.code]
        : null;
  const pending = purchasePending || leasePending;

  return (
    <article className="grid min-h-0 overflow-hidden rounded-xl border border-white/10 bg-card shadow-lg lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <section className="relative min-h-[240px] border-b border-white/10 bg-black/20 lg:min-h-[430px] lg:border-b-0 lg:border-r">
        {template.imageUrl ? (
          <Image
            alt={`${gradeLabels[template.grade]} üretim hattı`}
            className="object-contain p-5"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 40vw"
            src={template.imageUrl}
          />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            <Factory size={56} />
          </div>
        )}
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-lg border border-white/10 bg-background/75 px-3 py-2 backdrop-blur">
          <div>
            <h3 className="font-semibold text-white">
              {gradeLabels[template.grade]}
            </h3>
            <p className="text-xs text-muted-foreground">Üretim hattı</p>
          </div>
          <Badge variant="secondary">{template.machineCount} makine</Badge>
        </div>
      </section>

      <section className="flex min-h-0 flex-col">
        <div className="space-y-3 p-3 sm:p-4">
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric icon={<Gauge size={14} />} label="Kapasite" value={`${formatInteger(template.dailyPointCapacity)} point/gün`} />
            <Metric icon={<Users size={14} />} label="İdeal personel" value={formatInteger(template.idealStaff)} />
            <Metric icon={<Ruler size={14} />} label="Alan" value={`${formatInteger(template.areaM2)} m²`} />
            <Metric icon={<Zap size={14} />} label="Elektrik" value={`${formatMoney(template.monthlyElectricityBaseCents, currencyCode)} / dönem`} />
          </dl>

          <section aria-label="Yatırım finansmanı" className="rounded-lg border border-white/10 bg-background/35 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
              Yatırım Finansmanı
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-black/20 p-1">
              <PaymentButton active={paymentMode === "CASH"} label="Peşin" onClick={() => setPaymentMode("CASH")} />
              <PaymentButton active={paymentMode === "LEASING"} disabled={template.leasingOffers.length === 0} label="Leasing" onClick={() => setPaymentMode("LEASING")} />
            </div>

            {paymentMode === "CASH" ? (
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Bugün ödenecek</p>
                  <strong className="font-mono text-xl text-emerald-300">
                    {formatMoney(template.preview.purchaseCostCents, currencyCode)}
                  </strong>
                </div>
                <span className="text-right text-[11px] text-muted-foreground">
                  Tek seferde kasadan düşer
                </span>
              </div>
            ) : selectedOffer ? (
              <LeasingOptions
                currencyCode={currencyCode}
                offers={template.leasingOffers}
                selectedOfferId={selectedOffer.id}
                onChange={setSelectedOfferId}
              />
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Bu hat için aktif leasing teklifi bulunmuyor.
              </p>
            )}
          </section>

          <details className="rounded-lg border border-white/10 bg-background/25 p-3">
            <summary className="cursor-pointer text-xs font-semibold text-white">
              İşletme Gideri Etkisi · {formatMoney(template.preview.totalRecurringCostIncreaseCents, currencyCode)} / dönem
            </summary>
            <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Yeni operasyon kademesi</span>
                <Badge variant="outline">{template.preview.resultingOperatingStage.name}</Badge>
              </div>
              <StaffBreakdown label={`Direkt personel · ${template.preview.directStaffCount}`} staff={template.preview.directStaff} />
              <StaffBreakdown label={`Support / yönetim farkı · ${template.preview.supportStaffCount}`} staff={template.preview.supportStaff} />
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <CostRow currencyCode={currencyCode} label="Direkt maaş" value={template.preview.directPayrollIncreaseCents} />
                <CostRow currencyCode={currencyCode} label="Support maaş" value={template.preview.supportPayrollIncreaseCents} />
                <CostRow currencyCode={currencyCode} label="Hat elektriği" value={template.preview.electricityIncreaseCents} />
                <CostRow currencyCode={currencyCode} label="Diğer giderler" value={template.preview.otherLineRecurringIncreaseCents} />
              </dl>
            </div>
          </details>

          {errorMessage ? (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="sticky bottom-0 mt-auto border-t border-white/10 bg-card/95 p-3 backdrop-blur sm:p-4">
          {paymentMode === "CASH" ? (
            <form action={purchaseAction}>
              <input name="factoryId" type="hidden" value={factoryId} />
              <input name="productionLineTemplateId" type="hidden" value={template.id} />
              <input name="requestId" type="hidden" value={purchaseRequestId} />
              <Button className="w-full" disabled={pending || isShiftPlaybackActive} type="submit">
                {purchasePending ? "Satın alınıyor…" : `Peşin Satın Al · ${formatMoney(template.preview.purchaseCostCents, currencyCode)}`}
              </Button>
            </form>
          ) : (
            <form action={leaseAction}>
              <input name="factoryId" type="hidden" value={factoryId} />
              <input name="productionLineTemplateId" type="hidden" value={template.id} />
              <input name="leasingOfferId" type="hidden" value={selectedOffer?.id ?? ""} />
              <input name="requestId" type="hidden" value={leaseRequestId} />
              <Button className="w-full" disabled={pending || isShiftPlaybackActive || !selectedOffer} type="submit">
                {leasePending ? "Leasing kuruluyor…" : selectedOffer ? `Leasing ile Kur · Bugün ${formatMoney(selectedOffer.downPaymentCents, currencyCode)}` : "Leasing teklifi yok"}
              </Button>
            </form>
          )}
        </div>
      </section>
    </article>
  );
}

function PaymentButton({ active, disabled, label, onClick }: { active: boolean; disabled?: boolean; label: string; onClick: () => void }) {
  return (
    <button aria-pressed={active} className={cn("rounded-md px-3 py-2 text-xs font-semibold transition-colors", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white", disabled && "cursor-not-allowed opacity-40")} disabled={disabled} onClick={onClick} type="button">
      {label}
    </button>
  );
}

function LeasingOptions({ currencyCode, offers, onChange, selectedOfferId }: { currencyCode: CurrencyCode; offers: ProductionLineInvestmentTemplate["leasingOffers"]; onChange: (id: string) => void; selectedOfferId: string }) {
  const selected = offers.find((offer) => offer.id === selectedOfferId) ?? offers[0];

  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-3 gap-1.5">
        {offers.map((offer) => (
          <label className={cn("cursor-pointer rounded-md border px-2 py-2 text-center", offer.id === selected?.id ? "border-primary/60 bg-primary/10" : "border-white/10 bg-card/40")} key={offer.id}>
            <input checked={offer.id === selected?.id} className="sr-only" name="leasing-term-preview" onChange={() => onChange(offer.id)} type="radio" value={offer.id} />
            <strong className="block text-xs text-white">{offer.termYears} Yıl</strong>
            <span className="block text-[10px] text-muted-foreground">{offer.installmentCount} taksit</span>
            <span className="mt-1 block truncate font-mono text-[10px] text-primary">{formatMoney(offer.installmentAmountCents, currencyCode)}</span>
          </label>
        ))}
      </div>
      {selected ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <SummaryRow label="Bugün" value={formatMoney(selected.downPaymentCents, currencyCode)} />
          <SummaryRow label="Her 22 günde" value={formatMoney(selected.installmentAmountCents, currencyCode)} />
          <SummaryRow label="Taksit" value={String(selected.installmentCount)} />
          <SummaryRow label="Toplam maliyet" value={formatMoney(selected.totalCostCents, currencyCode)} />
        </dl>
      ) : null}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{label}</dt><dd className="font-mono text-white">{value}</dd></div>;
}

function StaffBreakdown({ label, staff }: { label: string; staff: ProductionLineInvestmentTemplate["preview"]["directStaff"] }) {
  return <div><p className="text-xs font-medium text-white">{label}</p><p className="mt-1 text-[11px] text-muted-foreground">{staff.length > 0 ? staff.map((item) => `${item.roleName} × ${item.quantity}`).join(" · ") : "Ek personel yok"}</p></div>;
}

function CostRow({ currencyCode, label, value }: { currencyCode: CurrencyCode; label: string; value: string }) {
  return <div className="rounded-md bg-background/40 p-2"><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-mono text-white">{formatMoney(value, currencyCode)}</dd></div>;
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-lg border border-white/8 bg-background/40 p-2"><dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">{icon}{label}</dt><dd className="mt-1 truncate font-mono text-[11px] text-white">{value}</dd></div>;
}

function formatInteger(value: number) { return new Intl.NumberFormat("tr-TR").format(value); }
function formatMoney(valueCents: string | number, currencyCode: CurrencyCode) { return new Intl.NumberFormat("tr-TR", { currency: currencyCode, maximumFractionDigits: 0, style: "currency" }).format(Number(BigInt(valueCents)) / 100); }

const gradeLabels = { WORKSHOP: "Workshop", INDUSTRIAL: "Industrial", PRECISION: "Precision", SMART: "Smart" } as const;

const purchaseErrorLabels: Record<Extract<PurchaseProductionLineResult, { ok: false }>["code"], string> = {
  DUPLICATE_REQUEST: "Bu satın alma isteği daha önce işlendi.", FACTORY_NOT_ACTIVE: "Fabrika şu anda yatırıma açık değil.", FACTORY_NOT_FOUND: "Fabrika kaydı bulunamadı.", INSUFFICIENT_FUNDS: "Bu hat için yeterli nakit bulunmuyor.", INVALID_DEPARTMENT_KIND: "Bu departman üretim hattı yatırımını desteklemiyor.", INVALID_REQUEST: "Satın alma isteği geçersiz.", PLAYBACK_ACTIVE: "Vardiya oynatılırken yatırım yapılamaz.", SECTOR_MISMATCH: "Seçilen hat fabrikanın sektörüne ait değil.", TEMPLATE_NOT_ACTIVE: "Bu üretim hattı artık satışta değil.", TEMPLATE_NOT_FOUND: "Üretim hattı seçeneği bulunamadı.", UNAUTHORIZED: "Bu işlem için oturum açmalısınız.", UNKNOWN_ERROR: "Satın alma tamamlanamadı. Lütfen tekrar deneyin.",
};

const leaseErrorLabels: Record<Extract<LeaseProductionLineResult, { ok: false }>["code"], string> = {
  DUPLICATE_REQUEST: "Bu leasing isteği daha önce işlendi.", FACTORY_NOT_ACTIVE: "Fabrika şu anda yatırıma açık değil.", FACTORY_NOT_FOUND: "Fabrika kaydı bulunamadı.", INSUFFICIENT_FUNDS: "Peşinat için yeterli nakit bulunmuyor.", INVALID_DEPARTMENT_KIND: "Bu departman üretim hattı yatırımını desteklemiyor.", INVALID_REQUEST: "Leasing isteği geçersiz.", OFFER_NOT_ACTIVE: "Seçilen leasing teklifi artık aktif değil.", OFFER_NOT_FOUND: "Leasing teklifi bulunamadı.", OFFER_TEMPLATE_MISMATCH: "Leasing teklifi seçilen hatta ait değil.", PLAYBACK_ACTIVE: "Vardiya oynatılırken yatırım yapılamaz.", SECTOR_MISMATCH: "Seçilen hat fabrikanın sektörüne ait değil.", TEMPLATE_NOT_ACTIVE: "Bu üretim hattı artık satışta değil.", TEMPLATE_NOT_FOUND: "Üretim hattı seçeneği bulunamadı.", UNAUTHORIZED: "Bu işlem için oturum açmalısınız.", UNKNOWN_ERROR: "Leasing kurulamadı. Lütfen tekrar deneyin.",
};
