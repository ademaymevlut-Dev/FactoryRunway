import { MarketOrderOfferType } from "@/generated/prisma/enums";

export type MarketOfferTypeRuleConfig = {
  offerType: MarketOrderOfferType;
  generationWeightBps: number;
  minDeliveryDays: number;
  maxDeliveryDays: number;
  offerExpiryDays: number;
  minimumIntervalDays: number;
  priceMultiplierMinBps: number;
  priceMultiplierMaxBps: number;
};

export type MarketOfferStageRuleConfig = {
  targetActiveOfferCount: number;
  maxNewOffersPerDay: number;
};

export type MarketPricingQuantityAnchor = {
  totalOfferQuantity: number;
  priceMultiplierBps: number;
};

export type MarketPricingConfig = {
  balanceVersion: number;
  model: "PIECEWISE_LINEAR";
  quantityAnchors: MarketPricingQuantityAnchor[];
  segmentPriceMultiplierMode: "DISABLED";
  volumePriceMultiplierMode: "DISABLED";
};

export const MARKET_VOLUME_CLASS_KEYS = [
  "small_batch",
  "regular",
  "large_retail",
  "mass_distribution",
  "capsule_collection",
] as const;

export type MarketVolumeClassKey = (typeof MARKET_VOLUME_CLASS_KEYS)[number];

export const MARKET_SCALE_KEYS = [
  "START",
  "COMPACT",
  "GROWING",
  "INDUSTRIAL_I",
  "INDUSTRIAL_II",
  "ENTERPRISE_I",
  "ENTERPRISE_II",
  "MEGA_I",
  "MEGA_II",
] as const;

export type MarketScaleKey = (typeof MARKET_SCALE_KEYS)[number];

export type MarketScaleAnchor = {
  scaleKey: MarketScaleKey;
  activeProductionLineCount: number;
  volumeClassWeightsBps: Record<MarketVolumeClassKey, number>;
};

export type MarketScaleConfig = {
  balanceVersion: number;
  model: "PIECEWISE_LINEAR";
  anchors: MarketScaleAnchor[];
};

export type MarketConfigSource = "db" | "fallback";

type ResolvedMarketOfferTypeRules = {
  rules: MarketOfferTypeRuleConfig[];
  sources: Record<MarketOrderOfferType, MarketConfigSource>;
  validationErrors: string[];
};

type ResolvedMarketOfferStageRule = {
  rule: MarketOfferStageRuleConfig;
  source: MarketConfigSource;
  validationErrors: string[];
};

type ResolvedOfferPriceBand = {
  band: { minBps: number; maxBps: number };
  source: MarketConfigSource;
  validationErrors: string[];
};

type ResolvedMarketPricingConfig = {
  config: MarketPricingConfig;
  source: MarketConfigSource;
  validationErrors: string[];
};

export type ResolvedMarketScaleConfig = {
  config: MarketScaleConfig;
  source: MarketConfigSource;
  validationErrors: string[];
};

const MAX_REASONABLE_BPS = 100_000;
const MAX_REASONABLE_DELIVERY_DAYS = 365;
const MAX_REASONABLE_OFFER_COUNT = 100;
const MAX_REASONABLE_QUANTITY_ANCHORS = 20;
const MAX_REASONABLE_OFFER_QUANTITY = 10_000_000;
const MAX_REASONABLE_MARKET_SCALE_ANCHORS = 20;
const MAX_REASONABLE_PRODUCTION_LINE_COUNT = 10_000;
const MAX_REASONABLE_MARKET_SCALE_WEIGHT_BPS = 5_000_000;

export const MARKET_PRICING_BALANCE_VERSION = 4;
export const MARKET_SCALE_BALANCE_VERSION = 5;
export const MARKET_OFFER_BALANCE_VERSION = 5;

