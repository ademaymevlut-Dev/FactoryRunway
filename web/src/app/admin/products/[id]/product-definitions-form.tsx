"use client";

import { useMemo, useState } from "react";
import { Save } from "lucide-react";

import {
  Field,
  FormGrid,
  Input,
  Panel,
  Select,
  Textarea,
} from "../../form-ui";
import { updateProductDefinitionsAction } from "../product-actions";
import {
  getProductTierMinimumLevel,
  type ProductTier,
} from "@/features/orders/product-tier-rules";

const DEFAULT_MONTHLY_EXPENSE = "42891";
const DEFAULT_WORK_DAYS = 22;

type ProductDefinitionsValue = {
  id: string;
  baseUnitPriceCents: number;
  requiredPlayerLevel: number;
  tier: ProductTier;
  descriptionTr: string;
  descriptionEn: string;
  metadata: string;
};

type ProductRouteCapacityValue = {
  id: string;
  canOutsource: boolean;
  departmentName: string;
  lineKey: string | null;
  workloadPointsPerUnit: number;
  dailyPointCapacity: number | null;
  outsourceOptions: ProductRouteOutsourceOptionValue[];
};

type ProductRouteOutsourceOptionValue = {
  baseCostPer1000PointsCents: number;
  costMultiplierBps: number;
  leadTimeDays: number;
  optionType: "FAST" | "STANDARD" | "SAFE";
};

export function ProductDefinitionsForm({
  product,
  routeCapacities,
}: {
  product: ProductDefinitionsValue;
  routeCapacities: ProductRouteCapacityValue[];
}) {
  const [currencyCode, setCurrencyCode] = useState<"EUR" | "USD">("EUR");
  const minimumPlayerLevel = getProductTierMinimumLevel(product.tier);
  const [monthlyExpense, setMonthlyExpense] = useState(
    DEFAULT_MONTHLY_EXPENSE,
  );
  const [baseUnitPrice, setBaseUnitPrice] = useState(
    formatMoneyInput(product.baseUnitPriceCents),
  );
  const analysis = useMemo(
    () =>
      calculatePricingAnalysis({
        baseUnitPrice,
        monthlyExpense,
        routeCapacities,
      }),
    [baseUnitPrice, monthlyExpense, routeCapacities],
  );

  return (
    <Panel
      description="Fiyat, oyuncu seviyesi, çok dilli açıklamalar ve ek JSON verileri."
      title="Ürün tanımlamaları"
    >
      <form
        action={updateProductDefinitionsAction.bind(null, product.id)}
        className="grid gap-5"
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)]">
          <div className="grid gap-5">
            <FormGrid>
              <Field
                hint="Başlangıç oyuncu işletmesi için 22 günlük ortalama gider referansı."
                label="Aylık ortalama gider"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
                  <Input
                    inputMode="decimal"
                    min="0"
                    onChange={(event) =>
                      setMonthlyExpense(event.target.value)
                    }
                    required
                    type="text"
                    value={monthlyExpense}
                  />
                  <Select
                    aria-label="Para birimi"
                    onChange={(event) =>
                      setCurrencyCode(event.target.value as "EUR" | "USD")
                    }
                    value={currencyCode}
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </Select>
                </div>
              </Field>
              <Field
                hint="Oyuncuya gösterilecek baz birim satış fiyatı."
                label="Oyuncu birim fiyatı"
              >
                <Input
                  inputMode="decimal"
                  min="0"
                  name="baseUnitPrice"
                  onChange={(event) => setBaseUnitPrice(event.target.value)}
                  required
                  type="text"
                  value={baseUnitPrice}
                />
              </Field>
              <Field
                label="Gerekli oyuncu seviyesi"
                hint={`${product.tier} grubu için en az LEVEL ${minimumPlayerLevel}. Daha yüksek bir ürün barajı belirleyebilirsin.`}
              >
                <Input
                  defaultValue={product.requiredPlayerLevel}
                  min={minimumPlayerLevel}
                  name="requiredPlayerLevel"
                  type="number"
                />
              </Field>
              <Field label="Türkçe açıklama">
                <Input
                  defaultValue={product.descriptionTr}
                  name="descriptionTr"
                />
              </Field>
              <Field label="İngilizce açıklama">
                <Input
                  defaultValue={product.descriptionEn}
                  name="descriptionEn"
                />
              </Field>
            </FormGrid>
            <Field label="Metadata JSON">
              <Textarea
                defaultValue={product.metadata}
                name="metadata"
                placeholder='{"collection":"summer"}'
              />
            </Field>
          </div>

          <PricingSummary
            analysis={analysis}
            currencyCode={currencyCode}
            routeCapacities={routeCapacities}
          />
        </div>

        <button className="game-button-primary w-fit" type="submit">
          <Save size={16} />
          Tanımlamaları Kaydet
        </button>
      </form>
    </Panel>
  );
}

