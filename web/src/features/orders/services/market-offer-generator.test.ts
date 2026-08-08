import assert from "node:assert/strict";
import test from "node:test";

import { MarketOrderOfferType } from "@/generated/prisma/enums";
import {
  CANONICAL_MARKET_OFFER_TYPE_RULES,
  CANONICAL_MARKET_PRICING_CONFIG,
  CANONICAL_MARKET_SCALE_CONFIG,
  MARKET_OFFER_BALANCE_VERSION,
  MARKET_PRICING_BALANCE_VERSION,
  MARKET_SCALE_BALANCE_VERSION,
  calculateMarketScaleWeightBps,
  calculateQuantityPriceMultiplierBps,
  getFallbackMarketStageRule,
  resolveMarketOfferPriceBand,
  resolveMarketOfferStageRule,
  resolveMarketOfferTypeRules,
  resolveMarketPricingConfig,
  resolveMarketScaleConfig,
} from "@/lib/order-market/market-offer-config";

import {
  areCollectionTiersCompatible,
  buildMarketPricingMetadata,
  calculateDepartmentCostProfiles,
  calculateDynamicTierQuantityCap,
  calculateFactoryScaledCustomerWeight,
  calculateMarketOfferCreationCount,
  calculateCapacityTargetQuantity,
  calculateOfferUnitPriceCents,
  calculatePlannedItemQuantity,
  calculatePlannedUnitCostCents,
  calculateSharedFactoryMonthlyCostCents,
  filterCollectionCompatibleCandidates,
  pickProductTierForOffer,
  resolveFactoryScaleBand,
  resolveOfferItemCountRange,
  resolveOfferDeliveryRange,
  resolveOfferLoadProfile,
  resolveOfferPriceBand,
  resolveMarketStageRule,
} from "./market-offer-generator";

test("küçük teklifte canonical quantity eğrisi nötr kalır ve type kimliği korunur", () => {
  assert.deepEqual(resolveOfferPriceBand(MarketOrderOfferType.NORMAL), {
    minBps: 10_000,
    maxBps: 10_000,
  });
  assert.deepEqual(resolveOfferPriceBand(MarketOrderOfferType.OPPORTUNITY), {
    minBps: 10_400,
    maxBps: 10_800,
  });
  assert.deepEqual(resolveOfferPriceBand(MarketOrderOfferType.EXPRESS), {
    minBps: 11_500,
    maxBps: 11_600,
  });
  assert.deepEqual(
    resolveOfferPriceBand(MarketOrderOfferType.EXPRESS, {
      minBps: 11_500,
      maxBps: 13_500,
    }),
    { minBps: 11_500, maxBps: 13_500 },
  );
  assert.deepEqual(
    resolveOfferPriceBand(MarketOrderOfferType.OPPORTUNITY, {
      minBps: 11_000,
      maxBps: 12_500,
    }),
    { minBps: 11_000, maxBps: 12_500 },
  );
  assert.equal(
    calculateOfferUnitPriceCents({
      baseUnitPriceCents: 845,
      quantityPriceMultiplierBps: 10_000,
      typePriceMultiplierBps: 10_000,
    }),
    845,
  );
  assert.equal(
    calculateOfferUnitPriceCents({
      baseUnitPriceCents: 845,
      quantityPriceMultiplierBps: 10_000,
      typePriceMultiplierBps: 10_800,
    }),
    913,
  );
});

test("DB type rule varsa bütün ekonomik alanlarda DB authoritative olur", () => {
  const configuredRule = {
    offerType: MarketOrderOfferType.OPPORTUNITY,
    generationWeightBps: 4321,
    minDeliveryDays: 11,
    maxDeliveryDays: 19,
    offerExpiryDays: 4,
    minimumIntervalDays: 6,
    priceMultiplierMinBps: 11_000,
    priceMultiplierMaxBps: 12_500,
  };
  const result = resolveMarketOfferTypeRules([configuredRule]);

  assert.deepEqual(
    result.rules.find(
      (rule) => rule.offerType === MarketOrderOfferType.OPPORTUNITY,
    ),
    configuredRule,
  );
  assert.equal(result.sources.OPPORTUNITY, "db");
  assert.equal(result.sources.NORMAL, "fallback");
  assert.deepEqual(result.validationErrors, []);
});

test("eksik DB type rule canonical fallback ile tamamlanır", () => {
  const result = resolveMarketOfferTypeRules([]);

  assert.deepEqual(result.rules, CANONICAL_MARKET_OFFER_TYPE_RULES);
  assert.deepEqual(result.sources, {
    NORMAL: "fallback",
    OPPORTUNITY: "fallback",
    EXPRESS: "fallback",
    REPEAT: "fallback",
  });
});

test("tüm DB type ağırlıkları sıfırsa açık validation ile fallback kullanılır", () => {
  const configuredRules = CANONICAL_MARKET_OFFER_TYPE_RULES.map((rule) => ({
    ...rule,
    generationWeightBps: 0,
  }));
  const result = resolveMarketOfferTypeRules(configuredRules);

  assert.deepEqual(result.rules, CANONICAL_MARKET_OFFER_TYPE_RULES);
  assert.ok(result.validationErrors.length > 0);
  assert.ok(Object.values(result.sources).every((source) => source === "fallback"));
});

