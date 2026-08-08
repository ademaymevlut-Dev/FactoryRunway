import { Prisma } from "@/generated/prisma/client";
import {
  ContentStatus,
  CustomerOrderStatus,
  FactoryProductionLineStatus,
  LeasingContractStatus,
  MarketOrderOfferStatus,
  MarketOrderOfferType,
  ProductionOrderStatus,
  RouteProcessingMode,
  StaffAssignmentStatus,
  StaffType,
  type ProductTier,
} from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import {
  buildCustomerRelationshipMetadata,
  buildCustomerRelationshipSummary,
  calculateCustomerSelectionWeight,
  type CustomerRelationshipSummary,
} from "@/lib/customer-relationship";
import {
  getOrderProductCandidatesForFactory,
  type DepartmentDailyCapacity,
  type OrderProductCandidate,
  type OrderProductCandidateColor,
} from "@/lib/order-market/product-candidates";
import {
  calculateMarketScaleWeightBps,
  calculateQuantityPriceMultiplierBps,
  MARKET_OFFER_BALANCE_VERSION,
  MARKET_PRICING_BALANCE_VERSION,
  MARKET_SCALE_BALANCE_VERSION,
  resolveMarketOfferPriceBand,
  resolveMarketOfferStageRule,
  resolveMarketOfferTypeRules,
  resolveMarketPricingConfig,
  resolveMarketScaleConfig,
  type MarketOfferStageRuleConfig,
  type MarketOfferTypeRuleConfig,
  type MarketPricingConfig,
  type MarketScaleConfig,
} from "@/lib/order-market/market-offer-config";
import { PRODUCT_TIER_ORDER } from "../product-tier-rules";

const DEFAULT_MONTHLY_WORK_DAYS = 22;
const DELIVERY_CAPACITY_HORIZON_DAYS = 20;
const MATERIAL_READY_DAYS = 1;
const RECENT_OFFER_LOOKBACK = 48;
const MARKET_OFFER_POLICY_VERSION = 5;
const reportedMarketConfigErrors = new Set<string>();

const COST_LINE_STATUSES = [
  FactoryProductionLineStatus.IDLE,
  FactoryProductionLineStatus.RUNNING,
  FactoryProductionLineStatus.BLOCKED,
  FactoryProductionLineStatus.MAINTENANCE,
  FactoryProductionLineStatus.BROKEN,
] as const;

const ACTIVE_PRODUCTION_STATUSES = [
  ProductionOrderStatus.PLANNED,
  ProductionOrderStatus.RELEASED,
  ProductionOrderStatus.IN_PROGRESS,
  ProductionOrderStatus.WAITING_INPUT,
  ProductionOrderStatus.WAITING_OUTSOURCE,
] as const;

const DEFAULT_TIER_CAPS: Record<ProductTier, { min: number; max: number }> = {
  BASIC: { min: 500, max: 20_000 },
  STANDARD: { min: 300, max: 10_000 },
  PREMIUM: { min: 100, max: 5_000 },
  LUXURY: { min: 50, max: 2_000 },
};
// These are safety ceilings, not target quantities. Route capacity remains the target source.
const GLOBAL_TIER_QUANTITY_CAPS: Record<ProductTier, number> = {
  BASIC: 100_000,
  STANDARD: 100_000,
  PREMIUM: 50_000,
  LUXURY: 10_000,
};
const SCALABLE_VOLUME_CLASS_KEYS = new Set([
  "regular",
  "large_retail",
  "mass_distribution",
]);
const DAY_BPS = 10_000;
const TARGET_LOAD_RANGES: Record<
  MarketOrderOfferType,
  Record<ProductTier, { minBps: number; maxBps: number }>
> = {
  EXPRESS: {
    BASIC: { minBps: 35_000, maxBps: 45_000 },
    LUXURY: { minBps: 30_000, maxBps: 40_000 },
    PREMIUM: { minBps: 30_000, maxBps: 45_000 },
    STANDARD: { minBps: 35_000, maxBps: 45_000 },
  },
  NORMAL: {
    BASIC: { minBps: 50_000, maxBps: 80_000 },
    LUXURY: { minBps: 20_000, maxBps: 40_000 },
    PREMIUM: { minBps: 30_000, maxBps: 50_000 },
    STANDARD: { minBps: 40_000, maxBps: 60_000 },
  },
  OPPORTUNITY: {
    BASIC: { minBps: 35_000, maxBps: 50_000 },
    LUXURY: { minBps: 30_000, maxBps: 40_000 },
    PREMIUM: { minBps: 30_000, maxBps: 45_000 },
    STANDARD: { minBps: 35_000, maxBps: 45_000 },
  },
  REPEAT: {
    BASIC: { minBps: 50_000, maxBps: 80_000 },
    LUXURY: { minBps: 25_000, maxBps: 50_000 },
    PREMIUM: { minBps: 35_000, maxBps: 60_000 },
    STANDARD: { minBps: 40_000, maxBps: 70_000 },
  },
};
const BASIC_LARGE_BLOCK_LOAD_RANGE = { minBps: 80_000, maxBps: 120_000 };
const PRODUCT_TIER_RANK: Record<ProductTier, number> = {
  BASIC: 0,
  STANDARD: 1,
  PREMIUM: 2,
  LUXURY: 3,
};
type MarketOfferTypeRule = MarketOfferTypeRuleConfig;
type MarketOfferStageRule = MarketOfferStageRuleConfig;

type OfferGenerationResult =
  | {
      created: true;
      createdCount: number;
      offerIds: string[];
    }
  | {
      created: false;
      reason:
        | "FACTORY_NOT_FOUND"
        | "NO_CUSTOMERS"
        | "NO_PRODUCTS"
        | "MARKET_POOL_FILLED"
        | "NO_CREATABLE_OFFER";
      rejectedProductCount?: number;
    };

type VirtualCustomerForOffer = Awaited<
  ReturnType<typeof fetchVirtualCustomersForFactory>
>[number];

type RecentOfferForPenalty = Awaited<
  ReturnType<typeof fetchRecentOffersForFactory>
>[number];

type CustomerRelationshipById = Map<string, CustomerRelationshipSummary>;

type FactoryCostContext = Awaited<ReturnType<typeof fetchFactoryCostContext>>;

export type DepartmentCostProfile = {
  departmentId: string;
  effectiveDailyPointCapacity: number;
  monthlyDirectCostCents: number;
  costPer1000PointsCents: number;
};

export type PlannedUnitCostBreakdown = {
  directRouteUnitCostCents: number;
  setupUnitCostCents: number;
  sharedFactoryUnitCostCents: number;
  leasingUnitCostCents: number;
  outsourceUnitCostCents: number;
  referenceMonthlyQuantity: number;
  totalUnitCostCents: number;
};

type PlannedOfferItem = {
  product: OrderProductCandidate;
  quantity: number;
  quantityPriceMultiplierBps: number;
  unitPriceCents: number;
  totalPriceCents: bigint;
  estimatedUnitCostCents: number;
  estimatedProfitCents: bigint;
  plannedCostBreakdown: PlannedUnitCostBreakdown;
  requiredTotalPoints: number;
  estimatedLoadDaysBps: number;
  colors: Array<OrderProductCandidateColor & { quantity: number }>;
  tierCap: { min: number; max: number };
  quantityPolicy: PlannedItemQuantity;
};

type OfferLoadProfile = {
  isLargeBasicBlock: boolean;
  targetLoadDaysBps: number;
  targetLoadDayMinBps: number;
  targetLoadDayMaxBps: number;
  volumeReferenceDays: number;
};

type DepartmentLoad = {
  departmentId: string;
  existingWorkPoints: number;
  offerWorkPoints: number;
  dailyPointCapacity: number;
  ownLoadBps: number;
  loadAfterAcceptBps: number;
  queueAfterAcceptDays: number;
};

export type FactoryScaleBand =
  | "COMPACT"
  | "GROWING"
  | "INDUSTRIAL"
  | "ENTERPRISE";

export type PlannedItemQuantity = {
  allocatedRawQuantity: number;
  baseTierCapMax: number;
  capacityTargetQuantity: number;
  dynamicTierCapMax: number;
  effectiveTierCapMax: number;
  globalTierCapMax: number;
  quantity: number;
};