// Canonical v4 pricing fallback and seed snapshot. Runtime DB metadata wins when valid.
export const CANONICAL_MARKET_PRICING_CONFIG: MarketPricingConfig = {
  balanceVersion: MARKET_PRICING_BALANCE_VERSION,
  model: "PIECEWISE_LINEAR",
  quantityAnchors: [
    { totalOfferQuantity: 0, priceMultiplierBps: 10_000 },
    { totalOfferQuantity: 10_000, priceMultiplierBps: 10_000 },
    { totalOfferQuantity: 25_000, priceMultiplierBps: 9_700 },
    { totalOfferQuantity: 50_000, priceMultiplierBps: 9_000 },
    { totalOfferQuantity: 100_000, priceMultiplierBps: 8_100 },
    { totalOfferQuantity: 200_000, priceMultiplierBps: 7_300 },
  ],
  segmentPriceMultiplierMode: "DISABLED",
  volumePriceMultiplierMode: "DISABLED",
};

// Canonical v5 customer-mix progression. Runtime DB metadata wins when valid.
// Line-count anchors are interpolated deterministically; unrelated market rules
// (quantity, price, cadence, eligibility and product selection) are not changed.
export const CANONICAL_MARKET_SCALE_CONFIG: MarketScaleConfig = {
  balanceVersion: MARKET_SCALE_BALANCE_VERSION,
  model: "PIECEWISE_LINEAR",
  anchors: [
    {
      scaleKey: "START",
      activeProductionLineCount: 0,
      volumeClassWeightsBps: {
        capsule_collection: 8_000,
        large_retail: 5_000,
        mass_distribution: 1_000,
        regular: 11_000,
        small_batch: 12_000,
      },
    },
    {
      scaleKey: "COMPACT",
      activeProductionLineCount: 12,
      volumeClassWeightsBps: {
        capsule_collection: 8_000,
        large_retail: 5_000,
        mass_distribution: 1_000,
        regular: 11_000,
        small_batch: 12_000,
      },
    },
    {
      scaleKey: "GROWING",
      activeProductionLineCount: 30,
      volumeClassWeightsBps: {
        capsule_collection: 7_000,
        large_retail: 14_000,
        mass_distribution: 40_000,
        regular: 10_000,
        small_batch: 7_000,
      },
    },
    {
      scaleKey: "INDUSTRIAL_I",
      activeProductionLineCount: 45,
      volumeClassWeightsBps: {
        capsule_collection: 6_000,
        large_retail: 30_000,
        mass_distribution: 400_000,
        regular: 9_000,
        small_batch: 5_500,
      },
    },
    {
      scaleKey: "INDUSTRIAL_II",
      activeProductionLineCount: 60,
      volumeClassWeightsBps: {
        capsule_collection: 5_000,
        large_retail: 40_000,
        mass_distribution: 800_000,
        regular: 8_000,
        small_batch: 4_500,
      },
    },
    {
      scaleKey: "ENTERPRISE_I",
      activeProductionLineCount: 100,
      volumeClassWeightsBps: {
        capsule_collection: 4_000,
        large_retail: 50_000,
        mass_distribution: 1_500_000,
        regular: 6_500,
        small_batch: 3_500,
      },
    },
    {
      scaleKey: "ENTERPRISE_II",
      activeProductionLineCount: 150,
      volumeClassWeightsBps: {
        capsule_collection: 3_500,
        large_retail: 60_000,
        mass_distribution: 2_200_000,
        regular: 5_500,
        small_batch: 3_000,
      },
    },
    {
      scaleKey: "MEGA_I",
      activeProductionLineCount: 200,
      volumeClassWeightsBps: {
        capsule_collection: 3_000,
        large_retail: 65_000,
        mass_distribution: 2_600_000,
        regular: 5_000,
        small_batch: 2_500,
      },
    },
    {
      scaleKey: "MEGA_II",
      activeProductionLineCount: 300,
      volumeClassWeightsBps: {
        capsule_collection: 2_700,
        large_retail: 70_000,
        mass_distribution: 3_200_000,
        regular: 4_500,
        small_batch: 2_200,
      },
    },
  ],
};

