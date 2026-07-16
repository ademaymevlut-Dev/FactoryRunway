import assert from "node:assert/strict";
import test from "node:test";

import { MarketOrderOfferType } from "@/generated/prisma/client";

import { calculateLateDeliveryPenalty } from "./order-penalties";

test("normal sipariş gecikme cezası gelir yüzdesiyle hesaplanır", () => {
  const penalty = calculateLateDeliveryPenalty({
    lateDays: 2,
    offerType: MarketOrderOfferType.NORMAL,
    totalRevenueCents: BigInt(100_000),
  });

  assert.equal(penalty.penaltyBps, 400);
  assert.equal(penalty.amountCents, BigInt(4_000));
  assert.equal(penalty.capped, false);
});

test("express sipariş gecikme cezası daha sert ve üst limitlidir", () => {
  const penalty = calculateLateDeliveryPenalty({
    lateDays: 20,
    offerType: MarketOrderOfferType.EXPRESS,
    totalRevenueCents: BigInt(100_000),
  });

  assert.equal(penalty.rawPenaltyBps, 6_000);
  assert.equal(penalty.penaltyBps, 2_500);
  assert.equal(penalty.amountCents, BigInt(25_000));
  assert.equal(penalty.capped, true);
});

test("gecikmeyen veya gelirsiz sipariş ceza üretmez", () => {
  assert.equal(
    calculateLateDeliveryPenalty({
      lateDays: 0,
      offerType: MarketOrderOfferType.NORMAL,
      totalRevenueCents: BigInt(100_000),
    }).amountCents,
    BigInt(0),
  );
  assert.equal(
    calculateLateDeliveryPenalty({
      lateDays: 3,
      offerType: MarketOrderOfferType.NORMAL,
      totalRevenueCents: BigInt(0),
    }).amountCents,
    BigInt(0),
  );
});