export async function ensureMarketOfferForFactory(
  factoryId: string,
): Promise<OfferGenerationResult> {
  const prisma = getPrisma();
  const [factoryCostContext, candidateResult] = await Promise.all([
    fetchFactoryCostContext(factoryId),
    getOrderProductCandidatesForFactory(factoryId),
  ]);

  if (!factoryCostContext) {
    return { created: false, reason: "FACTORY_NOT_FOUND" };
  }

  await expireOldOffers({
    currentDay: factoryCostContext.currentDay,
    factoryId,
  });

  if (candidateResult.candidates.length === 0) {
    return {
      created: false,
      reason: "NO_PRODUCTS",
      rejectedProductCount: candidateResult.rejected.length,
    };
  }

  const currentStage = factoryCostContext.operatingStageState?.currentStage;
  const [
    marketRules,
    customers,
    recentOffers,
    activeOffers,
    todayOfferCount,
    offerCount,
    customerRelationshipById,
    queueRows,
  ] =
    await Promise.all([
      fetchMarketRules({
        currentStageId: currentStage?.id ?? null,
        currentStageSortOrder: currentStage?.sortOrder ?? null,
        sectorId: factoryCostContext.sectorId,
      }),
      fetchVirtualCustomersForFactory({
        currentStageSortOrder: currentStage?.sortOrder ?? null,
        sectorId: factoryCostContext.sectorId,
      }),
      fetchRecentOffersForFactory(factoryId),
      prisma.marketOrderOffer.findMany({
        where: {
          factoryId,
          status: MarketOrderOfferStatus.AVAILABLE,
        },
        select: {
          id: true,
          metadata: true,
          offeredDay: true,
          productTier: true,
          virtualCustomerId: true,
          virtualCustomer: { select: { productTier: true } },
          items: {
            select: { productId: true, productTier: true },
          },
        },
      }),
      prisma.marketOrderOffer.count({
        where: {
          factoryId,
          offeredDay: factoryCostContext.currentDay,
          status: { not: MarketOrderOfferStatus.EXPIRED },
        },
      }),
      prisma.marketOrderOffer.count({ where: { factoryId } }),
      fetchCustomerRelationshipsForFactory(factoryId),
      fetchQueueRows(factoryId),
    ]);
  const repeatCustomerIds = new Set(
    Array.from(customerRelationshipById.values())
      .filter((relationship) => relationship.repeatEligible)
      .map((relationship) => relationship.virtualCustomerId),
  );

  if (customers.length === 0) {
    return { created: false, reason: "NO_CUSTOMERS" };
  }

  const candidateTierByProductId = new Map(
    candidateResult.candidates.map((candidate) => [
      candidate.productId,
      candidate.tier,
    ]),
  );
  const eligibleCustomerIds = new Set(customers.map((customer) => customer.id));
  const compatibleActiveOffers = activeOffers.filter((offer) =>
    isActiveOfferCompatible({
      candidateTierByProductId,
      eligibleCustomerIds,
      offer,
    }),
  );
  const incompatibleOfferIds = activeOffers
    .filter((offer) => !compatibleActiveOffers.includes(offer))
    .map((offer) => offer.id);

  if (incompatibleOfferIds.length > 0) {
    await prisma.marketOrderOffer.updateMany({
      where: { id: { in: incompatibleOfferIds } },
      data: { status: MarketOrderOfferStatus.EXPIRED },
    });
  }

  const incompatibleTodayCount = activeOffers.filter(
    (offer) =>
      offer.offeredDay === factoryCostContext.currentDay &&
      incompatibleOfferIds.includes(offer.id),
  ).length;
  const eligibleTodayOfferCount = Math.max(
    0,
    todayOfferCount - incompatibleTodayCount,
  );

  const activeOfferCount = compatibleActiveOffers.length;
  const activeTierCounts = countOfferTiers(compatibleActiveOffers);
  const missingOfferCount = calculateMarketOfferCreationCount({
    activeOfferCount,
    maxNewOffersPerDay: marketRules.stageRule.maxNewOffersPerDay,
    targetActiveOfferCount: marketRules.stageRule.targetActiveOfferCount,
    todayOfferCount: eligibleTodayOfferCount,
  });

  if (missingOfferCount === 0) {
    return { created: false, reason: "MARKET_POOL_FILLED" };
  }

  const monthlyWorkDays =
    factoryCostContext.sector.operatingCostConfig?.monthlyWorkDays ??
    DEFAULT_MONTHLY_WORK_DAYS;
  const factoryExpenseBreakdown = calculateFactoryMonthlyExpenseCents({
    factory: factoryCostContext,
    monthlyWorkDays,
  });
  const departmentCapacityById = new Map(
    candidateResult.departmentCapacities.map((capacity) => [
      capacity.departmentId,
      capacity,
    ]),
  );
  const activeProductionLineCount = candidateResult.departmentCapacities.reduce(
    (total, capacity) => total + capacity.lineCount,
    0,
  );
  const factoryScaleBand = resolveFactoryScaleBand(
    activeProductionLineCount,
  );
  const existingWorkPointsByDepartmentId = calculateExistingWorkPoints(queueRows);
  const productRecentCounts = countRecentProducts(recentOffers);
  const tierRecentCounts = countRecentTiers(recentOffers);
  const customerRecentCounts = countRecentCustomers(recentOffers);
  const createdOfferIds: string[] = [];
  const usedProductIds = new Map<string, number>();
  const usedCustomerIds = new Map<string, number>();
  const usedOfferTypeCounts = new Map<MarketOrderOfferType, number>();
  const usedTierCounts = new Map<ProductTier, number>();

  for (let index = 0; index < missingOfferCount; index += 1) {
    const sequence = offerCount + createdOfferIds.length + 1;
    const seedBase = [
      factoryId,
      factoryCostContext.currentDay,
      eligibleTodayOfferCount,
      index,
      sequence,
    ].join(":");
    const productTier = pickProductTierForOffer({
      activeTierCounts,
      candidates: candidateResult.candidates,
      customers,
      seed: `${seedBase}:product-tier`,
      usedTierCounts,
    });

    if (!productTier) continue;

    const tierCustomers = customers.filter(
      (customer) => customer.productTier === productTier,
    );
    const tierRepeatCustomerIds = new Set(
      tierCustomers
        .filter((customer) => repeatCustomerIds.has(customer.id))
        .map((customer) => customer.id),
    );
    const offerTypeRule = pickOfferTypeRule({
      currentDay: factoryCostContext.currentDay,
      createdOfferTypeCounts: usedOfferTypeCounts,
      recentOffers,
      repeatCustomerIds: tierRepeatCustomerIds,
      rules: marketRules.typeRules,
      seed: `${seedBase}:offer-type`,
    });

    if (!offerTypeRule) continue;

    const customer = pickCustomerForOffer({
      activeProductionLineCount,
      customerRelationshipById,
      customers: tierCustomers,
      customerRecentCounts,
      marketScaleConfig: marketRules.scaleConfig,
      offerType: offerTypeRule.offerType,
      repeatCustomerIds: tierRepeatCustomerIds,
      seed: `${seedBase}:customer`,
      usedCustomerIds,
    });

    if (!customer) continue;

    const products = pickProductsForOffer({
      candidates: candidateResult.candidates,
      customer,
      factoryScaleBand,
      productRecentCounts,
      seed: `${seedBase}:products`,
      tierRecentCounts,
      usedProductIds,
      usedTierCounts,
    });

    if (products.length === 0) continue;

    const plannedOffer = buildPlannedOffer({
      currentDay: factoryCostContext.currentDay,
      customer,
      customerRelationship:
        customerRelationshipById.get(customer.id) ?? null,
      departmentCapacityById,
      existingWorkPointsByDepartmentId,
      factoryScaleBand,
      factoryExpenseBreakdown,
      factoryId,
      activeProductionLineCount,
      monthlyWorkDays,
      offerNo: `MO-${String(sequence).padStart(4, "0")}`,
      offerTypeRule,
      pricingConfig: marketRules.pricingConfig,
      marketScaleConfig: marketRules.scaleConfig,
      marketScaleConfigSource: marketRules.scaleConfigSource,
      productTier,
      products,
      seed: seedBase,
    });

    if (!plannedOffer) continue;

    const offer = await prisma.marketOrderOffer.create({
      data: plannedOffer,
      select: { id: true },
    });

    createdOfferIds.push(offer.id);
    usedCustomerIds.set(customer.id, (usedCustomerIds.get(customer.id) ?? 0) + 1);
    usedOfferTypeCounts.set(
      offerTypeRule.offerType,
      (usedOfferTypeCounts.get(offerTypeRule.offerType) ?? 0) + 1,
    );
    usedTierCounts.set(productTier, (usedTierCounts.get(productTier) ?? 0) + 1);

    for (const product of products) {
      usedProductIds.set(
        product.productId,
        (usedProductIds.get(product.productId) ?? 0) + 1,
      );
    }
  }

  if (createdOfferIds.length === 0) {
    return { created: false, reason: "NO_CREATABLE_OFFER" };
  }

  return {
    created: true,
    createdCount: createdOfferIds.length,
    offerIds: createdOfferIds,
  };
}

function isActiveOfferCompatible(input: {
  candidateTierByProductId: Map<string, ProductTier>;
  eligibleCustomerIds: Set<string>;
  offer: {
    items: Array<{ productId: string; productTier: ProductTier }>;
    metadata: unknown;
    productTier: ProductTier;
    virtualCustomer: { productTier: ProductTier };
    virtualCustomerId: string;
  };
}) {
  return (
    readMarketOfferPolicyVersion(input.offer.metadata) ===
      MARKET_OFFER_POLICY_VERSION &&
    input.offer.items.length > 0 &&
    input.eligibleCustomerIds.has(input.offer.virtualCustomerId) &&
    input.offer.virtualCustomer.productTier === input.offer.productTier &&
    input.offer.items.every(
      (item) =>
        item.productTier === input.offer.productTier &&
        input.candidateTierByProductId.get(item.productId) ===
          input.offer.productTier,
    )
  );
}

function readMarketOfferPolicyVersion(metadata: unknown) {
  if (!isRecord(metadata)) return null;

  return readPositiveNumber(metadata.marketOfferPolicyVersion);
}

async function expireOldOffers(input: {
  currentDay: number;
  factoryId: string;
}) {
  const prisma = getPrisma();

  await prisma.marketOrderOffer.updateMany({
    where: {
      factoryId: input.factoryId,
      status: MarketOrderOfferStatus.AVAILABLE,
      expiresDay: { lt: input.currentDay },
    },
    data: { status: MarketOrderOfferStatus.EXPIRED },
  });
}

async function fetchFactoryCostContext(factoryId: string) {
  const prisma = getPrisma();

  return prisma.factory.findUnique({
    where: { id: factoryId },
    select: {
      id: true,
      currentDay: true,
      sectorId: true,
      sector: {
        select: {
          operatingCostConfig: {
            select: {
              monthlyWorkDays: true,
              rentPerM2Cents: true,
            },
          },
        },
      },
      operatingStageState: {
        select: {
          currentStage: {
            select: {
              id: true,
              sortOrder: true,
              fabricWarehouseM2: true,
              accessoryWarehouseM2: true,
              productWarehouseM2: true,
              officeSocialTechnicalM2: true,
              commonAreaBps: true,
              facilityElectricityCents: true,
              staffElectricityExtraCents: true,
              dailySupportMealPerStaffCents: true,
              canteenFixedCents: true,
              overheadBaseCents: true,
              supportOverheadPerStaffCents: true,
            },
          },
        },
      },
      productionLines: {
        where: {
          status: { in: [...COST_LINE_STATUSES] },
        },
        select: {
          departmentId: true,
          conditionBps: true,
          status: true,
          productionLineTemplate: {
            select: {
              areaM2: true,
              dailyPointCapacity: true,
              directCostPer1000PointsCents: true,
            },
          },
        },
      },
      staffAssignments: {
        where: {
          factoryProductionLineId: null,
          quantity: { gt: 0 },
          status: StaffAssignmentStatus.ACTIVE,
          staffRole: {
            staffType: {
              in: [StaffType.SUPPORT, StaffType.MANAGEMENT],
            },
          },
        },
        select: {
          quantity: true,
          staffRole: {
            select: { monthlySalaryCents: true },
          },
        },
      },
      leasingContracts: {
        where: { status: LeasingContractStatus.ACTIVE },
        select: { monthlyPaymentCents: true },
      },
    },
  });
}