// Bootstrap and missing-config fallback only. Runtime DB rows are authoritative.
// These values preserve the effective v5 market behavior at the canonical-v3 cutover.
export const CANONICAL_MARKET_OFFER_TYPE_RULES: readonly MarketOfferTypeRuleConfig[] =
  [
    {
      offerType: MarketOrderOfferType.NORMAL,
      generationWeightBps: 6500,
      minDeliveryDays: 20,
      maxDeliveryDays: 24,
      offerExpiryDays: 3,
      minimumIntervalDays: 0,
      priceMultiplierMinBps: 10_000,
      priceMultiplierMaxBps: 10_000,
    },
    {
      offerType: MarketOrderOfferType.OPPORTUNITY,
      generationWeightBps: 1200,
      minDeliveryDays: 12,
      maxDeliveryDays: 15,
      offerExpiryDays: 2,
      minimumIntervalDays: 5,
      priceMultiplierMinBps: 10_400,
      priceMultiplierMaxBps: 10_800,
    },
    {
      offerType: MarketOrderOfferType.EXPRESS,
      generationWeightBps: 1000,
      minDeliveryDays: 7,
      maxDeliveryDays: 10,
      offerExpiryDays: 1,
      minimumIntervalDays: 2,
      priceMultiplierMinBps: 11_500,
      priceMultiplierMaxBps: 11_600,
    },
    {
      offerType: MarketOrderOfferType.REPEAT,
      generationWeightBps: 1300,
      minDeliveryDays: 18,
      maxDeliveryDays: 24,
      offerExpiryDays: 3,
      minimumIntervalDays: 3,
      priceMultiplierMinBps: 10_000,
      priceMultiplierMaxBps: 10_200,
    },
  ];

const FALLBACK_TYPE_RULE_BY_TYPE = new Map(
  CANONICAL_MARKET_OFFER_TYPE_RULES.map((rule) => [rule.offerType, rule]),
);

export function getFallbackMarketStageRule(
  sortOrder: number,
): MarketOfferStageRuleConfig {
  if (sortOrder <= 10) {
    return { maxNewOffersPerDay: 1, targetActiveOfferCount: 3 };
  }
  if (sortOrder <= 20) {
    return { maxNewOffersPerDay: 1, targetActiveOfferCount: 4 };
  }
  if (sortOrder <= 30) {
    return { maxNewOffersPerDay: 2, targetActiveOfferCount: 5 };
  }
  if (sortOrder <= 40) {
    return { maxNewOffersPerDay: 2, targetActiveOfferCount: 6 };
  }
  if (sortOrder <= 50) {
    return { maxNewOffersPerDay: 2, targetActiveOfferCount: 7 };
  }

  return { maxNewOffersPerDay: 3, targetActiveOfferCount: 8 };
}

export function resolveMarketOfferTypeRules(
  configuredRules: readonly MarketOfferTypeRuleConfig[],
): ResolvedMarketOfferTypeRules {
  const configuredByType = new Map(
    configuredRules.map((rule) => [rule.offerType, rule]),
  );
  const sources = {} as Record<MarketOrderOfferType, MarketConfigSource>;
  const validationErrors: string[] = [];

  const rules = CANONICAL_MARKET_OFFER_TYPE_RULES.map((fallbackRule) => {
    const configuredRule = configuredByType.get(fallbackRule.offerType);

    if (!configuredRule) {
      sources[fallbackRule.offerType] = "fallback";
      return fallbackRule;
    }

    const errors = validateMarketOfferTypeRule(configuredRule);
    if (errors.length > 0) {
      sources[fallbackRule.offerType] = "fallback";
      validationErrors.push(
        ...errors.map((error) => `${fallbackRule.offerType}: ${error}`),
      );
      return fallbackRule;
    }

    sources[fallbackRule.offerType] = "db";
    return configuredRule;
  });

  if (rules.every((rule) => rule.generationWeightBps === 0)) {
    for (const fallbackRule of CANONICAL_MARKET_OFFER_TYPE_RULES) {
      sources[fallbackRule.offerType] = "fallback";
    }
    validationErrors.push(
      "At least one market offer type generation weight must be positive",
    );
    return {
      rules: [...CANONICAL_MARKET_OFFER_TYPE_RULES],
      sources,
      validationErrors,
    };
  }

  return { rules, sources, validationErrors };
}

