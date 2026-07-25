import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  PackageCheck,
  Shirt,
  Tag,
  WalletCards,
} from "lucide-react";

import { OrderMetricCard } from "@/components/game-presentation/order-metric-card";
import { ProductColorChips } from "@/components/game-presentation/product-color-chips";
import { ProductRouteTimeline } from "@/components/game-presentation/product-route-timeline";
import {
  ProductShowcaseCard,
  type ProductShowcaseMetric,
} from "@/components/game-presentation/product-showcase-card";
import { Button } from "@/components/ui/button";

import {
  formatShowcaseMoney,
  formatShowcaseNumber,
} from "./order-acceptance-formatters";
import type {
  OrderAcceptanceSceneCopy,
  OrderAcceptanceSceneModel,
  OrderAcceptanceTarget,
} from "./order-acceptance-scene-types";
import { getOrderAcceptanceTargetClass } from "./order-acceptance-target";

export type OrderOfferDetailProps = {
  accepted: boolean;
  activeTarget: OrderAcceptanceTarget | null;
  copy: OrderAcceptanceSceneCopy;
  model: OrderAcceptanceSceneModel;
  numberLocale: string;
  onAccept: () => void;
};

export function OrderOfferDetail({
  accepted,
  activeTarget,
  copy,
  model,
  numberLocale,
  onAccept,
}: OrderOfferDetailProps) {
  const { product, selectedOffer } = model;
  const showcaseMetrics: ProductShowcaseMetric[] = [
    {
      icon: Tag,
      key: "category",
      label: copy.categoryLabel,
      value: product.category.label,
    },
    {
      icon: Shirt,
      key: "product-type",
      label: copy.productTypeLabel,
      value: product.productType.label,
    },
    {
      icon: WalletCards,
      key: "unit-price",
      label: copy.unitPriceLabel,
      value: formatShowcaseMoney(
        selectedOffer.unitPrice,
        selectedOffer.currency,
        numberLocale,
      ),
    },
  ];
  const colorChips = model.colorAllocation.map(({ color, quantity }) => ({
    hexCode: color.hexCode,
    key: color.key,
    label: color.label,
    quantityLabel: `${formatShowcaseNumber(quantity, numberLocale)} ${
      copy.pieceUnitLabel
    }`,
  }));
  const routeSteps = product.route.map((step) => ({
    canOutsource: step.canOutsource,
    departmentKey: step.departmentKey,
    label: step.label,
    sequence: step.sequence,
    workloadLabel: `${formatShowcaseNumber(
      step.workloadPointsPerUnit,
      numberLocale,
    )} ${copy.workloadUnitLabel}`,
    workloadPointsPerUnit: step.workloadPointsPerUnit,
  }));

  return (
    <div
      className="min-w-0 rounded-xl border border-white/10 bg-card/62 p-3 sm:p-4"
      data-order-acceptance-detail
    >
      <ProductShowcaseCard
        cardColors={product.card}
        imageUrl={product.imageUrl}
        metaLabel={selectedOffer.customerName}
        metrics={showcaseMetrics}
        name={product.name}
      />

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <div
          className={getOrderAcceptanceTargetClass(
            activeTarget,
            "order-quantity",
          )}
          data-highlighted={activeTarget === "order-quantity"}
          data-showcase-target="order-quantity"
        >
          <OrderMetricCard
            icon={PackageCheck}
            label={copy.quantityLabel}
            value={`${formatShowcaseNumber(
              selectedOffer.quantity,
              numberLocale,
            )} ${copy.pieceUnitLabel}`}
          />
        </div>
        <div
          className={getOrderAcceptanceTargetClass(
            activeTarget,
            "order-delivery",
          )}
          data-highlighted={activeTarget === "order-delivery"}
          data-showcase-target="order-delivery"
        >
          <OrderMetricCard
            icon={CalendarDays}
            label={copy.deliveryLabel}
            value={`${formatShowcaseNumber(
              selectedOffer.deliveryDays,
              numberLocale,
            )} ${copy.dayUnitLabel}`}
          />
        </div>
        <OrderMetricCard
          icon={Banknote}
          label={copy.revenueLabel}
          value={formatShowcaseMoney(
            selectedOffer.totalRevenue,
            selectedOffer.currency,
            numberLocale,
          )}
        />
      </div>

      <div
        className={getOrderAcceptanceTargetClass(
          activeTarget,
          "order-colors",
          "mt-3",
        )}
        data-highlighted={activeTarget === "order-colors"}
        data-showcase-target="order-colors"
      >
        <ProductColorChips colors={colorChips} title={copy.colorsLabel} />
      </div>

      <div
        className={getOrderAcceptanceTargetClass(
          activeTarget,
          "order-route",
          "mt-3 border border-border bg-background/60 p-3",
        )}
        data-highlighted={activeTarget === "order-route"}
        data-showcase-target="order-route"
      >
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {copy.routeLabel}
        </p>
        <ProductRouteTimeline
          outsourceLabel={copy.outsourceLabel}
          steps={routeSteps}
          title={copy.routeLabel}
        />
      </div>

      <div
        className={getOrderAcceptanceTargetClass(
          activeTarget,
          "order-accept",
          "mt-3",
        )}
        data-highlighted={activeTarget === "order-accept"}
        data-showcase-target="order-accept"
      >
        <Button
          className="h-11 w-full gap-2 bg-primary font-semibold text-primary-foreground shadow-[0_0_24px_color-mix(in_srgb,var(--primary)_20%,transparent)] hover:bg-primary/90"
          data-order-accept-button
          disabled={accepted}
          onClick={onAccept}
          type="button"
        >
          {accepted ? (
            <CheckCircle2 aria-hidden="true" size={17} />
          ) : (
            <ArrowRight aria-hidden="true" size={17} />
          )}
          {accepted ? copy.acceptedButton : copy.acceptButton}
        </Button>
      </div>
    </div>
  );
}