async function fetchMarketRules(input: {
  sectorId: string;
  currentStageId: string | null;
  currentStageSortOrder: number | null;
}) {
  const prisma = getPrisma();
  const [typeRules, stageRule] = await Promise.all([
    prisma.sectorMarketOfferTypeRule.findMany({
      where: { sectorId: input.sectorId },
      orderBy: { offerType: "asc" },
      select: {
        offerType: true,
        generationWeightBps: true,
        minDeliveryDays: true,
        maxDeliveryDays: true,
        offerExpiryDays: true,
        minimumIntervalDays: true,
        priceMultiplierMinBps: true,
        priceMultiplierMaxBps: true,
        metadata: true,
      },
    }),
    input.currentStageId
      ? prisma.sectorMarketOfferStageRule.findUnique({
          where: { operatingStageId: input.currentStageId },
          select: {
            targetActiveOfferCount: true,
            maxNewOffersPerDay: true,
          },
        })
      : null,
  ]);

  const resolvedTypeRules = resolveMarketOfferTypeRules(typeRules);
  const resolvedPricingConfig = resolveMarketPricingConfig(
    typeRules.find((rule) => rule.offerType === MarketOrderOfferType.NORMAL)
      ?.metadata,
  );
  const resolvedScaleConfig = resolveMarketScaleConfig(
    typeRules.find((rule) => rule.offerType === MarketOrderOfferType.NORMAL)
      ?.metadata,
  );
  const resolvedStageRule = resolveMarketOfferStageRule({
    configuredRule: stageRule,
    sortOrder: input.currentStageSortOrder ?? 10,
  });

  reportInvalidMarketConfigOnce(
    `type:${input.sectorId}`,
    resolvedTypeRules.validationErrors,
  );
  reportInvalidMarketConfigOnce(
    `stage:${input.currentStageId ?? "missing"}`,
    resolvedStageRule.validationErrors,
  );
  reportInvalidMarketConfigOnce(
    `pricing:${input.sectorId}`,
    resolvedPricingConfig.validationErrors,
  );
  reportInvalidMarketConfigOnce(
    `scale:${input.sectorId}`,
    resolvedScaleConfig.validationErrors,
  );
  debugMarketConfigSources({
    pricingSource: resolvedPricingConfig.source,
    scaleSource: resolvedScaleConfig.source,
    sectorId: input.sectorId,
    stageSource: resolvedStageRule.source,
    typeSources: resolvedTypeRules.sources,
  });

  return {
    pricingConfig: resolvedPricingConfig.config,
    scaleConfig: resolvedScaleConfig.config,
    scaleConfigSource: resolvedScaleConfig.source,
    typeRules: resolvedTypeRules.rules,
    stageRule: resolvedStageRule.rule,
  };
}

function reportInvalidMarketConfigOnce(key: string, errors: string[]) {
  if (errors.length === 0 || reportedMarketConfigErrors.has(key)) return;

  reportedMarketConfigErrors.add(key);
  console.error("[market-config] Invalid DB config; using explicit fallback.", {
    errors,
    key,
  });
}

function debugMarketConfigSources(input: {
  pricingSource: "db" | "fallback";
  scaleSource: "db" | "fallback";
  sectorId: string;
  stageSource: "db" | "fallback";
  typeSources: Record<MarketOrderOfferType, "db" | "fallback">;
}) {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.MARKET_CONFIG_DEBUG !== "1"
  ) {
    return;
  }

  console.debug("[market-config] Resolved config sources.", input);
}

export function resolveMarketStageRule(input: {
  configuredRule: MarketOfferStageRule | null;
  sortOrder: number;
}): MarketOfferStageRule {
  return resolveMarketOfferStageRule(input).rule;
}

export function calculateMarketOfferCreationCount(input: {
  activeOfferCount: number;
  maxNewOffersPerDay: number;
  targetActiveOfferCount: number;
  todayOfferCount: number;
}) {
  const missingMarketSlots = Math.max(
    0,
    input.targetActiveOfferCount - input.activeOfferCount,
  );
  const dailySlots = Math.max(
    0,
    input.maxNewOffersPerDay - input.todayOfferCount,
  );

  return Math.min(missingMarketSlots, dailySlots);
}

async function fetchVirtualCustomersForFactory(input: {
  currentStageSortOrder: number | null;
  sectorId: string;
}) {
  const prisma = getPrisma();
  const customers = await prisma.virtualCustomer.findMany({
    where: {
      sectorId: input.sectorId,
      status: ContentStatus.ACTIVE,
      customerSegment: { status: ContentStatus.ACTIVE },
      customerVolumeClass: { status: ContentStatus.ACTIVE },
    },
    orderBy: [{ trustRequirementBps: "asc" }, { createdAt: "asc" }],
    include: {
      customerSegment: true,
      customerVolumeClass: true,
      minOperatingStage: { select: { sortOrder: true } },
      maxOperatingStage: { select: { sortOrder: true } },
    },
  });

  const currentStageSortOrder = input.currentStageSortOrder;

  if (currentStageSortOrder === null) return customers;

  return customers.filter((customer) => {
    const minSortOrder = customer.minOperatingStage?.sortOrder ?? null;
    const maxSortOrder = customer.maxOperatingStage?.sortOrder ?? null;

    return (
      (minSortOrder === null || minSortOrder <= currentStageSortOrder) &&
      (maxSortOrder === null || maxSortOrder >= currentStageSortOrder)
    );
  });
}

async function fetchRecentOffersForFactory(factoryId: string) {
  const prisma = getPrisma();

  return prisma.marketOrderOffer.findMany({
    where: { factoryId },
    orderBy: [{ offeredDay: "desc" }, { createdAt: "desc" }],
    take: RECENT_OFFER_LOOKBACK,
    select: {
      offerType: true,
      offeredDay: true,
      virtualCustomerId: true,
      items: {
        select: {
          productId: true,
          productTier: true,
        },
      },
    },
  });
}

async function fetchCustomerRelationshipsForFactory(
  factoryId: string,
): Promise<CustomerRelationshipById> {
  const prisma = getPrisma();
  const orders = await prisma.customerOrder.findMany({
    where: {
      factoryId,
      virtualCustomerId: { not: null },
      status: {
        in: [CustomerOrderStatus.SHIPPED, CustomerOrderStatus.DELIVERED],
      },
    },
    orderBy: [{ shippedDay: "asc" }, { createdAt: "asc" }],
    select: {
      lateDays: true,
      shippedDay: true,
      targetDeliveryDay: true,
      virtualCustomerId: true,
      customerSegment: {
        select: { metadata: true },
      },
    },
  });
  const groupedOrders = new Map<
    string,
    {
      orders: Array<{
        lateDays: number;
        shippedDay: number | null;
        targetDeliveryDay: number;
      }>;
      segmentMetadata: unknown;
    }
  >();

  for (const order of orders) {
    if (!order.virtualCustomerId) continue;

    const current = groupedOrders.get(order.virtualCustomerId);

    if (current) {
      current.orders.push({
        lateDays: order.lateDays,
        shippedDay: order.shippedDay,
        targetDeliveryDay: order.targetDeliveryDay,
      });
      current.segmentMetadata = order.customerSegment?.metadata ?? current.segmentMetadata;
    } else {
      groupedOrders.set(order.virtualCustomerId, {
        orders: [
          {
            lateDays: order.lateDays,
            shippedDay: order.shippedDay,
            targetDeliveryDay: order.targetDeliveryDay,
          },
        ],
        segmentMetadata: order.customerSegment?.metadata,
      });
    }
  }

  return new Map(
    Array.from(groupedOrders.entries()).map(([virtualCustomerId, group]) => [
      virtualCustomerId,
      buildCustomerRelationshipSummary({
        orders: group.orders,
        segmentMetadata: group.segmentMetadata,
        virtualCustomerId,
      }),
    ]),
  );
}

async function fetchQueueRows(factoryId: string) {
  const prisma = getPrisma();

  return prisma.productionOrderRouteProgress.findMany({
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
      departmentId: true,
      remainingQuantity: true,
      completedQuantity: true,
      workloadPointsPerUnit: true,
      setupPoints: true,
    },
  });
}

function calculateFactoryMonthlyExpenseCents(input: {
  factory: NonNullable<FactoryCostContext>;
  monthlyWorkDays: number;
}) {
  const departmentCostById = calculateDepartmentCostProfiles({
    lines: input.factory.productionLines,
    monthlyWorkDays: input.monthlyWorkDays,
  });
  const directLineCostCents = Array.from(
    departmentCostById.values(),
  ).reduce(
    (total, department) => total + department.monthlyDirectCostCents,
    0,
  );
  const stage = input.factory.operatingStageState?.currentStage;
  const totalProductionLineAreaM2 = input.factory.productionLines.reduce(
    (total, line) => total + line.productionLineTemplate.areaM2,
    0,
  );
  const rentPerM2Cents =
    input.factory.sector.operatingCostConfig?.rentPerM2Cents ?? 0;
  const sharedCostBreakdown = calculateSharedFactoryMonthlyCostCents({
    monthlyWorkDays: input.monthlyWorkDays,
    rentPerM2Cents,
    stage,
    supportStaffAssignments: input.factory.staffAssignments,
    totalProductionLineAreaM2,
  });
  const sharedFactoryCostCents =
    sharedCostBreakdown.sharedFactoryCostCents;
  const leasingPaymentCents = input.factory.leasingContracts.reduce(
    (total, contract) => total + Number(contract.monthlyPaymentCents),
    0,
  );

  return {
    departmentCostById,
    directLineCostCents,
    sharedFactoryCostCents,
    leasingPaymentCents,
    sharedCostBreakdown,
    totalCents:
      directLineCostCents + sharedFactoryCostCents + leasingPaymentCents,
  };
}

export function calculateSharedFactoryMonthlyCostCents(input: {
  monthlyWorkDays: number;
  rentPerM2Cents: number;
  stage: {
    accessoryWarehouseM2: number;
    canteenFixedCents: number;
    commonAreaBps: number;
    dailySupportMealPerStaffCents: number;
    fabricWarehouseM2: number;
    facilityElectricityCents: number;
    officeSocialTechnicalM2: number;
    overheadBaseCents: number;
    productWarehouseM2: number;
    staffElectricityExtraCents: number;
    supportOverheadPerStaffCents: number;
  } | null | undefined;
  supportStaffAssignments: Array<{
    quantity: number;
    staffRole: { monthlySalaryCents: number };
  }>;
  totalProductionLineAreaM2: number;
}) {
  const supportStaffCount = input.supportStaffAssignments.reduce(
    (total, assignment) => total + assignment.quantity,
    0,
  );
  const supportPayrollCents = input.supportStaffAssignments.reduce(
    (total, assignment) =>
      total + assignment.quantity * assignment.staffRole.monthlySalaryCents,
    0,
  );
  const stage = input.stage;
  const warehouseAreaM2 = stage
    ? stage.fabricWarehouseM2 +
      stage.accessoryWarehouseM2 +
      stage.productWarehouseM2
    : 0;
  const commonAreaM2 = stage
    ? Math.round(
        ((input.totalProductionLineAreaM2 + warehouseAreaM2) *
          stage.commonAreaBps) /
          10_000,
      )
    : 0;
  const nonProductionAreaM2 = stage
    ? warehouseAreaM2 + stage.officeSocialTechnicalM2 + commonAreaM2
    : 0;
  const nonProductionAreaRentCents =
    nonProductionAreaM2 * input.rentPerM2Cents;
  const facilityElectricityCents =
    (stage?.facilityElectricityCents ?? 0) +
    (stage?.staffElectricityExtraCents ?? 0);
  const supportMealCents =
    supportStaffCount *
    (stage?.dailySupportMealPerStaffCents ?? 0) *
    input.monthlyWorkDays;
  const supportOverheadCents =
    supportStaffCount * (stage?.supportOverheadPerStaffCents ?? 0);
  const fixedStageCostCents =
    (stage?.canteenFixedCents ?? 0) + (stage?.overheadBaseCents ?? 0);
  const sharedFactoryCostCents =
    supportPayrollCents +
    nonProductionAreaRentCents +
    facilityElectricityCents +
    supportMealCents +
    supportOverheadCents +
    fixedStageCostCents;

  return {
    supportStaffCount,
    supportPayrollCents,
    totalProductionLineAreaM2: input.totalProductionLineAreaM2,
    commonAreaM2,
    nonProductionAreaM2,
    nonProductionAreaRentCents,
    facilityElectricityCents,
    supportMealCents,
    supportOverheadCents,
    fixedStageCostCents,
    sharedFactoryCostCents,
  };
}

