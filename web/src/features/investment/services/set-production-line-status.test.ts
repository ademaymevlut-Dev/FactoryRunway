import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { FactoryProductionLineStatus } from "@/generated/prisma/client";

import {
  countReleasedDirectStaff,
  countRequiredDirectStaff,
  getProductionLineStatusTarget,
} from "./set-production-line-status";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("production line status hedefleri yalnızca disable ve activate aksiyonlarından türetilir", () => {
  assert.equal(
    getProductionLineStatusTarget("disable"),
    FactoryProductionLineStatus.DISABLED,
  );
  assert.equal(
    getProductionLineStatusTarget("activate"),
    FactoryProductionLineStatus.IDLE,
  );
});

test("disable ve activate personel etkisini negatif değerleri saymadan hesaplar", () => {
  assert.equal(
    countReleasedDirectStaff([
      { quantity: 4 },
      { quantity: 0 },
      { quantity: -2 },
      { quantity: 3 },
    ]),
    7,
  );
  assert.equal(
    countRequiredDirectStaff([
      { requiredQuantity: 2 },
      { requiredQuantity: 0 },
      { requiredQuantity: -1 },
      { requiredQuantity: 5 },
    ]),
    7,
  );
});

test("production line status service transaction, playback, plan ve staff lifecycle guardlarını taşır", () => {
  const service = readSource("./set-production-line-status.ts");

  assert.match(service, /TransactionIsolationLevel\.Serializable/);
  assert.match(service, /getActiveShiftPlayback/);
  assert.match(service, /ShiftSimulationStatus\.RUNNING/);
  assert.match(service, /ProductionAllocationStatus\.PLANNED/);
  assert.match(service, /ProductionAllocationStatus\.LOCKED/);
  assert.match(service, /FactoryProductionLineStatus\.DISABLED/);
  assert.match(service, /FactoryProductionLineStatus\.IDLE/);
  assert.match(service, /StaffAssignmentStatus\.PASSIVE/);
  assert.match(service, /factoryStaffAssignment\.upsert/);
  assert.match(service, /recalculateFactoryOperatingStage/);
  assert.match(service, /source: "production-line-disable"/);
  assert.match(service, /source: "production-line-activate"/);
});

test("production line status action /game snapshotını revalidate eder", () => {
  const action = readSource("../actions/set-production-line-status-action.ts");

  assert.match(action, /"use server"/);
  assert.match(action, /setProductionLineStatus/);
  assert.match(action, /revalidatePath\("\/game"\)/);
});
