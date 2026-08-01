import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  normalizeProductHeroHex,
  resolveProductHeroPalette,
  type ProductHeroPaletteSource,
} from "./product-hero-palette";

const HEX = /^#[\dA-F]{6}$/;
const RGBA = /^rgba\(\d{1,3}, \d{1,3}, \d{1,3}, 0(?:\.\d+)?\)$/;

test("hero HEX değerlerini genişletir, uppercase yapar ve invalid değerde fallback kullanır", () => {
  assert.equal(normalizeProductHeroHex("#abc"), "#AABBCC");
  assert.equal(normalizeProductHeroHex("#a1b2c3"), "#A1B2C3");
  assert.equal(normalizeProductHeroHex("not-a-color"), "#38BDF8");
  assert.equal(
    normalizeProductHeroHex("not-a-color", "also-invalid"),
    "#38BDF8",
  );
});

test("siyah, beyaz, neon ve gri kaynaklardan güvenli CSS palette üretir", () => {
  const palettes = [
    paletteSource("#000000"),
    paletteSource("#FFFFFF"),
    paletteSource("#00FF00"),
    paletteSource("#777777"),
  ].map(resolveProductHeroPalette);

  for (const palette of palettes) {
    for (const key of [
      "accent",
      "baseFrom",
      "baseTo",
      "primary",
      "rayColor",
      "secondary",
    ] as const) {
      assert.match(palette[key], HEX, `${key}: ${palette[key]}`);
    }

    for (const key of [
      "baseGlow",
      "borderAccent",
      "primaryGlow",
      "secondaryGlow",
    ] as const) {
      assert.match(palette[key], RGBA, `${key}: ${palette[key]}`);
    }

    assert.notEqual(palette.rayColor, "#000000");
    assert.notEqual(palette.rayColor, "#FFFFFF");
    assert.match(palette.primaryGlow, /, 0\.18\)$/);
    assert.match(palette.secondaryGlow, /, 0\.12\)$/);
    assert.match(palette.baseGlow, /, 0\.07\)$/);
  }
});

test("invalid ve eksik alanlar aynı güvenli palette fallback'ine döner", () => {
  const invalid = resolveProductHeroPalette({
    cardGradientFrom: "invalid",
    cardGradientTo: "",
    cardPrimaryColor: "rgb(0,0,0)",
    cardSecondaryColor: "transparent",
    cardSvgIconAccentColor: "#12",
  });

  assert.deepEqual(invalid, resolveProductHeroPalette({}));
});

test("palette resolver giriş objesini mutate etmez", () => {
  const source = paletteSource("#123456");
  const snapshot = structuredClone(source);

  resolveProductHeroPalette(source);

  assert.deepEqual(source, snapshot);
});

test("palette resolver tier ve sipariş renk dağılımı verisine bağlı değildir", () => {
  const source = readFileSync(
    new URL("./product-hero-palette.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /\btier\b/i);
  assert.doesNotMatch(source, /ProductColorVariant|hexCode/);
});

function paletteSource(color: string): ProductHeroPaletteSource {
  return {
    cardGradientFrom: color,
    cardGradientTo: color,
    cardPrimaryColor: color,
    cardSecondaryColor: color,
    cardSvgIconAccentColor: color,
  };
}