export function calculateDepartmentCostProfiles(input: {
  lines: Array<{
    departmentId: string;
    conditionBps: number;
    status: FactoryProductionLineStatus;
    productionLineTemplate: {
      dailyPointCapacity: number;
      directCostPer1000PointsCents: number;
    };
  }>;
  monthlyWorkDays: number;
}) {
  const aggregateByDepartmentId = new Map<
    string,
    {
      effectiveDailyPointCapacity: number;
      monthlyDirectCostCents: number;
    }
  >();

  for (const line of input.lines) {
    const template = line.productionLineTemplate;
    const current = aggregateByDepartmentId.get(line.departmentId) ?? {
      effectiveDailyPointCapacity: 0,
      monthlyDirectCostCents: 0,
    };
    const isAvailableForCapacity =
      line.status === FactoryProductionLineStatus.IDLE ||
      line.status === FactoryProductionLineStatus.RUNNING;
    const effectiveDailyPointCapacity = isAvailableForCapacity
      ? Math.floor(
          (template.dailyPointCapacity * Math.max(0, line.conditionBps)) /
            10_000,
        )
      : 0;
    const monthlyReferencePointCapacity =
      template.dailyPointCapacity * input.monthlyWorkDays;
    const monthlyDirectCostCents = Math.round(
      (template.directCostPer1000PointsCents *
        monthlyReferencePointCapacity) /
        1000,
    );

    aggregateByDepartmentId.set(line.departmentId, {
      effectiveDailyPointCapacity:
        current.effectiveDailyPointCapacity +
        Math.max(0, effectiveDailyPointCapacity),
      monthlyDirectCostCents:
        current.monthlyDirectCostCents +
        Math.max(0, monthlyDirectCostCents),
    });
  }

  return new Map<string, DepartmentCostProfile>(
    Array.from(
      aggregateByDepartmentId,
      ([departmentId, department]) => {
        const monthlyEffectivePointCapacity =
          department.effectiveDailyPointCapacity *
          Math.max(1, input.monthlyWorkDays);

        return [
          departmentId,
          {
            departmentId,
            effectiveDailyPointCapacity:
              department.effectiveDailyPointCapacity,
            monthlyDirectCostCents: department.monthlyDirectCostCents,
            costPer1000PointsCents:
              monthlyEffectivePointCapacity > 0
                ? Math.ceil(
                    (department.monthlyDirectCostCents * 1000) /
                      monthlyEffectivePointCapacity,
                  )
                : 0,
          },
        ];
      },
    ),
  );
}

function pickOfferTypeRule(input: {
  createdOfferTypeCounts: Map<MarketOrderOfferType, number>;
  currentDay: number;
  recentOffers: RecentOfferForPenalty[];
  repeatCustomerIds: Set<string>;
  rules: MarketOfferTypeRule[];
  seed: string;
}) {
  const eligibleRules = input.rules.filter((rule) => {
    if (
      rule.offerType === MarketOrderOfferType.REPEAT &&
      input.repeatCustomerIds.size === 0
    ) {
      return false;
    }

    if (
      rule.offerType !== MarketOrderOfferType.NORMAL &&
      (input.createdOfferTypeCounts.get(rule.offerType) ?? 0) > 0
    ) {
      return false;
    }

    const lastOfferDay = input.recentOffers.find(
      (offer) => offer.offerType === rule.offerType,
    )?.offeredDay;

    return (
      lastOfferDay === undefined ||
      input.currentDay - lastOfferDay >= rule.minimumIntervalDays
    );
  });
  const candidates = eligibleRules.length > 0 ? eligibleRules : input.rules;

  return pickWeighted(candidates, input.seed, (rule) => rule.generationWeightBps);
}

function pickCustomerForOffer(input: {
  activeProductionLineCount: number;
  customerRelationshipById: CustomerRelationshipById;
  customers: VirtualCustomerForOffer[];
  customerRecentCounts: Map<string, number>;
  marketScaleConfig: MarketScaleConfig;
  offerType: MarketOrderOfferType;
  repeatCustomerIds: Set<string>;
  seed: string;
  usedCustomerIds: Map<string, number>;
}) {
  const typeEligibleCustomers =
    input.offerType === MarketOrderOfferType.REPEAT
      ? input.customers.filter((customer) => input.repeatCustomerIds.has(customer.id))
      : input.customers;

  return pickWeighted(typeEligibleCustomers, input.seed, (customer) => {
    const recentPenalty = input.customerRecentCounts.get(customer.id) ?? 0;
    const batchPenalty = input.usedCustomerIds.get(customer.id) ?? 0;
    const relationship = input.customerRelationshipById.get(customer.id) ?? null;
    const trustWeight = Math.max(100, 10_000 - customer.trustRequirementBps);
    const offerWeight = readPositiveNumber(
      isRecord(customer.metadata) ? customer.metadata.offerWeight : null,
    ) ?? 100;
    const baseWeight = Math.round(
      (trustWeight * offerWeight) /
        100 /
        (1 + recentPenalty * 0.75 + batchPenalty * 3),
    );
    const factoryScaledWeight = calculateFactoryScaledCustomerWeight({
      activeProductionLineCount: input.activeProductionLineCount,
      baseWeight,
      marketScaleConfig: input.marketScaleConfig,
      volumeClassKey: customer.customerVolumeClass.key,
    });

    return calculateCustomerSelectionWeight({
      baseWeight: factoryScaledWeight,
      offerType: input.offerType,
      relationship,
    });
  });
}

export function pickProductTierForOffer(input: {
  activeTierCounts: Map<ProductTier, number>;
  candidates: Array<{ tier: ProductTier }>;
  customers: Array<{ productTier: ProductTier }>;
  seed: string;
  usedTierCounts: Map<ProductTier, number>;
}) {
  const candidateTiers = new Set(input.candidates.map((candidate) => candidate.tier));
  const customerTiers = new Set(
    input.customers.map((customer) => customer.productTier),
  );
  const eligibleTiers = PRODUCT_TIER_ORDER.filter(
    (tier) => candidateTiers.has(tier) && customerTiers.has(tier),
  );

  if (eligibleTiers.length === 0) return null;

  const smallestPoolCount = Math.min(
    ...eligibleTiers.map(
      (tier) =>
        (input.activeTierCounts.get(tier) ?? 0) +
        (input.usedTierCounts.get(tier) ?? 0),
    ),
  );
  const leastRepresentedTiers = eligibleTiers.filter(
    (tier) =>
      (input.activeTierCounts.get(tier) ?? 0) +
        (input.usedTierCounts.get(tier) ?? 0) ===
      smallestPoolCount,
  );

  return pickWeighted(leastRepresentedTiers, input.seed, () => 1);
}

function pickProductsForOffer(input: {
  candidates: OrderProductCandidate[];
  customer: VirtualCustomerForOffer;
  factoryScaleBand: FactoryScaleBand;
  productRecentCounts: Map<string, number>;
  seed: string;
  tierRecentCounts: Map<ProductTier, number>;
  usedProductIds: Map<string, number>;
  usedTierCounts: Map<ProductTier, number>;
}) {
  const tierCandidates = input.candidates.filter(
    (candidate) => candidate.tier === input.customer.productTier,
  );
  const itemCountRange = resolveOfferItemCountRange({
    configuredMax: input.customer.customerVolumeClass.itemCountMax,
    configuredMin: input.customer.customerVolumeClass.itemCountMin,
    factoryScaleBand: input.factoryScaleBand,
    volumeClassKey: input.customer.customerVolumeClass.key,
  });
  const requestedItemCount = seededInt({
    min: itemCountRange.min,
    max: itemCountRange.max,
    seed: `${input.seed}:item-count`,
  });
  const minimumItemCount = itemCountRange.min;
  const targetItemCount = Math.max(minimumItemCount, requestedItemCount);
  const selectedProducts: OrderProductCandidate[] = [];
  const selectedProductIds = new Set<string>();

  for (let index = 0; index < targetItemCount; index += 1) {
    const compatibleCandidates = filterCollectionCompatibleCandidates(
      tierCandidates,
      selectedProducts.map((product) => product.tier),
    );

    if (compatibleCandidates.length === 0) break;

    const product = pickProductForOffer({
      candidates: compatibleCandidates,
      customer: input.customer,
      excludedProductIds: selectedProductIds,
      productRecentCounts: input.productRecentCounts,
      seed: `${input.seed}:${index}`,
      tierRecentCounts: input.tierRecentCounts,
      usedProductIds: input.usedProductIds,
      usedTierCounts: input.usedTierCounts,
    });

    if (!product) break;

    selectedProducts.push(product);
    selectedProductIds.add(product.productId);
  }

  if (selectedProducts.length < minimumItemCount) return [];

  return selectedProducts;
}

export function filterCollectionCompatibleCandidates<
  T extends { tier: ProductTier },
>(candidates: T[], selectedTiers: ProductTier[]) {
  if (selectedTiers.length === 0) return candidates;

  return candidates.filter((candidate) =>
    selectedTiers.every((selectedTier) =>
      areCollectionTiersCompatible(selectedTier, candidate.tier),
    ),
  );
}

export function areCollectionTiersCompatible(
  firstTier: ProductTier,
  secondTier: ProductTier,
) {
  return firstTier === secondTier;
}

function pickProductForOffer(input: {
  candidates: OrderProductCandidate[];
  customer: VirtualCustomerForOffer;
  excludedProductIds: Set<string>;
  productRecentCounts: Map<string, number>;
  seed: string;
  tierRecentCounts: Map<ProductTier, number>;
  usedProductIds: Map<string, number>;
  usedTierCounts: Map<ProductTier, number>;
}) {
  const categoryWeights = readWeightMap(
    input.customer.customerSegment.categoryWeights,
  );
  const unselectedCandidates = input.candidates.filter(
    (candidate) => !input.excludedProductIds.has(candidate.productId),
  );
  const candidates =
    input.usedProductIds.size < input.candidates.length
      ? unselectedCandidates.filter(
          (candidate) => !input.usedProductIds.has(candidate.productId),
        )
      : unselectedCandidates;

  return pickWeighted(candidates, input.seed, (candidate) => {
    const categoryWeight =
      categoryWeights.get(candidate.categoryKey) ??
      categoryWeights.get(candidate.productTypeKey) ??
      10_000;
    if (categoryWeight <= 0) return 0;
    const productRecentPenalty =
      input.productRecentCounts.get(candidate.productId) ?? 0;
    const productBatchPenalty = input.usedProductIds.get(candidate.productId) ?? 0;
    const tierRecentPenalty = input.tierRecentCounts.get(candidate.tier) ?? 0;
    const tierBatchPenalty = input.usedTierCounts.get(candidate.tier) ?? 0;
    const capacityWeight = Math.min(
      30_000,
      Math.max(1_000, candidate.bottleneckDailyQuantity),
    );
    const rawWeight =
      (categoryWeight * capacityWeight) / 10_000;

    return Math.max(
      1,
      Math.round(
        rawWeight /
          (1 +
            productRecentPenalty * 1.5 +
            productBatchPenalty * 6 +
            tierRecentPenalty * 0.35 +
            tierBatchPenalty * 2),
      ),
    );
  });
}