export function resolveMarketOfferStageRule(input: {
  configuredRule: MarketOfferStageRuleConfig | null;
  sortOrder: number;
}): ResolvedMarketOfferStageRule {
  const fallbackRule = getFallbackMarketStageRule(input.sortOrder);
  if (!input.configuredRule) {
    return { rule: fallbackRule, source: "fallback", validationErrors: [] };
  }

  const validationErrors = validateMarketOfferStageRule(input.configuredRule);
  if (validationErrors.length > 0) {
    return { rule: fallbackRule, source: "fallback", validationErrors };
  }

  return { rule: input.configuredRule, source: "db", validationErrors: [] };
}

export function resolveMarketOfferPriceBand(input: {
  configuredBand?: { minBps: number; maxBps: number };
  offerType: MarketOrderOfferType;
}): ResolvedOfferPriceBand {
  const fallbackRule = FALLBACK_TYPE_RULE_BY_TYPE.get(input.offerType) ??
    FALLBACK_TYPE_RULE_BY_TYPE.get(MarketOrderOfferType.NORMAL);
  if (!fallbackRule) {
    throw new Error("NORMAL market offer fallback rule is missing.");
  }
  const fallbackBand = {
    minBps: fallbackRule.priceMultiplierMinBps,
    maxBps: fallbackRule.priceMultiplierMaxBps,
  };

  if (!input.configuredBand) {
    return {
      band: fallbackBand,
      source: "fallback",
      validationErrors: [],
    };
  }

  const validationErrors = validatePriceBand(input.configuredBand);
  if (validationErrors.length > 0) {
    return {
      band: fallbackBand,
      source: "fallback",
      validationErrors,
    };
  }

  return {
    band: input.configuredBand,
    source: "db",
    validationErrors: [],
  };
}

export function resolveMarketPricingConfig(
  typeRuleMetadata: unknown,
): ResolvedMarketPricingConfig {
  if (!isRecord(typeRuleMetadata) || !("marketPricing" in typeRuleMetadata)) {
    return {
      config: CANONICAL_MARKET_PRICING_CONFIG,
      source: "fallback",
      validationErrors: [],
    };
  }

  const configuredPricing = parseMarketPricingConfig(
    typeRuleMetadata.marketPricing,
  );

  if (configuredPricing.validationErrors.length > 0 || !configuredPricing.config) {
    return {
      config: CANONICAL_MARKET_PRICING_CONFIG,
      source: "fallback",
      validationErrors: configuredPricing.validationErrors,
    };
  }

  return {
    config: configuredPricing.config,
    source: "db",
    validationErrors: [],
  };
}

export function resolveMarketScaleConfig(
  typeRuleMetadata: unknown,
): ResolvedMarketScaleConfig {
  if (!isRecord(typeRuleMetadata) || !("marketScale" in typeRuleMetadata)) {
    return {
      config: CANONICAL_MARKET_SCALE_CONFIG,
      source: "fallback",
      validationErrors: [],
    };
  }

  const configuredScale = parseMarketScaleConfig(typeRuleMetadata.marketScale);

  if (configuredScale.validationErrors.length > 0 || !configuredScale.config) {
    return {
      config: CANONICAL_MARKET_SCALE_CONFIG,
      source: "fallback",
      validationErrors: configuredScale.validationErrors,
    };
  }

  return {
    config: configuredScale.config,
    source: "db",
    validationErrors: [],
  };
}

