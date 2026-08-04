import assert from "node:assert/strict";
import test from "node:test";

import {
  FACTORY_MAP_SECTION_LINE_LIMIT,
  FACTORY_MAP_SECTION_PAGE_SIZE,
  clampFactoryMapSectionPage,
  getFactoryMapSectionPageCount,
  getFactoryMapSectionPageItems,
  isFactoryMapSectionCollapsible,
} from "./factory-map-section-disclosure";

test("dokuz hat mevcut gridde kalır, onuncu hat accordion eşiğini açar", () => {
  assert.equal(FACTORY_MAP_SECTION_LINE_LIMIT, 9);
  assert.equal(FACTORY_MAP_SECTION_PAGE_SIZE, 9);
  assert.equal(isFactoryMapSectionCollapsible(9), false);
  assert.equal(isFactoryMapSectionCollapsible(10), true);
});

test("accordion sayfa sayısı yalnız üretim hattı adedinden hesaplanır", () => {
  assert.equal(getFactoryMapSectionPageCount(9), 1);
  assert.equal(getFactoryMapSectionPageCount(10), 2);
  assert.equal(getFactoryMapSectionPageCount(17), 2);
  assert.equal(getFactoryMapSectionPageCount(30), 4);
  assert.equal(getFactoryMapSectionPageCount(80), 9);
  assert.equal(getFactoryMapSectionPageCount(100), 12);
});

test("sayfa indeksi güvenli sınırlanır ve her sayfada en fazla dokuz item döner", () => {
  const items = Array.from({ length: 30 }, (_, index) => index + 1);

  assert.equal(clampFactoryMapSectionPage(-5, items.length), 0);
  assert.equal(clampFactoryMapSectionPage(99, items.length), 3);
  assert.deepEqual(getFactoryMapSectionPageItems(items, 0), [
    1, 2, 3, 4, 5, 6, 7, 8, 9,
  ]);
  assert.deepEqual(getFactoryMapSectionPageItems(items, 3), [28, 29, 30]);
});

test("geçersiz eşik ve sayfa girdileri UI hesabını bozmaz", () => {
  assert.equal(isFactoryMapSectionCollapsible(Number.NaN), false);
  assert.equal(isFactoryMapSectionCollapsible(-10), false);
  assert.equal(getFactoryMapSectionPageCount(Number.POSITIVE_INFINITY), 1);
  assert.equal(clampFactoryMapSectionPage(Number.NaN, 30), 0);
});