function buildPlannedOffer(input: {
  activeProductionLineCount: number;
  currentDay: number;
  customer: VirtualCustomerForOffer;
  customerRelationship: CustomerRelationshipSummary | null;
  departmentCapacityById: Map<string, DepartmentDailyCapacity>;
  existingWorkPointsByDepartmentId: Map<string, number>;
  factoryScaleBand: FactoryScaleBand;
  factoryExpenseBreakdown: ReturnType<typeof calculateFactoryMonthlyExpenseCents>;
  factoryId: string;
  monthlyWorkDays: number;
  marketScaleConfig: MarketScaleConfig;
  marketScaleConfigSource: "db" | "fallback";
  offerNo: string;
  offerTypeRule: MarketOfferTypeRule;
  pricingConfig: MarketPricingConfig;
  productTier: ProductTier;
  products: OrderProductCandidate[];
  seed: string;
}): Prisma.MarketOrderOfferCreateInput | null {
  const primaryProduct = input.products[0];

  if (!primaryProduct) return null;
  if (
    input.customer.productTier !== input.productTier ||
    input.products.some((product) => product.tier !== input.productTier)
  ) {
    return null;
  }

  const targetLoadProfile = resolveOfferLoadProfile({
    maxOfferLoadBps: input.customer.customerVolumeClass.maxOfferLoadBps,
    offerType: input.offerTypeRule.offerType,
    primaryTier: primaryProduct.tier,
    quantityMultiplierBps:
      input.customer.customerVolumeClass.quantityMultiplierBps,
    seed: `${input.seed}:target-load`,
    targetProductionDayMax:
      input.customer.customerVolumeClass.targetProductionDayMax,
    targetProductionDayMin:
      input.customer.customerVolumeClass.targetProductionDayMin,
    volumeClassKey: input.customer.customerVolumeClass.key,
  });
  const priceBand = resolveOfferPriceBand(
    input.offerTypeRule.offerType,
    {
      maxBps: input.offerTypeRule.priceMultiplierMaxBps,
      minBps: input.offerTypeRule.priceMultiplierMinBps,
    },
  );
  const typePriceMultiplierBps = seededInt({
    max: priceBand.maxBps,
    min: priceBand.minBps,
    seed: `${input.seed}:type-price`,
  });
  const itemPlans = buildItemPlans({
    customer: input.customer,
    factoryExpenseBreakdown: input.factoryExpenseBreakdown,
    monthlyWorkDays: input.monthlyWorkDays,
    pricingConfig: input.pricingConfig,
    products: input.products,
    seed: input.seed,
    targetLoadDaysBps: targetLoadProfile.targetLoadDaysBps,
    typePriceMultiplierBps,
  });

  if (itemPlans.length === 0) return null;

  const isCollection = itemPlans.length > 1;
  const tierRange = summarizeItemTierRange(itemPlans);
  const departmentLoads = calculateDepartmentLoads({
    departmentCapacityById: input.departmentCapacityById,
    existingWorkPointsByDepartmentId: input.existingWorkPointsByDepartmentId,
    itemPlans,
  });
  const targetDeliveryDays = calculateTargetDeliveryDays({
    customer: input.customer,
    isCollection,
    isLargeBasicBlock: targetLoadProfile.isLargeBasicBlock,
    rule: input.offerTypeRule,
    seed: `${input.seed}:delivery`,
  });
  const maxQueueAfterAcceptDays = Math.max(
    0,
    ...departmentLoads.map((load) => load.queueAfterAcceptDays),
  );
  const outsourcedLeadDays = Math.max(
    0,
    ...itemPlans.map((item) => item.product.estimatedOutsourceLeadDays),
  );
  const predictedCompletionDays =
    MATERIAL_READY_DAYS + maxQueueAfterAcceptDays + outsourcedLeadDays;
  const capacityRiskBps = Math.max(
    0,
    Math.max(0, ...departmentLoads.map((load) => load.loadAfterAcceptBps)) -
      7000,
  );
  const deliveryRiskBps = calculateDeliveryRiskBps({
    predictedCompletionDays,
    targetDeliveryDays,
  });
  const totalQuantity = itemPlans.reduce((total, item) => total + item.quantity, 0);
  const totalRevenueCents = itemPlans.reduce(
    (total, item) => total + item.totalPriceCents,
    BigInt(0),
  );
  const estimatedProfitCents = itemPlans.reduce(
    (total, item) => total + item.estimatedProfitCents,
    BigInt(0),
  );
  const requiredTotalPoints = itemPlans.reduce(
    (total, item) => total + item.requiredTotalPoints,
    0,
  );
  const estimatedLoadDaysBps = Math.max(
    0,
    ...departmentLoads.map((load) => load.ownLoadBps),
  );
  const complexityRiskBps = itemPlans.reduce(
    (total, item) => total + getTierComplexityRiskBps(item.product.tier),
    0,
  );
  const qualityRiskBps = itemPlans.reduce(
    (total, item) =>
      total +
      getTierQualityRiskBps(item.product.tier) +
      Math.max(0, input.customer.customerSegment.qualityExpectationBps - 8500) +
      (item.product.requiresOutsource ? 500 : 0),
    0,
  );
  const marketPricingMetadata = buildMarketPricingMetadata({
    config: input.pricingConfig,
    quantityPriceMultiplierBps:
      itemPlans[0]?.quantityPriceMultiplierBps ?? 10_000,
    totalOfferQuantity: totalQuantity,
    typePriceMultiplierBps,
  });
  const marketScaleWeightBps = calculateMarketScaleWeightBps({
    activeProductionLineCount: input.activeProductionLineCount,
    config: input.marketScaleConfig,
    volumeClassKey: input.customer.customerVolumeClass.key,
  });

  return {
    sector: { connect: { id: input.customer.sectorId } },
    factory: { connect: { id: input.factoryId } },
    virtualCustomer: { connect: { id: input.customer.id } },
    customerSegment: { connect: { id: input.customer.customerSegmentId } },
    customerVolumeClass: {
      connect: { id: input.customer.customerVolumeClassId },
    },
    offerType: input.offerTypeRule.offerType,
    productTier: input.productTier,
    offerNo: input.offerNo,
    offeredDay: input.currentDay,
    expiresDay: input.currentDay + input.offerTypeRule.offerExpiryDays,
    targetDeliveryDays,
    targetDeliveryDay: input.currentDay + targetDeliveryDays,
    totalQuantity,
    totalRevenueCents,
    estimatedProfitCents,
    requiredTotalPoints,
    estimatedLoadDaysBps,
    capacityRiskBps,
    deliveryRiskBps,
    complexityRiskBps,
    qualityRiskBps,
    status: MarketOrderOfferStatus.AVAILABLE,
    departmentLoadSnapshot: buildDepartmentLoadSnapshot({
      departmentLoads,
      itemPlans,
      predictedCompletionDays,
      targetDeliveryDays,
    }),
    metadata: {
      ...marketPricingMetadata,
      generator: "product_tier_market_v5",
      activeProductionLineCount: input.activeProductionLineCount,
      factoryScaleBand: input.factoryScaleBand,
      marketScaleBalanceVersion: MARKET_SCALE_BALANCE_VERSION,
      marketScaleConfigSource: input.marketScaleConfigSource,
      marketScaleModel: input.marketScaleConfig.model,
      marketScaleWeightBps,
      marketOfferPolicyVersion: MARKET_OFFER_POLICY_VERSION,
      isCollection,
      isLargeBasicBlock: targetLoadProfile.isLargeBasicBlock,
      tierRange,
      offerType: input.offerTypeRule.offerType,
      productTier: input.productTier,
      targetLoadDayMaxBps: targetLoadProfile.targetLoadDayMaxBps,
      targetLoadDayMinBps: targetLoadProfile.targetLoadDayMinBps,
      targetLoadDaysBps: targetLoadProfile.targetLoadDaysBps,
      targetProductionDays: Math.ceil(targetLoadProfile.targetLoadDaysBps / DAY_BPS),
      predictedCompletionDays,
      materialReadyDays: MATERIAL_READY_DAYS,
      outsourcedLeadDays,
      factoryMonthlyExpenseCents: input.factoryExpenseBreakdown.totalCents,
      customerRelationship: buildCustomerRelationshipMetadata(
        input.customerRelationship,
      ),
      monthlyDirectLineCostCents: input.factoryExpenseBreakdown.directLineCostCents,
      monthlyLeasingPaymentCents: input.factoryExpenseBreakdown.leasingPaymentCents,
      monthlySharedFactoryCostCents:
        input.factoryExpenseBreakdown.sharedFactoryCostCents,
      sharedFactoryCostBreakdown:
        input.factoryExpenseBreakdown.sharedCostBreakdown,
      monthlyWorkDays: input.monthlyWorkDays,
    },
    items: {
      create: itemPlans.map((item, index) => ({
        product: { connect: { id: item.product.productId } },
        productTier: item.product.tier,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        totalPriceCents: item.totalPriceCents,
        estimatedUnitCostCents: item.estimatedUnitCostCents,
        estimatedProfitCents: item.estimatedProfitCents,
        requiredTotalPoints: item.requiredTotalPoints,
        bottleneckDepartment: {
          connect: { id: item.product.bottleneckDepartmentId },
        },
        estimatedLoadDaysBps: item.estimatedLoadDaysBps,
        sortOrder: index,
        pricingSnapshot: {
          ...marketPricingMetadata,
          baseUnitPriceCents: item.product.baseUnitPriceCents,
          estimatedOutsourceUnitCostCents:
            item.product.estimatedOutsourceUnitCostCents,
          estimatedUnitCostCents: item.estimatedUnitCostCents,
          directRouteUnitCostCents:
            item.plannedCostBreakdown.directRouteUnitCostCents,
          setupUnitCostCents:
            item.plannedCostBreakdown.setupUnitCostCents,
          sharedFactoryUnitCostCents:
            item.plannedCostBreakdown.sharedFactoryUnitCostCents,
          leasingUnitCostCents:
            item.plannedCostBreakdown.leasingUnitCostCents,
          referenceMonthlyQuantity:
            item.plannedCostBreakdown.referenceMonthlyQuantity,
          factoryMonthlyExpenseCents: input.factoryExpenseBreakdown.totalCents,
          allocatedRawQuantity:
            item.quantityPolicy.allocatedRawQuantity,
          baseTierQuantityCapMax:
            item.quantityPolicy.baseTierCapMax,
          capacityTargetQuantity:
            item.quantityPolicy.capacityTargetQuantity,
          dynamicTierQuantityCapMax:
            item.quantityPolicy.dynamicTierCapMax,
          effectiveTierQuantityCapMax:
            item.quantityPolicy.effectiveTierCapMax,
          globalTierQuantityCapMax:
            item.quantityPolicy.globalTierCapMax,
          marketOfferPolicyVersion: MARKET_OFFER_POLICY_VERSION,
          monthlyWorkDays: input.monthlyWorkDays,
          offerType: input.offerTypeRule.offerType,
          productTier: item.product.tier,
          quantity: item.quantity,
          targetLoadDaysBps: targetLoadProfile.targetLoadDaysBps,
          targetProductionDays: Math.ceil(
            targetLoadProfile.targetLoadDaysBps / DAY_BPS,
          ),
          unitPriceCents: item.unitPriceCents,
          tierQuantityCapMax: item.tierCap.max,
          tierQuantityCapMin: item.tierCap.min,
        },
        metadata: {
          balanceVersion: MARKET_OFFER_BALANCE_VERSION,
          generator: "product_tier_market_v5",
          factoryScaleBand: input.factoryScaleBand,
          marketScaleBalanceVersion: MARKET_SCALE_BALANCE_VERSION,
          marketScaleWeightBps,
          marketOfferPolicyVersion: MARKET_OFFER_POLICY_VERSION,
          requiresOutsource: item.product.requiresOutsource,
          estimatedOutsourceLeadDays: item.product.estimatedOutsourceLeadDays,
          estimatedOutsourceUnitCostCents:
            item.product.estimatedOutsourceUnitCostCents,
        },
        colors: {
          create: item.colors.map((color, colorIndex) => ({
            colorVariant: { connect: { id: color.colorVariantId } },
            quantity: color.quantity,
            sortOrder: colorIndex,
            metadata: {
              sourceWeightBps: color.selectionWeightBps,
            },
          })),
        },
      })),
    },
  };
}