test("valid DB price band hard-coded politika tarafından sessizce daraltılmaz", () => {
  const result = resolveMarketOfferPriceBand({
    configuredBand: { minBps: 11_000, maxBps: 12_500 },
    offerType: MarketOrderOfferType.OPPORTUNITY,
  });

  assert.deepEqual(result.band, { minBps: 11_000, maxBps: 12_500 });
  assert.equal(result.source, "db");
  assert.deepEqual(result.validationErrors, []);
});

test("invalid DB price band açık validation ile safe fallback kullanır", () => {
  const result = resolveMarketOfferPriceBand({
    configuredBand: { minBps: 12_500, maxBps: 11_000 },
    offerType: MarketOrderOfferType.OPPORTUNITY,
  });

  assert.deepEqual(result.band, { minBps: 10_400, maxBps: 10_800 });
  assert.equal(result.source, "fallback");
  assert.ok(result.validationErrors.length > 0);
});

test("canonical seed snapshot type dağılımı ve efektif fiyat davranışını korur", () => {
  assert.deepEqual(
    CANONICAL_MARKET_OFFER_TYPE_RULES.map((rule) => ({
      offerType: rule.offerType,
      generationWeightBps: rule.generationWeightBps,
      delivery: [rule.minDeliveryDays, rule.maxDeliveryDays],
      priceBand: [rule.priceMultiplierMinBps, rule.priceMultiplierMaxBps],
    })),
    [
      {
        offerType: MarketOrderOfferType.NORMAL,
        generationWeightBps: 6500,
        delivery: [20, 24],
        priceBand: [10_000, 10_000],
      },
      {
        offerType: MarketOrderOfferType.OPPORTUNITY,
        generationWeightBps: 1200,
        delivery: [12, 15],
        priceBand: [10_400, 10_800],
      },
      {
        offerType: MarketOrderOfferType.EXPRESS,
        generationWeightBps: 1000,
        delivery: [7, 10],
        priceBand: [11_500, 11_600],
      },
      {
        offerType: MarketOrderOfferType.REPEAT,
        generationWeightBps: 1300,
        delivery: [18, 24],
        priceBand: [10_000, 10_200],
      },
    ],
  );

  assert.equal(
    calculateOfferUnitPriceCents({
      baseUnitPriceCents: 845,
      quantityPriceMultiplierBps: 10_000,
      typePriceMultiplierBps: 10_800,
    }),
    913,
  );
});

test("canonical cutover legacy DB + hard-policy efektif type davranışıyla birebir eşleşir", () => {
  const legacyDbBands = {
    NORMAL: { minBps: 9800, maxBps: 10_300 },
    OPPORTUNITY: { minBps: 11_000, maxBps: 12_500 },
    EXPRESS: { minBps: 11_500, maxBps: 13_500 },
    REPEAT: { minBps: 10_000, maxBps: 10_800 },
  } satisfies Record<MarketOrderOfferType, { minBps: number; maxBps: number }>;
  const legacyHardBands = {
    NORMAL: { minBps: 10_000, maxBps: 10_000 },
    OPPORTUNITY: { minBps: 10_400, maxBps: 10_800 },
    EXPRESS: { minBps: 11_000, maxBps: 11_600 },
    REPEAT: { minBps: 9900, maxBps: 10_200 },
  } satisfies Record<MarketOrderOfferType, { minBps: number; maxBps: number }>;
  const legacyDbDelivery = {
    NORMAL: { minDays: 18, maxDays: 24 },
    OPPORTUNITY: { minDays: 12, maxDays: 20 },
    EXPRESS: { minDays: 7, maxDays: 12 },
    REPEAT: { minDays: 14, maxDays: 20 },
  } satisfies Record<MarketOrderOfferType, { minDays: number; maxDays: number }>;
  const legacyHardDelivery = {
    NORMAL: { minDays: 20, maxDays: 24 },
    OPPORTUNITY: { minDays: 12, maxDays: 15 },
    EXPRESS: { minDays: 7, maxDays: 10 },
    REPEAT: { minDays: 18, maxDays: 24 },
  } satisfies Record<MarketOrderOfferType, { minDays: number; maxDays: number }>;

  for (const canonicalRule of CANONICAL_MARKET_OFFER_TYPE_RULES) {
    const legacyDb = legacyDbBands[canonicalRule.offerType];
    const legacyHard = legacyHardBands[canonicalRule.offerType];
    const intersection = {
      minBps: Math.max(legacyDb.minBps, legacyHard.minBps),
      maxBps: Math.min(legacyDb.maxBps, legacyHard.maxBps),
    };
    const legacyEffective =
      intersection.minBps <= intersection.maxBps ? intersection : legacyHard;

    assert.deepEqual(legacyEffective, {
      minBps: canonicalRule.priceMultiplierMinBps,
      maxBps: canonicalRule.priceMultiplierMaxBps,
    });

    const legacyDbRange = legacyDbDelivery[canonicalRule.offerType];
    const legacyHardRange = legacyHardDelivery[canonicalRule.offerType];
    const legacyEffectiveDelivery =
      canonicalRule.offerType === MarketOrderOfferType.EXPRESS ||
      canonicalRule.offerType === MarketOrderOfferType.OPPORTUNITY
        ? legacyHardRange
        : {
            minDays: Math.max(legacyDbRange.minDays, legacyHardRange.minDays),
            maxDays: Math.max(legacyDbRange.maxDays, legacyHardRange.maxDays),
          };

    assert.deepEqual(legacyEffectiveDelivery, {
      minDays: canonicalRule.minDeliveryDays,
      maxDays: canonicalRule.maxDeliveryDays,
    });
  }
});

