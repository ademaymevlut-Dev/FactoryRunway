import {
  ContentStatus,
  FactoryProductionLineStatus,
  MarketOrderOfferStatus,
  ProductImageVariant,
  ProductionOrderStatus,
  RouteProcessingMode,
  type CurrencyCode,
  type ProductTier,
} from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import {
  getEffectiveProductRequiredLevel,
  isProductTierUnlocked,
} from "../product-tier-rules";

import type {
  OrderMarketView,
  ActiveOrderPriorityView,
  OrderOfferCapacityPlanView,
  OrderOfferCapacityState,
  OrderOfferCustomerRelationshipView,
  OrderOfferItemColorView,
  OrderOfferItemView,
  OrderOfferView,
} from "../types";

const locale = "tr";
const COST_LINE_STATUSES = [
  FactoryProductionLineStatus.IDLE,
  FactoryProductionLineStatus.RUNNING,
] as const;
const ACTIVE_PRODUCTION_STATUSES = [
  ProductionOrderStatus.PLANNED,
  ProductionOrderStatus.RELEASED,
  ProductionOrderStatus.IN_PROGRESS,
  ProductionOrderStatus.WAITING_INPUT,
  ProductionOrderStatus.WAITING_OUTSOURCE,
] as const;
const DELIVERY_CAPACITY_HORIZON_DAYS = 20;

type TranslationRecord = {
  locale: string;
  name: string;
};

type MarketOfferRecord = Awaited<ReturnType<typeof fetchMarketOffers>>[number];
type MarketOfferItemRecord = MarketOfferRecord["items"][number];
type CapacityContext = Awaited<ReturnType<typeof fetchFactoryCapacityContext>>;
type DepartmentCapacityInfo = {
  dailyPointCapacity: number;
  lineCount: number;
};
type DepartmentLoadSnapshotRow = {
  departmentId: string;
  dailyPointCapacity: number;
  existingWorkPoints: number;
  offerWorkPoints: number;
  queueAfterAcceptDays: number;
};
type DepartmentLoadSnapshot = {
  departments: DepartmentLoadSnapshotRow[];
  predictedCompletionDays: number | null;
  targetDeliveryDays: number | null;
};
type CapacityRowInternal = OrderOfferCapacityPlanView["rows"][number] & {
  afterAcceptLoadDaysValue: number;
  currentLoadDaysValue: number;
  offerLoadDaysValue: number;
  sortOrder: number;
};

export async function getOrderMarketView(input: {
  currentDay: number;
  currentLevel: number;
  factoryId: string;
  currencyCode: CurrencyCode;
}): Promise<OrderMarketView> {
  const [offers, departmentCosts, activeOrders, capacityContext] = await Promise.all([
    fetchMarketOffers(input.factoryId, input.currentDay),
    fetchFactoryDepartmentCosts(input.factoryId),
    fetchActiveProductionOrders(input.factoryId),
    fetchFactoryCapacityContext(input.factoryId),
  ]);
  const visibleOffers = offers.filter((offer) =>
    isMarketOfferVisibleForLevel(offer, input.currentLevel),
  );
  const offerViews = visibleOffers.map((offer) =>
    toOrderOfferView({
      capacityContext,
      currencyCode: input.currencyCode,
      currentDay: input.currentDay,
      departmentCosts,
      offer,
    }),
  );

  return {
    activeOrders: activeOrders.map(toActiveOrderPriorityView),
    availableCount: offerViews.length,
    currentLevel: input.currentLevel,
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

async function fetchFactoryCapacityContext(factoryId: string) {
  const prisma = getPrisma();
  const [factory, lines, queueRows] = await Promise.all([
    prisma.factory.findUnique({
      where: { id: factoryId },
      select: { sectorId: true },
    }),
    prisma.factoryProductionLine.findMany({
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
          },
        },
      },
    }),
    prisma.productionOrderRouteProgress.findMany({
      where: {
        factoryId,
        isRequired: true,
        processingMode: RouteProcessingMode.INTERNAL,
        remainingQuantity: { gt: 0 },
        productionOrder: {
          status: { in: [...ACTIVE_PRODUCTION_STATUSES] },
        },
      },
      select: {
        completedQuantity: true,
        departmentId: true,
        remainingQuantity: true,
        setupPoints: true,
        workloadPointsPerUnit: true,
      },
    }),
  ]);
  const departments = factory
    ? await prisma.department.findMany({
        where: {
          sectorId: factory.sectorId,
          status: ContentStatus.ACTIVE,
        },
        orderBy: [{ routeOrder: "asc" }, { key: "asc" }],
        select: {
          id: true,
          key: true,
          routeOrder: true,
          translations: {
            where: { locale },
            select: { locale: true, name: true },
          },
        },
      })
    : [];
  const departmentCapacityById = calculateDepartmentCapacityById(lines);
  const currentWorkPointsByDepartmentId = calculateCurrentWorkPointsByDepartmentId(
    queueRows,
  );
  const departmentNameById = new Map(
    departments.map((department) => [
      department.id,
      pickTranslation(department.translations, department.key),
    ]),
  );
  const departmentSortOrderById = new Map(
    departments.map((department) => [department.id, department.routeOrder]),
  );

  return {
    currentWorkPointsByDepartmentId,
    departmentCapacityById,
    departmentNameById,
    departmentSortOrderById,
  };
}