export function resolveOfferLoadProfile(input: {
  maxOfferLoadBps: number;
  offerType: MarketOrderOfferType;
  primaryTier: ProductTier;
  quantityMultiplierBps: number;
  seed: string;
  targetProductionDayMax: number;
  targetProductionDayMin: number;
  volumeClassKey: string;
}): OfferLoadProfile {
  const baseRange = getTargetLoadRange(input.offerType, input.primaryTier);
  const configuredRange = {
    maxBps:
      Math.max(input.targetProductionDayMin, input.targetProductionDayMax) *
      DAY_BPS,
    minBps: Math.max(1, input.targetProductionDayMin) * DAY_BPS,
  };
  const usesScalableCustomerRange =
    (input.offerType === MarketOrderOfferType.NORMAL ||
      input.offerType === MarketOrderOfferType.REPEAT) &&
    SCALABLE_VOLUME_CLASS_KEYS.has(input.volumeClassKey);
  const isLargeBasicBlock = shouldCreateBasicLargeBlock(input);
  const selectedRange = isLargeBasicBlock
    ? BASIC_LARGE_BLOCK_LOAD_RANGE
    : usesScalableCustomerRange
      ? configuredRange
      : baseRange;
  const volumeReferenceDays = seededInt({
    max: Math.max(input.targetProductionDayMin, input.targetProductionDayMax),
    min: Math.max(1, input.targetProductionDayMin),
    seed: `${input.seed}:volume-days`,
  });
  const seededProfileBps = seededInt({
    max: selectedRange.maxBps,
    min: selectedRange.minBps,
    seed: `${input.seed}:profile-days`,
  });
  const quantityPressureBps = clamp(input.quantityMultiplierBps, 7_500, 13_000);
  const volumeReferenceBps = volumeReferenceDays * DAY_BPS;
  const blendedLoadBps = Math.round(
    ((seededProfileBps * 2 + volumeReferenceBps) / 3 *
      quantityPressureBps) /
      DAY_BPS,
  );
  const horizonCapBps = Math.max(
    DAY_BPS,
    Math.floor(
      (DELIVERY_CAPACITY_HORIZON_DAYS *
        DAY_BPS *
        Math.max(1, input.maxOfferLoadBps)) /
        DAY_BPS,
    ),
  );
  const targetLoadDaysBps = clamp(
    blendedLoadBps,
    selectedRange.minBps,
    Math.max(selectedRange.minBps, Math.min(selectedRange.maxBps, horizonCapBps)),
  );

  return {
    isLargeBasicBlock,
    targetLoadDayMaxBps: selectedRange.maxBps,
    targetLoadDayMinBps: selectedRange.minBps,
    targetLoadDaysBps,
    volumeReferenceDays,
  };
}

function getTargetLoadRange(
  offerType: MarketOrderOfferType,
  tier: ProductTier,
) {
  return TARGET_LOAD_RANGES[offerType]?.[tier] ?? TARGET_LOAD_RANGES.NORMAL[tier];
}

function shouldCreateBasicLargeBlock(input: {
  offerType: MarketOrderOfferType;
  primaryTier: ProductTier;
  quantityMultiplierBps: number;
  seed: string;
  volumeClassKey: string;
}) {
  if (
    input.offerType !== MarketOrderOfferType.NORMAL ||
    input.primaryTier !== "BASIC"
  ) {
    return false;
  }

  const chanceBps = getBasicLargeBlockChanceBps({
    quantityMultiplierBps: input.quantityMultiplierBps,
    volumeClassKey: input.volumeClassKey,
  });

  return (
    seededInt({ max: DAY_BPS, min: 1, seed: `${input.seed}:large-block` }) <=
    chanceBps
  );
}

function getBasicLargeBlockChanceBps(input: {
  quantityMultiplierBps: number;
  volumeClassKey: string;
}) {
  const configuredChance: Record<string, number> = {
    capsule_collection: 900,
    large_retail: 2600,
    mass_distribution: 3800,
    regular: 1200,
    small_batch: 400,
  };
  const baseChance = configuredChance[input.volumeClassKey] ?? 900;
  const multiplierBonus = clamp(
    Math.round((input.quantityMultiplierBps - DAY_BPS) / 5),
    0,
    1800,
  );

  return clamp(baseChance + multiplierBonus, 200, 5000);
}

export function resolveOfferPriceBand(
  offerType: MarketOrderOfferType,
  configuredBand?: { minBps: number; maxBps: number },
) {
  return resolveMarketOfferPriceBand({ configuredBand, offerType }).band;
}

export function buildMarketPricingMetadata(input: {
  config: MarketPricingConfig;
  quantityPriceMultiplierBps: number;
  totalOfferQuantity: number;
  typePriceMultiplierBps: number;
}) {
  return {
    balanceVersion: MARKET_OFFER_BALANCE_VERSION,
    pricingBalanceVersion: MARKET_PRICING_BALANCE_VERSION,
    pricingModel: input.config.model,
    quantityPriceMultiplierBps: input.quantityPriceMultiplierBps,
    roundingMode: "HALF_UP_SINGLE_COMPOUND_INTEGER",
    segmentPriceMultiplierMode: input.config.segmentPriceMultiplierMode,
    totalOfferQuantity: input.totalOfferQuantity,
    typePriceMultiplierBps: input.typePriceMultiplierBps,
    volumePriceMultiplierMode: input.config.volumePriceMultiplierMode,
  } as const;
}

export function calculateOfferUnitPriceCents(input: {
  baseUnitPriceCents: number;
  quantityPriceMultiplierBps: number;
  typePriceMultiplierBps: number;
}) {
  const numerator =
    BigInt(input.baseUnitPriceCents) *
    BigInt(input.typePriceMultiplierBps) *
    BigInt(input.quantityPriceMultiplierBps);
  const denominator = BigInt(100_000_000);

  return Math.max(
    1,
    Number((numerator + denominator / BigInt(2)) / denominator),
  );
}

export function calculatePlannedUnitCostCents(input: {
  bottleneckDailyQuantity: number;
  departmentCostById: ReadonlyMap<string, DepartmentCostProfile>;
  leasingPaymentCents: number;
  monthlySharedFactoryCostCents: number;
  monthlyWorkDays: number;
  outsourceUnitCostCents: number;
  quantity: number;
  routeSteps: Array<{
    departmentDailyPointCapacity: number;
    departmentId: string;
    isRequired: boolean;
    setupPoints: number;
    workloadPointsPerUnit: number;
  }>;
}): PlannedUnitCostBreakdown | null {
  const quantity = Math.max(1, input.quantity);
  let directRouteCostPer1000Numerator = 0;
  let setupCostPer1000Numerator = 0;

  for (const step of input.routeSteps) {
    if (!step.isRequired || step.departmentDailyPointCapacity <= 0) continue;

    const departmentCost = input.departmentCostById.get(step.departmentId);

    if (
      !departmentCost ||
      departmentCost.effectiveDailyPointCapacity <= 0
    ) {
      return null;
    }

    directRouteCostPer1000Numerator +=
      Math.max(0, step.workloadPointsPerUnit) *
      departmentCost.costPer1000PointsCents;
    setupCostPer1000Numerator +=
      Math.max(0, step.setupPoints) *
      departmentCost.costPer1000PointsCents;
  }

  const referenceMonthlyQuantity =
    Math.max(0, input.bottleneckDailyQuantity) *
    Math.max(1, input.monthlyWorkDays);

  if (referenceMonthlyQuantity <= 0) return null;

  const directRouteUnitCostCents = Math.ceil(
    directRouteCostPer1000Numerator / 1000,
  );
  const setupUnitCostCents = Math.ceil(
    setupCostPer1000Numerator / (1000 * quantity),
  );
  const sharedFactoryUnitCostCents = Math.ceil(
    Math.max(0, input.monthlySharedFactoryCostCents) /
      referenceMonthlyQuantity,
  );
  const leasingUnitCostCents = Math.ceil(
    Math.max(0, input.leasingPaymentCents) / referenceMonthlyQuantity,
  );
  const outsourceUnitCostCents = Math.max(
    0,
    input.outsourceUnitCostCents,
  );

  return {
    directRouteUnitCostCents,
    setupUnitCostCents,
    sharedFactoryUnitCostCents,
    leasingUnitCostCents,
    outsourceUnitCostCents,
    referenceMonthlyQuantity,
    totalUnitCostCents:
      directRouteUnitCostCents +
      setupUnitCostCents +
      sharedFactoryUnitCostCents +
      leasingUnitCostCents +
      outsourceUnitCostCents,
  };
}

