import {
  AlertTriangle,
  Layers3,
  Route,
  Scissors,
  Shirt,
} from "lucide-react";
import Image from "next/image";

import { ProductColorChips } from "@/components/game-presentation/product-color-chips";
import { ProductRouteTimeline } from "@/components/game-presentation/product-route-timeline";
import { ArtCard } from "@/components/ui/art-card";
import { Badge } from "@/components/ui/badge";

import { formatProductionQueueNumber } from "./production-queue-formatters";
import type {
  ProductionQueueLocale,
  ProductionQueueSceneCopy,
  ProductionQueueSceneModel,
} from "./production-queue-scene-types";

export type ProductionQueueDetailProps = {
  copy: ProductionQueueSceneCopy;
  locale: ProductionQueueLocale;
  model: ProductionQueueSceneModel;
  numberLocale: string;
};

export function ProductionQueueDetail({
  copy,
  locale,
  model,
  numberLocale,
}: ProductionQueueDetailProps) {
  const { activeItem, outsourceStep } = model;
  const { product } = activeItem;
  const routeSteps = product.route.map((step) => ({
    active: step.departmentKey === model.departmentStep.departmentKey,
    canOutsource: step.canOutsource,
    departmentKey: step.departmentKey,
    label: step.labels[locale],
    sequence: step.sequence,
    workloadLabel: `${formatProductionQueueNumber(
      step.workloadPointsPerUnit,
      numberLocale,
    )} ${copy.workloadUnitLabel}`,
    workloadPointsPerUnit: step.workloadPointsPerUnit,
  }));
  const colors = product.colors.map((color) => ({
    hexCode: color.hexCode,
    key: color.key,
    label: color.labels[locale],
  }));

  return (
    <aside
      aria-label={product.name}
      className="min-w-0 rounded-xl border border-white/10 bg-card/62 p-3"
      data-production-queue-detail
    >
      <div className="relative isolate aspect-[4/3] min-h-44 overflow-hidden rounded-lg border border-white/10 bg-[#15141d]">
        <ArtCard
          gradientFrom={product.card.gradientFrom}
          gradientTo={product.card.gradientTo}
          primaryColor={product.card.primaryColor}
          secondaryColor={product.card.secondaryColor}
          svgIconAccentColor={product.card.svgIconAccentColor}
        />
        <Image
          alt={product.name}
          className="z-10 object-contain object-bottom"
          fill
          sizes="(min-width: 1280px) 260px, (min-width: 768px) 38vw, 92vw"
          src={product.imageUrl}
        />
      </div>

      <div className="mt-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">
              {activeItem.customerName}
            </p>
            <h3 className="text-2xl font-semibold text-foreground">
              {product.name}
            </h3>
          </div>
          <Badge
            className="border-red-300/35 bg-red-500/10 text-red-100"
            variant="outline"
          >
            <AlertTriangle aria-hidden="true" className="mr-1" size={12} />
            {copy.warningLabels.DELIVERY_RISK}
          </Badge>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-background/55 p-2.5">
            <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <Layers3 aria-hidden="true" size={12} />
              {copy.categoryLabel}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">
              {product.category.labels[locale]}
            </dd>
          </div>
          <div className="rounded-lg border border-border bg-background/55 p-2.5">
            <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <Shirt aria-hidden="true" size={12} />
              {copy.productTypeLabel}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">
              {product.productType.labels[locale]}
            </dd>
          </div>
          <div className="rounded-lg border border-border bg-background/55 p-2.5">
            <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <Scissors aria-hidden="true" size={12} />
              {copy.workloadLabel}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-primary">
              {formatProductionQueueNumber(model.totalWorkload, numberLocale)}{" "}
              {copy.workloadUnitLabel}
            </dd>
          </div>
          <div className="rounded-lg border border-border bg-background/55 p-2.5">
            <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <AlertTriangle aria-hidden="true" size={12} />
              {copy.warningLabels.DELIVERY_RISK}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-red-100">
              {formatProductionQueueNumber(
                activeItem.dueInDays,
                numberLocale,
              )}{" "}
              {copy.dayUnitLabel}
            </dd>
          </div>
        </dl>
      </div>

      <ProductColorChips colors={colors} title={copy.colorsLabel} />

      <div className="mt-2 rounded-lg border border-border bg-background/60 p-2.5">
        <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <Route aria-hidden="true" size={13} />
          {copy.routeLabel}
        </p>
        <ProductRouteTimeline
          outsourceLabel={copy.outsourceBadgeLabel}
          steps={routeSteps}
          title={copy.routeLabel}
        />
        <p className="mt-2 rounded-md border border-fuchsia-300/25 bg-fuchsia-400/8 px-2 py-1.5 text-[11px] font-medium text-fuchsia-100">
          {outsourceStep.labels[locale]} · {copy.outsourceBadgeLabel}
        </p>
      </div>
    </aside>
  );
}
