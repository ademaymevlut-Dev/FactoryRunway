import {
  FinanceCategory,
  FinanceSourceType,
  MarketOrderOfferType,
  type Prisma,
} from "@/generated/prisma/client";

import {
  settleFactoryExpense,
  type FinancialTriggerClient,
  type FinancialTriggerResult,
} from "./financial-triggers";

const NORMAL_LATE_PENALTY_BPS_PER_DAY = 200;
const OPPORTUNITY_LATE_PENALTY_BPS_PER_DAY = 250;
const EXPRESS_LATE_PENALTY_BPS_PER_DAY = 300;
const REPEAT_LATE_PENALTY_BPS_PER_DAY = 150;
const MAX_LATE_PENALTY_BPS = 2_000;
const EXPRESS_MAX_LATE_PENALTY_BPS = 2_500;

export type LateDeliveryPenaltyInput = {
  lateDays: number;
  offerType: MarketOrderOfferType;
  totalRevenueCents: bigint;
};

export type LateDeliveryPenaltyResult = {
  amountCents: bigint;
  capped: boolean;
  penaltyBps: number;
  rawPenaltyBps: number;
};

export type LateDeliveryPenaltyProcessResult = FinancialTriggerResult & {
  penalizedOrderIds: string[];
  skippedOrderIds: string[];
  totalPenaltyCents: bigint;
};

export function calculateLateDeliveryPenalty(
  input: LateDeliveryPenaltyInput,
): LateDeliveryPenaltyResult {
  const revenueCents = input.totalRevenueCents > BigInt(0)
    ? input.totalRevenueCents
    : BigInt(0);
  const lateDays = Math.max(0, input.lateDays);
  const rawPenaltyBps =
    lateDays * getPenaltyBpsPerDay(input.offerType);
  const maxPenaltyBps =
    input.offerType === MarketOrderOfferType.EXPRESS
      ? EXPRESS_MAX_LATE_PENALTY_BPS
      : MAX_LATE_PENALTY_BPS;
  const penaltyBps = Math.min(rawPenaltyBps, maxPenaltyBps);

  return {
    amountCents: (revenueCents * BigInt(penaltyBps)) / BigInt(10_000),
    capped: rawPenaltyBps > penaltyBps,
    penaltyBps,
    rawPenaltyBps,
  };
}

export async function processLateDeliveryPenalties(input: {
  factoryDay: number;
  factoryId: string;
  orderIds: string[];
  tx: FinancialTriggerClient;
}): Promise<LateDeliveryPenaltyProcessResult> {
  if (input.orderIds.length === 0) return emptyPenaltyResult();

  const orders = await input.tx.customerOrder.findMany({
    where: {
      factoryId: input.factoryId,
      id: { in: input.orderIds },
      lateDays: { gt: 0 },
    },
    orderBy: [{ shippedDay: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      lateDays: true,
      offerType: true,
      orderNo: true,
      shippedDay: true,
      targetDeliveryDay: true,
      totalQuantity: true,
      totalRevenueCents: true,
    },
  });

  let result = emptyPenaltyResult();

  for (const order of orders) {
    const penalty = calculateLateDeliveryPenalty({
      lateDays: order.lateDays,
      offerType: order.offerType,
      totalRevenueCents: order.totalRevenueCents,
    });

    if (penalty.amountCents <= BigInt(0)) {
      result.skippedOrderIds.push(order.id);
      continue;
    }

    const settlement = await settleFactoryExpense({
      amountCents: penalty.amountCents,
      category: FinanceCategory.PENALTY,
      description: `${order.orderNo} gecikme cezası`,
      factoryDay: input.factoryDay,
      factoryId: input.factoryId,
      metadata: {
        capped: penalty.capped,
        lateDays: order.lateDays,
        offerType: order.offerType,
        orderNo: order.orderNo,
        penaltyBps: penalty.penaltyBps,
        rawPenaltyBps: penalty.rawPenaltyBps,
        shippedDay: order.shippedDay ?? input.factoryDay,
        source: "late-delivery-penalty",
        targetDeliveryDay: order.targetDeliveryDay,
        totalQuantity: order.totalQuantity,
        totalRevenueCents: order.totalRevenueCents.toString(),
        translationKey: "finance.lateDeliveryPenalty",
      } satisfies Prisma.InputJsonObject,
      referenceKey: buildLateDeliveryPenaltyReferenceKey(order.id),
      sourceId: order.id,
      sourceType: FinanceSourceType.CUSTOMER_ORDER,
      tx: input.tx,
    });

    if (
      settlement.paidTransactionIds.length === 0 &&
      settlement.dueIds.length === 0
    ) {
      result.skippedOrderIds.push(order.id);
      continue;
    }

    result = mergePenaltyResults(result, settlement);
    result.penalizedOrderIds.push(order.id);
    result.totalPenaltyCents += penalty.amountCents;
  }

  return result;
}

export function buildLateDeliveryPenaltyReferenceKey(customerOrderId: string) {
  return `LATE_DELIVERY_PENALTY:${customerOrderId}`;
}

function getPenaltyBpsPerDay(offerType: MarketOrderOfferType) {
  switch (offerType) {
    case MarketOrderOfferType.EXPRESS:
      return EXPRESS_LATE_PENALTY_BPS_PER_DAY;
    case MarketOrderOfferType.OPPORTUNITY:
      return OPPORTUNITY_LATE_PENALTY_BPS_PER_DAY;
    case MarketOrderOfferType.REPEAT:
      return REPEAT_LATE_PENALTY_BPS_PER_DAY;
    case MarketOrderOfferType.NORMAL:
    default:
      return NORMAL_LATE_PENALTY_BPS_PER_DAY;
  }
}

function emptyPenaltyResult(): LateDeliveryPenaltyProcessResult {
  return {
    dueIds: [],
    overdueDueIds: [],
    paidTransactionIds: [],
    partialDueIds: [],
    penalizedOrderIds: [],
    skippedOrderIds: [],
    totalPenaltyCents: BigInt(0),
  };
}

function mergePenaltyResults(
  first: LateDeliveryPenaltyProcessResult,
  second: FinancialTriggerResult,
): LateDeliveryPenaltyProcessResult {
  return {
    ...first,
    dueIds: [...first.dueIds, ...second.dueIds],
    overdueDueIds: [...first.overdueDueIds, ...second.overdueDueIds],
    paidTransactionIds: [
      ...first.paidTransactionIds,
      ...second.paidTransactionIds,
    ],
    partialDueIds: [...first.partialDueIds, ...second.partialDueIds],
  };
}
