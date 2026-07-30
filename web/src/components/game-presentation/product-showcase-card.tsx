import { PackageCheck, type LucideIcon } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

import { ArtCard } from "@/components/ui/art-card";
import { cn } from "@/lib/utils";

import { OrderMetricCard } from "./order-metric-card";

const COMPACT_MOBILE_METRIC_KEYS = new Set([
  "delivery",
  "quantity",
  "route",
]);

export type ProductShowcaseCardColors = {
  gradientFrom: string;
  gradientTo: string;
  primaryColor: string;
  secondaryColor: string;
  svgIconAccentColor: string;
};

export type ProductShowcaseMetric = {
  icon: LucideIcon;
  key: string;
  label: string;
  value: ReactNode;
};

export type ProductShowcaseCardProps = {
  backgroundLayer?: ReactNode;
  cardColors: ProductShowcaseCardColors;
  compactMobile?: boolean;
  imageUrl: string | null;
  metaLabel?: string;
  metrics: readonly ProductShowcaseMetric[];
  name: string;
};

export function ProductShowcaseCard({
  backgroundLayer,
  cardColors,
  compactMobile = false,
  imageUrl,
  metaLabel,
  metrics,
  name,
}: ProductShowcaseCardProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-2",
        compactMobile
          ? "min-[900px]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
          : "lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]",
        compactMobile ? "min-h-[230px] sm:min-h-[330px]" : "min-h-[330px]",
      )}
      data-product-showcase-card
    >
      <div className="flex min-w-0 flex-col justify-between gap-2 rounded-lg border border-border bg-background/60 p-2.5">
        <div>
          <h3
            className={cn(
              "text-lg font-semibold leading-tight text-foreground",
              compactMobile ? "xl:text-2xl" : "sm:text-2xl",
            )}
          >
            {name}
          </h3>
          {metaLabel ? (
            <p className="mt-1 text-xs text-muted-foreground">{metaLabel}</p>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          {metrics.map((metric) => {
            const hideOnCompactMobile =
              compactMobile &&
              !COMPACT_MOBILE_METRIC_KEYS.has(metric.key);

            return (
              <div
                className={cn(
                  "contents",
                  hideOnCompactMobile && "hidden xl:contents",
                )}
                key={metric.key}
              >
                <OrderMetricCard
                  icon={metric.icon}
                  label={metric.label}
                  value={metric.value}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div
        className={cn(
          "relative isolate overflow-hidden rounded-lg",
          compactMobile
            ? "min-h-[200px] sm:min-h-[300px] min-[900px]:min-h-0"
            : "min-h-[300px] lg:min-h-0",
        )}
      >
        <div
          className="absolute inset-0 z-0 overflow-hidden rounded-lg border border-white/10 bg-[#15141d]"
          data-product-art-layer="true"
        >
          {backgroundLayer ?? (
            <ArtCard
              gradientFrom={cardColors.gradientFrom}
              gradientTo={cardColors.gradientTo}
              primaryColor={cardColors.primaryColor}
              secondaryColor={cardColors.secondaryColor}
              svgIconAccentColor={cardColors.svgIconAccentColor}
            />
          )}
        </div>
        {imageUrl ? (
          <div
            className="pointer-events-none absolute inset-0 z-30"
            data-product-image-layer="true"
          >
            <Image
              alt={name}
              className="object-contain object-bottom"
              fill
              sizes="(min-width: 1280px) 420px, (min-width: 1024px) 40vw, 90vw"
              src={imageUrl}
            />
          </div>
        ) : (
          <span className="absolute inset-8 z-30 grid place-items-center rounded-lg border border-white/15 bg-white/10 text-white/50">
            <PackageCheck aria-hidden="true" size={72} />
          </span>
        )}
      </div>
    </div>
  );
}
