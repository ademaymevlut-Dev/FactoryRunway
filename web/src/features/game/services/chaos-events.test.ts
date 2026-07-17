import assert from "node:assert/strict";
import test from "node:test";

import {
  ChaosEventType,
  ChaosScope,
  ChaosSeverity,
} from "@/generated/prisma/client";

import {
  buildLineEventPenaltyBpsMap,
  deterministicBps,
  generateFactoryChaosEvents,
  planFactoryChaosEvents,
} from "./chaos-events";

const baseConfig = {
  cooldownDays: 0,
  dailyChanceBps: 10_000,
  eventType: ChaosEventType.STAFF_ABSENCE,
  id: "config-1",
  key: "staff_absence",
  maxOccurrencesPerDay: 1,
  maxPenaltyBps: 9_500,
  maxTotalStaff: null,
  metadata: {
    messageKey: "chaos.staff_absence.test",
    targetMinute: 70,
  },
  minPenaltyBps: 9_500,
  minTotalStaff: null,
  scope: ChaosScope.PRODUCTION_LINE,
  severity: ChaosSeverity.MINOR,
} as const;

const baseInput = {
  existingToday: [],
  factoryId: "factory-1",
  gameDay: 12,
  productionLines: [
    { departmentId: "sewing", id: "line-2" },
    { departmentId: "cutting", id: "line-1" },
  ],
  recentEvents: [],
  sectorId: "sector-1",
  shiftSimulationId: "shift-1",
  totalStaffCount: 38,
};

test("chaos planı aynı factory/gün/config için deterministik event üretir", () => {
  const first = planFactoryChaosEvents({
    ...baseInput,
    configs: [baseConfig],
  });
  const second = planFactoryChaosEvents({
    ...baseInput,
    configs: [baseConfig],
  });

  assert.deepEqual(first, second);
  assert.equal(first.length, 1);
  assert.equal(first[0]?.chaosEventConfigId, "config-1");
  assert.equal(first[0]?.messageKey, "chaos.staff_absence.test");
  assert.equal(first[0]?.penaltyBps, 9_500);
  assert.equal(first[0]?.factoryProductionLineId !== null, true);
});

test("chaos planı shift id değişse bile aynı gün için aynı kalır", () => {
  const first = planFactoryChaosEvents({
    ...baseInput,
    configs: [baseConfig],
    shiftSimulationId: "shift-1",
  });
  const second = planFactoryChaosEvents({
    ...baseInput,
    configs: [baseConfig],
    shiftSimulationId: "shift-retry",
  });

  assert.deepEqual(first, second);
});

test("staff aralığı dışında kalan config event üretmez", () => {
  const events = planFactoryChaosEvents({
    ...baseInput,
    configs: [
      {
        ...baseConfig,
        maxTotalStaff: 20,
        minTotalStaff: 1,
      },
    ],
  });

  assert.equal(events.length, 0);
});

test("cooldown içindeki config event üretmez", () => {
  const events = planFactoryChaosEvents({
    ...baseInput,
    configs: [
      {
        ...baseConfig,
        cooldownDays: 2,
      },
    ],
    recentEvents: [
      {
        chaosEventConfigId: "config-1",
        gameDay: 11,
      },
    ],
  });

  assert.equal(events.length, 0);
});

test("mevcut gün max occurrence dolduysa yeni event eklenmez", () => {
  const events = planFactoryChaosEvents({
    ...baseInput,
    configs: [baseConfig],
    existingToday: [
      {
        chaosEventConfigId: "config-1",
        gameDay: 12,
      },
    ],
  });

  assert.equal(events.length, 0);
});

test("department scope hedef olarak yalnızca departman yazar", () => {
  const events = planFactoryChaosEvents({
    ...baseInput,
    configs: [
      {
        ...baseConfig,
        scope: ChaosScope.DEPARTMENT,
      },
    ],
  });

  assert.equal(events.length, 1);
  assert.ok(events[0]?.departmentId);
  assert.equal(events[0]?.factoryProductionLineId, null);
});

test("factory scope hedef olarak departman veya hat yazmaz", () => {
  const events = planFactoryChaosEvents({
    ...baseInput,
    configs: [
      {
        ...baseConfig,
        scope: ChaosScope.FACTORY,
      },
    ],
  });

  assert.equal(events.length, 1);
  assert.equal(events[0]?.departmentId, null);
  assert.equal(events[0]?.factoryProductionLineId, null);
});

test("line event penalty map factory, department ve line etkilerini birleştirir", () => {
  const penalties = buildLineEventPenaltyBpsMap({
    events: [
      {
        departmentId: null,
        factoryProductionLineId: null,
        penaltyBps: 9_000,
        scope: ChaosScope.FACTORY,
      },
      {
        departmentId: "sewing",
        factoryProductionLineId: null,
        penaltyBps: 8_000,
        scope: ChaosScope.DEPARTMENT,
      },
      {
        departmentId: "sewing",
        factoryProductionLineId: "line-2",
        penaltyBps: 9_500,
        scope: ChaosScope.PRODUCTION_LINE,
      },
    ],
    productionLines: [
      { departmentId: "cutting", id: "line-1" },
      { departmentId: "sewing", id: "line-2" },
    ],
  });

  assert.equal(penalties.get("line-1"), 9_000);
  assert.equal(penalties.get("line-2"), 6_840);
});

test("deterministicBps 0-9999 aralığında kalır", () => {
  assert.equal(deterministicBps("same-seed"), deterministicBps("same-seed"));
  assert.ok(deterministicBps("same-seed") >= 0);
  assert.ok(deterministicBps("same-seed") < 10_000);
});

test("generateFactoryChaosEvents seçilen olayları DB kaydına dönüştürür", async () => {
  const calls = {
    createManyData: [] as Array<Record<string, unknown>>,
    deleteManyWhere: null as Record<string, unknown> | null,
  };
  const prisma = {
    chaosEventConfig: {
      findMany: async () => [baseConfig],
    },
    factoryChaosEvent: {
      createMany: async ({ data }: { data: Array<Record<string, unknown>> }) => {
        calls.createManyData = data;
        return { count: data.length };
      },
      deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
        calls.deleteManyWhere = where;
        return { count: 0 };
      },
      findMany: async () => [],
    },
  } as unknown as Parameters<typeof generateFactoryChaosEvents>[0]["prisma"];

  const result = await generateFactoryChaosEvents({
    factoryId: "factory-1",
    gameDay: 12,
    prisma,
    productionLines: baseInput.productionLines,
    sectorId: "sector-1",
    shiftSimulationId: "shift-1",
    totalStaffCount: 38,
  });

  assert.equal(result.createdCount, 1);
  assert.equal(calls.createManyData.length, 1);
  assert.equal(calls.createManyData[0]?.factoryId, "factory-1");
  assert.equal(calls.createManyData[0]?.shiftSimulationId, "shift-1");
  assert.equal(calls.createManyData[0]?.chaosEventConfigId, "config-1");
  assert.equal(calls.createManyData[0]?.penaltyBps, 9_500);
  assert.ok(calls.deleteManyWhere);
});