test("segment ve volume price multiplier Faz 2 v4'te pasif kalır", () => {
  const finalPrices = [
    { segmentPriceMultiplierBps: 9000, volumePriceMultiplierBps: 8500 },
    { segmentPriceMultiplierBps: 13_000, volumePriceMultiplierBps: 12_000 },
  ].map(() =>
    calculateOfferUnitPriceCents({
      baseUnitPriceCents: 845,
      quantityPriceMultiplierBps: 9_000,
      typePriceMultiplierBps: 10_800,
    }),
  );

  assert.deepEqual(finalPrices, [821, 821]);
  assert.equal(
    CANONICAL_MARKET_PRICING_CONFIG.segmentPriceMultiplierMode,
    "DISABLED",
  );
  assert.equal(
    CANONICAL_MARKET_PRICING_CONFIG.volumePriceMultiplierMode,
    "DISABLED",
  );
});

test("canonical v4 quantity pressure anchorları seçilen Q2 eğrisini kilitler", () => {
  assert.equal(MARKET_PRICING_BALANCE_VERSION, 4);
  assert.deepEqual(CANONICAL_MARKET_PRICING_CONFIG.quantityAnchors, [
    { totalOfferQuantity: 0, priceMultiplierBps: 10_000 },
    { totalOfferQuantity: 10_000, priceMultiplierBps: 10_000 },
    { totalOfferQuantity: 25_000, priceMultiplierBps: 9_700 },
    { totalOfferQuantity: 50_000, priceMultiplierBps: 9_000 },
    { totalOfferQuantity: 100_000, priceMultiplierBps: 8_100 },
    { totalOfferQuantity: 200_000, priceMultiplierBps: 7_300 },
  ]);

  const expected = new Map([
    [5_000, 10_000],
    [10_000, 10_000],
    [25_000, 9_700],
    [50_000, 9_000],
    [100_000, 8_100],
    [200_000, 7_300],
    [300_000, 7_300],
  ]);

  for (const [totalOfferQuantity, priceMultiplierBps] of expected) {
    assert.equal(
      calculateQuantityPriceMultiplierBps({
        config: CANONICAL_MARKET_PRICING_CONFIG,
        totalOfferQuantity,
      }),
      priceMultiplierBps,
    );
  }
});

test("yeni generated pricing fixture v5 offer ve v4 pricing snapshotı taşır", () => {
  assert.deepEqual(
    buildMarketPricingMetadata({
      config: CANONICAL_MARKET_PRICING_CONFIG,
      quantityPriceMultiplierBps: 9_000,
      totalOfferQuantity: 50_000,
      typePriceMultiplierBps: 10_000,
    }),
    {
      balanceVersion: 5,
      pricingBalanceVersion: 4,
      pricingModel: "PIECEWISE_LINEAR",
      quantityPriceMultiplierBps: 9_000,
      roundingMode: "HALF_UP_SINGLE_COMPOUND_INTEGER",
      segmentPriceMultiplierMode: "DISABLED",
      totalOfferQuantity: 50_000,
      typePriceMultiplierBps: 10_000,
      volumePriceMultiplierMode: "DISABLED",
    },
  );
  assert.equal(MARKET_OFFER_BALANCE_VERSION, 5);
  assert.equal(MARKET_SCALE_BALANCE_VERSION, 5);
  assert.equal(MARKET_PRICING_BALANCE_VERSION, 4);
});

test("quantity pressure monotoniktir ve anchor sınırlarında cliff üretmez", () => {
  let previousMultiplier = Number.POSITIVE_INFINITY;

  for (let quantity = 0; quantity <= 250_000; quantity += 250) {
    const multiplier = calculateQuantityPriceMultiplierBps({
      config: CANONICAL_MARKET_PRICING_CONFIG,
      totalOfferQuantity: quantity,
    });
    assert.ok(multiplier <= previousMultiplier);
    previousMultiplier = multiplier;
  }

  for (const boundary of [10_000, 25_000, 50_000, 100_000, 200_000]) {
    const values = [boundary - 1, boundary, boundary + 1].map(
      (totalOfferQuantity) =>
        calculateQuantityPriceMultiplierBps({
          config: CANONICAL_MARKET_PRICING_CONFIG,
          totalOfferQuantity,
        }),
    );
    assert.ok(Math.max(...values) - Math.min(...values) <= 1);
  }
});

