import {
  CustomerOrderStatus,
  ProductTier,
  XpReason,
  type Prisma,
} from "@/generated/prisma/client";

import { grantFactoryXp } from "./factory-progression";

const ORDER_XP_SOURCE_TYPE = "customer_order";
const WORKLOAD_POINTS_PER_XP = 1_000;
const MAX_WORKLOAD_XP = 5_000;
const BASE_ORDER_XP = 50;
const STANDARD_DIFFICULTY_XP = 20;
const PREMIUM_DIFFICULTY_XP = 90;
const LUXURY_DIFFICULTY_XP = 180;
const EXTRA_ITEM_COMPLEXITY_XP = 30;
const OUTSOURCE_STEP_COMPLEXITY_XP = 20;
const MAX_COMPLEXITY_XP = 300;
const ON_TIME_BONUS_BPS = 1_500;
const MIN_ON_TIME_BONUS_XP = 25;
const MAX_ON_TIME_BONUS_XP = 250;
const DELAY_PENALTY_BPS_PER_DAY = 1_000;
const MAX_DELAY_PENALTY_BPS = 7_000;

const PRODUCT_TIER_RANK: Record<ProductTier, number> = {
  [ProductTier.BASIC]: 1,
  [ProductTier.STANDARD]: 2,
  [ProductTier.PREMIUM]: 3,
  [ProductTier.LUXURY]: 4,
};

const ORDER_XP_REASONS = [
  XpReason.ORDER_COMPLETED,
  XpReason.ON_TIME_DELIVERY,
  XpReason.PREMIUM_ORDER,
  XpReason.LUXURY_ORDER,
] as const;

type OrderXpTransactionClient = Prisma.TransactionClient;
type OrderTierBonusReason =
  | (typeof XpReason)["PREMIUM_ORDER"]
  | (typeof XpReason)["LUXURY_ORDER"];

export type OrderXpRewardInput = {
  itemCount: number;
  lateDays: number;
  outsourcedStepCount: number;
  tiers: ProductTier[];
  totalWorkloadPoints: number;
};

export type OrderXpRewardBreakdown = {
  complexityXp: number;
  coreOrderXp: number;
  delayPenaltyBps: number;
  highestTier: ProductTier;
  onTimeBonusXp: number;
  orderCompletedXp: number;
  tierBonusReason: OrderTierBonusReason | null;
  tierBonusXp: number;
  totalAwardXp: number;
  workloadXp: number;
};

export function calculateOrderXpReward(
  input: OrderXpRewardInput,
): OrderXpRewardBreakdown {
  const highestTier = pickHighestTier(input.tiers);
  const workloadXp = Math.min(
    MAX_WORKLOAD_XP,
    Math.floor(Math.max(0, input.totalWorkloadPoints) / WORKLOAD_POINTS_PER_XP),
  );
  const complexityXp = Math.min(
    MAX_COMPLEXITY_XP,
    Math.max(0, input.itemCount - 1) * EXTRA_ITEM_COMPLEXITY_XP +
      Math.max(0, input.outsourcedStepCount) * OUTSOURCE_STEP_COMPLEXITY_XP,
  );
  const standardDifficultyXp =
    highestTier === ProductTier.STANDARD ? STANDARD_DIFFICULTY_XP : 0;
  const coreOrderXp =
    BASE_ORDER_XP + workloadXp + complexityXp + standardDifficultyXp;
  const rawTierBonusXp =
    highestTier === ProductTier.LUXURY
      ? LUXURY_DIFFICULTY_XP
      : highestTier === ProductTier.PREMIUM
        ? PREMIUM_DIFFICULTY_XP
        : 0;
  const delayPenaltyBps = Math.min(
    MAX_DELAY_PENALTY_BPS,
    Math.max(0, input.lateDays) * DELAY_PENALTY_BPS_PER_DAY,
  );
  const orderCompletedXp = applyDelayPenalty(coreOrderXp, delayPenaltyBps, {
    minimumPositiveXp: 10,
  });
  const tierBonusXp = applyDelayPenalty(rawTierBonusXp, delayPenaltyBps);
  const onTimeBonusXp =
    input.lateDays === 0
      ? clamp(
          Math.floor(((coreOrderXp + rawTierBonusXp) * ON_TIME_BONUS_BPS) / 10_000),
          MIN_ON_TIME_BONUS_XP,
          MAX_ON_TIME_BONUS_XP,
        )
      : 0;
  const tierBonusReason =
    highestTier === ProductTier.LUXURY
      ? XpReason.LUXURY_ORDER
      : highestTier === ProductTier.PREMIUM
        ? XpReason.PREMIUM_ORDER
        : null;

  return {
    complexityXp,
    coreOrderXp,
    delayPenaltyBps,
    highestTier,
    onTimeBonusXp,
    orderCompletedXp,
    tierBonusReason,
    tierBonusXp,
    totalAwardXp: orderCompletedXp + tierBonusXp + onTimeBonusXp,
    workloadXp,
  };
}

