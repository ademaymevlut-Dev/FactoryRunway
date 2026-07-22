import assert from "node:assert/strict";
import test from "node:test";

import {
  PRODUCT_TIER_MIN_LEVEL,
  getEffectiveProductRequiredLevel,
  isProductTierUnlocked,
} from "./product-tier-rules";

test("ürün grupları 1/5/20/50 seviye barajlarını kullanır", () => {
  assert.deepEqual(PRODUCT_TIER_MIN_LEVEL, {
    BASIC: 1,
    STANDARD: 5,
    PREMIUM: 20,
    LUXURY: 50,
  });
});

test("ürün için admin barajı grup barajından düşük olamaz, yüksek olabilir", () => {
  assert.equal(
    getEffectiveProductRequiredLevel({
      requiredPlayerLevel: 1,
      tier: "PREMIUM",
    }),
    20,
  );
  assert.equal(
    getEffectiveProductRequiredLevel({
      requiredPlayerLevel: 27,
      tier: "PREMIUM",
    }),
    27,
  );
});

test("grup tam eşik seviyesinde açılır", () => {
  assert.equal(isProductTierUnlocked("STANDARD", 4), false);
  assert.equal(isProductTierUnlocked("STANDARD", 5), true);
  assert.equal(isProductTierUnlocked("LUXURY", 49), false);
  assert.equal(isProductTierUnlocked("LUXURY", 50), true);
});
