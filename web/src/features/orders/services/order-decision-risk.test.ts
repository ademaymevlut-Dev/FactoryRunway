import assert from "node:assert/strict";
import test from "node:test";

import { getOrderDecisionRiskValues } from "./order-decision-risk";

test("birleşik risk kapasite ve teslimat riskinin maksimumudur", () => {
  assert.deepEqual(getOrderDecisionRiskValues(2_400, 1_800), {
    dominantFactor: "CAPACITY",
    scoreBps: 2_400,
  });
  assert.deepEqual(getOrderDecisionRiskValues(1_800, 2_400), {
    dominantFactor: "DELIVERY",
    scoreBps: 2_400,
  });
});

test("eşit riskte BALANCED üretmeden dominant faktörü boş bırakır", () => {
  assert.deepEqual(getOrderDecisionRiskValues(2_000, 2_000), {
    dominantFactor: null,
    scoreBps: 2_000,
  });
});
