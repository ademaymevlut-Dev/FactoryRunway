import assert from "node:assert/strict";
import test from "node:test";

import { MarketOrderOfferType } from "@/generated/prisma/enums";

import {
  areCollectionTiersCompatible,
  calculateMarketOfferCreationCount,
  calculateCapacityTargetQuantity,
  filterCollectionCompatibleCandidates,
  pickProductTierForOffer,
  resolveOfferDeliveryRange,
  resolveOfferLoadProfile,
  resolveMarketStageRule,
} from "./market-offer-generator";

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
