"use client";

import { memo } from "react";
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
  compactMetrics?: boolean;
  departmentIconKey?: string;
  departmentLabel: string;
  isFinal: boolean;
  metrics: readonly ShiftDepartmentMetric[];
  numberLocale: string;
  numberSeparator?: string;
  presentation?: "default" | "mobileCompact";
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
  compactMetrics = false,
  departmentIconKey = "warehouse",
  departmentLabel,
  isFinal,
  metrics,
  numberLocale,
  numberSeparator = ".",
  presentation = "default",
  processedProductsLabel,
  products = [],
  statusLabel,
  statusTone = "neutral",
  utilizationAriaLabel,
  utilizationPercent,
  utilizationTone,
}: ShiftDepartmentResultViewProps) {
  if (presentation === "mobileCompact") {
    const primaryMetric =
      metrics.find((metric) => metric.key === "produced") ?? metrics[0];

    return (
      <article
        className="flex min-h-[68px] min-w-0 items-center justify-between gap-3 rounded-xl border border-white/10 bg-card/80 px-2.5 py-2.5 shadow-[0_10px_28px_rgba(0,0,0,0.2)] backdrop-blur"
        data-final={isFinal}
        data-shift-department-presentation="mobile-compact"
        data-shift-department-result-view
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <MobileDepartmentIcon iconKey={departmentIconKey} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-xs font-semibold text-white">
              {departmentLabel}
            </h3>
            {activeProduct ? (
              <div
                aria-label={activeProduct.ariaLabel}
                aria-live="polite"
                className="mt-1 flex min-w-0 items-center gap-1.5"
                data-active-product-key={activeProduct.key}
                style={{ opacity: activeProduct.opacity }}
              >
                <ProductThumb
                  imageUrl={activeProduct.imageUrl}
                  name={activeProduct.name}
                  pulseScale={activeProduct.pulseScale}
                  size="sm"
                />
                <p className="min-w-0 truncate text-[9px] font-medium text-muted-foreground">
                  {activeProduct.name}
                </p>
              </div>
            ) : null}
          </div>
        </div>
        {primaryMetric ? (
          <div
            className="shrink-0 text-right"
            data-metric-value={primaryMetric.value}
            data-shift-department-metric={primaryMetric.key}
          >
            <p className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
              {primaryMetric.label}
            </p>
            <CountUp
              className="block font-mono text-base font-semibold tabular-nums text-emerald-300"
              immediate={isFinal}
              locale={numberLocale}
              separator={numberSeparator}
              value={primaryMetric.value}
            />
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <article
      className="min-w-0 rounded-lg border border-white/10 bg-card/80 p-2 shadow-lg backdrop-blur min-[1440px]:p-3"
      data-shift-department-result-view
    >
      <div className="mb-2 flex items-center justify-between gap-2 min-[1440px]:mb-3">
        <h3 className="truncate text-xs font-semibold text-white min-[1440px]:text-sm">
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
          <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground min-[1440px]:text-[10px]">
            {activeLineLabel}
          </span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto] min-[1440px]:gap-3">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,4.5rem),1fr))] gap-2 min-[1440px]:gap-3">
          {metrics.map((metric) => (
            <Metric
              isFinal={isFinal}
              key={metric.key}
              label={metric.label}
              locale={numberLocale}
              compact={compactMetrics}
              metricKey={metric.key}
              separator={numberSeparator}
              value={metric.value}
            />
          ))}
        </div>
        <div
          aria-label={utilizationAriaLabel}
          className="flex min-w-10 items-center justify-end min-[1440px]:min-w-[56px]"
          data-utilization-percent={utilizationPercent}
        >
          <span
            className={cn(
              "flex items-baseline font-mono text-base font-semibold tabular-nums min-[1440px]:text-lg",
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
          className="mt-2 border-t border-white/8 pt-1.5 min-[1440px]:mt-3 min-[1440px]:pt-2"
          data-active-product-key={activeProduct.key}
          style={{ opacity: activeProduct.opacity }}
        >
          <div className="flex min-h-12 items-center gap-2 rounded-md bg-background/35 px-1.5 py-1.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-100 min-[1440px]:min-h-[72px] min-[1440px]:gap-3 min-[1440px]:px-2 min-[1440px]:py-2">
            <ProductThumb
              imageUrl={activeProduct.imageUrl}
              name={activeProduct.name}
              pulseScale={activeProduct.pulseScale}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white min-[1440px]:text-sm">
                {activeProduct.name}
              </p>
              <p className="mt-0.5 truncate text-[8px] text-muted-foreground min-[1440px]:mt-1 min-[1440px]:text-[10px]">
                {activeProduct.orderLabel}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {isFinal && products.length > 0 ? (
        <div className="mt-2 border-t border-white/8 pt-1.5 min-[1440px]:mt-3 min-[1440px]:pt-2">
          <p className="mb-1.5 text-[8px] font-semibold uppercase tracking-wider text-muted-foreground min-[1440px]:mb-2 min-[1440px]:text-[9px]">
            {processedProductsLabel}
          </p>
          <div className="space-y-1 min-[1440px]:space-y-1.5">
            {products.map((product) => (
              <div
                className="flex items-center justify-between gap-1.5 rounded-md bg-background/45 px-1.5 py-1 text-[10px] min-[1440px]:gap-2 min-[1440px]:px-2 min-[1440px]:py-1.5 min-[1440px]:text-xs"
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
                  <p className="truncate text-[8px] text-muted-foreground min-[1440px]:text-[10px]">
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

const MobileDepartmentIcon = memo(function MobileDepartmentIcon({
  iconKey,
}: {
  iconKey: string;
}) {
  const iconUrl = `/game-icons/dock/${iconKey}.svg`;
  const iconMaskStyle = {
    WebkitMaskImage: `url("${iconUrl}")`,
    WebkitMaskPosition: "center",
    WebkitMaskRepeat: "no-repeat",
    WebkitMaskSize: "contain",
    maskImage: `url("${iconUrl}")`,
    maskPosition: "center",
    maskRepeat: "no-repeat",
    maskSize: "contain",
  };

  return (
    <span
      aria-hidden="true"
      className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-primary/20 bg-primary/8 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_20px_rgba(0,0,0,0.22)]"
    >
      <span className="relative block size-5">
        <span
          className="absolute inset-0 bg-current opacity-95"
          style={iconMaskStyle}
        />
        <span
          className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.86)_0%,rgba(136,224,255,0.62)_28%,rgba(0,109,143,0.88)_66%,rgba(1,28,40,0.3)_100%)] opacity-80 mix-blend-screen"
          style={iconMaskStyle}
        />
        <span
          className="absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.94)_0%,rgba(255,255,255,0.28)_24%,transparent_52%)] opacity-70"
          style={iconMaskStyle}
        />
      </span>
    </span>
  );
});

function Metric({
  compact,
  isFinal,
  label,
  locale,
  metricKey,
  separator,
  value,
}: {
  compact: boolean;
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
      <p
        className={cn(
          "font-semibold uppercase text-muted-foreground",
          compact
            ? "whitespace-nowrap text-[7px] tracking-[0.04em]"
            : "truncate text-[7px] tracking-wider min-[1440px]:text-[8px]",
        )}
      >
        {label}
      </p>
      <CountUp
        className={cn(
          "block truncate font-mono font-semibold tabular-nums text-emerald-300",
          compact
            ? "text-xs min-[1440px]:text-sm"
            : "text-sm min-[1440px]:text-base",
        )}
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
      ? "size-10 rounded-md min-[1440px]:size-16 min-[1440px]:rounded-lg"
      : "size-7 rounded-md min-[1440px]:size-9";
  const imagePadding =
    size === "lg"
      ? "p-1 min-[1440px]:p-1.5"
      : "p-0.5 min-[1440px]:p-1";
  const imageSizes =
    size === "lg"
      ? "(min-width: 1440px) 64px, 40px"
      : "(min-width: 1440px) 36px, 28px";

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
                ? "size-4 min-[1440px]:size-[22px]"
                : "size-3.5 min-[1440px]:size-4"
            }
          />
        </span>
      )}
    </div>
  );
}
