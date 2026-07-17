import assert from "node:assert/strict";
import test from "node:test";

import { MarketOrderOfferType } from "@/generated/prisma/enums";

import {
  CUSTOMER_RELATIONSHIP_BASE_BPS,
  buildCustomerRelationshipSummary,
  calculateCustomerRelationshipImpact,
  calculateCustomerSelectionWeight,
} from "./customer-relationship";

test("zamanında teslim müşteri güvenini artırır", () => {
  const impact = calculateCustomerRelationshipImpact({
    lateDays: 0,
    segmentMetadata: { trustGainMultiplierBps: 12_000 },
  });

  assert.equal(impact.label, "gained");
  assert.equal(impact.trustChangeBps, 840);
});

test("gecikmiş teslim müşteri güvenini segment çarpanıyla düşürür", () => {
  const impact = calculateCustomerRelationshipImpact({
    lateDays: 2,
    segmentMetadata: { trustLossMultiplierBps: 15_000 },
  });

  assert.equal(impact.label, "lost");
  assert.equal(impact.trustChangeBps, -2700);
});

test("müşteri ilişki özeti repeat uygunluğunu geçmiş performansa göre kurar", () => {
  const trusted = buildCustomerRelationshipSummary({
    orders: [
      { lateDays: 0, shippedDay: 10, targetDeliveryDay: 10 },
      { lateDays: 0, shippedDay: 30, targetDeliveryDay: 30 },
      { lateDays: 0, shippedDay: 52, targetDeliveryDay: 52 },
    ],
    segmentMetadata: { repeatOrderChanceBps: 8_000 },
    virtualCustomerId: "customer-1",
  });
  const damaged = buildCustomerRelationshipSummary({
    orders: [
      { lateDays: 4, shippedDay: 14, targetDeliveryDay: 10 },
      { lateDays: 5, shippedDay: 35, targetDeliveryDay: 30 },
    ],
    segmentMetadata: { repeatOrderChanceBps: 8_000 },
    virtualCustomerId: "customer-1",
  });

  assert.ok(trusted.relationshipScoreBps > CUSTOMER_RELATIONSHIP_BASE_BPS);
  assert.equal(trusted.repeatEligible, true);
  assert.equal(trusted.status, "trusted");
  assert.equal(damaged.repeatEligible, false);
  assert.equal(damaged.status, "at_risk");
});

test("repeat teklif ağırlığı güven kötü olduğunda sıfırlanır", () => {
  const damaged = buildCustomerRelationshipSummary({
    orders: [
      { lateDays: 5, shippedDay: 15, targetDeliveryDay: 10 },
      { lateDays: 5, shippedDay: 35, targetDeliveryDay: 30 },
    ],
    segmentMetadata: { repeatOrderChanceBps: 8_000 },
    virtualCustomerId: "customer-1",
  });
  const normalWeight = calculateCustomerSelectionWeight({
    baseWeight: 1000,
    offerType: MarketOrderOfferType.NORMAL,
    relationship: damaged,
  });
  const repeatWeight = calculateCustomerSelectionWeight({
    baseWeight: 1000,
    offerType: MarketOrderOfferType.REPEAT,
    relationship: damaged,
  });

  assert.ok(normalWeight > 0);
  assert.equal(repeatWeight, 0);
});
