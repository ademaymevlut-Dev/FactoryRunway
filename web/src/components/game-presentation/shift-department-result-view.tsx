"use client";

import { PackageOpen } from "lucide-react";
import Image from "next/image";

import CountUp from "@/components/ui/CountUp";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ShiftDepartmentMetric = {
  key: string;
  label: string;
  value: number;
};

export type ShiftDepartmentProductView = {
  imageUrl: string | null;
  key: string;
  name: string;
  orderLabel: string;
  quantityLabel: string;
};

export type ShiftDepartmentActiveProductView = {
  ariaLabel: string;
  imageUrl: string | null;
  key: string;
  name: string;
  opacity: number;
  orderLabel: string;
  pulseScale: number;
};

export type ShiftDepartmentResultTone =
  | "danger"
  | "neutral"
  | "success"
  | "warning";

export type ShiftDepartmentResultViewProps = {
  activeLineLabel: string;
  activeProduct?: ShiftDepartmentActiveProductView | null;
  departmentLabel: string;
  isFinal: boolean;
  metrics: readonly ShiftDepartmentMetric[];
  numberLocale: string;
  numberSeparator?: string;
  processedProductsLabel: string;
  products?: readonly ShiftDepartmentProductView[];
  statusLabel?: string;
  statusTone?: ShiftDepartmentResultTone;
  utilizationAriaLabel: string;
  utilizationPercent: number;
  utilizationTone: ShiftDepartmentResultTone;
};

const utilizationToneClasses: Record<ShiftDepartmentResultTone, string> = {
  danger: "text-red-400",
  neutral: "text-orange-400",
  success: "text-emerald-300",
  warning: "text-yellow-300",
};

const statusToneClasses: Record<ShiftDepartmentResultTone, string> = {
  danger: "border-red-300/35 text-red-200",
  neutral: "border-white/15 text-muted-foreground",
  success: "border-emerald-300/35 text-emerald-200",
  warning: "border-amber-300/35 text-amber-200",
};

