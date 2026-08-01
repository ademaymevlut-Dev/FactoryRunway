"use client";

import { useRef, useState, type RefObject } from "react";
import { useFormStatus } from "react-dom";
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  Check,
  CircleDollarSign,
  Gauge,
  Repeat2,
  Shirt,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";

import { ProductRouteTimeline } from "@/components/game-presentation/product-route-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { acceptMarketOrderAction } from "../actions/accept-market-order-action";
import type {
  ActiveOrderPriorityView,
  OrderOfferCapacityState,
  OrderOfferItemView,
  OrderOfferView,
} from "../types";
import {
  isOrderAnalysisMode,
  useOrdersUi,
  type OrderAnalysisMode,
} from "./orders-ui-context";
import { OrderProductHeroCanvas } from "./order-product-hero-canvas";
import type { OrdersPanelMode } from "./use-orders-panel-mode";

const offerAccentClasses = {
  EXPRESS: "border-t-rose-400",
  NORMAL: "border-t-sky-400",
  OPPORTUNITY: "border-t-amber-400",
  REPEAT: "border-t-emerald-400",
} as const;

export function OrderDecisionWorkspace({
  activeOrders,
  compactBackButtonRef,
  offer,
  onCompactBack,
  panelMode,
  panelModeRevision,
}: {
  activeOrders: ActiveOrderPriorityView[];
  compactBackButtonRef: RefObject<HTMLButtonElement | null>;
  offer: OrderOfferView;
  onCompactBack: () => void;
  panelMode: OrdersPanelMode;
  panelModeRevision: number;
}) {
  const { copy } = useOrdersUi();
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [acceptanceOpen, setAcceptanceOpen] = useState(false);
  const [analysisSession, setAnalysisSession] = useState({
    open: false,
    panelModeRevision,
  });
  const [workspaceElement, setWorkspaceElement] =
    useState<HTMLDivElement | null>(null);
  const analysisTriggerRef = useRef<HTMLButtonElement>(null);
  const activeItem = offer.items[activeItemIndex] ?? offer.items[0];
  const analysisOpen =
    analysisSession.open &&
    analysisSession.panelModeRevision === panelModeRevision;
  const setAnalysisOpen = (open: boolean) => {
    setAnalysisSession({ open, panelModeRevision });
  };

  const openAcceptance = () => {
    setAnalysisOpen(false);
    setAcceptanceOpen(true);
  };

  return (
    <div
      className="orders-decision-workspace grid h-full min-h-0 min-w-0 gap-2"
      data-order-decision-workspace="true"
      ref={setWorkspaceElement}
    >
      <div className="orders-compact-detail-header min-w-0">
        <Button
          aria-label={copy.navigation.backToMarket}
          className="size-11 shrink-0"
          onClick={onCompactBack}
          ref={compactBackButtonRef}
          size="icon"
          type="button"
          variant="outline"
        >
          <ArrowLeft />
        </Button>
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {copy.marketTitle}
          </span>
          <strong className="block truncate text-sm text-foreground">
            {offer.customerName}
          </strong>
        </span>
      </div>
      <OrderDecisionCore
        activeItem={activeItem}
        activeItemIndex={activeItemIndex}
        offer={offer}
        onActiveItemChange={setActiveItemIndex}
      />
      <ResponsiveAnalysisShell
        activeItem={activeItem}
        activeOrders={activeOrders}
        analysisTriggerRef={analysisTriggerRef}
        offer={offer}
        onOpenChange={setAnalysisOpen}
        onActiveItemChange={setActiveItemIndex}
        open={analysisOpen}
        panelMode={panelMode}
        portalContainer={workspaceElement}
      />
      <OrderDecisionBar
        analysisTriggerRef={analysisTriggerRef}
        offer={offer}
        onAccept={openAcceptance}
        onAnalysis={() => setAnalysisOpen(true)}
      />
      <OrderAcceptanceSheet
        offer={offer}
        onOpenChange={setAcceptanceOpen}
        open={acceptanceOpen}
      />
    </div>
  );
}