test("valid DB market pricing config authoritative, invalid config explicit fallback olur", () => {
  const validConfig = {
    balanceVersion: 4,
    model: "PIECEWISE_LINEAR",
    quantityAnchors: [
      { totalOfferQuantity: 0, priceMultiplierBps: 10_000 },
      { totalOfferQuantity: 100_000, priceMultiplierBps: 8_500 },
    ],
    segmentPriceMultiplierMode: "DISABLED",
    volumePriceMultiplierMode: "DISABLED",
  };
  const validResult = resolveMarketPricingConfig({ marketPricing: validConfig });

  assert.equal(validResult.source, "db");
  assert.deepEqual(validResult.config, validConfig);
  assert.deepEqual(validResult.validationErrors, []);

  const invalidResult = resolveMarketPricingConfig({
    marketPricing: {
      ...validConfig,
      quantityAnchors: [
        { totalOfferQuantity: 0, priceMultiplierBps: 9_000 },
        { totalOfferQuantity: 100_000, priceMultiplierBps: 10_000 },
      ],
    },
  });

  assert.equal(invalidResult.source, "fallback");
  assert.deepEqual(invalidResult.config, CANONICAL_MARKET_PRICING_CONFIG);
  assert.ok(invalidResult.validationErrors.length > 0);
});

test("total offer quantity multi-item fiyat politikasını tek kez belirler", () => {
  const totalOfferMultiplier = calculateQuantityPriceMultiplierBps({
    config: CANONICAL_MARKET_PRICING_CONFIG,
    totalOfferQuantity: 50_000,
  });
  const itemOnlyMultiplier = calculateQuantityPriceMultiplierBps({
    config: CANONICAL_MARKET_PRICING_CONFIG,
    totalOfferQuantity: 25_000,
  });

  assert.equal(totalOfferMultiplier, 9_000);
  assert.equal(itemOnlyMultiplier, 9_700);
  assert.deepEqual(
    [294, 692].map((baseUnitPriceCents) =>
      calculateOfferUnitPriceCents({
        baseUnitPriceCents,
        quantityPriceMultiplierBps: totalOfferMultiplier,
        typePriceMultiplierBps: 10_000,
      }),
    ),
    [265, 623],
  );
});

test("offer type premiumi ve büyük siparişte total profit progression korunur", () => {
  const price = (quantity: number, typePriceMultiplierBps = 10_000) =>
    calculateOfferUnitPriceCents({
      baseUnitPriceCents: 294,
      quantityPriceMultiplierBps: calculateQuantityPriceMultiplierBps({
        config: CANONICAL_MARKET_PRICING_CONFIG,
        totalOfferQuantity: quantity,
      }),
      typePriceMultiplierBps,
    });
  const profit = (quantity: number) => BigInt(price(quantity) - 155) * BigInt(quantity);

  assert.ok(price(100_000, 11_500) > price(100_000));
  assert.ok(price(100_000, 10_400) > price(100_000));
  assert.ok(profit(100_000) > profit(25_000));
  assert.ok(profit(200_000) > profit(100_000));
  assert.equal(
    calculateOfferUnitPriceCents({
      baseUnitPriceCents: 1,
      quantityPriceMultiplierBps: 7_300,
      typePriceMultiplierBps: 10_000,
    }),
    1,
  );
});

test("departman maliyeti hatları tek havuzda toplar ve kondisyon kaybını puan maliyetine yansıtır", () => {
  const costs = calculateDepartmentCostProfiles({
    monthlyWorkDays: 22,
    lines: [
      {
        departmentId: "sewing",
        conditionBps: 10_000,
        status: "IDLE",
        productionLineTemplate: {
          dailyPointCapacity: 10_000,
          directCostPer1000PointsCents: 2_000,
        },
      },
      {
        departmentId: "sewing",
        conditionBps: 5_000,
        status: "RUNNING",
        productionLineTemplate: {
          dailyPointCapacity: 10_000,
          directCostPer1000PointsCents: 2_000,
        },
      },
    ],
  });

  assert.deepEqual(costs.get("sewing"), {
    departmentId: "sewing",
    effectiveDailyPointCapacity: 15_000,
    monthlyDirectCostCents: 880_000,
    costPer1000PointsCents: 2_667,
  });
});

test("ortak fabrika maliyeti destek kadrosunu ve üretim dışı alanı rota sayısına bölmeden toplar", () => {
  const breakdown = calculateSharedFactoryMonthlyCostCents({
    monthlyWorkDays: 22,
    rentPerM2Cents: 200,
    stage: {
      accessoryWarehouseM2: 30,
      canteenFixedCents: 12_000,
      commonAreaBps: 1_200,
      dailySupportMealPerStaffCents: 235,
      fabricWarehouseM2: 100,
      facilityElectricityCents: 45_000,
      officeSocialTechnicalM2: 120,
      overheadBaseCents: 65_000,
      productWarehouseM2: 70,
      staffElectricityExtraCents: 10_000,
      supportOverheadPerStaffCents: 600,
    },
    supportStaffAssignments: [
      { quantity: 2, staffRole: { monthlySalaryCents: 50_000 } },
      { quantity: 1, staffRole: { monthlySalaryCents: 70_000 } },
    ],
    totalProductionLineAreaM2: 300,
  });

  assert.deepEqual(breakdown, {
    supportStaffCount: 3,
    supportPayrollCents: 170_000,
    totalProductionLineAreaM2: 300,
    commonAreaM2: 60,
    nonProductionAreaM2: 380,
    nonProductionAreaRentCents: 76_000,
    facilityElectricityCents: 55_000,
    supportMealCents: 15_510,
    supportOverheadCents: 1_800,
    fixedStageCostCents: 77_000,
    sharedFactoryCostCents: 395_310,
  });
});