export function calculateMarketScaleWeightBps(input: {
  config: MarketScaleConfig;
  activeProductionLineCount: number;
  volumeClassKey: string;
}) {
  if (
    !Number.isInteger(input.activeProductionLineCount) ||
    input.activeProductionLineCount < 0
  ) {
    throw new RangeError(
      "activeProductionLineCount must be a non-negative integer",
    );
  }

  if (!isMarketVolumeClassKey(input.volumeClassKey)) return 10_000;

  const anchors = input.config.anchors;
  const firstAnchor = anchors[0];

  if (!firstAnchor) throw new Error("Market scale anchors are missing");
  if (
    input.activeProductionLineCount <= firstAnchor.activeProductionLineCount
  ) {
    return firstAnchor.volumeClassWeightsBps[input.volumeClassKey];
  }

  for (let index = 1; index < anchors.length; index += 1) {
    const left = anchors[index - 1];
    const right = anchors[index];

    if (input.activeProductionLineCount <= right.activeProductionLineCount) {
      const lineSpan =
        right.activeProductionLineCount - left.activeProductionLineCount;
      const lineOffset =
        input.activeProductionLineCount - left.activeProductionLineCount;
      const leftWeight = left.volumeClassWeightsBps[input.volumeClassKey];
      const rightWeight = right.volumeClassWeightsBps[input.volumeClassKey];

      return (
        leftWeight +
        Math.round(((rightWeight - leftWeight) * lineOffset) / lineSpan)
      );
    }
  }

  return anchors[anchors.length - 1].volumeClassWeightsBps[
    input.volumeClassKey
  ];
}

export function calculateQuantityPriceMultiplierBps(input: {
  config: MarketPricingConfig;
  totalOfferQuantity: number;
}) {
  if (
    !Number.isInteger(input.totalOfferQuantity) ||
    input.totalOfferQuantity < 0
  ) {
    throw new RangeError("totalOfferQuantity must be a non-negative integer");
  }

  const anchors = input.config.quantityAnchors;
  const firstAnchor = anchors[0];

  if (!firstAnchor) {
    throw new Error("Market pricing quantity anchors are missing");
  }
  if (input.totalOfferQuantity <= firstAnchor.totalOfferQuantity) {
    return firstAnchor.priceMultiplierBps;
  }

  for (let index = 1; index < anchors.length; index += 1) {
    const left = anchors[index - 1];
    const right = anchors[index];

    if (input.totalOfferQuantity <= right.totalOfferQuantity) {
      const quantitySpan = right.totalOfferQuantity - left.totalOfferQuantity;
      const quantityOffset = input.totalOfferQuantity - left.totalOfferQuantity;
      const discountSpan = left.priceMultiplierBps - right.priceMultiplierBps;

      return (
        left.priceMultiplierBps -
        Math.round((discountSpan * quantityOffset) / quantitySpan)
      );
    }
  }

  return anchors[anchors.length - 1].priceMultiplierBps;
}

function validateMarketOfferTypeRule(rule: MarketOfferTypeRuleConfig) {
  const errors = validatePriceBand({
    minBps: rule.priceMultiplierMinBps,
    maxBps: rule.priceMultiplierMaxBps,
  });

  if (
    !Number.isInteger(rule.generationWeightBps) ||
    rule.generationWeightBps < 0 ||
    rule.generationWeightBps > MAX_REASONABLE_BPS
  ) {
    errors.push("generationWeightBps is outside the safety range");
  }
  if (
    !Number.isInteger(rule.minDeliveryDays) ||
    rule.minDeliveryDays < 1 ||
    rule.minDeliveryDays > MAX_REASONABLE_DELIVERY_DAYS
  ) {
    errors.push("minDeliveryDays is outside the safety range");
  }
  if (
    !Number.isInteger(rule.maxDeliveryDays) ||
    rule.maxDeliveryDays < rule.minDeliveryDays ||
    rule.maxDeliveryDays > MAX_REASONABLE_DELIVERY_DAYS
  ) {
    errors.push("maxDeliveryDays must be at least minDeliveryDays");
  }
  if (
    !Number.isInteger(rule.offerExpiryDays) ||
    rule.offerExpiryDays < 1 ||
    rule.offerExpiryDays > MAX_REASONABLE_DELIVERY_DAYS
  ) {
    errors.push("offerExpiryDays is outside the safety range");
  }
  if (
    !Number.isInteger(rule.minimumIntervalDays) ||
    rule.minimumIntervalDays < 0 ||
    rule.minimumIntervalDays > MAX_REASONABLE_DELIVERY_DAYS
  ) {
    errors.push("minimumIntervalDays is outside the safety range");
  }

  return errors;
}

