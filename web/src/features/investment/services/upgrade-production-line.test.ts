import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ProductionGrade } from "@/generated/prisma/client";

import {
  buildLineUpgradeReferenceKey,
  calculateCapacityIncreaseBps,
  calculateProductionLineUpgradePricing,
  getNextProductionGrade,
} from "./upgrade-production-line";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("upgrade grade sırası Workshop -> Industrial -> Precision -> Smart", () => {
  assert.equal(
    getNextProductionGrade(ProductionGrade.WORKSHOP),
    ProductionGrade.INDUSTRIAL,
  );
  assert.equal(
    getNextProductionGrade(ProductionGrade.INDUSTRIAL),
    ProductionGrade.PRECISION,
  );
  assert.equal(
    getNextProductionGrade(ProductionGrade.PRECISION),
    ProductionGrade.SMART,
  );
  assert.equal(getNextProductionGrade(ProductionGrade.SMART), null);
});

test("upgrade fiyatı mevcut yatırımın yarısını ikinci el iade olarak düşer", () => {
  assert.deepEqual(
    calculateProductionLineUpgradePricing({
      currentPurchaseCostCents: 4_500_000,
      nextPurchaseCostCents: 7_000_000,
    }),
    {
      grossUpgradeCostCents: 7_000_000,
      netUpgradeCostCents: 4_750_000,
      tradeInRefundCents: 2_250_000,
    },
  );
});

test("kapasite artışı bps olarak hesaplanır", () => {
  assert.equal(
    calculateCapacityIncreaseBps({
      currentDailyPointCapacity: 23_040,
      nextDailyPointCapacity: 24_480,
    }),
    625,
  );
});

test("upgrade reference key deterministiktir", () => {
  assert.equal(
    buildLineUpgradeReferenceKey({
      factoryId: "factory-1",
      factoryProductionLineId: "line-1",
      requestId: "request-1",
    }),
    "LINE_UPGRADE:factory-1:line-1:request-1",
  );
});

test("upgrade service leasing kilidi, staff sync, machine purchase finance ve XP kaydı taşır", () => {
  const service = readSource("./upgrade-production-line.ts");

  assert.match(service, /LeasingContractStatus\.ACTIVE/);
  assert.match(service, /return failure\("LEASING_ACTIVE"\)/);
  assert.match(service, /productionLineTemplateId: nextTemplate\.id/);
  assert.match(service, /factoryStaffAssignment\.upsert/);
  assert.match(service, /StaffAssignmentStatus\.PASSIVE/);
  assert.match(service, /category: FinanceCategory\.MACHINE_PURCHASE/);
  assert.match(service, /cashBalanceCents: \{ decrement: netUpgradeCostCents \}/);
  assert.match(service, /currentXp: \{ increment: UPGRADE_XP_REWARD \}/);
  assert.match(service, /factoryXpTransaction\.create/);
  assert.match(service, /reason: XpReason\.FACTORY_EXPANSION/);
});

test("upgrade panel ham point yerine yüzde iş gücü artışını gösterir", () => {
  const panel = readSource("../components/upgrade-production-line-panel.tsx");

  assert.match(panel, /İş gücü artışı/);
  assert.match(panel, /formatSignedPercentBps/);
  assert.doesNotMatch(panel, /point\/gün/);
});
