import assert from "node:assert/strict";
import test from "node:test";

import {
  getFactoryMapDragDelta,
  resolveFactoryMapDragAxis,
} from "./factory-map-gesture";

test("touch sürüklemesi ilk baskın eksene kilitlenir", () => {
  assert.equal(
    resolveFactoryMapDragAxis({ deltaX: 18, deltaY: 6, lockToAxis: true }),
    "horizontal",
  );
  assert.equal(
    resolveFactoryMapDragAxis({ deltaX: 4, deltaY: -12, lockToAxis: true }),
    "vertical",
  );
});

test("mouse ve kalem sürüklemesi serbest iki eksenli hareketi korur", () => {
  assert.equal(
    resolveFactoryMapDragAxis({ deltaX: 18, deltaY: 6, lockToAxis: false }),
    "free",
  );
  assert.deepEqual(
    getFactoryMapDragDelta({ axis: "free", deltaX: 18, deltaY: 6 }),
    { x: 18, y: 6 },
  );
});

test("kilitli touch hareketinde diğer eksenin küçük sapması uygulanmaz", () => {
  assert.deepEqual(
    getFactoryMapDragDelta({ axis: "horizontal", deltaX: 24, deltaY: 7 }),
    { x: 24, y: 0 },
  );
  assert.deepEqual(
    getFactoryMapDragDelta({ axis: "vertical", deltaX: -5, deltaY: 30 }),
    { x: 0, y: 30 },
  );
});