function validateMarketOfferStageRule(rule: MarketOfferStageRuleConfig) {
  const errors: string[] = [];

  if (
    !Number.isInteger(rule.targetActiveOfferCount) ||
    rule.targetActiveOfferCount < 1 ||
    rule.targetActiveOfferCount > MAX_REASONABLE_OFFER_COUNT
  ) {
    errors.push("targetActiveOfferCount is outside the safety range");
  }
  if (
    !Number.isInteger(rule.maxNewOffersPerDay) ||
    rule.maxNewOffersPerDay < 1 ||
    rule.maxNewOffersPerDay > MAX_REASONABLE_OFFER_COUNT
  ) {
    errors.push("maxNewOffersPerDay is outside the safety range");
  }

  return errors;
}

function validatePriceBand(band: { minBps: number; maxBps: number }) {
  const errors: string[] = [];

  if (
    !Number.isInteger(band.minBps) ||
    band.minBps < 1 ||
    band.minBps > MAX_REASONABLE_BPS
  ) {
    errors.push("priceMultiplierMinBps is outside the safety range");
  }
  if (
    !Number.isInteger(band.maxBps) ||
    band.maxBps < band.minBps ||
    band.maxBps > MAX_REASONABLE_BPS
  ) {
    errors.push("priceMultiplierMaxBps must be at least the minimum");
  }

  return errors;
}