test("planlanan maliyet rota, setup, ortak gider, leasing ve fasonu bir kez toplar", () => {
  const breakdown = calculatePlannedUnitCostCents({
    bottleneckDailyQuantity: 100,
    departmentCostById: new Map([
      [
        "cutting",
        {
          departmentId: "cutting",
          effectiveDailyPointCapacity: 10_000,
          monthlyDirectCostCents: 440_000,
          costPer1000PointsCents: 2_000,
        },
      ],
      [
        "sewing",
        {
          departmentId: "sewing",
          effectiveDailyPointCapacity: 10_000,
          monthlyDirectCostCents: 660_000,
          costPer1000PointsCents: 3_000,
        },
      ],
      [
        "finishing",
        {
          departmentId: "finishing",
          effectiveDailyPointCapacity: 10_000,
          monthlyDirectCostCents: 220_000,
          costPer1000PointsCents: 1_000,
        },
      ],
    ]),
    leasingPaymentCents: 22_000,
    monthlySharedFactoryCostCents: 100_000,
    monthlyWorkDays: 22,
    outsourceUnitCostCents: 20,
    quantity: 100,
    routeSteps: [
      {
        departmentDailyPointCapacity: 10_000,
        departmentId: "cutting",
        isRequired: true,
        setupPoints: 100,
        workloadPointsPerUnit: 50,
      },
      {
        departmentDailyPointCapacity: 10_000,
        departmentId: "sewing",
        isRequired: true,
        setupPoints: 200,
        workloadPointsPerUnit: 100,
      },
      {
        departmentDailyPointCapacity: 10_000,
        departmentId: "finishing",
        isRequired: true,
        setupPoints: 50,
        workloadPointsPerUnit: 20,
      },
    ],
  });

  assert.deepEqual(breakdown, {
    directRouteUnitCostCents: 420,
    setupUnitCostCents: 9,
    sharedFactoryUnitCostCents: 46,
    leasingUnitCostCents: 10,
    outsourceUnitCostCents: 20,
    referenceMonthlyQuantity: 2_200,
    totalUnitCostCents: 505,
  });
});

test("normal standard sipariş müşteri sınıfındaki 4-7 üretim gününü kullanır", () => {
  const profile = resolveOfferLoadProfile({
    maxOfferLoadBps: 7000,
    offerType: MarketOrderOfferType.NORMAL,
    primaryTier: "STANDARD",
    quantityMultiplierBps: 10000,
    seed: "regular-standard",
    targetProductionDayMax: 7,
    targetProductionDayMin: 4,
    volumeClassKey: "regular",
  });

  assert.equal(profile.isLargeBasicBlock, false);
  assert.ok(profile.targetLoadDaysBps >= 40_000);
  assert.ok(profile.targetLoadDaysBps <= 70_000);
});

test("yüksek hacimli normal siparişlerde 6-10 ve 8-12 günlük müşteri bantları korunur", () => {
  const largeRetail = resolveOfferLoadProfile({
    maxOfferLoadBps: 8000,
    offerType: MarketOrderOfferType.NORMAL,
    primaryTier: "STANDARD",
    quantityMultiplierBps: 17000,
    seed: "large-retail-standard",
    targetProductionDayMax: 10,
    targetProductionDayMin: 6,
    volumeClassKey: "large_retail",
  });
  const massDistribution = resolveOfferLoadProfile({
    maxOfferLoadBps: 8500,
    offerType: MarketOrderOfferType.NORMAL,
    primaryTier: "STANDARD",
    quantityMultiplierBps: 25000,
    seed: "mass-standard",
    targetProductionDayMax: 12,
    targetProductionDayMin: 8,
    volumeClassKey: "mass_distribution",
  });

  assert.ok(largeRetail.targetLoadDaysBps >= 60_000);
  assert.ok(largeRetail.targetLoadDaysBps <= 100_000);
  assert.ok(massDistribution.targetLoadDaysBps >= 80_000);
  assert.ok(massDistribution.targetLoadDaysBps <= 120_000);
});

test("canonical express 7-10 ve fırsat 12-15 DB terminleri aynen kullanılır", () => {
  assert.deepEqual(
    resolveOfferDeliveryRange({
      isLargeBasicBlock: false,
      offerType: MarketOrderOfferType.EXPRESS,
      ruleMaxDeliveryDays: 10,
      ruleMinDeliveryDays: 7,
    }),
    { maxDays: 10, minDays: 7 },
  );
  assert.deepEqual(
    resolveOfferDeliveryRange({
      isLargeBasicBlock: false,
      offerType: MarketOrderOfferType.OPPORTUNITY,
      ruleMaxDeliveryDays: 15,
      ruleMinDeliveryDays: 12,
    }),
    { maxDays: 15, minDays: 12 },
  );
});

test("valid DB delivery band hard-coded termin tarafından değiştirilmez", () => {
  assert.deepEqual(
    resolveOfferDeliveryRange({
      isLargeBasicBlock: false,
      offerType: MarketOrderOfferType.OPPORTUNITY,
      ruleMaxDeliveryDays: 19,
      ruleMinDeliveryDays: 11,
    }),
    { maxDays: 19, minDays: 11 },
  );
});

