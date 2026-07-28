import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildLinePurchaseReferenceKey,
  calculateNextLinePlacement,
} from "./purchase-production-line";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("satın alma reference key ve yerleşim hesapları deterministiktir", () => {
  assert.equal(
    buildLinePurchaseReferenceKey({
      factoryId: "factory-1",
      requestId: "request-1",
    }),
    "LINE_PURCHASE:factory-1:request-1",
  );
  assert.deepEqual(
    calculateNextLinePlacement({
      maximumDepartmentGroupSortOrder: 30,
      maximumDepartmentLineNumber: 2,
    }),
    { lineNumber: 3, sortOrder: 40 },
  );
  assert.deepEqual(
    calculateNextLinePlacement({
      maximumDepartmentGroupSortOrder: null,
      maximumDepartmentLineNumber: null,
    }),
    { lineNumber: 1, sortOrder: 10 },
  );
});

test("satın alma server fiyatı ve bakiye guardı ile kurulum kaydı oluşturur", () => {
  const service = readSource("./purchase-production-line.ts");

  assert.match(service, /BigInt\(template\.purchaseCostCents\)/);
  assert.match(
    service,
    /cashBalanceCents: \{ gte: paidAmountCents \}/,
  );
  assert.match(service, /TransactionIsolationLevel\.Serializable/);
  assert.match(service, /tx\.factoryProductionLine\.create/);
  assert.match(
    service,
    /status: FactoryProductionLineStatus\.INSTALLING/,
  );
  assert.match(
    service,
    /tx\.factoryProductionLineInstallation\.create/,
  );
  assert.match(service, /reserveProductionLineAcquisitionSequence/);
  assert.match(service, /resolveProductionLineInstallationSchedule/);
  assert.match(service, /tx\.factoryFinanceTransaction\.create/);
  assert.doesNotMatch(service, /input\.purchase\.(?:price|staff|readyDay)/);
});

test("personel, operating stage, görev ve XP yalnızca ortak aktivasyon servisinde açılır", () => {
  const purchase = readSource("./purchase-production-line.ts");
  const activation = readSource(
    "./production-line-installation-activation.ts",
  );

  assert.doesNotMatch(purchase, /factoryStaffAssignment\.(?:upsert|createMany)/);
  assert.match(purchase, /activateProductionLineInstallation/);
  assert.match(activation, /factoryStaffAssignment\.upsert/);
  assert.match(activation, /recalculateFactoryOperatingStage/);
  assert.match(activation, /objectiveType: "ACQUIRE_PRODUCTION_LINE"/);
  assert.match(activation, /grantFactoryXp/);
  assert.match(activation, /referenceKey:/);
});

test("satın alma ownership, playback, içerik ve direct staff config guardlarını taşır", () => {
  const service = readSource("./purchase-production-line.ts");

  assert.match(service, /playerProfile: \{ userId: input\.userId \}/);
  assert.match(service, /getActiveShiftPlayback/);
  assert.match(service, /ShiftSimulationStatus\.RUNNING/);
  assert.match(service, /FactoryStatus\.ACTIVE/);
  assert.match(service, /ContentStatus\.ACTIVE/);
  assert.match(service, /DepartmentKind\.PRODUCTION/);
  assert.match(service, /StaffType\.DIRECT_PRODUCTION/);
  assert.match(service, /DUPLICATE_REQUEST/);
});
