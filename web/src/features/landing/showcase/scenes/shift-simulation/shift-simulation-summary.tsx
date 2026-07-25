import { AlertTriangle, Boxes, Gauge, Layers3, Shirt } from "lucide-react";

import { ProductColorChips } from "@/components/game-presentation/product-color-chips";
import {
  ProductShowcaseCard,
  type ProductShowcaseMetric,
} from "@/components/game-presentation/product-showcase-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { formatShiftSimulationNumber } from "./shift-simulation-formatters";
import type {
  ShiftSimulationSceneCopy,
  ShiftSimulationSceneModel,
} from "./shift-simulation-scene-types";

export type ShiftSimulationSummaryProps = {
  copy: ShiftSimulationSceneCopy;
  isOpen: boolean;
  model: ShiftSimulationSceneModel;
  numberLocale: string;
  highlighted: boolean;
  sceneId: string;
};

export function ShiftSimulationSummary({
  copy,
  highlighted,
  isOpen,
  model,
  numberLocale,
  sceneId,
}: ShiftSimulationSummaryProps) {
  const titleId = `${sceneId}-summary-title`;
  const sewing = model.departmentsByKey.sewing;
  const finishedGoods = model.finishedGoods[0];
  const metrics: ProductShowcaseMetric[] = [
    {
      icon: Layers3,
      key: "category",
      label: copy.categoryLabel,
      value: model.product.category.label,
    },
    {
      icon: Shirt,
      key: "product-type",
      label: copy.productTypeLabel,
      value: model.product.productType.label,
    },
    {
      icon: Gauge,
      key: "workload",
      label: copy.workloadLabel,
      value: `${formatShiftSimulationNumber(
        model.totalWorkload,
        numberLocale,
      )} ${copy.workloadUnitLabel}`,
    },
  ];
  const colors = model.product.colors.map((color) => ({
    hexCode: color.hexCode,
    key: color.key,
    label: color.label,
  }));

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "mt-3 rounded-xl border border-white/10 bg-card/55 p-3 transition-[border-color,box-shadow] sm:p-4",
        highlighted &&
          "border-primary/60 shadow-[0_0_32px_color-mix(in_srgb,var(--primary)_16%,transparent)]",
      )}
      data-highlighted={highlighted}
      data-shift-summary-open={isOpen}
      data-showcase-target="shift-summary"
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-readable">
          {copy.finishedGoodsLabel}
        </p>
        <h3 className="mt-1 text-xl font-semibold text-foreground" id={titleId}>
          {copy.summaryTitle}
        </h3>
        <p className="mt-2 max-w-3xl text-xs leading-5 text-muted-foreground">
          {isOpen ? copy.summaryDescription : copy.summaryPendingLabel}
        </p>
      </div>

      {isOpen && finishedGoods && sewing ? (
        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <div>
            <ProductShowcaseCard
              cardColors={model.product.card}
              imageUrl={model.product.imageUrl}
              metaLabel={copy.finishedGoodsLabel}
              metrics={metrics}
              name={model.product.name}
            />
            <ProductColorChips colors={colors} title={copy.colorsLabel} />
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-300/25 bg-emerald-400/8 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100/75">
                {copy.finishedGoodsLabel}
              </p>
              <strong className="mt-2 block font-mono text-3xl text-emerald-200">
                {formatShiftSimulationNumber(
                  finishedGoods.quantity,
                  numberLocale,
                )}{" "}
                {model.product.name}
              </strong>
            </div>

            <div className="rounded-xl border border-white/10 bg-background/52 p-3">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-b border-white/8 pb-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <span>{copy.categoryLabel}</span>
                <span>{copy.plannedLabel}</span>
                <span>{copy.actualLabel}</span>
                <span>{copy.differenceLabel}</span>
              </div>
              <div className="mt-2 grid gap-2">
                {model.departments.map((department) => (
                  <div
                    className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 text-xs"
                    key={department.departmentKey}
                  >
                    <span className="font-medium text-foreground">
                      {department.departmentName}
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {department.plannedQuantity}
                    </span>
                    <span className="font-mono text-foreground">
                      {department.actualQuantity}
                    </span>
                    <span
                      className={cn(
                        "font-mono",
                        department.difference < 0
                          ? "text-red-200"
                          : "text-emerald-200",
                      )}
                    >
                      {department.difference > 0 ? "+" : ""}
                      {department.difference}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-red-300/30 bg-red-500/10 p-3">
              <div className="flex items-center gap-2">
                <Badge
                  className="border-red-300/35 text-red-100"
                  variant="outline"
                >
                  <AlertTriangle
                    aria-hidden="true"
                    className="mr-1"
                    size={12}
                  />
                  {copy.statuses.bottleneck}
                </Badge>
                <span className="font-mono text-sm text-red-100">
                  {sewing.difference} {copy.pieceUnitLabel}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-red-100/80">
                {copy.bottleneckSummary}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-background/52 p-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Boxes aria-hidden="true" size={14} />
                {model.events[0]?.copy.title}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {model.events[0]?.copy.description}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
