import { GripVertical } from "lucide-react";

import {
  ProductionQueueRow,
  type ProductionQueueRowItem,
  type ProductionQueueRowTone,
} from "@/components/game-presentation/production-queue-row";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { formatProductionQueueNumber } from "./production-queue-formatters";
import type { ProductionQueueSceneState } from "./production-queue-scene-state";
import type {
  ProductionQueueLocale,
  ProductionQueueSceneCopy,
  ProductionQueueSceneModel,
  ProductionQueueTarget,
  ResolvedProductionQueueItem,
} from "./production-queue-scene-types";

export type ProductionQueueListProps = {
  activeTarget: ProductionQueueTarget | null;
  copy: ProductionQueueSceneCopy;
  locale: ProductionQueueLocale;
  model: ProductionQueueSceneModel;
  numberLocale: string;
  state: ProductionQueueSceneState;
};

function getItemTone(
  item: ResolvedProductionQueueItem,
): ProductionQueueRowTone {
  if (item.status === "urgent") return "danger";
  if (item.status === "material_waiting" || item.dueInDays <= 8) {
    return "warning";
  }
  if (item.status === "outsourcing_available") return "info";
  return "success";
}

function getMetricTargets(itemId: string, movedItemId: string) {
  return {
    planned:
      itemId === movedItemId
        ? "queue-updated-plan"
        : itemId === "queue-clavier"
          ? "queue-planned"
          : undefined,
    remaining: itemId === movedItemId ? "queue-remaining" : undefined,
  };
}

function createRowItem(
  item: ResolvedProductionQueueItem,
  plannedProduction: number,
  copy: ProductionQueueSceneCopy,
  locale: ProductionQueueLocale,
  numberLocale: string,
): ProductionQueueRowItem {
  const statusLabel = copy.statuses[item.status];
  const quantity = (value: number) =>
    `${formatProductionQueueNumber(value, numberLocale)} ${copy.pieceUnitLabel}`;

  return {
    completedQuantityLabel: quantity(0),
    dueLabel: `${formatProductionQueueNumber(
      item.dueInDays,
      numberLocale,
    )} ${copy.dayUnitLabel}`,
    dueTone: getItemTone(item),
    footerStatusLabel: statusLabel,
    inputReadyQuantityLabel: quantity(item.remainingQuantity),
    modeLabel: item.product.productType.labels[locale],
    orderNo: item.product.name,
    orderSummaryLabel: `${item.customerName} · ${statusLabel}`,
    plannedProductionLabel: quantity(plannedProduction),
    productCode: item.customerName,
    productImageUrl: item.product.imageUrl,
    productName: item.product.name,
    productTierLabel: item.product.category.labels[locale],
    queueStartLabel: statusLabel,
    queueStartTone: getItemTone(item),
    remainingQuantityLabel: quantity(item.remainingQuantity),
    warningLabel: undefined,
  };
}

