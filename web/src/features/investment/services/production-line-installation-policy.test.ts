import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateProductionLineReadyDay,
  ProductionLineInstallationConfigurationError,
  resolveProductionLineInstallationPolicy,
  type ProductionLineInstallationRuleSnapshot,
} from "./production-line-installation-policy";

const fiveDayRule: ProductionLineInstallationRuleSnapshot = {
  delayDays: 5,
  id: "rule-11-15",
  maxConcurrentInstalls: 2,
  maximumAcquisitionSequence: 15,
  minimumAcquisitionSequence: 11,
  minimumRemainingDays: 1,
  tokenSkipCostPerDay: 3,
};

test("sıfır gün kuralı kurulum kuyruğu oluşturmadan aynı günü döndürür", async () => {
  const schedule = await calculateProductionLineReadyDay({
    acquisitionSequence: 4,
    factoryId: "factory-1",
    prisma: {} as never,
    requestedDay: 12,
    rule: {
      ...fiveDayRule,
      delayDays: 0,
      id: "rule-1-5",
      maxConcurrentInstalls: 1,
      maximumAcquisitionSequence: 5,
      minimumAcquisitionSequence: 1,
      minimumRemainingDays: 0,
      tokenSkipCostPerDay: 2,
    },
  });

  assert.deepEqual(schedule, {
    acquisitionSequence: 4,
    concurrentSlot: null,
    delayDays: 0,
    originalReadyDay: 12,
    readyDay: 12,
    rule: schedule.rule,
  });
});

test("eş zamanlı iki slot en erken boşalan slota deterministik plan yapar", async () => {
  const prisma = {
    factoryProductionLineInstallation: {
      findMany: async () => [
        { concurrentSlot: 1, readyDay: 20 },
        { concurrentSlot: 2, readyDay: 17 },
      ],
    },
  } as never;
  const schedule = await calculateProductionLineReadyDay({
    acquisitionSequence: 13,
    factoryId: "factory-1",
    prisma,
    requestedDay: 14,
    rule: fiveDayRule,
  });

  assert.equal(schedule.concurrentSlot, 2);
  assert.equal(schedule.originalReadyDay, 19);
  assert.equal(schedule.readyDay, 22);
  assert.equal(schedule.delayDays, 8);
});

test("policy resolver boş ve çakışan config aralıklarını açıkça reddeder", async () => {
  const missingPrisma = {
    sectorProductionLineInstallationRule: {
      findMany: async () => [],
    },
  } as never;
  const overlappingPrisma = {
    sectorProductionLineInstallationRule: {
      findMany: async () => [
        {
          delayDays: 5,
          id: "rule-a",
          maxAcquisitionSequence: 15,
          maxConcurrentInstalls: 2,
          minAcquisitionSequence: 11,
          minimumRemainingDays: 1,
          tokenSkipCostPerDay: 3,
        },
        {
          delayDays: 7,
          id: "rule-b",
          maxAcquisitionSequence: 20,
          maxConcurrentInstalls: 2,
          minAcquisitionSequence: 10,
          minimumRemainingDays: 1,
          tokenSkipCostPerDay: 5,
        },
      ],
    },
  } as never;

  await assert.rejects(
    resolveProductionLineInstallationPolicy({
      acquisitionSequence: 12,
      prisma: missingPrisma,
      sectorId: "sector-1",
    }),
    ProductionLineInstallationConfigurationError,
  );
  await assert.rejects(
    resolveProductionLineInstallationPolicy({
      acquisitionSequence: 12,
      prisma: overlappingPrisma,
      sectorId: "sector-1",
    }),
    ProductionLineInstallationConfigurationError,
  );
});