export async function processShippedOrderXpRewards(input: {
  factoryDay: number;
  factoryId: string;
  orderIds?: string[];
  tx: OrderXpTransactionClient;
}) {
  if (input.orderIds && input.orderIds.length === 0) {
    return emptyRewardResult();
  }

  const orders = await input.tx.customerOrder.findMany({
    where: {
      factoryId: input.factoryId,
      ...(input.orderIds ? { id: { in: input.orderIds } } : {}),
      shippedDay: input.factoryDay,
      status: CustomerOrderStatus.SHIPPED,
    },
    orderBy: [{ shippedDay: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      lateDays: true,
      orderNo: true,
      shippedDay: true,
      targetDeliveryDay: true,
      totalQuantity: true,
      totalRevenueCents: true,
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          quantity: true,
          product: {
            select: {
              tier: true,
            },
          },
          productionOrder: {
            select: {
              routeProgress: {
                where: { isRequired: true },
                select: {
                  outsourceJobs: {
                    select: { id: true },
                    take: 1,
                  },
                  plannedQuantity: true,
                  setupPoints: true,
                  workloadPointsPerUnit: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (orders.length === 0) return emptyRewardResult();

  const orderIds = orders.map((order) => order.id);
  const existingTransactions = await input.tx.factoryXpTransaction.findMany({
    where: {
      factoryId: input.factoryId,
      reason: { in: [...ORDER_XP_REASONS] },
      sourceId: { in: orderIds },
      sourceType: ORDER_XP_SOURCE_TYPE,
    },
    select: {
      reason: true,
      sourceId: true,
    },
  });
  const awardedKeys = new Set(
    existingTransactions.map(
      (transaction) => `${transaction.sourceId}:${transaction.reason}`,
    ),
  );
  const result = emptyRewardResult();

  for (const order of orders) {
    const rewardInput = buildOrderRewardInput(order);
    const reward = calculateOrderXpReward(rewardInput);
    const metadata = {
      complexityXp: reward.complexityXp,
      coreOrderXp: reward.coreOrderXp,
      delayPenaltyBps: reward.delayPenaltyBps,
      highestTier: reward.highestTier,
      itemCount: rewardInput.itemCount,
      lateDays: rewardInput.lateDays,
      orderNo: order.orderNo,
      outsourcedStepCount: rewardInput.outsourcedStepCount,
      shippedDay: order.shippedDay ?? input.factoryDay,
      source: "order-xp-rewards",
      targetDeliveryDay: order.targetDeliveryDay,
      totalQuantity: order.totalQuantity,
      totalRevenueCents: order.totalRevenueCents.toString(),
      totalWorkloadPoints: rewardInput.totalWorkloadPoints,
      workloadXp: reward.workloadXp,
    } satisfies Prisma.InputJsonObject;

    const grantedOrderXp = await grantOrderXpIfMissing({
      amountXp: reward.orderCompletedXp,
      awardedKeys,
      factoryDay: input.factoryDay,
      factoryId: input.factoryId,
      metadata: {
        ...metadata,
        rewardPart: "order_completed",
      },
      orderId: order.id,
      reason: XpReason.ORDER_COMPLETED,
      tx: input.tx,
    });

    const grantedTierXp = reward.tierBonusReason
      ? await grantOrderXpIfMissing({
          amountXp: reward.tierBonusXp,
          awardedKeys,
          factoryDay: input.factoryDay,
          factoryId: input.factoryId,
          metadata: {
            ...metadata,
            rewardPart: "tier_bonus",
          },
          orderId: order.id,
          reason: reward.tierBonusReason,
          tx: input.tx,
        })
      : 0;

    const grantedOnTimeXp = await grantOrderXpIfMissing({
      amountXp: reward.onTimeBonusXp,
      awardedKeys,
      factoryDay: input.factoryDay,
      factoryId: input.factoryId,
      metadata: {
        ...metadata,
        rewardPart: "on_time_delivery",
      },
      orderId: order.id,
      reason: XpReason.ON_TIME_DELIVERY,
      tx: input.tx,
    });
    const grantedTotalXp = grantedOrderXp + grantedTierXp + grantedOnTimeXp;

    if (grantedTotalXp > 0) {
      result.awardedOrderIds.push(order.id);
      result.totalAwardedXp += grantedTotalXp;
      result.transactionCount += [
        grantedOrderXp,
        grantedTierXp,
        grantedOnTimeXp,
      ].filter((xp) => xp > 0).length;
    } else {
      result.skippedOrderIds.push(order.id);
    }
  }

  return result;
}

async function grantOrderXpIfMissing(input: {
  amountXp: number;
  awardedKeys: Set<string>;
  factoryDay: number;
  factoryId: string;
  metadata: Prisma.InputJsonObject;
  orderId: string;
  reason: (typeof ORDER_XP_REASONS)[number];
  tx: OrderXpTransactionClient;
}) {
  if (input.amountXp <= 0) return 0;
  const key = `${input.orderId}:${input.reason}`;
  if (input.awardedKeys.has(key)) return 0;

  await grantFactoryXp({
    amountXp: input.amountXp,
    factoryId: input.factoryId,
    gameDay: input.factoryDay,
    metadata: input.metadata,
    reason: input.reason,
    sourceId: input.orderId,
    sourceType: ORDER_XP_SOURCE_TYPE,
    tx: input.tx,
  });
  input.awardedKeys.add(key);

  return input.amountXp;
}

function buildOrderRewardInput(order: {
  lateDays: number;
  items: Array<{
    quantity: number;
    product: { tier: ProductTier };
    productionOrder: {
      routeProgress: Array<{
        outsourceJobs: Array<{ id: string }>;
        plannedQuantity: number;
        setupPoints: number;
        workloadPointsPerUnit: number;
      }>;
    } | null;
  }>;
}): OrderXpRewardInput {
  let totalWorkloadPoints = 0;
  let outsourcedStepCount = 0;

  for (const item of order.items) {
    const routeProgress = item.productionOrder?.routeProgress ?? [];

    if (routeProgress.length === 0) continue;

    for (const step of routeProgress) {
      totalWorkloadPoints +=
        step.plannedQuantity * Math.max(1, step.workloadPointsPerUnit) +
        Math.max(0, step.setupPoints);

      if (step.outsourceJobs.length > 0) {
        outsourcedStepCount += 1;
      }
    }
  }

  return {
    itemCount: order.items.length,
    lateDays: Math.max(0, order.lateDays),
    outsourcedStepCount,
    tiers: order.items.map((item) => item.product.tier),
    totalWorkloadPoints,
  };
}

function pickHighestTier(tiers: ProductTier[]) {
  return tiers.reduce<ProductTier>((highest, tier) => {
    return PRODUCT_TIER_RANK[tier] > PRODUCT_TIER_RANK[highest] ? tier : highest;
  }, ProductTier.BASIC);
}

function applyDelayPenalty(
  value: number,
  delayPenaltyBps: number,
  options: { minimumPositiveXp?: number } = {},
) {
  if (value <= 0) return 0;
  const nextValue = Math.floor((value * Math.max(0, 10_000 - delayPenaltyBps)) / 10_000);

  return Math.max(options.minimumPositiveXp ?? 1, nextValue);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function emptyRewardResult() {
  return {
    awardedOrderIds: [] as string[],
    skippedOrderIds: [] as string[],
    totalAwardedXp: 0,
    transactionCount: 0,
  };
}
