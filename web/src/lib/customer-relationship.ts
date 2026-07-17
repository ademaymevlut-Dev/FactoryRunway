import { MarketOrderOfferType } from "@/generated/prisma/enums";

export const CUSTOMER_RELATIONSHIP_BASE_BPS = 5_000;
export const CUSTOMER_RELATIONSHIP_REPEAT_MIN_BPS = 3_000;

type RelationshipMetadataConfig = {
  repeatOrderChanceBps: number;
  trustGainMultiplierBps: number;
  trustLossMultiplierBps: number;
};

export type CustomerRelationshipImpact = {
  label: "gained" | "lost" | "neutral";
  lateDays: number;
  trustChangeBps: number;
};

export type CustomerRelationshipOrder = {
  lateDays: number;
  shippedDay: number | null;
  targetDeliveryDay: number;
};

export type CustomerRelationshipSummary = {
  completedOrderCount: number;
  lateOrderCount: number;
  lastShippedDay: number | null;
  onTimeOrderCount: number;
  relationshipScoreBps: number;
  repeatEligible: boolean;
  repeatWeightBps: number;
  status: "new" | "trusted" | "warm" | "at_risk";
  totalLateDays: number;
  virtualCustomerId: string;
};

export function readCustomerRelationshipConfig(
  metadata: unknown,
): RelationshipMetadataConfig {
  const source = isRecord(metadata) ? metadata : {};

  return {
    repeatOrderChanceBps: clampBps(
      readPositiveNumber(source.repeatOrderChanceBps) ?? 6_000,
    ),
    trustGainMultiplierBps: clamp(
      readPositiveNumber(source.trustGainMultiplierBps) ?? 10_000,
      1_000,
      30_000,
    ),
    trustLossMultiplierBps: clamp(
      readPositiveNumber(source.trustLossMultiplierBps) ?? 10_000,
      1_000,
      30_000,
    ),
  };
}

export function calculateCustomerRelationshipImpact(input: {
  lateDays: number;
  segmentMetadata?: unknown;
}): CustomerRelationshipImpact {
  const lateDays = Math.max(0, Math.trunc(input.lateDays));
  const config = readCustomerRelationshipConfig(input.segmentMetadata);

  if (lateDays <= 0) {
    return {
      label: "gained",
      lateDays,
      trustChangeBps: Math.round((700 * config.trustGainMultiplierBps) / 10_000),
    };
  }

  return {
    label: "lost",
    lateDays,
    trustChangeBps: -Math.round(
      ((900 + lateDays * 450) * config.trustLossMultiplierBps) / 10_000,
    ),
  };
}

export function buildCustomerRelationshipSummary(input: {
  orders: CustomerRelationshipOrder[];
  segmentMetadata?: unknown;
  virtualCustomerId: string;
}): CustomerRelationshipSummary {
  const sortedOrders = [...input.orders].sort((first, second) => {
    return (
      (first.shippedDay ?? first.targetDeliveryDay) -
      (second.shippedDay ?? second.targetDeliveryDay)
    );
  });
  let score = CUSTOMER_RELATIONSHIP_BASE_BPS;
  let lateOrderCount = 0;
  let onTimeOrderCount = 0;
  let totalLateDays = 0;
  let lastShippedDay: number | null = null;

  for (const order of sortedOrders) {
    const impact = calculateCustomerRelationshipImpact({
      lateDays: order.lateDays,
      segmentMetadata: input.segmentMetadata,
    });

    score = clampBps(score + impact.trustChangeBps);
    lastShippedDay =
      order.shippedDay === null
        ? lastShippedDay
        : Math.max(lastShippedDay ?? order.shippedDay, order.shippedDay);

    if (order.lateDays > 0) {
      lateOrderCount += 1;
      totalLateDays += order.lateDays;
    } else {
      onTimeOrderCount += 1;
    }
  }

  const config = readCustomerRelationshipConfig(input.segmentMetadata);
  const repeatEligible =
    sortedOrders.length > 0 && score >= CUSTOMER_RELATIONSHIP_REPEAT_MIN_BPS;
  const relationshipFactorBps = clamp(5_000 + score, 5_000, 15_000);
  const repeatWeightBps = repeatEligible
    ? Math.round((config.repeatOrderChanceBps * relationshipFactorBps) / 10_000)
    : 0;

  return {
    completedOrderCount: sortedOrders.length,
    lateOrderCount,
    lastShippedDay,
    onTimeOrderCount,
    relationshipScoreBps: score,
    repeatEligible,
    repeatWeightBps,
    status: resolveCustomerRelationshipStatus(score, sortedOrders.length),
    totalLateDays,
    virtualCustomerId: input.virtualCustomerId,
  };
}

export function calculateCustomerSelectionWeight(input: {
  baseWeight: number;
  offerType: MarketOrderOfferType;
  relationship?: CustomerRelationshipSummary | null;
}) {
  const baseWeight = Math.max(1, Math.round(input.baseWeight));
  const relationship = input.relationship;

  if (input.offerType === MarketOrderOfferType.REPEAT) {
    if (!relationship?.repeatEligible) return 0;

    return Math.max(
      1,
      Math.round((baseWeight * relationship.repeatWeightBps) / 10_000),
    );
  }

  if (!relationship) return baseWeight;

  const relationshipMultiplierBps = clamp(
    7_000 + Math.round(relationship.relationshipScoreBps * 0.6),
    7_000,
    13_000,
  );

  return Math.max(1, Math.round((baseWeight * relationshipMultiplierBps) / 10_000));
}

export function buildCustomerRelationshipMetadata(
  relationship: CustomerRelationshipSummary | null | undefined,
) {
  if (!relationship) return null;

  return {
    completedOrderCount: relationship.completedOrderCount,
    lateOrderCount: relationship.lateOrderCount,
    relationshipScoreBps: relationship.relationshipScoreBps,
    repeatEligible: relationship.repeatEligible,
    repeatWeightBps: relationship.repeatWeightBps,
    status: relationship.status,
    totalLateDays: relationship.totalLateDays,
  };
}

export function readCustomerRelationshipImpactFromMetadata(metadata: unknown) {
  const source = isRecord(metadata) ? metadata.customerRelationshipImpact : null;

  if (!isRecord(source)) return null;

  const trustChangeBps = readFiniteNumber(source.trustChangeBps);
  const lateDays = readFiniteNumber(source.lateDays);
  const label = source.label;

  if (
    trustChangeBps === null ||
    lateDays === null ||
    (label !== "gained" && label !== "lost" && label !== "neutral")
  ) {
    return null;
  }

  return {
    label,
    lateDays,
    trustChangeBps,
  } satisfies CustomerRelationshipImpact;
}

function resolveCustomerRelationshipStatus(score: number, orderCount: number) {
  if (orderCount === 0) return "new";
  if (score >= 7_000) return "trusted";
  if (score >= CUSTOMER_RELATIONSHIP_REPEAT_MIN_BPS) return "warm";

  return "at_risk";
}

function readPositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function readFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clampBps(value: number) {
  return clamp(value, 0, 10_000);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