export function ShiftDepartmentResultView({
  activeLineLabel,
  activeProduct,
  departmentLabel,
  isFinal,
  metrics,
  numberLocale,
  numberSeparator = ".",
  processedProductsLabel,
  products = [],
  statusLabel,
  statusTone = "neutral",
  utilizationAriaLabel,
  utilizationPercent,
  utilizationTone,
}: ShiftDepartmentResultViewProps) {
  return (
    <article
      className="min-w-0 rounded-lg border border-white/10 bg-card/80 p-2 shadow-lg backdrop-blur xl:p-3"
      data-shift-department-result-view
    >
      <div className="mb-2 flex items-center justify-between gap-2 xl:mb-3">
        <h3 className="truncate text-xs font-semibold text-white xl:text-sm">
          {departmentLabel}
        </h3>
        <div className="flex shrink-0 items-center gap-1.5">
          {statusLabel ? (
            <Badge
              className={cn(
                "h-5 rounded-md bg-transparent px-1.5 text-[9px]",
                statusToneClasses[statusTone],
              )}
              variant="outline"
            >
              {statusLabel}
            </Badge>
          ) : null}
          <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground xl:text-[10px]">
            {activeLineLabel}
          </span>
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-[1fr_auto] xl:gap-3">
        <div className="grid grid-cols-3 gap-2 xl:gap-3">
          {metrics.map((metric) => (
            <Metric
              isFinal={isFinal}
              key={metric.key}
              label={metric.label}
              locale={numberLocale}
              metricKey={metric.key}
              separator={numberSeparator}
              value={metric.value}
            />
          ))}
        </div>
        <div
          aria-label={utilizationAriaLabel}
          className="flex min-w-10 items-center justify-end xl:min-w-[56px]"
          data-utilization-percent={utilizationPercent}
        >
          <span
            className={cn(
              "flex items-baseline font-mono text-base font-semibold tabular-nums xl:text-lg",
              utilizationToneClasses[utilizationTone],
            )}
          >
            %
            <CountUp
              className="inline-block"
              immediate={isFinal}
              locale={numberLocale}
              value={utilizationPercent}
            />
          </span>
        </div>
      </div>

      {activeProduct ? (
        <div
          aria-label={activeProduct.ariaLabel}
          aria-live="polite"
          className="mt-2 border-t border-white/8 pt-1.5 xl:mt-3 xl:pt-2"
          data-active-product-key={activeProduct.key}
          style={{ opacity: activeProduct.opacity }}
        >
          <div className="flex min-h-12 items-center gap-2 rounded-md bg-background/35 px-1.5 py-1.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-100 xl:min-h-[72px] xl:gap-3 xl:px-2 xl:py-2">
            <ProductThumb
              imageUrl={activeProduct.imageUrl}
              name={activeProduct.name}
              pulseScale={activeProduct.pulseScale}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white xl:text-sm">
                {activeProduct.name}
              </p>
              <p className="mt-0.5 truncate text-[8px] text-muted-foreground xl:mt-1 xl:text-[10px]">
                {activeProduct.orderLabel}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {isFinal && products.length > 0 ? (
        <div className="mt-2 border-t border-white/8 pt-1.5 xl:mt-3 xl:pt-2">
          <p className="mb-1.5 text-[8px] font-semibold uppercase tracking-wider text-muted-foreground xl:mb-2 xl:text-[9px]">
            {processedProductsLabel}
          </p>
          <div className="space-y-1 xl:space-y-1.5">
            {products.map((product) => (
              <div
                className="flex items-center justify-between gap-1.5 rounded-md bg-background/45 px-1.5 py-1 text-[10px] xl:gap-2 xl:px-2 xl:py-1.5 xl:text-xs"
                key={product.key}
              >
                <ProductThumb
                  imageUrl={product.imageUrl}
                  name={product.name}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">
                    {product.name}
                  </p>
                  <p className="truncate text-[8px] text-muted-foreground xl:text-[10px]">
                    {product.orderLabel}
                  </p>
                </div>
                <span className="shrink-0 font-mono tabular-nums text-emerald-300">
                  {product.quantityLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function Metric({
  isFinal,
  label,
  locale,
  metricKey,
  separator,
  value,
}: {
  isFinal: boolean;
  label: string;
  locale: string;
  metricKey: string;
  separator: string;
  value: number;
}) {
  return (
    <div
      className="min-w-0"
      data-metric-value={value}
      data-shift-department-metric={metricKey}
    >
      <p className="truncate text-[7px] font-semibold uppercase tracking-wider text-muted-foreground xl:text-[8px]">
        {label}
      </p>
      <CountUp
        className="block truncate font-mono text-sm font-semibold tabular-nums text-emerald-300 xl:text-base"
        immediate={isFinal}
        locale={locale}
        separator={separator}
        value={value}
      />
    </div>
  );
}

function ProductThumb({
  imageUrl,
  name,
  pulseScale = 1,
  size,
}: {
  imageUrl: string | null;
  name: string;
  pulseScale?: number;
  size: "sm" | "lg";
}) {
  const dimensions =
    size === "lg"
      ? "size-10 rounded-md xl:size-16 xl:rounded-lg"
      : "size-7 rounded-md xl:size-9";
  const imagePadding = size === "lg" ? "p-1 xl:p-1.5" : "p-0.5 xl:p-1";
  const imageSizes =
    size === "lg"
      ? "(min-width: 1280px) 64px, 40px"
      : "(min-width: 1280px) 36px, 28px";

  return (
    <div
      className={`relative shrink-0 overflow-hidden border border-white/10 bg-card/70 shadow-sm transition-transform duration-150 ease-out ${dimensions}`}
      style={{ transform: `scale(${pulseScale})` }}
    >
      {imageUrl ? (
        <Image
          alt={name}
          className={`object-contain ${imagePadding}`}
          fill
          sizes={imageSizes}
          src={imageUrl}
        />
      ) : (
        <span className="grid size-full place-items-center text-primary">
          <PackageOpen
            aria-hidden="true"
            className={
              size === "lg"
                ? "size-4 xl:size-[22px]"
                : "size-3.5 xl:size-4"
            }
          />
        </span>
      )}
    </div>
  );
}