function buildItemPlans(input: {
  customer: VirtualCustomerForOffer;
  factoryExpenseBreakdown: ReturnType<typeof calculateFactoryMonthlyExpenseCents>;
  monthlyWorkDays: number;
  pricingConfig: MarketPricingConfig;
  products: OrderProductCandidate[];
  seed: string;
  targetLoadDaysBps: number;
  typePriceMultiplierBps: number;
}): PlannedOfferItem[] {
  const primaryProduct = input.products[0];

  if (!primaryProduct) return [];

  const capacityBudgetPoints = Math.floor(
    (primaryProduct.bottleneckDailyQuantity *
      primaryProduct.requiredPointsPerUnit *
      input.targetLoadDaysBps) /
      DAY_BPS,
  );
  const shareWeights = input.products.map((product, index) => ({
    product,
    weight: seededInt({
      min: 8500,
      max: 11500,
      seed: `${input.seed}:item-share:${index}`,
    }),
  }));
  const totalShareWeight = shareWeights.reduce(
    (total, entry) => total + entry.weight,
    0,
  );

  const quantityPlans = shareWeights.flatMap(({ product, weight }, index) => {
    const tierCap = getTierQuantityCap(
      input.customer.customerVolumeClass.tierQuantityCaps,
      product.tier,
    );
    const allocatedPoints = Math.floor(
      (capacityBudgetPoints * weight) / Math.max(1, totalShareWeight),
    );
    const rawQuantity = Math.floor(
      allocatedPoints / Math.max(1, product.requiredPointsPerUnit),
    );
    const quantityPolicy = calculatePlannedItemQuantity({
      allocatedRawQuantity: rawQuantity,
      baseTierCapMax: tierCap.max,
      bottleneckDailyQuantity: product.bottleneckDailyQuantity,
      productTier: product.tier,
      targetLoadDaysBps: input.targetLoadDaysBps,
      tierCapMin: tierCap.min,
      volumeClassKey: input.customer.customerVolumeClass.key,
    });
    const quantity = quantityPolicy.quantity;

    if (quantity <= 0) return [];

    return [{ index, product, quantity, quantityPolicy, tierCap }];
  });
  const costedQuantityPlans = quantityPlans.flatMap((plan) => {
    const plannedCostBreakdown = calculatePlannedUnitCostCents({
      bottleneckDailyQuantity: plan.product.bottleneckDailyQuantity,
      departmentCostById: input.factoryExpenseBreakdown.departmentCostById,
      leasingPaymentCents: input.factoryExpenseBreakdown.leasingPaymentCents,
      monthlySharedFactoryCostCents:
        input.factoryExpenseBreakdown.sharedFactoryCostCents,
      monthlyWorkDays: input.monthlyWorkDays,
      outsourceUnitCostCents: plan.product.estimatedOutsourceUnitCostCents,
      quantity: plan.quantity,
      routeSteps: plan.product.routeSteps,
    });

    return plannedCostBreakdown ? [{ ...plan, plannedCostBreakdown }] : [];
  });
  const totalOfferQuantity = costedQuantityPlans.reduce(
    (total, plan) => total + plan.quantity,
    0,
  );
  const quantityPriceMultiplierBps = calculateQuantityPriceMultiplierBps({
    config: input.pricingConfig,
    totalOfferQuantity,
  });

  return costedQuantityPlans.map(
    ({
      index,
      plannedCostBreakdown,
      product,
      quantity,
      quantityPolicy,
      tierCap,
    }) => {
      const unitPriceCents = calculateOfferUnitPriceCents({
        baseUnitPriceCents: product.baseUnitPriceCents,
        quantityPriceMultiplierBps,
        typePriceMultiplierBps: input.typePriceMultiplierBps,
      });
      const estimatedUnitCostCents =
        plannedCostBreakdown.totalUnitCostCents;
      const totalPriceCents = BigInt(unitPriceCents) * BigInt(quantity);
      const estimatedProfitCents =
        BigInt(unitPriceCents - estimatedUnitCostCents) * BigInt(quantity);
      const requiredTotalPoints = product.requiredPointsPerUnit * quantity;
      const estimatedLoadDaysBps = Math.ceil(
        (quantity * 10_000) / Math.max(1, product.bottleneckDailyQuantity),
      );
      const colors = distributeColorQuantities({
        colors: pickOfferColors({
          product,
          quantity,
          seed: `${input.seed}:colors:${index}`,
        }),
        quantity,
      });

      return {
        product,
        quantity,
        quantityPriceMultiplierBps,
        unitPriceCents,
        totalPriceCents,
        estimatedUnitCostCents,
        estimatedProfitCents,
        plannedCostBreakdown,
        requiredTotalPoints,
        estimatedLoadDaysBps,
        colors,
        tierCap,
        quantityPolicy,
      };
    },
  );
}

export function calculatePlannedItemQuantity(input: {
  allocatedRawQuantity: number;
  baseTierCapMax: number;
  bottleneckDailyQuantity: number;
  productTier: ProductTier;
  targetLoadDaysBps: number;
  tierCapMin: number;
  volumeClassKey: string;
}): PlannedItemQuantity {
  const maxLoadQuantity = calculateCapacityTargetQuantity({
    bottleneckDailyQuantity: input.bottleneckDailyQuantity,
    targetLoadDaysBps: input.targetLoadDaysBps,
  });
  const capacityTargetQuantity = Math.max(
    1,
    Math.min(maxLoadQuantity, Math.max(1, input.allocatedRawQuantity)),
  );
  const quantityCaps = calculateDynamicTierQuantityCap({
    baseTierCapMax: input.baseTierCapMax,
    capacityTargetQuantity,
    productTier: input.productTier,
    volumeClassKey: input.volumeClassKey,
  });
  const cappedMaxQuantity = Math.max(
    1,
    Math.min(capacityTargetQuantity, quantityCaps.effectiveTierCapMax),
  );
  const roundedMaxQuantity = roundOrderQuantityDown(cappedMaxQuantity);
  const cappedMinQuantity = Math.max(
    1,
    Math.min(input.tierCapMin, roundedMaxQuantity),
  );

  return {
    allocatedRawQuantity: Math.max(1, input.allocatedRawQuantity),
    baseTierCapMax: Math.max(1, input.baseTierCapMax),
    capacityTargetQuantity,
    ...quantityCaps,
    quantity: clamp(
      roundOrderQuantity(capacityTargetQuantity),
      cappedMinQuantity,
      roundedMaxQuantity,
    ),
  };
}

export function calculateDynamicTierQuantityCap(input: {
  baseTierCapMax: number;
  capacityTargetQuantity: number;
  productTier: ProductTier;
  volumeClassKey: string;
}) {
  const baseTierCapMax = Math.max(1, input.baseTierCapMax);
  const capacityTargetQuantity = Math.max(1, input.capacityTargetQuantity);
  const globalTierCapMax = GLOBAL_TIER_QUANTITY_CAPS[input.productTier];
  const dynamicTierCapMax = SCALABLE_VOLUME_CLASS_KEYS.has(
    input.volumeClassKey,
  )
    // Geometric growth lets large factories move beyond catalog caps gradually.
    ? roundOrderQuantityDown(
        Math.floor(Math.sqrt(baseTierCapMax * capacityTargetQuantity)),
      )
    : baseTierCapMax;

  return {
    dynamicTierCapMax,
    effectiveTierCapMax: Math.min(
      globalTierCapMax,
      Math.max(baseTierCapMax, dynamicTierCapMax),
    ),
    globalTierCapMax,
  };
}

export function calculateCapacityTargetQuantity(input: {
  bottleneckDailyQuantity: number;
  targetLoadDaysBps: number;
}) {
  return Math.max(
    1,
    Math.floor(
      (Math.max(1, input.bottleneckDailyQuantity) * input.targetLoadDaysBps) /
        DAY_BPS,
    ),
  );
}

function summarizeItemTierRange(itemPlans: PlannedOfferItem[]) {
  const tiers = itemPlans
    .map((item) => item.product.tier)
    .sort((first, second) => PRODUCT_TIER_RANK[first] - PRODUCT_TIER_RANK[second]);
  const firstTier = tiers.at(0) ?? null;
  const lastTier = tiers.at(-1) ?? null;

  if (!firstTier || !lastTier) return null;

  return firstTier === lastTier ? firstTier : `${firstTier}_${lastTier}`;
}

function calculateDepartmentLoads(input: {
  departmentCapacityById: Map<string, DepartmentDailyCapacity>;
  existingWorkPointsByDepartmentId: Map<string, number>;
  itemPlans: PlannedOfferItem[];
}) {
  const offerWorkPointsByDepartmentId = new Map<string, number>();

  for (const item of input.itemPlans) {
    for (const step of item.product.routeSteps) {
      if (!step.isRequired || step.departmentDailyPointCapacity <= 0) continue;

      const workPoints =
        item.quantity * step.workloadPointsPerUnit + Math.max(0, step.setupPoints);
      offerWorkPointsByDepartmentId.set(
        step.departmentId,
        (offerWorkPointsByDepartmentId.get(step.departmentId) ?? 0) +
          workPoints,
      );
    }
  }

  return Array.from(offerWorkPointsByDepartmentId, ([departmentId, offerWorkPoints]) => {
    const dailyPointCapacity =
      input.departmentCapacityById.get(departmentId)?.dailyPointCapacity ?? 0;
    const existingWorkPoints =
      input.existingWorkPointsByDepartmentId.get(departmentId) ?? 0;
    const totalWorkPoints = existingWorkPoints + offerWorkPoints;

    return {
      departmentId,
      existingWorkPoints,
      offerWorkPoints,
      dailyPointCapacity,
      ownLoadBps:
        dailyPointCapacity > 0
          ? Math.ceil((offerWorkPoints * 10_000) / dailyPointCapacity)
          : 10_000,
      loadAfterAcceptBps:
        dailyPointCapacity > 0
          ? Math.ceil(
              (totalWorkPoints * 10_000) /
                (dailyPointCapacity * DELIVERY_CAPACITY_HORIZON_DAYS),
            )
          : 10_000,
      queueAfterAcceptDays:
        dailyPointCapacity > 0
          ? Math.ceil(totalWorkPoints / dailyPointCapacity)
          : DELIVERY_CAPACITY_HORIZON_DAYS,
    };
  });
}