function OrderDecisionCore({
  activeItem,
  activeItemIndex,
  offer,
  onActiveItemChange,
}: {
  activeItem: OrderOfferItemView | undefined;
  activeItemIndex: number;
  offer: OrderOfferView;
  onActiveItemChange: (index: number) => void;
}) {
  const { copy } = useOrdersUi();

  return (
    <section
      className={cn(
        "orders-decision-core flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-border border-t-2 bg-card/70",
        offerAccentClasses[offer.offerType],
      )}
      data-order-decision-core="true"
    >
      <div className="shrink-0 border-b border-border p-2 sm:p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground sm:text-xs">
              {copy.detail.selectedOrder}
            </p>
            <h2 className="mt-1 truncate text-base font-semibold text-foreground sm:text-xl">
              {offer.customerName}
            </h2>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">
              {activeItem?.productName ?? copy.detail.emptyItem}
            </p>
          </div>
          <Badge className="shrink-0" variant="secondary">
            {offer.offerNo}
          </Badge>
        </div>
        <div className="orders-decision-metric-grid mt-2 grid gap-1.5">
          <DecisionMetric
            label={copy.decision.quantity}
            value={offer.totalQuantityLabel}
          />
          <DecisionMetric
            label={copy.decision.delivery}
            value={offer.deliveryLabel}
          />
          <DecisionMetric
            label={copy.decision.revenue}
            value={offer.totalRevenueLabel}
          />
          <DecisionMetric
            label={copy.decision.margin}
            value={offer.plannedMarginLabel}
          />
          <DecisionMetric
            className="orders-risk-metric"
            label={copy.decision.risk}
            value={offer.decisionRisk.summaryLabel}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
        {activeItem ? (
          <OrderProductHeroCanvas
            activeItem={activeItem}
            activeItemIndex={activeItemIndex}
            items={offer.items}
            onActiveItemChange={onActiveItemChange}
          />
        ) : (
          <p className="rounded-lg border border-border bg-background/60 p-4 text-sm text-muted-foreground">
            {copy.detail.emptyItem}
          </p>
        )}
      </div>
    </section>
  );
}

function DecisionMetric({
  className,
  label,
  value,
}: {
  className?: string;
  label: string;
  value: string;
}) {
  return (
    <span
      className={cn(
        "min-w-0 rounded-md border border-border bg-background/55 px-2 py-1",
        className,
      )}
    >
      <span className="block truncate text-[9px] text-muted-foreground sm:text-[10px]">
        {label}
      </span>
      <strong className="block truncate text-[11px] text-foreground sm:text-xs">
        {value}
      </strong>
    </span>
  );
}

function ResponsiveAnalysisShell({
  activeItem,
  activeOrders,
  analysisTriggerRef,
  offer,
  onActiveItemChange,
  onOpenChange,
  open,
  panelMode,
  portalContainer,
}: {
  activeItem: OrderOfferItemView | undefined;
  activeOrders: ActiveOrderPriorityView[];
  analysisTriggerRef: RefObject<HTMLButtonElement | null>;
  offer: OrderOfferView;
  onActiveItemChange: (index: number) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  panelMode: OrdersPanelMode;
  portalContainer: HTMLElement | null;
}) {
  const { copy } = useOrdersUi();

  if (panelMode === "WIDE") {
    return (
      <OrderAnalysisContent
        activeItem={activeItem}
        activeOrders={activeOrders}
        className="orders-analysis-wide-dock"
        offer={offer}
        onActiveItemChange={onActiveItemChange}
      />
    );
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={cn(
          "orders-analysis-overlay absolute flex gap-0 overflow-hidden rounded-xl border border-border bg-card p-0 shadow-2xl",
          panelMode === "MEDIUM"
            ? "orders-analysis-drawer bottom-0 left-auto right-0 top-0 h-auto max-h-none w-[min(400px,calc(100%-1rem))] max-w-none translate-x-0 translate-y-0 data-open:slide-in-from-right-4 data-closed:slide-out-to-right-4"
            : "orders-analysis-bottom-sheet bottom-0 left-0 top-auto max-h-[88dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-2xl data-open:slide-in-from-bottom-4 data-closed:slide-out-to-bottom-4",
        )}
        data-analysis-shell={panelMode}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          analysisTriggerRef.current?.focus();
        }}
        overlayClassName="orders-analysis-scrim absolute"
        portalContainer={portalContainer}
        showCloseButton={false}
      >
        <div className="orders-analysis-overlay-header flex min-h-14 items-center gap-3 border-b border-border px-3 py-2">
          {panelMode === "COMPACT" ? (
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-foreground/20"
            />
          ) : null}
          <span className="grid size-9 shrink-0 place-items-center rounded-md border border-primary/25 bg-primary/10 text-primary">
            <BarChart3 size={17} />
          </span>
          <DialogHeader className="min-w-0 flex-1 gap-0.5 text-left">
            <DialogTitle>{copy.analysis.title}</DialogTitle>
            <DialogDescription className="truncate text-xs">
              {copy.analysis.description}
            </DialogDescription>
          </DialogHeader>
          <DialogClose asChild>
            <Button
              aria-label={copy.analysis.close}
              className="size-11 shrink-0"
              size="icon"
              type="button"
              variant="ghost"
            >
              <X />
            </Button>
          </DialogClose>
        </div>
        <OrderAnalysisContent
          activeItem={activeItem}
          activeOrders={activeOrders}
          className="min-h-0 flex-1 border-0 bg-transparent"
          offer={offer}
          onActiveItemChange={onActiveItemChange}
        />
      </DialogContent>
    </Dialog>
  );
}

