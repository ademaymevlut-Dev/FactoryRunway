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
import {
  numberLocale as resolveNumberLocale,
  type NumberLocale,
  type SupportedLocale,
} from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

import {
  investmentCopy,
  type InvestmentPurchaseCopy,
} from "../investment-copy";

type PaymentMode = "CASH" | "LEASING";

export function ProductionLineTemplatePurchaseCard({
  currencyCode,
  factoryId,
  locale,
  template,
}: {
  currencyCode: CurrencyCode;
  factoryId: string;
  locale: SupportedLocale;
  template: ProductionLineInvestmentTemplate;
}) {
  const router = useRouter();
  const copy = investmentCopy[locale];
  const purchaseCopy = copy.purchase;
  const numberLocale = resolveNumberLocale(locale);
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
        ? purchaseCopy.purchaseErrors[purchaseResult.code]
        : null
      : leaseResult?.ok === false
        ? purchaseCopy.leaseErrors[leaseResult.code]
        : null;
  const pending = purchasePending || leasePending;
  const gradeLabel = copy.gradeLabels[template.grade];

  return (
    <article className="grid min-h-0 overflow-hidden rounded-xl border border-white/10 bg-card shadow-lg lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <section className="relative min-h-[240px] border-b border-white/10 bg-black/20 lg:min-h-[430px] lg:border-b-0 lg:border-r">
        {template.imageUrl ? (
          <Image
            alt={purchaseCopy.imageAlt(gradeLabel)}
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
              {gradeLabel}
            </h3>
            <p className="text-xs text-muted-foreground">{purchaseCopy.lineType}</p>
          </div>
          <Badge variant="secondary">
            {copy.panel.machineCount(template.machineCount)}
          </Badge>
        </div>
      </section>

      <section className="flex min-h-0 flex-col">
        <div className="space-y-3 p-3 sm:p-4">
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric
              icon={<Gauge size={14} />}
              label={purchaseCopy.metrics.capacity}
              value={purchaseCopy.metrics.pointPerDay(
                formatInteger(template.dailyPointCapacity, numberLocale),
              )}
            />
            <Metric
              icon={<Users size={14} />}
              label={purchaseCopy.metrics.idealStaff}
              value={formatInteger(template.idealStaff, numberLocale)}
            />
            <Metric
              icon={<Ruler size={14} />}
              label={purchaseCopy.metrics.area}
              value={`${formatInteger(template.areaM2, numberLocale)} m²`}
            />
            <Metric
              icon={<Zap size={14} />}
              label={purchaseCopy.metrics.electricity}
              value={purchaseCopy.metrics.periodCost(
                formatMoney(
                  template.monthlyElectricityBaseCents,
                  currencyCode,
                  numberLocale,
                ),
              )}
            />
          </dl>

          <section aria-label={purchaseCopy.financingAria} className="rounded-lg border border-white/10 bg-background/35 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
              {purchaseCopy.financingTitle}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-black/20 p-1">
              <PaymentButton active={paymentMode === "CASH"} label={purchaseCopy.paymentCash} onClick={() => setPaymentMode("CASH")} />
              <PaymentButton active={paymentMode === "LEASING"} disabled={template.leasingOffers.length === 0} label={purchaseCopy.paymentLeasing} onClick={() => setPaymentMode("LEASING")} />
            </div>

            {paymentMode === "CASH" ? (
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {purchaseCopy.dueToday}
                  </p>
                  <strong className="font-mono text-xl text-emerald-300">
                    {formatMoney(
                      template.preview.purchaseCostCents,
                      currencyCode,
                      numberLocale,
                    )}
                  </strong>
                </div>
                <span className="text-right text-[11px] text-muted-foreground">
                  {purchaseCopy.cashNote}
                </span>
              </div>
            ) : selectedOffer ? (
              <LeasingOptions
                currencyCode={currencyCode}
                offers={template.leasingOffers}
                copy={purchaseCopy}
                numberLocale={numberLocale}
                selectedOfferId={selectedOffer.id}
                onChange={setSelectedOfferId}
              />
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                {purchaseCopy.noLeaseOffer}
              </p>
            )}
          </section>

          <details className="rounded-lg border border-white/10 bg-background/25 p-3">
            <summary className="cursor-pointer text-xs font-semibold text-white">
              {purchaseCopy.recurringSummary(
                formatMoney(
                  template.preview.totalRecurringCostIncreaseCents,
                  currencyCode,
                  numberLocale,
                ),
              )}
            </summary>
            <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {purchaseCopy.newOperatingStage}
                </span>
                <Badge variant="outline">{template.preview.resultingOperatingStage.name}</Badge>
              </div>
              <StaffBreakdown
                copy={purchaseCopy}
                label={purchaseCopy.directStaff(template.preview.directStaffCount)}
                staff={template.preview.directStaff}
              />
              <StaffBreakdown
                copy={purchaseCopy}
                label={purchaseCopy.supportStaff(template.preview.supportStaffCount)}
                staff={template.preview.supportStaff}
              />
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <CostRow currencyCode={currencyCode} label={purchaseCopy.costs.directPayroll} numberLocale={numberLocale} value={template.preview.directPayrollIncreaseCents} />
                <CostRow currencyCode={currencyCode} label={purchaseCopy.costs.supportPayroll} numberLocale={numberLocale} value={template.preview.supportPayrollIncreaseCents} />
                <CostRow currencyCode={currencyCode} label={purchaseCopy.costs.electricity} numberLocale={numberLocale} value={template.preview.electricityIncreaseCents} />
                <CostRow currencyCode={currencyCode} label={purchaseCopy.costs.other} numberLocale={numberLocale} value={template.preview.otherLineRecurringIncreaseCents} />
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
                {purchasePending
                  ? purchaseCopy.buyPending
                  : purchaseCopy.buyAction(
                      formatMoney(
                        template.preview.purchaseCostCents,
                        currencyCode,
                        numberLocale,
                      ),
                    )}
              </Button>
            </form>
          ) : (
            <form action={leaseAction}>
              <input name="factoryId" type="hidden" value={factoryId} />
              <input name="productionLineTemplateId" type="hidden" value={template.id} />
              <input name="leasingOfferId" type="hidden" value={selectedOffer?.id ?? ""} />
              <input name="requestId" type="hidden" value={leaseRequestId} />
              <Button className="w-full" disabled={pending || isShiftPlaybackActive || !selectedOffer} type="submit">
                {leasePending
                  ? purchaseCopy.leasePending
                  : selectedOffer
                    ? purchaseCopy.leaseAction(
                        formatMoney(
                          selectedOffer.downPaymentCents,
                          currencyCode,
                          numberLocale,
                        ),
                      )
                    : purchaseCopy.noLeaseButton}
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

function LeasingOptions({
  copy,
  currencyCode,
  numberLocale,
  offers,
  onChange,
  selectedOfferId,
}: {
  copy: InvestmentPurchaseCopy;
  currencyCode: CurrencyCode;
  numberLocale: NumberLocale;
  offers: ProductionLineInvestmentTemplate["leasingOffers"];
  onChange: (id: string) => void;
  selectedOfferId: string;
}) {
  const selected = offers.find((offer) => offer.id === selectedOfferId) ?? offers[0];

  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-3 gap-1.5">
        {offers.map((offer) => (
          <label className={cn("cursor-pointer rounded-md border px-2 py-2 text-center", offer.id === selected?.id ? "border-primary/60 bg-primary/10" : "border-white/10 bg-card/40")} key={offer.id}>
            <input checked={offer.id === selected?.id} className="sr-only" name="leasing-term-preview" onChange={() => onChange(offer.id)} type="radio" value={offer.id} />
            <strong className="block text-xs text-white">
              {copy.leaseTerm(offer.termYears)}
            </strong>
            <span className="block text-[10px] text-muted-foreground">
              {copy.installmentCount(offer.installmentCount)}
            </span>
            <span className="mt-1 block truncate font-mono text-[10px] text-primary">
              {formatMoney(
                offer.installmentAmountCents,
                currencyCode,
                numberLocale,
              )}
            </span>
          </label>
        ))}
      </div>
      {selected ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <SummaryRow
            label={copy.summaryRows.today}
            value={formatMoney(
              selected.downPaymentCents,
              currencyCode,
              numberLocale,
            )}
          />
          <SummaryRow
            label={copy.summaryRows.every22Days}
            value={formatMoney(
              selected.installmentAmountCents,
              currencyCode,
              numberLocale,
            )}
          />
          <SummaryRow
            label={copy.summaryRows.installment}
            value={String(selected.installmentCount)}
          />
          <SummaryRow
            label={copy.summaryRows.totalCost}
            value={formatMoney(
              selected.totalCostCents,
              currencyCode,
              numberLocale,
            )}
          />
        </dl>
      ) : null}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{label}</dt><dd className="font-mono text-white">{value}</dd></div>;
}

function StaffBreakdown({
  copy,
  label,
  staff,
}: {
  copy: InvestmentPurchaseCopy;
  label: string;
  staff: ProductionLineInvestmentTemplate["preview"]["directStaff"];
}) {
  return <div><p className="text-xs font-medium text-white">{label}</p><p className="mt-1 text-[11px] text-muted-foreground">{staff.length > 0 ? staff.map((item) => `${item.roleName} × ${item.quantity}`).join(" · ") : copy.noExtraStaff}</p></div>;
}

function CostRow({
  currencyCode,
  label,
  numberLocale,
  value,
}: {
  currencyCode: CurrencyCode;
  label: string;
  numberLocale: NumberLocale;
  value: string;
}) {
  return <div className="rounded-md bg-background/40 p-2"><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-mono text-white">{formatMoney(value, currencyCode, numberLocale)}</dd></div>;
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-lg border border-white/8 bg-background/40 p-2"><dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">{icon}{label}</dt><dd className="mt-1 truncate font-mono text-[11px] text-white">{value}</dd></div>;
}

function formatInteger(value: number, numberLocale: NumberLocale) {
  return new Intl.NumberFormat(numberLocale).format(value);
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