async function fetchMarketOffers(factoryId: string, currentDay: number) {
  const prisma = getPrisma();

  return prisma.marketOrderOffer.findMany({
    where: {
      factoryId,
      status: MarketOrderOfferStatus.AVAILABLE,
      expiresDay: { gte: currentDay },
    },
    orderBy: [{ expiresDay: "asc" }, { offeredDay: "desc" }, { offerNo: "asc" }],
    take: 48,
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

function isMarketOfferVisibleForLevel(
  offer: MarketOfferRecord,
  currentLevel: number,
) {
  if (offer.items.length === 0) return false;

  const itemTiers = new Set(offer.items.map((item) => item.productTier));
  const productTier = offer.items[0]?.productTier;

  if (!productTier || itemTiers.size !== 1) return false;
  if (offer.productTier !== productTier) return false;
  if (offer.virtualCustomer.productTier !== productTier) return false;
  if (!isProductTierUnlocked(productTier, currentLevel)) return false;

  return offer.items.every(
    (item) =>
      item.product.status === ContentStatus.ACTIVE &&
      item.product.tier === productTier &&
      getEffectiveProductRequiredLevel({
        requiredPlayerLevel: item.product.requiredPlayerLevel,
        tier: item.product.tier,
      }) <= currentLevel,
  );
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
  capacityContext,
  currencyCode,
  currentDay,
  departmentCosts,
  offer,
}: {
  capacityContext: CapacityContext;
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
    customerRelationship: buildCustomerRelationshipView(offer.metadata),
    offerType: offer.offerType,
    offerTypeLabel: formatOfferType(offer.offerType),
    productTier: offer.productTier,
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
    capacityPlan: buildCapacityPlanView({ capacityContext, offer }),
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

function buildCustomerRelationshipView(
  metadata: unknown,
): OrderOfferCustomerRelationshipView | null {
  const source = isRecord(metadata) ? metadata.customerRelationship : null;

  if (!isRecord(source)) return null;

  const relationshipScoreBps = clampNumber(
    Math.round(readFiniteNumber(source.relationshipScoreBps) ?? 0),
    0,
    10_000,
  );
  const completedOrderCount = Math.max(
    0,
    Math.round(readFiniteNumber(source.completedOrderCount) ?? 0),
  );
  const lateOrderCount = Math.max(
    0,
    Math.round(readFiniteNumber(source.lateOrderCount) ?? 0),
  );
  const totalLateDays = Math.max(
    0,
    Math.round(readFiniteNumber(source.totalLateDays) ?? 0),
  );
  const repeatWeightBps = clampNumber(
    Math.round(readFiniteNumber(source.repeatWeightBps) ?? 0),
    0,
    10_000,
  );
  const repeatEligible = source.repeatEligible === true;
  const status = readCustomerRelationshipStatus(source.status);

  return {
    completedOrderCount,
    lateOrderCount,
    relationshipScoreBps,
    relationshipScoreLabel: formatBpsPercent(relationshipScoreBps),
    repeatEligible,
    repeatLabel: repeatEligible ? "RPT uygun" : "RPT beklemede",
    repeatWeightLabel: formatBpsPercent(repeatWeightBps),
    status,
    statusLabel: formatCustomerRelationshipStatus(status),
    totalLateDays,
  };
}

function buildCapacityPlanView({
  capacityContext,
  offer,
}: {
  capacityContext: CapacityContext;
  offer: MarketOfferRecord;
}): OrderOfferCapacityPlanView {
  const snapshot = parseDepartmentLoadSnapshot(offer.departmentLoadSnapshot);
  const snapshotByDepartmentId = new Map(
    (snapshot?.departments ?? []).map((department) => [
      department.departmentId,
      department,
    ]),
  );
  const fallbackOfferWorkPointsByDepartmentId =
    calculateOfferWorkPointsByDepartmentId(offer.items);
  const departmentIds = new Set<string>([
    ...capacityContext.currentWorkPointsByDepartmentId.keys(),
    ...fallbackOfferWorkPointsByDepartmentId.keys(),
    ...snapshotByDepartmentId.keys(),
  ]);
  const rows: CapacityRowInternal[] = Array.from(departmentIds, (departmentId) => {
    const snapshotRow = snapshotByDepartmentId.get(departmentId);
    const capacityInfo =
      capacityContext.departmentCapacityById.get(departmentId) ??
      toSnapshotCapacityInfo(snapshotRow);
    const dailyPointCapacity = capacityInfo?.dailyPointCapacity ?? 0;
    const currentWorkPoints = capacityContext.currentWorkPointsByDepartmentId.has(
      departmentId,
    )
      ? (capacityContext.currentWorkPointsByDepartmentId.get(departmentId) ?? 0)
      : (snapshotRow?.existingWorkPoints ?? 0);
    const offerWorkPoints =
      snapshotRow?.offerWorkPoints ??
      fallbackOfferWorkPointsByDepartmentId.get(departmentId) ??
      0;
    const currentLoadDaysValue = calculateLoadDays(
      currentWorkPoints,
      dailyPointCapacity,
    );
    const offerLoadDaysValue = calculateLoadDays(
      offerWorkPoints,
      dailyPointCapacity,
    );
    const afterAcceptLoadDaysValue = calculateLoadDays(
      currentWorkPoints + offerWorkPoints,
      dailyPointCapacity,
    );
    const state = getCapacityState(
      afterAcceptLoadDaysValue,
      dailyPointCapacity,
    );

    return {
      afterAcceptLoadDaysLabel: formatDays(afterAcceptLoadDaysValue),
      afterAcceptLoadDaysValue,
      afterAcceptLoadPercent: getLoadPercent(afterAcceptLoadDaysValue, state),
      currentLoadDaysLabel: formatDays(currentLoadDaysValue),
      currentLoadDaysValue,
      dailyCapacityLabel:
        dailyPointCapacity > 0
          ? `${formatNumber(dailyPointCapacity)} point/gün`
          : "Planlı hat yok",
      departmentId,
      departmentName:
        capacityContext.departmentNameById.get(departmentId) ?? "Bölüm",
      lineCountLabel:
        (capacityInfo?.lineCount ?? 0) > 0
          ? `${formatNumber(capacityInfo?.lineCount ?? 0)} hat`
          : dailyPointCapacity > 0
            ? "Hat bilgisi yok"
            : "Hat yok",
      offerLoadDaysLabel: formatDays(offerLoadDaysValue),
      offerLoadDaysValue,
      sortOrder: capacityContext.departmentSortOrderById.get(departmentId) ?? 999,
      state,
      stateLabel: getCapacityStateLabel(state),
    };
  }).sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;

    return a.departmentName.localeCompare(b.departmentName, "tr");
  });

  if (rows.length === 0) {
    return {
      afterAcceptLoadDaysLabel: "-",
      bottleneckDepartmentLabel: "Darboğaz yok",
      currentLoadDaysLabel: "-",
      offerLoadDaysLabel: "-",
      plannedCompletionLabel: "-",
      rows: [],
      state: "NO_CAPACITY",
      stateLabel: getCapacityStateLabel("NO_CAPACITY"),
      targetDeliveryLabel: `${offer.targetDeliveryDays} gün termin`,
    };
  }

  const bottleneck = rows.reduce((current, row) =>
    row.afterAcceptLoadDaysValue > current.afterAcceptLoadDaysValue
      ? row
      : current,
  );
  const currentLoadDaysValue = getMaxLoadDays(
    rows.map((row) => row.currentLoadDaysValue),
  );
  const offerLoadDaysValue = getMaxLoadDays(
    rows.map((row) => row.offerLoadDaysValue),
  );
  const afterAcceptLoadDaysValue = getMaxLoadDays(
    rows.map((row) => row.afterAcceptLoadDaysValue),
  );
  const state = getCapacityState(
    afterAcceptLoadDaysValue,
    bottleneck.state === "NO_CAPACITY" ? 0 : 1,
  );
  const plannedCompletionDays =
    snapshot?.predictedCompletionDays ??
    (Number.isFinite(afterAcceptLoadDaysValue)
      ? Math.ceil(afterAcceptLoadDaysValue) + 1
      : null);

  return {
    afterAcceptLoadDaysLabel: formatDays(afterAcceptLoadDaysValue),
    bottleneckDepartmentLabel: bottleneck.departmentName,
    currentLoadDaysLabel: formatDays(currentLoadDaysValue),
    offerLoadDaysLabel: formatDays(offerLoadDaysValue),
    plannedCompletionLabel:
      plannedCompletionDays === null
        ? "-"
        : `${formatNumber(plannedCompletionDays)} gün tahmini`,
    rows,
    state,
    stateLabel: getCapacityStateLabel(state),
    targetDeliveryLabel: `${
      snapshot?.targetDeliveryDays ?? offer.targetDeliveryDays
    } gün termin`,
  };
}

function calculateDepartmentCapacityById(
  lines: Array<{
    conditionBps: number;
    departmentId: string;
    productionLineTemplate: { dailyPointCapacity: number };
  }>,
) {
  const capacityByDepartmentId = new Map<string, DepartmentCapacityInfo>();

  for (const line of lines) {
    const current = capacityByDepartmentId.get(line.departmentId) ?? {
      dailyPointCapacity: 0,
      lineCount: 0,
    };
    const effectiveDailyCapacity = Math.floor(
      (line.productionLineTemplate.dailyPointCapacity * line.conditionBps) /
        10_000,
    );

    capacityByDepartmentId.set(line.departmentId, {
      dailyPointCapacity:
        current.dailyPointCapacity + Math.max(0, effectiveDailyCapacity),
      lineCount: current.lineCount + 1,
    });
  }

  return capacityByDepartmentId;
}

function calculateCurrentWorkPointsByDepartmentId(
  rows: Array<{
    completedQuantity: number;
    departmentId: string;
    remainingQuantity: number;
    setupPoints: number;
    workloadPointsPerUnit: number;
  }>,
) {
  const workPointsByDepartmentId = new Map<string, number>();

  for (const row of rows) {
    const workPoints =
      row.remainingQuantity * row.workloadPointsPerUnit +
      (row.completedQuantity <= 0 ? Math.max(0, row.setupPoints) : 0);

    workPointsByDepartmentId.set(
      row.departmentId,
      (workPointsByDepartmentId.get(row.departmentId) ?? 0) + workPoints,
    );
  }

  return workPointsByDepartmentId;
}

function calculateOfferWorkPointsByDepartmentId(
  items: MarketOfferRecord["items"],
) {
  const workPointsByDepartmentId = new Map<string, number>();

  for (const item of items) {
    for (const step of item.product.routeSteps) {
      if (!step.isRequired) continue;

      const workPoints =
        item.quantity * step.workloadPointsPerUnit + Math.max(0, step.setupPoints);

      workPointsByDepartmentId.set(
        step.departmentId,
        (workPointsByDepartmentId.get(step.departmentId) ?? 0) + workPoints,
      );
    }
  }

  return workPointsByDepartmentId;
}

function parseDepartmentLoadSnapshot(
  value: unknown,
): DepartmentLoadSnapshot | null {
  if (!isRecord(value) || !Array.isArray(value.departments)) return null;

  const departments = value.departments.flatMap((department) => {
    if (!isRecord(department) || typeof department.departmentId !== "string") {
      return [];
    }

    return [
      {
        dailyPointCapacity: readFiniteNumber(department.dailyPointCapacity) ?? 0,
        departmentId: department.departmentId,
        existingWorkPoints: readFiniteNumber(department.existingWorkPoints) ?? 0,
        offerWorkPoints: readFiniteNumber(department.offerWorkPoints) ?? 0,
        queueAfterAcceptDays:
          readFiniteNumber(department.queueAfterAcceptDays) ?? 0,
      },
    ];
  });

  return {
    departments,
    predictedCompletionDays: readFiniteNumber(value.predictedCompletionDays),
    targetDeliveryDays: readFiniteNumber(value.targetDeliveryDays),
  };
}

function toSnapshotCapacityInfo(
  snapshotRow: DepartmentLoadSnapshotRow | undefined,
): DepartmentCapacityInfo | undefined {
  if (!snapshotRow) return undefined;

  return {
    dailyPointCapacity: snapshotRow.dailyPointCapacity,
    lineCount: 0,
  };
}

function calculateLoadDays(workPoints: number, dailyPointCapacity: number) {
  if (dailyPointCapacity <= 0) return Number.POSITIVE_INFINITY;

  return workPoints / dailyPointCapacity;
}

function getMaxLoadDays(values: number[]) {
  if (values.length === 0) return 0;

  return values.reduce((max, value) => Math.max(max, value), 0);
}

function getCapacityState(
  loadDays: number,
  dailyPointCapacity: number,
): OrderOfferCapacityState {
  if (dailyPointCapacity <= 0 || !Number.isFinite(loadDays)) return "NO_CAPACITY";
  if (loadDays <= 4) return "SAFE";
  if (loadDays <= 7) return "BALANCED";
  if (loadDays <= 10) return "STRETCH";
  if (loadDays <= 15) return "RISKY";

  return "CRITICAL";
}

function getCapacityStateLabel(state: OrderOfferCapacityState) {
  const labels: Record<OrderOfferCapacityState, string> = {
    BALANCED: "Dengeli",
    CRITICAL: "Kritik",
    NO_CAPACITY: "Hat yok",
    RISKY: "Riskli",
    SAFE: "Rahat",
    STRETCH: "Yoğun",
  };

  return labels[state];
}

function getLoadPercent(loadDays: number, state: OrderOfferCapacityState) {
  if (state === "NO_CAPACITY") return 100;

  return clampNumber(
    Math.round((loadDays / DELIVERY_CAPACITY_HORIZON_DAYS) * 100),
    0,
    100,
  );
}

function formatDays(value: number) {
  if (!Number.isFinite(value)) return "-";
  if (value === 0) return "0 gün";

  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: value < 10 ? 1 : 0,
    minimumFractionDigits: value < 1 ? 1 : 0,
  }).format(value)} gün`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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

function formatBpsPercent(value: number) {
  return `%${formatBpsNumber(value)}`;
}

function readCustomerRelationshipStatus(value: unknown) {
  if (
    value === "trusted" ||
    value === "warm" ||
    value === "at_risk" ||
    value === "new"
  ) {
    return value;
  }

  return "new";
}

function formatCustomerRelationshipStatus(
  status: OrderOfferCustomerRelationshipView["status"],
) {
  const labels: Record<OrderOfferCustomerRelationshipView["status"], string> = {
    at_risk: "Riskli",
    new: "Yeni",
    trusted: "Güvenilir",
    warm: "Sıcak",
  };

  return labels[status];
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
