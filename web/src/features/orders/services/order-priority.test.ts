import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildOrderPriorityUpdates,
  hasExactOrderOwnership,
  mergeDepartmentOrderPriority,
} from "./order-priority";

test("priority sırasını deterministik aralıklarla kaydeder", () => {
  assert.deepEqual(buildOrderPriorityUpdates(["order-c", "order-a", "order-b"]), [
    { id: "order-c", priority: 100 },
    { id: "order-a", priority: 200 },
    { id: "order-b", priority: 300 },
  ]);
});

test("departman satır sırasını global sipariş listesindeki aynı slotlara uygular", () => {
  assert.deepEqual(
    mergeDepartmentOrderPriority(
      ["order-a", "order-b", "order-c", "order-d"],
      ["order-c", "order-b"],
    ),
    ["order-a", "order-c", "order-b", "order-d"],
  );
  assert.equal(
    mergeDepartmentOrderPriority(
      ["order-a", "order-b"],
      ["foreign-order"],
    ),
    null,
  );
});

test("başka factory siparişi listeye karıştığında ownership doğrulaması reddeder", () => {
  assert.equal(
    hasExactOrderOwnership(
      ["factory-order", "foreign-order"],
      ["factory-order"],
    ),
    false,
  );
});

test("refresh sorgusu priority ve deterministik tie-break sırasını korur", () => {
  const source = readFileSync(
    new URL("./order-market-view.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /\{ priority: "asc" \}[\s\S]*\{ targetDeliveryDay: "asc" \}[\s\S]*\{ createdAt: "asc" \}[\s\S]*\{ id: "asc" \}/,
  );
});

test("priority action playback, running shift ve factory ownership guardlarını içerir", () => {
  const source = readFileSync(
    new URL("../actions/update-order-priority-action.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /getActiveShiftPlayback/);
  assert.match(source, /ShiftSimulationStatus\.RUNNING/);
  assert.match(source, /factoryId: factory\.id/);
  assert.match(source, /hasExactOrderOwnership/);
});
