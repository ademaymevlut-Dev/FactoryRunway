import assert from "node:assert/strict";
import test from "node:test";

import { MarketOrderOfferType } from "@/generated/prisma/enums";

import {
  areCollectionTiersCompatible,
  calculateDepartmentCostProfiles,
  calculateMarketOfferCreationCount,
  calculateCapacityTargetQuantity,
  calculateOfferUnitPriceCents,
  calculatePlannedUnitCostCents,
  calculateSharedFactoryMonthlyCostCents,
  filterCollectionCompatibleCandidates,
  pickProductTierForOffer,
  resolveOfferDeliveryRange,
  resolveOfferLoadProfile,
  resolveOfferPriceBand,
  resolveMarketStageRule,
} from "./market-offer-generator";

test("teklif fiyatı admin baz fiyatını yalnızca sipariş türü bandıyla değiştirir", () => {
  assert.deepEqual(resolveOfferPriceBand(MarketOrderOfferType.NORMAL), {
    minBps: 10_000,
    maxBps: 10_000,
  });
  assert.deepEqual(resolveOfferPriceBand(MarketOrderOfferType.OPPORTUNITY), {
    minBps: 10_400,
    maxBps: 10_800,
  });
  assert.deepEqual(resolveOfferPriceBand(MarketOrderOfferType.EXPRESS), {
    minBps: 11_000,
    maxBps: 11_600,
  });
  assert.deepEqual(
    resolveOfferPriceBand(MarketOrderOfferType.EXPRESS, {
      minBps: 11_500,
      maxBps: 13_500,
    }),
    { minBps: 11_500, maxBps: 11_600 },
  );
  assert.deepEqual(
    resolveOfferPriceBand(MarketOrderOfferType.OPPORTUNITY, {
      minBps: 11_000,
      maxBps: 12_500,
    }),
    { minBps: 10_400, maxBps: 10_800 },
  );
  assert.equal(
    calculateOfferUnitPriceCents({
      baseUnitPriceCents: 845,
      typePriceMultiplierBps: 10_000,
    }),
    845,
  );
  assert.equal(
    calculateOfferUnitPriceCents({
      baseUnitPriceCents: 845,
      typePriceMultiplierBps: 10_800,
    }),
    913,
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

test("normal standard sipariş hedef yükü 4-6 planlanan üretim gününde kalır", () => {
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
  assert.ok(profile.targetLoadDaysBps <= 60_000);
});

test("express 7-10, fırsat 12-15 günlük ayrı terminlere normalize olur", () => {
  assert.deepEqual(
    resolveOfferDeliveryRange({
      isLargeBasicBlock: false,
      offerType: MarketOrderOfferType.EXPRESS,
      ruleMaxDeliveryDays: 12,
      ruleMinDeliveryDays: 7,
    }),
    { maxDays: 10, minDays: 7 },
  );
  assert.deepEqual(
    resolveOfferDeliveryRange({
      isLargeBasicBlock: false,
      offerType: MarketOrderOfferType.OPPORTUNITY,
      ruleMaxDeliveryDays: 20,
      ruleMinDeliveryDays: 12,
    }),
    { maxDays: 15, minDays: 12 },
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

test("pazar ritmi eski yüksek DB stage configini dengeli üst limite indirir", () => {
  assert.deepEqual(
    resolveMarketStageRule({
      configuredRule: {
        maxNewOffersPerDay: 5,
        targetActiveOfferCount: 14,
      },
      sortOrder: 10,
    }),
    { maxNewOffersPerDay: 1, targetActiveOfferCount: 3 },
  );
  assert.deepEqual(
    resolveMarketStageRule({
      configuredRule: {
        maxNewOffersPerDay: 4,
        targetActiveOfferCount: 12,
      },
      sortOrder: 50,
    }),
    { maxNewOffersPerDay: 2, targetActiveOfferCount: 7 },
  );
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
