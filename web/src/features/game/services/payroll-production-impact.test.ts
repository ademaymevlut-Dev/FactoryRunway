import assert from "node:assert/strict";
import test from "node:test";

import {
  calculatePayrollProductionImpact,
  toPayrollProductionImpactMetadata,
} from "./payroll-production-impact";

test("maaş gecikmesi günlük yüzde 5 artar ve yüzde 30 seviyesinde durur", () => {
  const due = {
    amountCents: BigInt(100_000),
    dueDay: 22,
    id: "payroll-22",
    settledAmountCents: BigInt(0),
  };

  assert.deepEqual(
    calculatePayrollProductionImpact({
      currentDay: 22,
      dues: [due],
    }),
    {
      capacityMultiplierBps: 10_000,
      dueIds: ["payroll-22"],
      oldestDueDay: 22,
      outstandingCents: BigInt(100_000),
      overdueDays: 0,
      productionPenaltyBps: 0,
    },
  );
  assert.equal(
    calculatePayrollProductionImpact({
      currentDay: 23,
      dues: [due],
    }).productionPenaltyBps,
    500,
  );
  assert.equal(
    calculatePayrollProductionImpact({
      currentDay: 25,
      dues: [due],
    }).productionPenaltyBps,
    1_500,
  );
  assert.equal(
    calculatePayrollProductionImpact({
      currentDay: 28,
      dues: [due],
    }).productionPenaltyBps,
    3_000,
  );
  assert.equal(
    calculatePayrollProductionImpact({
      currentDay: 60,
      dues: [due],
    }).productionPenaltyBps,
    3_000,
  );
});

test("birden fazla maaş borcunu toplar ve en eski vadeyi esas alır", () => {
  const impact = calculatePayrollProductionImpact({
    currentDay: 47,
    dues: [
      {
        amountCents: BigInt(100_000),
        dueDay: 22,
        id: "payroll-22",
        settledAmountCents: BigInt(40_000),
      },
      {
        amountCents: BigInt(120_000),
        dueDay: 44,
        id: "payroll-44",
        settledAmountCents: BigInt(0),
      },
      {
        amountCents: BigInt(50_000),
        dueDay: 47,
        id: "paid",
        settledAmountCents: BigInt(50_000),
      },
    ],
  });

  assert.equal(impact.oldestDueDay, 22);
  assert.equal(impact.outstandingCents, BigInt(180_000));
  assert.equal(impact.productionPenaltyBps, 3_000);
  assert.deepEqual(impact.dueIds, ["payroll-22", "payroll-44"]);
});

test("maaş borcu kapanınca kapasite aynı gün hesabında normale döner", () => {
  const impact = calculatePayrollProductionImpact({
    currentDay: 24,
    dues: [
      {
        amountCents: BigInt(100_000),
        dueDay: 22,
        id: "payroll-22",
        settledAmountCents: BigInt(100_000),
      },
    ],
  });

  assert.equal(impact.outstandingCents, BigInt(0));
  assert.equal(impact.overdueDays, 0);
  assert.equal(impact.productionPenaltyBps, 0);
  assert.equal(impact.capacityMultiplierBps, 10_000);
});

test("vardiya metadata'sı bigint borcu JSON güvenli string olarak saklar", () => {
  assert.deepEqual(
    toPayrollProductionImpactMetadata({
      capacityMultiplierBps: 8_500,
      dueIds: ["payroll-22"],
      oldestDueDay: 22,
      outstandingCents: BigInt(180_000),
      overdueDays: 3,
      productionPenaltyBps: 1_500,
    }),
    {
      capacityMultiplierBps: 8_500,
      oldestDueDay: 22,
      outstandingCents: "180000",
      overdueDays: 3,
      productionPenaltyBps: 1_500,
    },
  );
});
