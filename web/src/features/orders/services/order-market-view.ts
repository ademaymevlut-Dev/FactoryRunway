import {
  FactoryProductionLineStatus,
  MarketOrderOfferStatus,
  ProductImageVariant,
  ProductionOrderStatus,
  type CurrencyCode,
  type ProductTier,
} from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";

import type {
  OrderMarketView,
  ActiveOrderPriorityView,
  OrderOfferItemColorView,
  OrderOfferItemView,
  OrderOfferView,
} from "../types";

const locale = "tr";
const COST_LINE_STATUSES = [
  FactoryProductionLineStatus.IDLE,
  FactoryProductionLineStatus.RUNNING,
] as const;

type TranslationRecord = {
  locale: string;
  name: string;
};

type MarketOfferRecord = Awaited<ReturnType<typeof fetchMarketOffers>>[number];
type MarketOfferItemRecord = MarketOfferRecord["items"][number];

export async function getOrderMarketView(input: {
  currentDay: number;
  factoryId: string;
  currencyCode: CurrencyCode;
}): Promise<OrderMarketView> {
  const [offers, departmentCosts, activeOrders] = await Promise.all([
    fetchMarketOffers(input.factoryId),
    fetchFactoryDepartmentCosts(input.factoryId),
    fetchActiveProductionOrders(input.factoryId),
  ]);
  const offerViews = offers.map((offer) =>
    toOrderOfferView({
      currencyCode: input.currencyCode,
      currentDay: input.currentDay,
      departmentCosts,
      offer,
    }),
  );

  return {
    activeOrders: activeOrders.map(toActiveOrderPriorityView),
    availableCount: offerViews.length,
    offers: offerViews,
  };
}