test("sipariş adedi hat kapasitesi 10 kat büyüyünce 10 kat ölçeklenir", () => {
  const twoLineQuantity = calculateCapacityTargetQuantity({
    bottleneckDailyQuantity: 200,
    targetLoadDaysBps: 40_000,
  });
  const twentyLineQuantity = calculateCapacityTargetQuantity({
    bottleneckDailyQuantity: 2000,
    targetLoadDaysBps: 40_000,
  });

  assert.equal(twoLineQuantity, 800);
  assert.equal(twentyLineQuantity, 8000);
});

test("dinamik adet tavanı büyürken segment mutlak sınırlarını aşmaz", () => {
  assert.deepEqual(
    calculateDynamicTierQuantityCap({
      baseTierCapMax: 30_000,
      capacityTargetQuantity: 509_000,
      productTier: "BASIC",
      volumeClassKey: "large_retail",
    }),
    {
      dynamicTierCapMax: 123_500,
      effectiveTierCapMax: 100_000,
      globalTierCapMax: 100_000,
    },
  );
  assert.deepEqual(
    calculateDynamicTierQuantityCap({
      baseTierCapMax: 10_000,
      capacityTargetQuantity: 237_480,
      productTier: "PREMIUM",
      volumeClassKey: "large_retail",
    }),
    {
      dynamicTierCapMax: 48_500,
      effectiveTierCapMax: 48_500,
      globalTierCapMax: 50_000,
    },
  );
  assert.equal(
    calculateDynamicTierQuantityCap({
      baseTierCapMax: 8_000,
      capacityTargetQuantity: 100_000,
      productTier: "LUXURY",
      volumeClassKey: "mass_distribution",
    }).effectiveTierCapMax,
    10_000,
  );
});

test("küçük parti sabit kalır, büyük sipariş ürün darboğazına göre ölçeklenir", () => {
  const smallBatch = calculatePlannedItemQuantity({
    allocatedRawQuantity: 200_000,
    baseTierCapMax: 3_000,
    bottleneckDailyQuantity: 50_000,
    productTier: "BASIC",
    targetLoadDaysBps: 40_000,
    tierCapMin: 300,
    volumeClassKey: "small_batch",
  });
  const enterpriseBasic = calculatePlannedItemQuantity({
    allocatedRawQuantity: 509_000,
    baseTierCapMax: 30_000,
    bottleneckDailyQuantity: 50_890,
    productTier: "BASIC",
    targetLoadDaysBps: 100_000,
    tierCapMin: 5_000,
    volumeClassKey: "large_retail",
  });
  const routeLimitedStandard = calculatePlannedItemQuantity({
    allocatedRawQuantity: 100_000,
    baseTierCapMax: 40_000,
    bottleneckDailyQuantity: 2_115,
    productTier: "STANDARD",
    targetLoadDaysBps: 120_000,
    tierCapMin: 8_000,
    volumeClassKey: "mass_distribution",
  });

  assert.equal(smallBatch.quantity, 3_000);
  assert.equal(enterpriseBasic.quantity, 100_000);
  assert.equal(routeLimitedStandard.capacityTargetQuantity, 25_380);
  assert.equal(routeLimitedStandard.quantity, 25_000);
});

test("fabrika ölçeği yüksek hacimli müşteriyi smooth progression ile görünür kılar", () => {
  assert.equal(resolveFactoryScaleBand(12), "COMPACT");
  assert.equal(resolveFactoryScaleBand(32), "INDUSTRIAL");
  assert.equal(resolveFactoryScaleBand(83), "ENTERPRISE");

  const lineCounts = [20, 40, 80, 120, 175, 250];
  const largeWeights = lineCounts.map((activeProductionLineCount) =>
    calculateFactoryScaledCustomerWeight({
      activeProductionLineCount,
      baseWeight: 1_000,
      marketScaleConfig: CANONICAL_MARKET_SCALE_CONFIG,
      volumeClassKey: "large_retail",
    }),
  );
  const massWeights = lineCounts.map((activeProductionLineCount) =>
    calculateFactoryScaledCustomerWeight({
      activeProductionLineCount,
      baseWeight: 100,
      marketScaleConfig: CANONICAL_MARKET_SCALE_CONFIG,
      volumeClassKey: "mass_distribution",
    }),
  );

  for (let index = 1; index < lineCounts.length; index += 1) {
    assert.ok(largeWeights[index] > largeWeights[index - 1]);
    assert.ok(massWeights[index] > massWeights[index - 1]);
  }
});

test("market scale anchor interpolasyonu 30→31 ve 60→61 teknik cliff üretmez", () => {
  const weight = (activeProductionLineCount: number, volumeClassKey: string) =>
    calculateMarketScaleWeightBps({
      activeProductionLineCount,
      config: CANONICAL_MARKET_SCALE_CONFIG,
      volumeClassKey,
    });

  assert.equal(weight(30, "mass_distribution"), 40_000);
  assert.equal(weight(31, "mass_distribution"), 64_000);
  assert.equal(weight(60, "mass_distribution"), 800_000);
  assert.equal(weight(61, "mass_distribution"), 817_500);
  assert.ok(weight(31, "large_retail") - weight(30, "large_retail") <= 1_100);
  assert.ok(weight(61, "large_retail") - weight(60, "large_retail") <= 300);
});

