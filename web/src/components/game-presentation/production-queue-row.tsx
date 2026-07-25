import { GripVertical, PackageOpen } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ProductionQueueRowTone =
  | "danger"
  | "info"
  | "success"
  | "warning";

export type ProductionQueueRowItem = {
  completedQuantityLabel: string;
  dueLabel: string;
  dueTone: ProductionQueueRowTone;
  footerStatusLabel: string;
  inputReadyQuantityLabel: string;
  modeLabel: string;
  orderNo: string;
  orderSummaryLabel: string;
  plannedProductionLabel: string;
  productCode: string;
  productImageUrl: string | null;
  productName: string;
  productTierLabel: string;
  queueStartLabel: string;
  queueStartTone: ProductionQueueRowTone;
  remainingQuantityLabel: string;
  warningLabel?: string;
};

export type ProductionQueueRowLabels = {
  completed: string;
  inputReady: string;
  planned: string;
  remaining: string;
};

export type ProductionQueueRowProps = {
  action?: ReactNode;
  activeMetricTarget?: string;
  dragHandle?: ReactNode;
  isDragging?: boolean;
  isHighlighted?: boolean;
  item: ProductionQueueRowItem;
  layout?: "default" | "showcase";
  labels: ProductionQueueRowLabels;
  metricTargets?: {
    planned?: string;
    remaining?: string;
  };
  priorityLabel: string;
  showDragHandle?: boolean;
};

export function ProductionQueueRow({
  action,
  activeMetricTarget,
  dragHandle,
  isDragging = false,
  isHighlighted = false,
  item,
  layout = "default",
  labels,
  metricTargets,
  priorityLabel,
  showDragHandle = false,
}: ProductionQueueRowProps) {
  return (
    <Card
      className={cn(
        "rounded-lg border bg-transparent py-0 shadow-none transition-colors data-[dragging]:border-primary/70 data-[dragging]:bg-primary/10",
        "border-border hover:border-primary/40",
        item.dueTone === "danger" && "border-red-300/35",
        item.dueTone === "warning" && "border-amber-300/35",
        isHighlighted && "border-primary/55 bg-primary/5",
      )}
      data-dragging={isDragging || undefined}
      data-production-queue-row
    >
      <CardContent
        className={cn(
          "grid min-h-[66px] gap-2 px-2.5 py-2",
          layout === "default" &&
            "lg:grid-cols-[30px_42px_minmax(150px,1fr)_78px_94px_84px_84px_112px_98px] lg:items-center",
          layout === "showcase" &&
            "sm:grid-cols-[30px_42px_minmax(130px,1fr)_72px_72px_88px] sm:items-center",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-1",
            layout === "default" ? "lg:block" : "sm:block",
          )}
        >
          {dragHandle ??
            (showDragHandle ? (
              <span className="grid size-7 place-items-center text-muted-foreground">
                <GripVertical aria-hidden="true" size={15} />
              </span>
            ) : null)}
          <span
            className={cn(
              "text-[11px] font-semibold tabular-nums text-muted-foreground",
              layout === "default"
                ? "lg:mt-1 lg:block lg:text-center"
                : "sm:mt-1 sm:block sm:text-center",
            )}
          >
            {priorityLabel}
          </span>
        </div>

        <ProductThumb
          imageUrl={item.productImageUrl}
          name={item.productName}
        />

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {item.orderNo}
            </h3>
            <Badge
              className="h-5 shrink-0 rounded-md px-1.5 text-[10px]"
              variant="outline"
            >
              {item.productTierLabel}
            </Badge>
            <Badge
              className="h-5 shrink-0 rounded-md border-emerald-300/30 px-1.5 text-[10px] text-emerald-100"
              variant="outline"
            >
              {item.modeLabel}
            </Badge>
            {item.warningLabel ? (
              <Badge
                className="h-5 shrink-0 rounded-md border-amber-300/40 px-1.5 text-[10px] text-amber-100"
                variant="outline"
              >
                {item.warningLabel}
              </Badge>
            ) : null}
            {action}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {item.productName} · {item.productCode}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            {item.orderSummaryLabel}
          </p>
        </div>

        <CompactMetric
          frameless
          highlight
          isTargetActive={metricTargets?.planned === activeMetricTarget}
          label={labels.planned}
          target={metricTargets?.planned}
          value={item.plannedProductionLabel}
        />
        {layout === "default" ? (
          <>
            <CompactMetric
              frameless
              label={labels.inputReady}
              value={item.inputReadyQuantityLabel}
            />
            <CompactMetric
              label={labels.completed}
              value={item.completedQuantityLabel}
            />
          </>
        ) : null}
        <CompactMetric
          frameless
          highlight
          isTargetActive={metricTargets?.remaining === activeMetricTarget}
          label={labels.remaining}
          target={metricTargets?.remaining}
          value={item.remainingQuantityLabel}
        />
        {layout === "default" ? (
          <QueuePill label={item.queueStartLabel} tone={item.queueStartTone} />
        ) : null}
        <div className="min-w-0">
          <QueuePill label={item.dueLabel} tone={item.dueTone} />
          <p className="mt-1 hidden truncate text-[10px] text-muted-foreground xl:block">
            {item.footerStatusLabel}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function CompactMetric({
  frameless = false,
  highlight = false,
  isTargetActive = false,
  label,
  target,
  tone,
  value,
}: {
  frameless?: boolean;
  highlight?: boolean;
  isTargetActive?: boolean;
  label: string;
  target?: string;
  tone?: ProductionQueueRowTone;
  value: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-md transition-[background-color,box-shadow]",
        frameless
          ? "border-0 bg-transparent px-0 py-0"
          : "border border-border bg-card/35 px-2 py-1 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0",
        isTargetActive &&
          (frameless
            ? "bg-primary/10"
            : "bg-primary/12 shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_65%,transparent),0_0_20px_color-mix(in_srgb,var(--primary)_18%,transparent)]"),
      )}
      data-highlighted={isTargetActive}
      data-showcase-target={target}
    >
      <span className="block truncate text-[10px] text-muted-foreground lg:hidden">
        {label}
      </span>
      <strong
        className={cn(
          "block truncate text-xs font-semibold tabular-nums text-foreground",
          highlight && "text-primary",
          tone === "danger" && "text-red-200",
          tone === "warning" && "text-amber-100",
        )}
      >
        {value}
      </strong>
    </div>
  );
}

function QueuePill({
  label,
  tone,
}: {
  label: string;
  tone: ProductionQueueRowTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-full items-center rounded-md border px-2 text-[11px] font-semibold",
        tone === "danger" &&
          "border-red-300/50 bg-red-500/15 text-red-200",
        tone === "warning" &&
          "border-amber-300/45 bg-amber-400/15 text-amber-200",
        tone === "info" &&
          "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
        tone === "success" &&
          "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
      )}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}

function ProductThumb({
  imageUrl,
  name,
}: {
  imageUrl: string | null;
  name: string;
}) {
  return (
    <div className="relative size-11 overflow-hidden rounded-md border border-border bg-card/70">
      {imageUrl ? (
        <Image
          alt={name}
          className="object-contain p-1"
          fill
          sizes="44px"
          src={imageUrl}
        />
      ) : (
        <span className="grid size-full place-items-center text-primary">
          <PackageOpen aria-hidden="true" size={18} />
        </span>
      )}
    </div>
  );
}
