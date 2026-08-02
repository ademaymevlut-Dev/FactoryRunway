import assert from "node:assert/strict";
import test from "node:test";

import {
  getDockItemScrollTarget,
  getDockOverflowState,
} from "./dock-overflow";

test("dock taşmıyorsa iki kenar göstergesi de kapalıdır", () => {
  assert.deepEqual(
    getDockOverflowState({ clientWidth: 420, scrollLeft: 0, scrollWidth: 420 }),
    { canScrollLeft: false, canScrollRight: false },
  );
});

test("dock başlangıç, orta ve son konumlarında doğru kenarları gösterir", () => {
  assert.deepEqual(
    getDockOverflowState({ clientWidth: 320, scrollLeft: 0, scrollWidth: 480 }),
    { canScrollLeft: false, canScrollRight: true },
  );
  assert.deepEqual(
    getDockOverflowState({ clientWidth: 320, scrollLeft: 70, scrollWidth: 480 }),
    { canScrollLeft: true, canScrollRight: true },
  );
  assert.deepEqual(
    getDockOverflowState({ clientWidth: 320, scrollLeft: 160, scrollWidth: 480 }),
    { canScrollLeft: true, canScrollRight: false },
  );
});

test("tam görünür aktif öğe dock'u gereksiz yere kaydırmaz", () => {
  assert.equal(
    getDockItemScrollTarget({
      itemEnd: 260,
      itemStart: 212,
      scrollLeft: 40,
      viewportEnd: 360,
      viewportStart: 40,
    }),
    null,
  );
});

test("sol veya sağ dışında kalan aktif öğe en yakın kenara getirilir", () => {
  assert.equal(
    getDockItemScrollTarget({
      itemEnd: 38,
      itemStart: -10,
      scrollLeft: 90,
      viewportEnd: 320,
      viewportStart: 0,
    }),
    80,
  );
  assert.equal(
    getDockItemScrollTarget({
      itemEnd: 372,
      itemStart: 324,
      scrollLeft: 90,
      viewportEnd: 320,
      viewportStart: 0,
    }),
    142,
  );
});
