import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeProductPresentationConfig,
  resolveProductPresentationConfig,
  resolveProductPresentationFamily,
} from "./product-presentation-config";

test("product type key deterministik sunum ailelerine çözülür", () => {
  assert.equal(resolveProductPresentationFamily("t_shirt"), "TOP");
  assert.equal(resolveProductPresentationFamily("pants"), "BOTTOM");
  assert.equal(resolveProductPresentationFamily("midi_dress"), "DRESS");
  assert.equal(resolveProductPresentationFamily("two_piece_set"), "SET");
});

test("bilinmeyen veya boş product type key DEFAULT kullanır", () => {
  assert.equal(resolveProductPresentationFamily("unknown_type"), "DEFAULT");
  assert.equal(resolveProductPresentationFamily(null), "DEFAULT");
  assert.equal(resolveProductPresentationFamily(undefined), "DEFAULT");
});

test("sayısal sunum alanları güvenli aralıklara clamp edilir", () => {
  const config = normalizeProductPresentationConfig({
    lightIntensity: 4,
    lightXPercent: -10,
    lightYPercent: 500,
    objectPositionXPercent: -20,
    objectPositionYPercent: 120,
    scale: 2,
    translateXPercent: -40,
    translateYPercent: 50,
  });

  assert.deepEqual(config, {
    lightIntensity: 0.24,
    lightXPercent: 10,
    lightYPercent: 65,
    objectPositionXPercent: 0,
    objectPositionYPercent: 100,
    scale: 1.16,
    translateXPercent: -10,
    translateYPercent: 10,
  });
});

test("geçersiz sayılar fallback'e döner ve sıfır ışık yoğunluğu korunur", () => {
  const invalid = normalizeProductPresentationConfig({
    lightIntensity: Number.NaN,
    scale: Number.POSITIVE_INFINITY,
  });
  const disabled = normalizeProductPresentationConfig({ lightIntensity: 0 });

  assert.equal(invalid.lightIntensity, 0.18);
  assert.equal(invalid.scale, 1.1);
  assert.equal(disabled.lightIntensity, 0);
});

test("object position yalnızca kontrollü yüzde değerlerinden üretilir", () => {
  const config = resolveProductPresentationConfig({
    productCode: "UNKNOWN-001",
    productTypeKey: "midi_dress",
  });

  assert.equal(config.family, "DRESS");
  assert.match(config.objectPosition, /^\d+(?:\.\d+)?% \d+(?:\.\d+)?%$/);
  assert.equal(config.objectPosition, "50% 51%");
});