test("valid DB market scale config authoritative, eksik ve invalid config fallback olur", () => {
  const validConfig = structuredClone(CANONICAL_MARKET_SCALE_CONFIG);
  validConfig.anchors[3].volumeClassWeightsBps.large_retail = 31_000;

  const validResult = resolveMarketScaleConfig({ marketScale: validConfig });
  assert.equal(validResult.source, "db");
  assert.deepEqual(validResult.config, validConfig);
  assert.deepEqual(validResult.validationErrors, []);

  const missingResult = resolveMarketScaleConfig({});
  assert.equal(missingResult.source, "fallback");
  assert.deepEqual(missingResult.config, CANONICAL_MARKET_SCALE_CONFIG);
  assert.deepEqual(missingResult.validationErrors, []);

  const invalidConfig = structuredClone(CANONICAL_MARKET_SCALE_CONFIG) as {
    anchors: Array<{
      scaleKey: string;
      activeProductionLineCount: number;
      volumeClassWeightsBps: Record<string, number>;
    }>;
    balanceVersion: number;
    model: string;
  };
  invalidConfig.anchors[1].scaleKey = "START";
  invalidConfig.anchors[2].volumeClassWeightsBps.unknown_volume = 5_000;
  invalidConfig.anchors[2].volumeClassWeightsBps.regular = -1;
  invalidConfig.anchors[3].volumeClassWeightsBps.mass_distribution = 5_000_001;

  const invalidResult = resolveMarketScaleConfig({
    marketScale: invalidConfig,
  });
  assert.equal(invalidResult.source, "fallback");
  assert.deepEqual(invalidResult.config, CANONICAL_MARKET_SCALE_CONFIG);
  assert.ok(
    invalidResult.validationErrors.some((error) => error.includes("duplicated")),
  );
  assert.ok(
    invalidResult.validationErrors.some((error) => error.includes("unknown volume")),
  );
  assert.ok(
    invalidResult.validationErrors.some((error) =>
      error.includes("outside the safety range"),
    ),
  );
});

test("büyük fabrikada hacimli siparişler 1-2 üründe kalır, kapsül koleksiyon korunur", () => {
  assert.deepEqual(
    resolveOfferItemCountRange({
      configuredMax: 4,
      configuredMin: 2,
      factoryScaleBand: "ENTERPRISE",
      volumeClassKey: "large_retail",
    }),
    { min: 1, max: 2 },
  );
  assert.deepEqual(
    resolveOfferItemCountRange({
      configuredMax: 3,
      configuredMin: 1,
      factoryScaleBand: "INDUSTRIAL",
      volumeClassKey: "regular",
    }),
    { min: 1, max: 2 },
  );
  assert.deepEqual(
    resolveOfferItemCountRange({
      configuredMax: 6,
      configuredMin: 3,
      factoryScaleBand: "ENTERPRISE",
      volumeClassKey: "capsule_collection",
    }),
    { min: 3, max: 6 },
  );
});

test("basic büyük blok siparişler seyrek oluşur ama yük ve termin bandı ayrıdır", () => {
  let profile: ReturnType<typeof resolveOfferLoadProfile> | null = null;

  for (let index = 0; index < 2000; index += 1) {
    const candidate = resolveOfferLoadProfile({
      maxOfferLoadBps: 8500,
      offerType: MarketOrderOfferType.NORMAL,
      primaryTier: "BASIC",
      quantityMultiplierBps: 25000,
      seed: `mass-basic-${index}`,
      targetProductionDayMax: 12,
      targetProductionDayMin: 8,
      volumeClassKey: "mass_distribution",
    });

    if (candidate.isLargeBasicBlock) {
      profile = candidate;
      break;
    }
  }

  assert.ok(profile, "deterministik seed aralığında basic büyük blok bulunmalı");
  assert.ok(profile.targetLoadDaysBps >= 80_000);
  assert.ok(profile.targetLoadDaysBps <= 120_000);
  assert.deepEqual(
    resolveOfferDeliveryRange({
      isLargeBasicBlock: profile.isLargeBasicBlock,
      offerType: MarketOrderOfferType.NORMAL,
      ruleMaxDeliveryDays: 24,
      ruleMinDeliveryDays: 20,
    }),
    { maxDays: 30, minDays: 24 },
  );
});

test("koleksiyon yalnızca tek bir ürün grubunda kalır", () => {
  assert.equal(areCollectionTiersCompatible("BASIC", "BASIC"), true);
  assert.equal(areCollectionTiersCompatible("BASIC", "STANDARD"), false);
  assert.equal(areCollectionTiersCompatible("STANDARD", "PREMIUM"), false);
  assert.equal(areCollectionTiersCompatible("PREMIUM", "LUXURY"), false);
  assert.equal(areCollectionTiersCompatible("BASIC", "PREMIUM"), false);
  assert.equal(areCollectionTiersCompatible("BASIC", "LUXURY"), false);
  assert.equal(areCollectionTiersCompatible("STANDARD", "LUXURY"), false);
});