async function fetchActiveProductionOrders(factoryId: string) {
  const prisma = getPrisma();

  return prisma.productionOrder.findMany({
    where: {
      factoryId,
      remainingQuantity: { gt: 0 },
      status: {
        in: [
          ProductionOrderStatus.PLANNED,
          ProductionOrderStatus.RELEASED,
          ProductionOrderStatus.IN_PROGRESS,
          ProductionOrderStatus.WAITING_INPUT,
          ProductionOrderStatus.WAITING_OUTSOURCE,
        ],
      },
    },
    orderBy: [
      { priority: "asc" },
      { targetDeliveryDay: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ],
    select: {
      createdAt: true,
      id: true,
      priority: true,
      remainingQuantity: true,
      targetDeliveryDay: true,
      customerOrder: {
        select: {
          orderNo: true,
          virtualCustomer: { select: { name: true } },
        },
      },
      product: { select: { name: true } },
    },
  });
}

function toActiveOrderPriorityView(
  order: Awaited<ReturnType<typeof fetchActiveProductionOrders>>[number],
): ActiveOrderPriorityView {
  return {
    customerName: order.customerOrder.virtualCustomer?.name ?? "-",
    id: order.id,
    orderNo: order.customerOrder.orderNo,
    priority: order.priority,
    productName: order.product.name,
    remainingQuantity: order.remainingQuantity,
    targetDeliveryDay: order.targetDeliveryDay,
  };
}

async function fetchMarketOffers(factoryId: string) {
  const prisma = getPrisma();

  return prisma.marketOrderOffer.findMany({
    where: {
      factoryId,
      status: MarketOrderOfferStatus.AVAILABLE,
    },
    orderBy: [{ expiresDay: "asc" }, { offeredDay: "desc" }, { offerNo: "asc" }],
    take: 12,
    include: {
      customerSegment: {
        include: {
          translations: {
            where: { locale },
          },
        },
      },
      customerVolumeClass: {
        include: {
          translations: {
            where: { locale },
          },
        },
      },
      virtualCustomer: true,
      items: {
        orderBy: [{ sortOrder: "asc" }, { product: { name: "asc" } }],
        include: {
          bottleneckDepartment: {
            include: {
              translations: {
                where: { locale },
              },
            },
          },
          colors: {
            orderBy: [{ sortOrder: "asc" }],
            include: {
              colorVariant: {
                include: {
                  translations: {
                    where: { locale },
                  },
                },
              },
            },
          },
          product: {
            include: {
              images: {
                where: {
                  variant: {
                    in: [ProductImageVariant.CARD, ProductImageVariant.THUMBNAIL],
                  },
                },
                orderBy: [{ variant: "asc" }, { sortOrder: "asc" }],
              },
              routeSteps: {
                orderBy: { sequence: "asc" },
                include: {
                  department: {
                    include: {
                      translations: {
                        where: { locale },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

async function fetchFactoryDepartmentCosts(factoryId: string) {
  const prisma = getPrisma();
  const lines = await prisma.factoryProductionLine.findMany({
    where: {
      factoryId,
      status: {
        in: [...COST_LINE_STATUSES],
      },
    },
    select: {
      conditionBps: true,
      departmentId: true,
      productionLineTemplate: {
        select: {
          dailyPointCapacity: true,
          directCostPer1000PointsCents: true,
        },
      },
    },
  });
  const weightedCosts = new Map<
    string,
    { weightedCost: number; weightedCapacity: number }
  >();

  for (const line of lines) {
    const effectiveCapacity = Math.max(
      0,
      Math.floor(
        (line.productionLineTemplate.dailyPointCapacity * line.conditionBps) /
          10_000,
      ),
    );
    const current = weightedCosts.get(line.departmentId) ?? {
      weightedCapacity: 0,
      weightedCost: 0,
    };

    weightedCosts.set(line.departmentId, {
      weightedCapacity: current.weightedCapacity + effectiveCapacity,
      weightedCost:
        current.weightedCost +
        effectiveCapacity *
          line.productionLineTemplate.directCostPer1000PointsCents,
    });
  }

  return new Map(
    Array.from(weightedCosts.entries()).map(([departmentId, cost]) => [
      departmentId,
      cost.weightedCapacity > 0
        ? Math.round(cost.weightedCost / cost.weightedCapacity)
        : 0,
    ]),
  );
}

function toOrderOfferView({
  currencyCode,
  currentDay,
  departmentCosts,
  offer,
}: {
  currencyCode: CurrencyCode;
  currentDay: number;
  departmentCosts: Map<string, number>;
  offer: MarketOfferRecord;
}): OrderOfferView {
  const items = offer.items.map((item) =>
    toOrderOfferItemView({ currencyCode, departmentCosts, item }),
  );
  const plannedCostCents = items.reduce(
    (total, item) => total + Number(item.plannedTotalCostLabelRaw),
    0,
  );
  const totalRevenueCents = Number(offer.totalRevenueCents);
  const plannedProfitCents = totalRevenueCents - plannedCostCents;
  const plannedMarginBps = calculateMarginBps(
    plannedProfitCents,
    totalRevenueCents,
  );

  return {
    id: offer.id,
    offerNo: offer.offerNo,
    customerName: offer.virtualCustomer.name,
    offerType: offer.offerType,
    offerTypeLabel: formatOfferType(offer.offerType),
    isCollection: offer.items.length > 1,
    segmentLabel: pickTranslation(
      offer.customerSegment.translations,
      offer.customerSegment.key,
    ),
    volumeLabel: pickTranslation(
      offer.customerVolumeClass.translations,
      offer.customerVolumeClass.key,
    ),
    status: offer.status,
    offeredDay: offer.offeredDay,
    expiresDay: offer.expiresDay,
    targetDeliveryDay: offer.targetDeliveryDay,
    deliveryLabel: `${offer.targetDeliveryDays} gün`,
    totalQuantity: offer.totalQuantity,
    totalQuantityLabel: `${formatNumber(offer.totalQuantity)} adet`,
    totalRevenueCents: offer.totalRevenueCents.toString(),
    totalRevenueLabel: formatMoney(totalRevenueCents, currencyCode),
    acceptPlan: {
      cuttingStartLabel: `${currentDay + 1}. gün kesim başlayabilir`,
      materialReadyLabel: `${currentDay + 1}. gün kumaş ve aksesuar stokta`,
      productionOrderLabel: `${offer.items.length} üretim emri hazırlanacak`,
    },
    plannedCostCents: String(plannedCostCents),
    plannedCostLabel: formatMoney(plannedCostCents, currencyCode),
    plannedProfitCents: String(plannedProfitCents),
    plannedProfitLabel: formatMoney(plannedProfitCents, currencyCode),
    plannedMarginBps,
    plannedMarginLabel: formatMarginPercent(plannedMarginBps),
    capacityRiskLabel: formatBpsNumber(offer.capacityRiskBps),
    deliveryRiskLabel: formatBpsNumber(offer.deliveryRiskBps),
    items: items.map(toPublicOrderOfferItemView),
  };
}

function toOrderOfferItemView({
  currencyCode,
  departmentCosts,
  item,
}: {
  currencyCode: CurrencyCode;
  departmentCosts: Map<string, number>;
  item: MarketOfferItemRecord;
}): OrderOfferItemView & { plannedTotalCostLabelRaw: string } {
  const plannedUnitCostCents =
    item.estimatedUnitCostCents ??
    calculateRouteUnitCostCents(item, departmentCosts);
  const plannedUnitProfitCents = item.unitPriceCents - plannedUnitCostCents;
  const plannedTotalCostCents = plannedUnitCostCents * item.quantity;
  const totalPriceCents = Number(item.totalPriceCents);
  const plannedProfitCents = totalPriceCents - plannedTotalCostCents;
  const plannedMarginBps = calculateMarginBps(
    plannedProfitCents,
    totalPriceCents,
  );

  return {
    cardGradientFrom: item.product.cardGradientFrom,
    cardGradientTo: item.product.cardGradientTo,
    cardPrimaryColor: item.product.cardPrimaryColor,
    cardSecondaryColor: item.product.cardSecondaryColor,
    cardSvgIconAccentColor: item.product.cardSvgIconAccentColor,
    cardTextColor: item.product.cardTextColor,
    id: item.id,
    productName: item.product.name,
    productCode: item.product.code ?? item.product.key,
    productTier: item.productTier,
    productTierLabel: formatTier(item.productTier),
    quantity: item.quantity,
    quantityLabel: `${formatNumber(item.quantity)} adet`,
    unitPriceCents: String(item.unitPriceCents),
    unitPriceLabel: formatMoney(item.unitPriceCents, currencyCode),
    totalPriceCents: String(totalPriceCents),
    totalPriceLabel: formatMoney(totalPriceCents, currencyCode),
    plannedUnitCostCents: String(plannedUnitCostCents),
    plannedUnitCostLabel: formatMoney(plannedUnitCostCents, currencyCode),
    plannedTotalCostCents: String(plannedTotalCostCents),
    plannedTotalCostLabel: formatMoney(plannedTotalCostCents, currencyCode),
    plannedTotalCostLabelRaw: String(plannedTotalCostCents),
    plannedUnitProfitCents: String(plannedUnitProfitCents),
    plannedUnitProfitLabel: formatMoney(plannedUnitProfitCents, currencyCode),
    plannedProfitCents: String(plannedProfitCents),
    plannedProfitLabel: formatMoney(plannedProfitCents, currencyCode),
    plannedMarginLabel: formatMarginPercent(plannedMarginBps),
    routeLabel: buildRouteLabel(item),
    bottleneckLabel: item.bottleneckDepartment
      ? pickTranslation(
          item.bottleneckDepartment.translations,
          item.bottleneckDepartment.key,
        )
      : "-",
    imageUrl: getProductImageUrl(item),
    colors: item.colors.map(toOrderOfferItemColorView),
  };
}

function toPublicOrderOfferItemView({
  plannedTotalCostLabelRaw,
  ...item
}: OrderOfferItemView & { plannedTotalCostLabelRaw: string }) {
  void plannedTotalCostLabelRaw;

  return item;
}

function calculateRouteUnitCostCents(
  item: MarketOfferItemRecord,
  departmentCosts: Map<string, number>,
) {
  return item.product.routeSteps.reduce((total, step) => {
    if (!step.isRequired) return total;

    const lineCostPer1000Points =
      departmentCosts.get(step.departmentId) ??
      step.department.operationCostPerPointCents * 1000;

    return (
      total +
      Math.round((step.workloadPointsPerUnit * lineCostPer1000Points) / 1000)
    );
  }, 0);
}

function toOrderOfferItemColorView(
  color: MarketOfferItemRecord["colors"][number],
): OrderOfferItemColorView {
  return {
    id: color.id,
    name: pickTranslation(
      color.colorVariant.translations,
      color.colorVariant.key,
    ),
    hexCode: color.colorVariant.hexCode,
    quantity: color.quantity,
    quantityLabel: `${formatNumber(color.quantity)} adet`,
  };
}

function buildRouteLabel(item: MarketOfferItemRecord) {
  return item.product.routeSteps
    .filter((step) => step.isRequired)
    .map((step) => pickTranslation(step.department.translations, step.department.key))
    .join(" > ");
}

function getProductImageUrl(item: MarketOfferItemRecord) {
  const image =
    item.product.images.find(
      (productImage) => productImage.variant === ProductImageVariant.CARD,
    ) ?? item.product.images[0];

  return image?.url ?? image?.pathname ?? null;
}

function pickTranslation(translations: TranslationRecord[], fallbackKey: string) {
  return (
    translations.find((translation) => translation.locale === locale)?.name ??
    translations[0]?.name ??
    toTitle(fallbackKey)
  );
}

function toTitle(value: string) {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function calculateMarginBps(profitCents: number, revenueCents: number) {
  if (revenueCents <= 0) return 0;

  return Math.round((profitCents / revenueCents) * 10_000);
}

function formatMarginPercent(value: number) {
  const formatted = new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value / 100);

  return `%${formatted}`;
}

function formatBpsNumber(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value / 100);
}

function formatMoney(cents: number, currencyCode: CurrencyCode) {
  return new Intl.NumberFormat("tr-TR", {
    currency: currencyCode,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(cents / 100);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function formatTier(tier: ProductTier) {
  const labels: Record<ProductTier, string> = {
    BASIC: "Basic",
    LUXURY: "Luxury",
    PREMIUM: "Premium",
    STANDARD: "Standard",
  };

  return labels[tier];
}

function formatOfferType(offerType: OrderOfferView["offerType"]) {
  switch (offerType) {
    case "OPPORTUNITY":
      return "Fırsat";
    case "EXPRESS":
      return "Express";
    case "REPEAT":
      return "RPT";
    default:
      return "Normal";
  }
}