function parseMarketPricingConfig(value: unknown): {
  config: MarketPricingConfig | null;
  validationErrors: string[];
} {
  const validationErrors: string[] = [];

  if (!isRecord(value)) {
    return {
      config: null,
      validationErrors: ["marketPricing must be an object"],
    };
  }

  if (value.balanceVersion !== MARKET_PRICING_BALANCE_VERSION) {
    validationErrors.push(
      `marketPricing.balanceVersion must be ${MARKET_PRICING_BALANCE_VERSION}`,
    );
  }
  if (value.model !== "PIECEWISE_LINEAR") {
    validationErrors.push("marketPricing.model must be PIECEWISE_LINEAR");
  }
  if (value.segmentPriceMultiplierMode !== "DISABLED") {
    validationErrors.push(
      "marketPricing.segmentPriceMultiplierMode is not supported in v4",
    );
  }
  if (value.volumePriceMultiplierMode !== "DISABLED") {
    validationErrors.push(
      "marketPricing.volumePriceMultiplierMode is not supported in v4",
    );
  }

  const rawAnchors = value.quantityAnchors;
  if (
    !Array.isArray(rawAnchors) ||
    rawAnchors.length < 2 ||
    rawAnchors.length > MAX_REASONABLE_QUANTITY_ANCHORS
  ) {
    validationErrors.push(
      "marketPricing.quantityAnchors must contain 2-20 anchors",
    );
  }

  const anchors: MarketPricingQuantityAnchor[] = [];
  if (Array.isArray(rawAnchors)) {
    for (const [index, rawAnchor] of rawAnchors.entries()) {
      if (!isRecord(rawAnchor)) {
        validationErrors.push(`quantityAnchors[${index}] must be an object`);
        continue;
      }

      const totalOfferQuantity = rawAnchor.totalOfferQuantity;
      const priceMultiplierBps = rawAnchor.priceMultiplierBps;

      if (
        !Number.isInteger(totalOfferQuantity) ||
        Number(totalOfferQuantity) < 0 ||
        Number(totalOfferQuantity) > MAX_REASONABLE_OFFER_QUANTITY
      ) {
        validationErrors.push(
          `quantityAnchors[${index}].totalOfferQuantity is outside the safety range`,
        );
      }
      if (
        !Number.isInteger(priceMultiplierBps) ||
        Number(priceMultiplierBps) < 1 ||
        Number(priceMultiplierBps) > MAX_REASONABLE_BPS
      ) {
        validationErrors.push(
          `quantityAnchors[${index}].priceMultiplierBps is outside the safety range`,
        );
      }

      if (
        Number.isInteger(totalOfferQuantity) &&
        Number.isInteger(priceMultiplierBps)
      ) {
        anchors.push({
          totalOfferQuantity: Number(totalOfferQuantity),
          priceMultiplierBps: Number(priceMultiplierBps),
        });
      }
    }
  }

  if (anchors[0]?.totalOfferQuantity !== 0) {
    validationErrors.push("The first quantity anchor must start at zero");
  }
  for (let index = 1; index < anchors.length; index += 1) {
    const previous = anchors[index - 1];
    const current = anchors[index];

    if (current.totalOfferQuantity <= previous.totalOfferQuantity) {
      validationErrors.push("Quantity anchors must be strictly increasing");
      break;
    }
    if (current.priceMultiplierBps > previous.priceMultiplierBps) {
      validationErrors.push(
        "Quantity price multipliers must be monotonically non-increasing",
      );
      break;
    }
  }

  if (validationErrors.length > 0) {
    return { config: null, validationErrors };
  }

  return {
    config: {
      balanceVersion: MARKET_PRICING_BALANCE_VERSION,
      model: "PIECEWISE_LINEAR",
      quantityAnchors: anchors,
      segmentPriceMultiplierMode: "DISABLED",
      volumePriceMultiplierMode: "DISABLED",
    },
    validationErrors: [],
  };
}