function OrderAnalysisContent({
  activeItem,
  activeOrders,
  className,
  offer,
  onActiveItemChange,
}: {
  activeItem: OrderOfferItemView | undefined;
  activeOrders: ActiveOrderPriorityView[];
  className?: string;
  offer: OrderOfferView;
  onActiveItemChange: (index: number) => void;
}) {
  const { activeAnalysisMode, copy, setActiveAnalysisMode } = useOrdersUi();
  const tabs = [
    {
      icon: CircleDollarSign,
      label: copy.analysis.profitability,
      value: "PROFITABILITY",
    },
    { icon: Gauge, label: copy.analysis.capacity, value: "CAPACITY" },
    { icon: UserRound, label: copy.analysis.customer, value: "CUSTOMER" },
    { icon: Shirt, label: copy.analysis.product, value: "PRODUCT" },
  ] as const;
  const selectMode = (value: string) => {
    if (isOrderAnalysisMode(value)) setActiveAnalysisMode(value);
  };

  return (
    <aside
      className={cn(
        "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card/55",
        className,
      )}
      data-active-analysis-mode={activeAnalysisMode}
      data-order-analysis-content="true"
    >
      <Tabs
        className="h-full min-h-0 gap-0"
        onValueChange={selectMode}
        value={activeAnalysisMode}
      >
        <div className="shrink-0 border-b border-border p-1.5 sm:p-2">
          <p className="sr-only">{copy.analysis.title}</p>
          <TabsList
            aria-label={copy.analysis.title}
            className="grid h-auto w-full grid-cols-4 gap-0"
            variant="line"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;

              return (
                <TabsTrigger
                  aria-label={tab.label}
                  className="h-auto min-h-11 min-w-0 flex-col gap-0.5 rounded-none px-1 py-1.5 text-[9px] leading-tight data-active:text-primary data-active:after:bg-primary sm:text-[10px]"
                  key={tab.value}
                  value={tab.value}
                >
                  <Icon aria-hidden="true" />
                  <span className="max-w-full truncate">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
          <TabsContent
            className="m-0 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150"
            data-analysis-content={activeAnalysisMode}
            key={activeAnalysisMode}
            value={activeAnalysisMode}
          >
            <ActiveAnalysisContent
              activeItem={activeItem}
              activeOrders={activeOrders}
              mode={activeAnalysisMode}
              offer={offer}
              onActiveItemChange={onActiveItemChange}
            />
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  );
}

function ActiveAnalysisContent({
  activeItem,
  activeOrders,
  mode,
  offer,
  onActiveItemChange,
}: {
  activeItem: OrderOfferItemView | undefined;
  activeOrders: ActiveOrderPriorityView[];
  mode: OrderAnalysisMode;
  offer: OrderOfferView;
  onActiveItemChange: (index: number) => void;
}) {
  if (mode === "CAPACITY") {
    return <CapacityAnalysis activeOrders={activeOrders} offer={offer} />;
  }

  if (mode === "CUSTOMER") {
    return <CustomerAnalysis offer={offer} />;
  }

  if (mode === "PRODUCT") {
    return (
      <ProductAnalysis
        activeItem={activeItem}
        offer={offer}
        onActiveItemChange={onActiveItemChange}
      />
    );
  }

  return <ProfitabilityAnalysis activeItem={activeItem} offer={offer} />;
}

function ProfitabilityAnalysis({
  activeItem,
  offer,
}: {
  activeItem: OrderOfferItemView | undefined;
  offer: OrderOfferView;
}) {
  const { copy } = useOrdersUi();
  const hasMultipleItems = offer.items.length > 1;
  const isProfitPositive =
    Number(activeItem?.plannedProfitCents ?? offer.plannedProfitCents) >= 0;

  return (
    <div className="divide-y divide-border/60" data-analysis="PROFITABILITY">
      <div className="pb-3">
        {hasMultipleItems && activeItem ? (
          <p className="truncate text-xs font-medium text-foreground">
            {activeItem.productName}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">{copy.cost.margin}</p>
        <h3
          className={cn(
            "mt-1 text-2xl font-semibold",
            isProfitPositive ? "text-emerald-300" : "text-red-300",
          )}
        >
          {activeItem?.plannedMarginLabel ?? offer.plannedMarginLabel}
        </h3>
      </div>
      <div className="divide-y divide-border/60">
        <CostPairMetric
          firstLabel={copy.cost.unitPrice}
          firstValue={activeItem?.unitPriceLabel ?? "-"}
          secondLabel={
            hasMultipleItems ? copy.cost.itemTotal : copy.cost.totalRevenue
          }
          secondValue={activeItem?.totalPriceLabel ?? offer.totalRevenueLabel}
        />
        <CostPairMetric
          firstLabel={copy.cost.unitCost}
          firstValue={activeItem?.plannedUnitCostLabel ?? "-"}
          secondLabel={
            hasMultipleItems ? copy.cost.itemCost : copy.cost.totalCost
          }
          secondValue={
            activeItem?.plannedTotalCostLabel ?? offer.plannedCostLabel
          }
        />
        <CostPairMetric
          firstLabel={copy.cost.unitProfit}
          firstValue={activeItem?.plannedUnitProfitLabel ?? "-"}
          secondLabel={
            hasMultipleItems ? copy.cost.itemProfit : copy.cost.totalProfit
          }
          secondValue={
            activeItem?.plannedProfitLabel ?? offer.plannedProfitLabel
          }
          tone={isProfitPositive ? "profit" : "loss"}
        />
      </div>
    </div>
  );
}

function CapacityAnalysis({
  activeOrders,
  offer,
}: {
  activeOrders: ActiveOrderPriorityView[];
  offer: OrderOfferView;
}) {
  const { copy } = useOrdersUi();

  return (
    <div data-analysis="CAPACITY">
      <div className="divide-y divide-border/60 rounded-md bg-background/30 px-2.5">
        <div className="flex items-center justify-between gap-2 py-2 text-xs">
          <span className="text-muted-foreground">
            {copy.cost.capacityRisk}
          </span>
          <strong className="text-foreground">{offer.capacityRiskLabel}</strong>
        </div>
        <div className="flex items-center justify-between gap-2 py-2 text-xs">
          <span className="text-muted-foreground">
            {copy.cost.deliveryRisk}
          </span>
          <strong className="text-foreground">{offer.deliveryRiskLabel}</strong>
        </div>
      </div>
      <CapacityPlanCard offer={offer} />
      <ActiveOrdersSnapshot activeOrders={activeOrders} />
    </div>
  );
}

function CustomerAnalysis({ offer }: { offer: OrderOfferView }) {
  return (
    <div data-analysis="CUSTOMER">
      <CustomerRelationshipCard offer={offer} />
    </div>
  );
}

function ProductAnalysis({
  activeItem,
  offer,
  onActiveItemChange,
}: {
  activeItem: OrderOfferItemView | undefined;
  offer: OrderOfferView;
  onActiveItemChange: (index: number) => void;
}) {
  const { copy } = useOrdersUi();

  if (!activeItem) {
    return (
      <p className="rounded-lg border border-border bg-background/60 p-4 text-sm text-muted-foreground">
        {copy.detail.emptyItem}
      </p>
    );
  }

  return (
    <div className="divide-y divide-border/60" data-analysis="PRODUCT">
      <div className="pb-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md border border-primary/25 bg-primary/10 text-primary">
            <Boxes size={15} />
          </span>
          <span className="min-w-0">
            <strong className="block truncate text-sm text-foreground">
              {activeItem.productName}
            </strong>
            <span className="block truncate text-[11px] text-muted-foreground">
              {activeItem.productCode} · {activeItem.productTierLabel}
            </span>
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 divide-x divide-border/60 rounded-md bg-background/30 text-xs">
          <ProductDetailMetric
            label={copy.metrics.quantity}
            value={activeItem.quantityLabel}
          />
          <ProductDetailMetric
            label={copy.capacity.bottleneck}
            value={activeItem.bottleneckLabel}
          />
        </div>
        <div className="mt-3 border-t border-border/60 pt-3">
          <span className="block text-[10px] text-muted-foreground">
            {copy.metrics.route}
          </span>
          <ProductRouteTimeline
            steps={activeItem.route}
            title={activeItem.routeLabel || "-"}
          />
        </div>
      </div>
      {offer.isCollection ? (
        <CollectionItems
          activeItemId={activeItem.id}
          items={offer.items}
          onSelect={onActiveItemChange}
        />
      ) : null}
    </div>
  );
}

function ProductDetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <span className="min-w-0 px-2.5 py-2">
      <span className="block text-[10px] text-muted-foreground">{label}</span>
      <strong className="block truncate text-foreground">{value}</strong>
    </span>
  );
}

function CollectionItems({
  activeItemId,
  items,
  onSelect,
}: {
  activeItemId: string;
  items: OrderOfferItemView[];
  onSelect: (index: number) => void;
}) {
  const { copy } = useOrdersUi();

  return (
    <div className="mt-3 border-t border-border/60 pt-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {copy.collectionItemsTitle}
      </p>
      <div className="mt-2 divide-y divide-border/50">
        {items.map((item, index) => (
          <button
            aria-pressed={item.id === activeItemId}
            className={cn(
              "flex min-h-11 w-full items-center justify-between gap-2 px-2 py-2 text-left text-xs transition-colors hover:bg-card/70",
              item.id === activeItemId &&
                "bg-primary/10 text-primary",
            )}
            key={item.id}
            onClick={() => onSelect(index)}
            type="button"
          >
            <span className="min-w-0 truncate">{item.productName}</span>
            <span className="shrink-0 text-muted-foreground">
              {item.productTierLabel} · {item.quantityLabel}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CustomerRelationshipCard({ offer }: { offer: OrderOfferView }) {
  const { copy } = useOrdersUi();
  const relationship = offer.customerRelationship;

  if (!relationship) {
    return (
      <div>
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md border border-sky-300/25 bg-sky-400/10 text-sky-100">
            <ShoppingBag size={15} />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {copy.relationship.title}
            </span>
            <strong className="block text-xs text-foreground">
              {copy.relationship.newCustomer}
            </strong>
          </span>
        </div>
        <p className="mt-3 border-t border-border/60 pt-3 text-[11px] leading-5 text-muted-foreground">
          {copy.relationship.noHistory}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "grid size-8 place-items-center rounded-md border",
              relationshipStatusIconClass(relationship.status),
            )}
          >
            <Repeat2 size={15} />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {copy.relationship.title}
            </span>
            <strong className="block text-xs text-foreground">
              {relationship.statusLabel}
            </strong>
          </span>
        </div>
        <span
          className={cn(
            "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold",
            relationshipStatusBadgeClass(relationship.status),
          )}
        >
          {relationship.repeatLabel}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 divide-x divide-border/60 rounded-md bg-background/30">
        <RelationshipMiniMetric
          label={copy.relationship.trust}
          value={relationship.relationshipScoreLabel}
        />
        <RelationshipMiniMetric
          label={copy.relationship.history}
          value={copy.relationship.completedWork(
            relationship.completedOrderCount,
          )}
        />
        <RelationshipMiniMetric label="RPT" value={relationship.repeatWeightLabel} />
      </div>
      <p className="mt-3 border-t border-border/60 pt-3 text-[11px] leading-5 text-muted-foreground">
        {relationship.lateOrderCount > 0
          ? copy.relationship.lateSummary(
              relationship.lateOrderCount,
              relationship.totalLateDays,
            )
          : copy.relationship.onTimeHistory}
      </p>
    </div>
  );
}

function RelationshipMiniMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <span className="min-w-0 px-2 py-2">
      <span className="block text-[10px] text-muted-foreground">{label}</span>
      <strong className="block truncate text-xs text-foreground">{value}</strong>
    </span>
  );
}

function CapacityPlanCard({ offer }: { offer: OrderOfferView }) {
  const { copy } = useOrdersUi();

  return (
    <div className="mt-3 border-t border-border/60 pt-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {copy.capacity.plannedLoad}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {copy.capacity.bottleneck}: {" "}
            <strong className="text-foreground">
              {offer.capacityPlan.bottleneckDepartmentLabel}
            </strong>
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold",
            capacityStateBadgeClass(offer.capacityPlan.state),
          )}
        >
          {offer.capacityPlan.stateLabel}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 divide-x divide-border/60 rounded-md bg-background/30">
        <CapacityMiniMetric
          label={copy.capacity.current}
          value={offer.capacityPlan.currentLoadDaysLabel}
        />
        <CapacityMiniMetric
          label={copy.capacity.offer}
          value={offer.capacityPlan.offerLoadDaysLabel}
        />
        <CapacityMiniMetric
          label={copy.capacity.targetAfter}
          tone={offer.capacityPlan.state}
          value={offer.capacityPlan.afterAcceptLoadDaysLabel}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 divide-x divide-border/60 rounded-md bg-background/30 text-[11px]">
        <span className="px-2 py-2 text-muted-foreground">
          {copy.capacity.prediction}: {" "}
          <strong className="text-foreground">
            {offer.capacityPlan.plannedCompletionLabel}
          </strong>
        </span>
        <span className="px-2 py-2 text-muted-foreground">
          {copy.capacity.deadline}: {" "}
          <strong className="text-foreground">
            {offer.capacityPlan.targetDeliveryLabel}
          </strong>
        </span>
      </div>
      {offer.capacityPlan.rows.length > 0 ? (
        <div className="mt-3 divide-y divide-border/50 border-y border-border/50">
          {offer.capacityPlan.rows.map((row) => (
            <CapacityProgressRow key={row.departmentId} row={row} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CapacityMiniMetric({
  label,
  tone = "SAFE",
  value,
}: {
  label: string;
  tone?: OrderOfferCapacityState;
  value: string;
}) {
  return (
    <span className="min-w-0 px-2 py-2">
      <span className="block text-[10px] text-muted-foreground">{label}</span>
      <strong
        className={cn("block truncate text-xs", capacityStateTextClass(tone))}
      >
        {value}
      </strong>
    </span>
  );
}

function CapacityProgressRow({
  row,
}: {
  row: OrderOfferView["capacityPlan"]["rows"][number];
}) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="min-w-0 truncate font-medium text-foreground">
          {row.departmentName}
        </span>
        <span
          className={cn(
            "shrink-0 font-semibold",
            capacityStateTextClass(row.state),
          )}
        >
          {row.afterAcceptLoadDaysLabel}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/50">
        <div
          className={cn(
            "h-full rounded-full",
            capacityStateBarClass(row.state),
          )}
          style={{ width: `${row.afterAcceptLoadPercent}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span>
          {row.lineCountLabel} · {row.dailyCapacityLabel}
        </span>
        <span className="shrink-0">
          {row.currentLoadDaysLabel} + {row.offerLoadDaysLabel}
        </span>
      </div>
    </div>
  );
}

function ActiveOrdersSnapshot({
  activeOrders,
}: {
  activeOrders: ActiveOrderPriorityView[];
}) {
  const { copy, numberLocale } = useOrdersUi();
  const visibleOrders = activeOrders.slice(0, 3);

  return (
    <div className="mt-3 border-t border-border/60 pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {copy.activeOrders.title}
        </p>
        <span className="text-[10px] text-muted-foreground">
          {copy.activeOrders.workCount(activeOrders.length)}
        </span>
      </div>
      {visibleOrders.length > 0 ? (
        <div className="mt-2 divide-y divide-border/50 border-y border-border/50">
          {visibleOrders.map((order) => (
            <div
              className="flex items-center justify-between gap-2 py-2 text-[11px]"
              key={order.id}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">
                  {order.productName}
                </span>
                <span className="block truncate text-muted-foreground">
                  {order.orderNo} · {order.customerName}
                </span>
              </span>
              <span className="shrink-0 text-right text-muted-foreground">
                <strong className="block text-foreground">
                  {copy.activeOrders.remaining(
                    order.remainingQuantity.toLocaleString(numberLocale),
                  )}
                </strong>
                {copy.activeOrders.targetDay(order.targetDeliveryDay)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 border-y border-dashed border-border/60 py-2 text-[11px] text-muted-foreground">
          {copy.activeOrders.empty}
        </p>
      )}
    </div>
  );
}

function OrderDecisionBar({
  analysisTriggerRef,
  offer,
  onAccept,
  onAnalysis,
}: {
  analysisTriggerRef: RefObject<HTMLButtonElement | null>;
  offer: OrderOfferView;
  onAccept: () => void;
  onAnalysis: () => void;
}) {
  const { activeAnalysisMode, copy } = useOrdersUi();
  const activeAnalysisLabel = getAnalysisModeLabel(activeAnalysisMode, copy);

  return (
    <div
      className="orders-decision-bar sticky bottom-0 z-20 col-span-full shrink-0 rounded-lg border border-border bg-card/95 p-2 shadow-[0_-12px_32px_hsl(var(--background)/0.5)] backdrop-blur"
      data-order-decision-bar="true"
    >
      <div className="orders-decision-metrics grid min-w-0 grid-cols-3 gap-2">
        <DecisionBarMetric
          label={copy.decision.revenue}
          value={offer.totalRevenueLabel}
        />
        <DecisionBarMetric
          label={copy.decision.margin}
          value={offer.plannedMarginLabel}
        />
        <DecisionBarMetric
          label={copy.decision.risk}
          value={offer.decisionRisk.summaryLabel}
        />
      </div>
      <div className="orders-decision-actions grid min-w-0 grid-cols-2 gap-2">
        <Button
          aria-label={`${copy.analysis.open}: ${activeAnalysisLabel}`}
          className="orders-analysis-trigger min-h-11 min-w-0"
          onClick={onAnalysis}
          ref={analysisTriggerRef}
          type="button"
          variant="outline"
        >
          <BarChart3 />
          <span className="min-w-0 truncate">{copy.analysis.open}</span>
        </Button>
        <Button
          className="orders-accept-button min-h-11 min-w-0 shrink-0"
          onClick={onAccept}
          type="button"
        >
          <Check />
          <span className="truncate">{copy.acceptButton.idle}</span>
        </Button>
      </div>
    </div>
  );
}

function DecisionBarMetric({
  className,
  label,
  value,
}: {
  className?: string;
  label: string;
  value: string;
}) {
  return (
    <span className={cn("min-w-0", className)}>
      <span className="block truncate text-[9px] text-muted-foreground sm:text-[10px]">
        {label}
      </span>
      <strong className="block truncate text-[11px] text-foreground sm:text-xs">
        {value}
      </strong>
    </span>
  );
}

function getAnalysisModeLabel(
  mode: OrderAnalysisMode,
  copy: ReturnType<typeof useOrdersUi>["copy"],
) {
  const labels: Record<OrderAnalysisMode, string> = {
    CAPACITY: copy.analysis.capacity,
    CUSTOMER: copy.analysis.customer,
    PRODUCT: copy.analysis.product,
    PROFITABILITY: copy.analysis.profitability,
  };

  return labels[mode];
}

function OrderAcceptanceSheet({
  offer,
  onOpenChange,
  open,
}: {
  offer: OrderOfferView;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const { copy } = useOrdersUi();
  const summary = offer.acceptanceSummary;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="max-h-[calc(100%-2rem)] overflow-y-auto sm:max-w-xl"
        data-order-acceptance-sheet="true"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>{copy.confirmation.title}</DialogTitle>
          <DialogDescription>{copy.confirmation.description}</DialogDescription>
        </DialogHeader>
        <form action={acceptMarketOrderAction}>
          <input name="offerId" type="hidden" value={offer.id} />
          <div className="grid gap-2 sm:grid-cols-2">
            <ConfirmationMetric
              label={copy.confirmation.material}
              value={summary.materialReadyLabel}
            />
            <ConfirmationMetric
              label={copy.confirmation.cutting}
              value={summary.cuttingStartLabel}
            />
            <ConfirmationMetric
              label={copy.confirmation.productionOrders}
              value={summary.productionOrderLabel}
            />
            <ConfirmationMetric
              label={copy.confirmation.quantity}
              value={summary.totalQuantityLabel}
            />
            <ConfirmationMetric
              label={copy.confirmation.revenue}
              value={summary.totalRevenueLabel}
            />
            <ConfirmationMetric
              label={copy.confirmation.margin}
              value={summary.plannedMarginLabel}
            />
            <ConfirmationMetric
              label={copy.confirmation.risk}
              value={summary.riskSummaryLabel}
            />
            <ConfirmationMetric
              label={copy.confirmation.productionImpact}
              value={summary.productionImpactLabel}
            />
          </div>
          <AcceptanceFormActions />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmationMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
      <span className="block text-[11px] text-muted-foreground">{label}</span>
      <strong className="mt-0.5 block text-sm text-foreground">{value}</strong>
    </div>
  );
}

function AcceptanceFormActions() {
  const { copy } = useOrdersUi();
  const { pending } = useFormStatus();

  return (
    <DialogFooter className="mt-4">
      <DialogClose asChild>
        <Button className="min-h-11" disabled={pending} type="button" variant="outline">
          {copy.confirmation.cancel}
        </Button>
      </DialogClose>
      <Button className="min-h-11" aria-busy={pending} disabled={pending} type="submit">
        <Check />
        {pending ? copy.acceptButton.pending : copy.acceptButton.idle}
      </Button>
    </DialogFooter>
  );
}

function CostPairMetric({
  firstLabel,
  firstValue,
  secondLabel,
  secondValue,
  tone = "default",
}: {
  firstLabel: string;
  firstValue: string;
  secondLabel: string;
  secondValue: string;
  tone?: "default" | "profit" | "loss";
}) {
  return (
    <div className="py-3">
      <div className="grid grid-cols-2 gap-2">
        <CostValue label={firstLabel} tone={tone} value={firstValue} />
        <CostValue label={secondLabel} tone={tone} value={secondValue} />
      </div>
    </div>
  );
}

function CostValue({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "default" | "profit" | "loss";
}) {
  return (
    <span className="min-w-0">
      <span className="block text-[11px] text-muted-foreground">{label}</span>
      <strong
        className={cn(
          "mt-0.5 block truncate text-base font-semibold",
          tone === "profit" && "text-emerald-300",
          tone === "loss" && "text-red-300",
          tone === "default" && "text-foreground",
        )}
      >
        {value}
      </strong>
    </span>
  );
}

function capacityStateBadgeClass(state: OrderOfferCapacityState) {
  const classes: Record<OrderOfferCapacityState, string> = {
    BALANCED: "border-cyan-400/45 bg-cyan-400/10 text-cyan-200",
    CRITICAL: "border-red-400/55 bg-red-400/10 text-red-200",
    NO_CAPACITY: "border-zinc-400/45 bg-zinc-400/10 text-zinc-200",
    RISKY: "border-orange-400/55 bg-orange-400/10 text-orange-200",
    SAFE: "border-emerald-400/45 bg-emerald-400/10 text-emerald-200",
    STRETCH: "border-amber-400/55 bg-amber-400/10 text-amber-200",
  };

  return classes[state];
}

function capacityStateTextClass(state: OrderOfferCapacityState) {
  const classes: Record<OrderOfferCapacityState, string> = {
    BALANCED: "text-cyan-200",
    CRITICAL: "text-red-200",
    NO_CAPACITY: "text-zinc-200",
    RISKY: "text-orange-200",
    SAFE: "text-emerald-200",
    STRETCH: "text-amber-200",
  };

  return classes[state];
}

function capacityStateBarClass(state: OrderOfferCapacityState) {
  const classes: Record<OrderOfferCapacityState, string> = {
    BALANCED: "bg-cyan-300",
    CRITICAL: "bg-red-400",
    NO_CAPACITY: "bg-zinc-400",
    RISKY: "bg-orange-400",
    SAFE: "bg-emerald-300",
    STRETCH: "bg-amber-300",
  };

  return classes[state];
}

function relationshipStatusIconClass(
  status: NonNullable<OrderOfferView["customerRelationship"]>["status"],
) {
  const classes: Record<
    NonNullable<OrderOfferView["customerRelationship"]>["status"],
    string
  > = {
    at_risk: "border-orange-300/30 bg-orange-400/10 text-orange-100",
    new: "border-sky-300/30 bg-sky-400/10 text-sky-100",
    trusted: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
    warm: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
  };

  return classes[status];
}

function relationshipStatusBadgeClass(
  status: NonNullable<OrderOfferView["customerRelationship"]>["status"],
) {
  const classes: Record<
    NonNullable<OrderOfferView["customerRelationship"]>["status"],
    string
  > = {
    at_risk: "border-orange-400/45 bg-orange-400/10 text-orange-200",
    new: "border-sky-400/45 bg-sky-400/10 text-sky-200",
    trusted: "border-emerald-400/45 bg-emerald-400/10 text-emerald-200",
    warm: "border-cyan-400/45 bg-cyan-400/10 text-cyan-200",
  };

  return classes[status];
}