test("koleksiyon filtresi seçilmiş tüm tierlarla uyumlu adayları bırakır", () => {
  const candidates = [
    { id: "basic", tier: "BASIC" as const },
    { id: "standard", tier: "STANDARD" as const },
    { id: "premium", tier: "PREMIUM" as const },
    { id: "luxury", tier: "LUXURY" as const },
  ];

  assert.deepEqual(
    filterCollectionCompatibleCandidates(candidates, ["BASIC"]).map(
      (candidate) => candidate.id,
    ),
    ["basic"],
  );
  assert.deepEqual(
    filterCollectionCompatibleCandidates(candidates, ["STANDARD"]).map(
      (candidate) => candidate.id,
    ),
    ["standard"],
  );
  assert.deepEqual(
    filterCollectionCompatibleCandidates(candidates, ["BASIC", "STANDARD"]).map(
      (candidate) => candidate.id,
    ),
    [],
  );
  assert.deepEqual(
    filterCollectionCompatibleCandidates(candidates, ["PREMIUM"]).map(
      (candidate) => candidate.id,
    ),
    ["premium"],
  );
});

test("ürün grubu seçimi müşterisi ve ürünü bulunan en az temsil edilen havuzu doldurur", () => {
  const tier = pickProductTierForOffer({
    activeTierCounts: new Map([
      ["BASIC", 2],
      ["STANDARD", 0],
    ]),
    candidates: [{ tier: "BASIC" }, { tier: "STANDARD" }],
    customers: [{ productTier: "BASIC" }, { productTier: "STANDARD" }],
    seed: "balanced-tier",
    usedTierCounts: new Map(),
  });

  assert.equal(tier, "STANDARD");
});

test("canonical stage snapshot micro-enterprise gameplay paritysini korur", () => {
  const stages = [
    { sortOrder: 10, beforeTarget: 5, beforeDaily: 2, target: 3, daily: 1 },
    { sortOrder: 20, beforeTarget: 6, beforeDaily: 2, target: 4, daily: 1 },
    { sortOrder: 30, beforeTarget: 8, beforeDaily: 3, target: 5, daily: 2 },
    { sortOrder: 40, beforeTarget: 10, beforeDaily: 3, target: 6, daily: 2 },
    { sortOrder: 50, beforeTarget: 12, beforeDaily: 4, target: 7, daily: 2 },
    { sortOrder: 60, beforeTarget: 14, beforeDaily: 5, target: 8, daily: 3 },
    { sortOrder: 70, beforeTarget: 14, beforeDaily: 5, target: 8, daily: 3 },
  ];

  for (const stage of stages) {
    const configuredRule = {
      targetActiveOfferCount: stage.target,
      maxNewOffersPerDay: stage.daily,
    };
    const fallbackRule = getFallbackMarketStageRule(stage.sortOrder);

    assert.deepEqual(fallbackRule, configuredRule);
    assert.deepEqual(
      {
        targetActiveOfferCount: Math.min(stage.beforeTarget, fallbackRule.targetActiveOfferCount),
        maxNewOffersPerDay: Math.min(stage.beforeDaily, fallbackRule.maxNewOffersPerDay),
      },
      configuredRule,
    );
    assert.deepEqual(
      resolveMarketStageRule({
        configuredRule,
        sortOrder: stage.sortOrder,
      }),
      configuredRule,
    );
  }
});

test("geçerli DB stage configi ekonomik clamp uygulanmadan aynen kazanır", () => {
  assert.deepEqual(
    resolveMarketStageRule({
      configuredRule: {
        maxNewOffersPerDay: 5,
        targetActiveOfferCount: 14,
      },
      sortOrder: 10,
    }),
    { maxNewOffersPerDay: 5, targetActiveOfferCount: 14 },
  );
  assert.deepEqual(
    resolveMarketStageRule({
      configuredRule: {
        maxNewOffersPerDay: 4,
        targetActiveOfferCount: 12,
      },
      sortOrder: 50,
    }),
    { maxNewOffersPerDay: 4, targetActiveOfferCount: 12 },
  );
});

test("eksik DB stage configi explicit fallback kullanır", () => {
  assert.deepEqual(
    resolveMarketStageRule({ configuredRule: null, sortOrder: 40 }),
    { maxNewOffersPerDay: 2, targetActiveOfferCount: 6 },
  );
});

test("invalid DB stage configi safe fallback ve açık validation sonucu üretir", () => {
  const result = resolveMarketOfferStageRule({
    configuredRule: {
      maxNewOffersPerDay: 0,
      targetActiveOfferCount: 8,
    },
    sortOrder: 60,
  });

  assert.equal(result.source, "fallback");
  assert.deepEqual(result.rule, {
    maxNewOffersPerDay: 3,
    targetActiveOfferCount: 8,
  });
  assert.ok(result.validationErrors.length > 0);
});

test("pazar ritmi açık havuz ve günlük yeni teklif limitini birlikte uygular", () => {
  assert.equal(
    calculateMarketOfferCreationCount({
      activeOfferCount: 0,
      maxNewOffersPerDay: 1,
      targetActiveOfferCount: 3,
      todayOfferCount: 0,
    }),
    1,
  );
  assert.equal(
    calculateMarketOfferCreationCount({
      activeOfferCount: 3,
      maxNewOffersPerDay: 1,
      targetActiveOfferCount: 3,
      todayOfferCount: 0,
    }),
    0,
  );
  assert.equal(
    calculateMarketOfferCreationCount({
      activeOfferCount: 5,
      maxNewOffersPerDay: 2,
      targetActiveOfferCount: 7,
      todayOfferCount: 1,
    }),
    1,
  );
});