function parseMarketScaleConfig(value: unknown): {
  config: MarketScaleConfig | null;
  validationErrors: string[];
} {
  const validationErrors: string[] = [];

  if (!isRecord(value)) {
    return {
      config: null,
      validationErrors: ["marketScale must be an object"],
    };
  }

  if (value.balanceVersion !== MARKET_SCALE_BALANCE_VERSION) {
    validationErrors.push(
      `marketScale.balanceVersion must be ${MARKET_SCALE_BALANCE_VERSION}`,
    );
  }
  if (value.model !== "PIECEWISE_LINEAR") {
    validationErrors.push("marketScale.model must be PIECEWISE_LINEAR");
  }

  const rawAnchors = value.anchors;
  if (
    !Array.isArray(rawAnchors) ||
    rawAnchors.length < 2 ||
    rawAnchors.length > MAX_REASONABLE_MARKET_SCALE_ANCHORS
  ) {
    validationErrors.push("marketScale.anchors must contain 2-20 anchors");
  }

  const anchors: MarketScaleAnchor[] = [];
  const seenScaleKeys = new Set<string>();
  const seenLineCounts = new Set<number>();

  if (Array.isArray(rawAnchors)) {
    for (const [index, rawAnchor] of rawAnchors.entries()) {
      if (!isRecord(rawAnchor)) {
        validationErrors.push(`marketScale.anchors[${index}] must be an object`);
        continue;
      }

      const scaleKey = rawAnchor.scaleKey;
      const activeProductionLineCount = rawAnchor.activeProductionLineCount;
      const rawWeights = rawAnchor.volumeClassWeightsBps;

      if (typeof scaleKey !== "string" || !isMarketScaleKey(scaleKey)) {
        validationErrors.push(
          `marketScale.anchors[${index}].scaleKey is unknown`,
        );
      } else if (seenScaleKeys.has(scaleKey)) {
        validationErrors.push(
          `marketScale.anchors[${index}].scaleKey is duplicated`,
        );
      } else {
        seenScaleKeys.add(scaleKey);
      }

      if (
        !Number.isInteger(activeProductionLineCount) ||
        Number(activeProductionLineCount) < 0 ||
        Number(activeProductionLineCount) >
          MAX_REASONABLE_PRODUCTION_LINE_COUNT
      ) {
        validationErrors.push(
          `marketScale.anchors[${index}].activeProductionLineCount is outside the safety range`,
        );
      } else if (seenLineCounts.has(Number(activeProductionLineCount))) {
        validationErrors.push(
          `marketScale.anchors[${index}].activeProductionLineCount is duplicated`,
        );
      } else {
        seenLineCounts.add(Number(activeProductionLineCount));
      }

      if (!isRecord(rawWeights)) {
        validationErrors.push(
          `marketScale.anchors[${index}].volumeClassWeightsBps must be an object`,
        );
        continue;
      }

      const unknownVolumeKeys = Object.keys(rawWeights).filter(
        (key) => !isMarketVolumeClassKey(key),
      );
      if (unknownVolumeKeys.length > 0) {
        validationErrors.push(
          `marketScale.anchors[${index}] contains unknown volume classes: ${unknownVolumeKeys.join(", ")}`,
        );
      }

      const weights = {} as Record<MarketVolumeClassKey, number>;
      let hasPositiveWeight = false;
      for (const volumeClassKey of MARKET_VOLUME_CLASS_KEYS) {
        const weight = rawWeights[volumeClassKey];
        if (
          !Number.isInteger(weight) ||
          Number(weight) < 0 ||
          Number(weight) > MAX_REASONABLE_MARKET_SCALE_WEIGHT_BPS
        ) {
          validationErrors.push(
            `marketScale.anchors[${index}].volumeClassWeightsBps.${volumeClassKey} is outside the safety range`,
          );
          continue;
        }

        weights[volumeClassKey] = Number(weight);
        hasPositiveWeight ||= Number(weight) > 0;
      }
      if (!hasPositiveWeight) {
        validationErrors.push(
          `marketScale.anchors[${index}] must contain a positive weight`,
        );
      }

      if (
        isMarketScaleKey(scaleKey) &&
        Number.isInteger(activeProductionLineCount) &&
        MARKET_VOLUME_CLASS_KEYS.every(
          (volumeClassKey) => weights[volumeClassKey] !== undefined,
        )
      ) {
        anchors.push({
          scaleKey,
          activeProductionLineCount: Number(activeProductionLineCount),
          volumeClassWeightsBps: weights,
        });
      }
    }
  }

  if (anchors[0]?.activeProductionLineCount !== 0) {
    validationErrors.push("The first market scale anchor must start at zero");
  }
  for (let index = 1; index < anchors.length; index += 1) {
    if (
      anchors[index].activeProductionLineCount <=
      anchors[index - 1].activeProductionLineCount
    ) {
      validationErrors.push(
        "Market scale anchors must be strictly increasing by line count",
      );
      break;
    }
  }

  if (validationErrors.length > 0) {
    return { config: null, validationErrors };
  }

  return {
    config: {
      balanceVersion: MARKET_SCALE_BALANCE_VERSION,
      model: "PIECEWISE_LINEAR",
      anchors,
    },
    validationErrors: [],
  };
}

function isMarketScaleKey(value: unknown): value is MarketScaleKey {
  return (
    typeof value === "string" &&
    (MARKET_SCALE_KEYS as readonly string[]).includes(value)
  );
}

function isMarketVolumeClassKey(
  value: unknown,
): value is MarketVolumeClassKey {
  return (
    typeof value === "string" &&
    (MARKET_VOLUME_CLASS_KEYS as readonly string[]).includes(value)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