function calculateExistingWorkPoints(
  rows: Awaited<ReturnType<typeof fetchQueueRows>>,
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

function calculateTargetDeliveryDays(input: {
  customer: VirtualCustomerForOffer;
  isCollection: boolean;
  isLargeBasicBlock: boolean;
  rule: MarketOfferTypeRule;
  seed: string;
}) {
  const deliveryRange = resolveOfferDeliveryRange({
    isLargeBasicBlock: input.isLargeBasicBlock,
    offerType: input.rule.offerType,
    ruleMaxDeliveryDays: input.rule.maxDeliveryDays,
    ruleMinDeliveryDays: input.rule.minDeliveryDays,
  });
  const baseDeliveryDays = seededInt({
    max: deliveryRange.maxDays,
    min: deliveryRange.minDays,
    seed: `${input.seed}:base`,
  });
  const lowPressureBufferDays = Math.max(
    0,
    Math.round(
      (10_000 - clamp(input.customer.customerSegment.deliveryPressureBps, 1, 10_000)) /
        2_000,
    ),
  );
  const collectionBufferDays = input.isCollection
    ? seededInt({ min: 2, max: 4, seed: `${input.seed}:collection` })
    : 0;

  return clamp(
    baseDeliveryDays + lowPressureBufferDays + collectionBufferDays,
    deliveryRange.minDays,
    deliveryRange.maxDays + collectionBufferDays,
  );
}

export function resolveOfferDeliveryRange(input: {
  isLargeBasicBlock: boolean;
  offerType: MarketOrderOfferType;
  ruleMaxDeliveryDays: number;
  ruleMinDeliveryDays: number;
}) {
  if (input.isLargeBasicBlock) {
    return { maxDays: 30, minDays: 24 };
  }

  return {
    maxDays: input.ruleMaxDeliveryDays,
    minDays: input.ruleMinDeliveryDays,
  };
}

function calculateDeliveryRiskBps(input: {
  predictedCompletionDays: number;
  targetDeliveryDays: number;
}) {
  if (input.predictedCompletionDays <= input.targetDeliveryDays) return 0;

  return Math.ceil(
    ((input.predictedCompletionDays - input.targetDeliveryDays) * 10_000) /
      Math.max(1, input.targetDeliveryDays),
  );
}

function buildDepartmentLoadSnapshot(input: {
  departmentLoads: DepartmentLoad[];
  itemPlans: PlannedOfferItem[];
  predictedCompletionDays: number;
  targetDeliveryDays: number;
}): Prisma.InputJsonObject {
  return {
    departments: input.departmentLoads.map((load) => ({
      departmentId: load.departmentId,
      dailyPointCapacity: load.dailyPointCapacity,
      existingWorkPoints: load.existingWorkPoints,
      offerWorkPoints: load.offerWorkPoints,
      ownLoadBps: load.ownLoadBps,
      loadAfterAcceptBps: load.loadAfterAcceptBps,
      queueAfterAcceptDays: load.queueAfterAcceptDays,
    })),
    predictedCompletionDays: input.predictedCompletionDays,
    targetDeliveryDays: input.targetDeliveryDays,
    items: input.itemPlans.map((item) => ({
      productId: item.product.productId,
      productTier: item.product.tier,
      quantity: item.quantity,
      requiredTotalPoints: item.requiredTotalPoints,
      bottleneckDailyQuantity: item.product.bottleneckDailyQuantity,
      requiresOutsource: item.product.requiresOutsource,
    })),
  };
}

function getTierComplexityRiskBps(tier: ProductTier) {
  switch (tier) {
    case "STANDARD":
      return 300;
    case "PREMIUM":
      return 900;
    case "LUXURY":
      return 1600;
    default:
      return 0;
  }
}

function getTierQualityRiskBps(tier: ProductTier) {
  switch (tier) {
    case "STANDARD":
      return 200;
    case "PREMIUM":
      return 700;
    case "LUXURY":
      return 1400;
    default:
      return 0;
  }
}

function pickOfferColors(input: {
  product: OrderProductCandidate;
  quantity: number;
  seed: string;
}) {
  const requestedColorCount = seededInt({
    max: input.product.offerColorCountMax,
    min: input.product.offerColorCountMin,
    seed: `${input.seed}:count`,
  });
  const minQuantityPerColor = getMinQuantityPerColor(input.product.tier);
  const colorCount = clamp(
    requestedColorCount,
    1,
    Math.min(
      input.product.colors.length,
      Math.max(1, Math.floor(input.quantity / minQuantityPerColor)),
    ),
  );
  const availableColors = [...input.product.colors];
  const selectedColors: OrderProductCandidateColor[] = [];

  for (let index = 0; index < colorCount; index += 1) {
    const picked = pickWeighted(
      availableColors,
      `${input.seed}:${index}`,
      (color) => Math.max(1, color.selectionWeightBps),
    );

    if (!picked) break;

    selectedColors.push(picked);
    availableColors.splice(availableColors.indexOf(picked), 1);
  }

  return selectedColors.sort((first, second) => first.sortOrder - second.sortOrder);
}

function getMinQuantityPerColor(tier: ProductTier) {
  switch (tier) {
    case "STANDARD":
      return 150;
    case "PREMIUM":
      return 80;
    case "LUXURY":
      return 40;
    default:
      return 200;
  }
}

function distributeColorQuantities(input: {
  colors: OrderProductCandidateColor[];
  quantity: number;
}) {
  const colors = input.colors.length > 0 ? input.colors : [];
  const totalWeight = colors.reduce(
    (total, color) => total + Math.max(1, color.selectionWeightBps),
    0,
  );
  const allocated = colors.map((color) => {
    const exactQuantity =
      totalWeight > 0
        ? (input.quantity * Math.max(1, color.selectionWeightBps)) / totalWeight
        : input.quantity / colors.length;

    return {
      ...color,
      fractionalRemainder: exactQuantity - Math.floor(exactQuantity),
      quantity: Math.floor(exactQuantity),
    };
  });
  let remainder =
    input.quantity -
    allocated.reduce((total, color) => total + color.quantity, 0);

  allocated
    .sort((first, second) => second.fractionalRemainder - first.fractionalRemainder)
    .forEach((color) => {
      if (remainder <= 0) return;

      color.quantity += 1;
      remainder -= 1;
    });

  return allocated
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .map(({ fractionalRemainder, ...color }) => {
      void fractionalRemainder;

      return color;
    });
}

function countRecentProducts(recentOffers: RecentOfferForPenalty[]) {
  const counts = new Map<string, number>();

  for (const offer of recentOffers) {
    for (const item of offer.items) {
      counts.set(item.productId, (counts.get(item.productId) ?? 0) + 1);
    }
  }

  return counts;
}

function countRecentTiers(recentOffers: RecentOfferForPenalty[]) {
  const counts = new Map<ProductTier, number>();

  for (const offer of recentOffers) {
    for (const item of offer.items) {
      counts.set(item.productTier, (counts.get(item.productTier) ?? 0) + 1);
    }
  }

  return counts;
}

function countRecentCustomers(recentOffers: RecentOfferForPenalty[]) {
  const counts = new Map<string, number>();

  for (const offer of recentOffers) {
    counts.set(
      offer.virtualCustomerId,
      (counts.get(offer.virtualCustomerId) ?? 0) + 1,
    );
  }

  return counts;
}

function countOfferTiers(offers: Array<{ productTier: ProductTier }>) {
  const counts = new Map<ProductTier, number>();

  for (const offer of offers) {
    counts.set(
      offer.productTier,
      (counts.get(offer.productTier) ?? 0) + 1,
    );
  }

  return counts;
}

export function resolveFactoryScaleBand(
  activeProductionLineCount: number,
): FactoryScaleBand {
  if (activeProductionLineCount <= 12) return "COMPACT";
  if (activeProductionLineCount <= 30) return "GROWING";
  if (activeProductionLineCount <= 60) return "INDUSTRIAL";

  return "ENTERPRISE";
}

export function calculateFactoryScaledCustomerWeight(input: {
  activeProductionLineCount: number;
  baseWeight: number;
  marketScaleConfig: MarketScaleConfig;
  volumeClassKey: string;
}) {
  const scaleBps = calculateMarketScaleWeightBps({
    activeProductionLineCount: input.activeProductionLineCount,
    config: input.marketScaleConfig,
    volumeClassKey: input.volumeClassKey,
  });

  return Math.max(
    1,
    Math.round((Math.max(1, input.baseWeight) * scaleBps) / DAY_BPS),
  );
}

export function resolveOfferItemCountRange(input: {
  configuredMax: number;
  configuredMin: number;
  factoryScaleBand: FactoryScaleBand;
  volumeClassKey: string;
}) {
  const configuredMin = Math.max(1, Math.round(input.configuredMin));
  const configuredMax = Math.max(
    configuredMin,
    Math.round(input.configuredMax),
  );

  if (input.volumeClassKey === "capsule_collection") {
    return {
      min: Math.max(2, configuredMin),
      max: Math.max(2, configuredMax),
    };
  }

  const isLargeFactory =
    input.factoryScaleBand === "INDUSTRIAL" ||
    input.factoryScaleBand === "ENTERPRISE";

  if (
    isLargeFactory &&
    SCALABLE_VOLUME_CLASS_KEYS.has(input.volumeClassKey)
  ) {
    return { min: 1, max: Math.min(2, configuredMax) };
  }

  return { min: configuredMin, max: configuredMax };
}

function getTierQuantityCap(value: unknown, tier: ProductTier) {
  const caps = isRecord(value) ? value : {};
  const tierCap = caps[tier];
  const defaultCap = DEFAULT_TIER_CAPS[tier];

  if (!isRecord(tierCap)) return defaultCap;

  return {
    min: readPositiveNumber(tierCap.min) ?? defaultCap.min,
    max: readPositiveNumber(tierCap.max) ?? defaultCap.max,
  };
}

function readWeightMap(value: unknown) {
  const weights = new Map<string, number>();

  if (!isRecord(value)) return weights;

  for (const [key, rawValue] of Object.entries(value)) {
    const parsedValue = readNonNegativeNumber(rawValue);

    if (parsedValue !== null) {
      weights.set(key, parsedValue);
    }
  }

  return weights;
}

function readNonNegativeNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.round(value);
}

function readPositiveNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.round(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function roundOrderQuantity(value: number) {
  if (value >= 10_000) return Math.round(value / 500) * 500;
  if (value >= 1_000) return Math.round(value / 100) * 100;
  if (value >= 100) return Math.round(value / 50) * 50;

  return Math.max(1, Math.round(value));
}

function roundOrderQuantityDown(value: number) {
  if (value >= 10_000) return Math.floor(value / 500) * 500;
  if (value >= 1_000) return Math.floor(value / 100) * 100;
  if (value >= 100) return Math.floor(value / 50) * 50;

  return Math.max(1, Math.floor(value));
}

function pickWeighted<T>(
  items: T[],
  seed: string,
  getWeight: (item: T) => number,
) {
  const weightedItems = items.map((item) => ({
    item,
    weight: Math.max(0, getWeight(item)),
  }));
  const totalWeight = weightedItems.reduce(
    (total, weightedItem) => total + weightedItem.weight,
    0,
  );

  if (totalWeight <= 0) return null;

  let cursor = seededRatio(seed) * totalWeight;

  for (const weightedItem of weightedItems) {
    cursor -= weightedItem.weight;

    if (cursor <= 0) return weightedItem.item;
  }

  return weightedItems.at(-1)?.item ?? null;
}

function seededInt(input: { max: number; min: number; seed: string }) {
  const min = Math.ceil(input.min);
  const max = Math.floor(input.max);

  if (max <= min) return min;

  return min + Math.floor(seededRatio(input.seed) * (max - min + 1));
}

function seededRatio(seed: string) {
  let hash = 2_166_136_261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  hash += hash << 13;
  hash ^= hash >>> 7;
  hash += hash << 3;
  hash ^= hash >>> 17;
  hash += hash << 5;

  return (hash >>> 0) / 4_294_967_296;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