function PricingSummary({
  analysis,
  currencyCode,
  routeCapacities,
}: {
  analysis: PricingAnalysis;
  currencyCode: "EUR" | "USD";
  routeCapacities: ProductRouteCapacityValue[];
}) {
  return (
    <aside className="rounded-lg border border-primary/25 bg-primary/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">
            Ortalama maliyet hesabı
          </p>
          <h3 className="mt-1 text-lg font-semibold">
            {analysis.unitCost === null
              ? "Rota kapasitesi bekleniyor"
              : formatCurrency(analysis.unitCost, currencyCode)}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Birim maliyet = iç gider payı + fiyatlı fason maliyeti
          </p>
        </div>
        {analysis.bottleneck ? (
          <div className="rounded-lg border border-border bg-card px-3 py-2 text-right">
            <p className="text-xs text-muted-foreground">Darboğaz</p>
            <p className="font-semibold">{analysis.bottleneck.departmentName}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <SummaryMetric
          label="Günlük max adet"
          value={
            analysis.dailyOutput === null
              ? "-"
              : formatInteger(analysis.dailyOutput)
          }
        />
        <SummaryMetric
          label="22 günlük adet"
          value={
            analysis.monthlyOutput === null
              ? "-"
              : formatInteger(analysis.monthlyOutput)
          }
        />
        <SummaryMetric
          label="Fason / adet"
          value={
            analysis.outsourceUnitCost === null
              ? "-"
              : formatCurrency(analysis.outsourceUnitCost, currencyCode)
          }
        />
        <SummaryMetric
          label="Birim kar"
          tone={analysis.unitProfit !== null && analysis.unitProfit < 0 ? "bad" : "good"}
          value={
            analysis.unitProfit === null
              ? "-"
              : formatCurrency(analysis.unitProfit, currencyCode)
          }
        />
        <SummaryMetric
          label="Maliyet üstü kar"
          tone={analysis.markupPercent !== null && analysis.markupPercent < 0 ? "bad" : "good"}
          value={
            analysis.markupPercent === null
              ? "-"
              : formatPercent(analysis.markupPercent)
          }
        />
      </div>

      {analysis.marginPercent !== null ? (
        <p className="mt-3 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
          Satış marjı:{" "}
          <span className="font-mono text-card-foreground">
            {formatPercent(analysis.marginPercent)}
          </span>
        </p>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Departman</th>
              <th className="px-3 py-2 font-medium">Kaynak</th>
              <th className="px-3 py-2 text-right font-medium">Puan</th>
              <th className="px-3 py-2 text-right font-medium">Adet/gün</th>
            </tr>
          </thead>
          <tbody>
            {analysis.routeOutputs.map((route) => {
              const isBottleneck =
                analysis.bottleneck?.id === route.id &&
                route.dailyOutput !== null;

              return (
                <tr
                  className={
                    isBottleneck
                      ? "bg-primary/10 text-primary"
                      : "border-t border-border"
                  }
                  key={route.id}
                >
                  <td className="px-3 py-2">
                    <p className="font-medium">{route.departmentName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {route.lineKey ?? "WORKSHOP hattı yok"}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{route.sourceLabel}</p>
                    <p className="max-w-[220px] text-[11px] text-muted-foreground">
                      {route.sourceDetail}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {route.workloadPointsPerUnit}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {route.dailyOutput === null ? "-" : formatInteger(route.dailyOutput)}
                  </td>
                </tr>
              );
            })}
            {routeCapacities.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-6 text-center text-muted-foreground"
                  colSpan={4}
                >
                  Rota adımı eklenince maliyet hesabı oluşacak.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </aside>
  );
}

function SummaryMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "good" | "bad";
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-mono text-lg font-semibold ${
          tone === "bad"
            ? "text-destructive"
            : tone === "good"
              ? "text-primary"
              : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

type PricingAnalysis = ReturnType<typeof calculatePricingAnalysis>;

function calculatePricingAnalysis({
  baseUnitPrice,
  monthlyExpense,
  routeCapacities,
}: {
  baseUnitPrice: string;
  monthlyExpense: string;
  routeCapacities: ProductRouteCapacityValue[];
}) {
  const routeOutputs = routeCapacities.map((route) => {
    const dailyOutput =
      route.dailyPointCapacity === null
        ? null
        : Math.floor(route.dailyPointCapacity / route.workloadPointsPerUnit);
    const hasInternalOutput = dailyOutput !== null && dailyOutput > 0;
    const pricingOutsourceOption =
      !hasInternalOutput && route.canOutsource
        ? pickPricingOutsourceOption(route.outsourceOptions)
        : null;
    const outsourceUnitCost =
      pricingOutsourceOption === null
        ? null
        : calculateOutsourceUnitCost(route, pricingOutsourceOption);
    const sourceLabel =
      hasInternalOutput
        ? "İç hat"
        : outsourceUnitCost !== null && pricingOutsourceOption
          ? `Fason ${pricingOutsourceOption.optionType}`
          : route.canOutsource
            ? "Fason fiyatı eksik"
            : "Kapasite yok";
    const sourceDetail =
      hasInternalOutput
        ? (route.lineKey ?? "WORKSHOP hattı yok")
        : route.outsourceOptions.length > 0
          ? formatOutsourceOptionCosts(route)
          : "Aktif ve fiyatlı fason seçeneği yok";

    return {
      ...route,
      dailyOutput,
      outsourceUnitCost,
      pricingOutsourceOption,
      sourceDetail,
      sourceLabel,
    };
  });
  const missingRoute = routeOutputs.find(
    (route) =>
      (route.dailyOutput === null || route.dailyOutput <= 0) &&
      route.outsourceUnitCost === null,
  );
  const internalRouteOutputs = routeOutputs.filter(
    (route) => route.dailyOutput !== null && route.dailyOutput > 0,
  );
  const isComplete =
    routeOutputs.length > 0 &&
    !missingRoute &&
    internalRouteOutputs.length > 0;
  const bottleneck = isComplete
    ? internalRouteOutputs.reduce((lowest, route) =>
        (route.dailyOutput ?? 0) < (lowest.dailyOutput ?? 0)
          ? route
          : lowest,
      )
    : null;
  const dailyOutput = bottleneck?.dailyOutput ?? null;
  const monthlyOutput =
    dailyOutput === null ? null : dailyOutput * DEFAULT_WORK_DAYS;
  const monthlyExpenseValue = parseMoney(monthlyExpense);
  const internalUnitCost =
    monthlyOutput && monthlyExpenseValue !== null
      ? monthlyExpenseValue / monthlyOutput
      : null;
  const outsourceUnitCost = isComplete
    ? routeOutputs.reduce(
        (total, route) => total + (route.outsourceUnitCost ?? 0),
        0,
      )
    : null;
  const unitCost =
    internalUnitCost !== null && outsourceUnitCost !== null
      ? internalUnitCost + outsourceUnitCost
      : null;
  const unitPrice = parseMoney(baseUnitPrice);
  const unitProfit =
    unitCost !== null && unitPrice !== null ? unitPrice - unitCost : null;
  const markupPercent =
    unitCost !== null && unitCost > 0 && unitProfit !== null
      ? (unitProfit / unitCost) * 100
      : null;
  const marginPercent =
    unitPrice !== null && unitPrice > 0 && unitProfit !== null
      ? (unitProfit / unitPrice) * 100
      : null;

  return {
    bottleneck,
    dailyOutput,
    internalUnitCost,
    marginPercent,
    markupPercent,
    monthlyOutput,
    outsourceUnitCost,
    routeOutputs,
    unitCost,
    unitProfit,
  };
}

function pickPricingOutsourceOption(
  options: ProductRouteOutsourceOptionValue[],
) {
  return (
    options.find((option) => option.optionType === "STANDARD") ??
    options.reduce<ProductRouteOutsourceOptionValue | null>(
      (lowest, option) =>
        !lowest || option.costMultiplierBps < lowest.costMultiplierBps
          ? option
          : lowest,
      null,
    )
  );
}

function calculateOutsourceUnitCost(
  route: ProductRouteCapacityValue,
  option: ProductRouteOutsourceOptionValue,
) {
  const baseCostPerUnitCents = Math.ceil(
    (route.workloadPointsPerUnit * option.baseCostPer1000PointsCents) / 1000,
  );
  const costPerUnitCents = Math.ceil(
    (baseCostPerUnitCents * option.costMultiplierBps) / 10_000,
  );

  return costPerUnitCents / 100;
}

function formatOutsourceOptionCosts(route: ProductRouteCapacityValue) {
  return route.outsourceOptions
    .map((option) => {
      const unitCost = calculateOutsourceUnitCost(route, option);

      return `${option.optionType} ${unitCost.toLocaleString("tr-TR", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      })}`;
    })
    .join(" · ");
}

function parseMoney(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  return Number(normalized);
}

function formatMoneyInput(cents: number) {
  return (cents / 100).toFixed(2).replace(/\.00$/, "");
}

function formatCurrency(value: number, currencyCode: "EUR" | "USD") {
  return new Intl.NumberFormat("tr-TR", {
    currency: currencyCode,
    maximumFractionDigits: 3,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
    style: "percent",
  }).format(value / 100);
}
