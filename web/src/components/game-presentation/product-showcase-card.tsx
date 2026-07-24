import { PackageCheck, type LucideIcon } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

import { ArtCard } from "@/components/ui/art-card";

import { OrderMetricCard } from "./order-metric-card";

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
  cardColors: ProductShowcaseCardColors;
  imageUrl: string | null;
  metaLabel?: string;
  metrics: readonly ProductShowcaseMetric[];
  name: string;
};

export function ProductShowcaseCard({
  cardColors,
  imageUrl,
  metaLabel,
  metrics,
  name,
}: ProductShowcaseCardProps) {
  return (
    <div
      className="grid min-h-[330px] grid-cols-1 gap-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
      data-product-showcase-card
    >
      <div className="flex min-w-0 flex-col justify-between gap-2 rounded-lg border border-border bg-background/60 p-2.5">
        <div>
          <h3 className="text-2xl font-semibold leading-tight text-foreground">
            {name}
          </h3>
          {metaLabel ? (
            <p className="mt-1 text-xs text-muted-foreground">{metaLabel}</p>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          {metrics.map((metric) => (
            <OrderMetricCard
              icon={metric.icon}
              key={metric.key}
              label={metric.label}
              value={metric.value}
            />
          ))}
        </div>
      </div>

      <div className="relative isolate min-h-[300px] overflow-hidden rounded-lg lg:min-h-0">
        <div
          className="absolute inset-0 z-0 overflow-hidden rounded-lg border border-white/10 bg-[#15141d]"
          data-product-art-layer="true"
        >
          <ArtCard
            gradientFrom={cardColors.gradientFrom}
            gradientTo={cardColors.gradientTo}
            primaryColor={cardColors.primaryColor}
            secondaryColor={cardColors.secondaryColor}
            svgIconAccentColor={cardColors.svgIconAccentColor}
          />
          <span className="absolute left-5 top-3 z-10 text-8xl font-extralight text-white/20">
            {name.charAt(0).toUpperCase()}
          </span>
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
