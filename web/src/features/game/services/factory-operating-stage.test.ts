import assert from "node:assert/strict";
import test from "node:test";

import { pickEligibleOperatingStage } from "./factory-operating-stage";

const stages = [
  {
    id: "micro",
    key: "micro_workshop",
    minProductionLines: 1,
    maxProductionLines: 2,
    sortOrder: 1,
  },
  {
    id: "small",
    key: "small_workshop",
    minProductionLines: 3,
    maxProductionLines: 5,
    sortOrder: 2,
  },
  {
    id: "stable",
    key: "stable_workshop",
    minProductionLines: 6,
    maxProductionLines: 9,
    sortOrder: 3,
  },
];

test("hat sayısı eşik aşmıyorsa operating stage aynı kalır", () => {
  assert.equal(pickEligibleOperatingStage(stages, 4)?.id, "small");
});

test("hat sayısı eşiği aşınca sıradaki operating stage seçilir", () => {
  assert.equal(pickEligibleOperatingStage(stages, 6)?.id, "stable");
});

test("hiçbir stage aralığı eşleşmezse null döner", () => {
  assert.equal(pickEligibleOperatingStage(stages, 20), null);
});
