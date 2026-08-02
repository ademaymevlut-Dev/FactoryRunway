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
  mobileDetailsAction?: ReactNode;
  mobileDetailsId?: string;
  mobileDetailsOpen?: boolean;
  mobileDetailsToggle?: ReactNode;
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
  mobileDetailsAction,
  mobileDetailsId,
  mobileDetailsOpen = false,
  mobileDetailsToggle,
  priorityLabel,
  showDragHandle = false,
}: ProductionQueueRowProps) {
  return (
    <Card
      className={cn(
        "rounded-lg border bg-transparent py-0 shadow-none transition-[border-color,background-color,box-shadow,transform] data-[dragging]:border-primary/70 data-[dragging]:bg-primary/10 data-[dragging]:shadow-lg",
        "border-border hover:border-primary/40",
        layout === "default" && "overflow-hidden max-[649px]:rounded-xl",
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
            "max-[649px]:min-h-[84px] max-[649px]:grid-cols-[44px_40px_minmax(0,1fr)_82px] max-[649px]:items-center max-[649px]:gap-2 max-[649px]:p-0 max-[649px]:pr-2 lg:grid-cols-[30px_42px_minmax(150px,1fr)_78px_94px_84px_84px_112px_98px] lg:items-center",
          layout === "showcase" &&
            "sm:grid-cols-[30px_42px_minmax(130px,1fr)_72px_72px_88px] sm:items-center",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-1",
            layout === "default"
              ? "max-[649px]:h-full max-[649px]:min-h-[84px] max-[649px]:flex-col max-[649px]:justify-center max-[649px]:gap-0 max-[649px]:border-r max-[649px]:border-border max-[649px]:bg-card/35 lg:block"
              : "sm:block",
          )}
        >
          {dragHandle ??
            (showDragHandle ? (
              <span
                className={cn(
                  "grid size-7 place-items-center text-muted-foreground",
                  layout === "default" &&
                    "max-[649px]:h-14 max-[649px]:w-full",
                )}
              >
                <GripVertical aria-hidden="true" size={15} />
              </span>
            ) : null)}
          <span
            className={cn(
              "text-[11px] font-semibold tabular-nums text-muted-foreground",
              layout === "default"
                ? "max-[649px]:pb-1 max-[649px]:text-[10px] lg:mt-1 lg:block lg:text-center"
                : "sm:mt-1 sm:block sm:text-center",
            )}
          >
            {priorityLabel}
          </span>
        </div>

        <ProductThumb
          className={layout === "default" ? "max-[649px]:size-10" : undefined}
          imageUrl={item.productImageUrl}
          name={item.productName}
        />

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
              {item.orderNo}
            </h3>
            <Badge
              className="h-5 shrink-0 rounded-md px-1.5 text-[10px]"
              variant="outline"
            >
              {item.productTierLabel}
            </Badge>
            <Badge
              className={cn(
                "h-5 shrink-0 rounded-md border-emerald-300/30 px-1.5 text-[10px] text-emerald-100",
                layout === "default" && "max-[649px]:hidden",
              )}
              variant="outline"
            >
              {item.modeLabel}
            </Badge>
            {item.warningLabel ? (
              <Badge
                className={cn(
                  "h-5 shrink-0 rounded-md border-amber-300/40 px-1.5 text-[10px] text-amber-100",
                  layout === "default" && "max-[649px]:hidden",
                )}
                variant="outline"
              >
                {item.warningLabel}
              </Badge>
            ) : null}
            {action
              ? layout === "default"
                ? <span className="max-[649px]:hidden">{action}</span>
                : action
              : null}
            {layout === "default" && mobileDetailsToggle ? (
              <span className="ml-auto hidden shrink-0 max-[649px]:inline-flex">
                {mobileDetailsToggle}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {item.productName}
            <span className={cn(layout === "default" && "max-[649px]:hidden")}>
              {" · "}
              {item.productCode}
            </span>
          </p>
          <p
            className={cn(
              "truncate text-[10px] text-muted-foreground",
              layout === "default" && "max-[649px]:hidden",
            )}
          >
            {item.orderSummaryLabel}
          </p>
        </div>

        <div
          className={cn(
            layout === "default" &&
              "max-[649px]:flex max-[649px]:min-w-0 max-[649px]:flex-col max-[649px]:items-end max-[649px]:gap-1 min-[650px]:contents",
            layout === "showcase" && "contents",
          )}
        >
          <CompactMetric
            className={layout === "default" ? "max-[649px]:text-right" : undefined}
            frameless
            highlight
            isTargetActive={metricTargets?.planned === activeMetricTarget}
            label={labels.planned}
            target={metricTargets?.planned}
            value={item.plannedProductionLabel}
          />
          {layout === "default" ? (
            <div className="hidden min-[650px]:contents">
              <CompactMetric
                frameless
                label={labels.inputReady}
                value={item.inputReadyQuantityLabel}
              />
              <CompactMetric
                label={labels.completed}
                value={item.completedQuantityLabel}
              />
            </div>
          ) : null}
          <CompactMetric
            className={layout === "default" ? "max-[649px]:hidden" : undefined}
            frameless
            highlight
            isTargetActive={metricTargets?.remaining === activeMetricTarget}
            label={labels.remaining}
            target={metricTargets?.remaining}
            value={item.remainingQuantityLabel}
          />
          {layout === "default" ? (
            <div className="hidden min-[650px]:block">
              <QueuePill label={item.queueStartLabel} tone={item.queueStartTone} />
            </div>
          ) : null}
          <div className="min-w-0 max-[649px]:max-w-full">
            <QueuePill
              className={layout === "default" ? "max-[649px]:h-5 max-[649px]:px-1.5 max-[649px]:text-[10px]" : undefined}
              label={item.dueLabel}
              tone={item.dueTone}
            />
            <p className="mt-1 hidden truncate text-[10px] text-muted-foreground xl:block">
              {item.footerStatusLabel}
            </p>
          </div>
        </div>
      </CardContent>

      {layout === "default" && mobileDetailsOpen ? (
        <div
          className="hidden border-t border-border bg-card/25 px-2.5 py-2.5 max-[649px]:block"
          data-production-queue-mobile-details
          id={mobileDetailsId}
        >
          <div className="grid grid-cols-3 gap-1.5">
            <CompactMetric
              label={labels.inputReady}
              value={item.inputReadyQuantityLabel}
            />
            <CompactMetric
              label={labels.completed}
              value={item.completedQuantityLabel}
            />
            <CompactMetric
              highlight
              label={labels.remaining}
              value={item.remainingQuantityLabel}
            />
          </div>
          <div className="mt-2 flex min-w-0 items-center gap-2">
            <QueuePill label={item.queueStartLabel} tone={item.queueStartTone} />
            <p className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">
              {item.orderSummaryLabel} · {item.productCode}
            </p>
            {mobileDetailsAction ? (
              <span className="shrink-0">{mobileDetailsAction}</span>
            ) : null}
          </div>
          <p className="mt-1.5 truncate text-[10px] text-muted-foreground">
            {item.footerStatusLabel}
          </p>
        </div>
      ) : null}
    </Card>
  );
}

function CompactMetric({
  className,
  frameless = false,
  highlight = false,
  isTargetActive = false,
  label,
  target,
  tone,
  value,
}: {
  className?: string;
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
        className,
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
  className,
  label,
  tone,
}: {
  className?: string;
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
        className,
      )}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}

function ProductThumb({
  className,
  imageUrl,
  name,
}: {
  className?: string;
  imageUrl: string | null;
  name: string;
}) {
  return (
    <div
      className={cn(
        "relative size-11 overflow-hidden rounded-md border border-border bg-card/70",
        className,
      )}
    >
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