export function ProductionQueueList({
  activeTarget,
  copy,
  locale,
  model,
  numberLocale,
  state,
}: ProductionQueueListProps) {
  const movedItemId = model.activeItem.id;
  const totalPlannedProduction = Object.values(
    state.plannedProductionByItemId,
  ).reduce((total, value) => total + value, 0);

  return (
    <section
      className={cn(
        "rounded-xl border border-white/10 bg-background/52 p-3 transition-[box-shadow,border-color] sm:p-4",
        activeTarget === "production-queue-list" &&
          "border-primary/60 shadow-[0_0_28px_color-mix(in_srgb,var(--primary)_16%,transparent)]",
      )}
      data-highlighted={activeTarget === "production-queue-list"}
      data-production-queue-list
      data-showcase-target="production-queue-list"
    >
      <div className="mb-3 flex flex-col gap-3 border-b border-white/8 pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {copy.departmentLabel}
          </p>
          <h3 className="mt-1 text-xl font-semibold text-foreground">
            {model.departmentName}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {copy.queueDescription}
          </p>
        </div>
        <div className="rounded-lg border border-primary/25 bg-primary/8 px-3 py-2 sm:text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {copy.plannedSummaryLabel}
          </p>
          <strong className="mt-0.5 block font-mono text-lg text-primary">
            {formatProductionQueueNumber(
              totalPlannedProduction,
              numberLocale,
            )}{" "}
            {copy.pieceUnitLabel}
          </strong>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="mb-1 hidden grid-cols-[30px_42px_minmax(130px,1fr)_72px_72px_88px] gap-2 px-2.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground lg:grid"
      >
        <span>{copy.priorityLabel}</span>
        <span />
        <span>{copy.queueLabel}</span>
        <span>{copy.plannedLabel}</span>
        <span>{copy.remainingLabel}</span>
        <span>{copy.dayUnitLabel}</span>
      </div>

      <ol
        aria-label={copy.queueListAriaLabel}
        className="grid gap-2"
        data-queue-order={state.queueOrder.join(",")}
      >
        {state.queueOrder.map((itemId, index) => {
          const item = model.itemsById[itemId];

          if (!item) return null;

          const isMovedItem = item.id === movedItemId;
          const isReordering =
            isMovedItem && state.status === "reordering";
          const plannedProduction =
            state.plannedProductionByItemId[item.id] ?? 0;
          const metricTargets = getMetricTargets(item.id, movedItemId);

          return (
            <li
              aria-label={`${copy.priorityLabel} ${index + 1}: ${
                item.product.name
              }, ${item.customerName}`}
              className="relative"
              data-moved-item={isMovedItem}
              data-priority={index + 1}
              data-production-queue-item={item.id}
              key={item.id}
            >
              <ProductionQueueRow
                action={
                  item.warningCode ? (
                    <span
                      className={cn(
                        "inline-flex rounded-md transition-[box-shadow,opacity]",
                        activeTarget === "queue-delivery-risk" &&
                          "shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_70%,transparent),0_0_18px_color-mix(in_srgb,var(--primary)_22%,transparent)]",
                      )}
                      data-highlighted={
                        activeTarget === "queue-delivery-risk"
                      }
                      data-showcase-target={
                        isMovedItem ? "queue-delivery-risk" : undefined
                      }
                    >
                      <Badge
                        className="h-5 rounded-md border-amber-300/40 px-1.5 text-[10px] text-amber-100"
                        variant="outline"
                      >
                        {copy.warningLabels[item.warningCode]}
                      </Badge>
                    </span>
                  ) : undefined
                }
                activeMetricTarget={activeTarget ?? undefined}
                dragHandle={
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-7 place-items-center rounded-md text-muted-foreground transition-[background-color,color,box-shadow]",
                      activeTarget === "queue-drag-handle" &&
                        isMovedItem &&
                        "bg-primary/15 text-primary shadow-[0_0_16px_color-mix(in_srgb,var(--primary)_24%,transparent)]",
                    )}
                    data-highlighted={
                      activeTarget === "queue-drag-handle" && isMovedItem
                    }
                    data-showcase-target={
                      isMovedItem ? "queue-drag-handle" : undefined
                    }
                  >
                    <GripVertical size={15} />
                  </span>
                }
                isDragging={isReordering}
                isHighlighted={
                  isMovedItem &&
                  (state.status === "reordering" ||
                    state.status === "updated" ||
                    state.status === "completed")
                }
                item={createRowItem(
                  item,
                  plannedProduction,
                  copy,
                  locale,
                  numberLocale,
                )}
                labels={{
                  completed: copy.completedLabel,
                  inputReady: copy.inputReadyLabel,
                  planned: copy.plannedLabel,
                  remaining: copy.remainingLabel,
                }}
                layout="showcase"
                metricTargets={metricTargets}
                priorityLabel={`#${index + 1}`}
              />
            </li>
          );
        })}
      </ol>
    </section>
  );
}
