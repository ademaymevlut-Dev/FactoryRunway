import assert from "node:assert/strict";
import test from "node:test";

import {
  Prisma,
  RouteProcessingMode,
  RouteProgressStatus,
  ShiftSimulationStatus,
} from "@/generated/prisma/client";

import {
  buildDailyLineResults,
  buildAllocationMap,
  buildShiftIdempotencyKey,
  claimFactoryDayShift,
  getAvailableQuantity,
  getLineStaffCoverageBps,
  getRouteProgressStatus,
} from "./day-simulation";
import { ShiftClaimConflictError } from "./shift-transaction";

type SimulationInput = Parameters<typeof buildDailyLineResults>[0];
type SimulationLine = SimulationInput["lines"][number];
type SimulationQueueItem = SimulationInput["queue"][number];

function buildLine(id: string, dailyPointCapacity: number): SimulationLine {
  return {
    assignedStaffQuantity: 10,
    conditionBps: 10_000,
    departmentId: "sewing",
    id,
    lineNumber: Number(id.replace(/\D/g, "")) || 1,
    productionLineTemplate: { dailyPointCapacity },
    productionLineTemplateId: `template-${id}`,
    requiredStaffQuantity: 10,
    sortOrder: 1,
  };
}

function buildQueueItem(input: {
  completedQuantity?: number;
  id: string;
  inputReadyQuantity: number;
  plannedQuantity: number;
  setupPoints?: number;
  workloadPointsPerUnit: number;
}): SimulationQueueItem {
  const completedQuantity = input.completedQuantity ?? 0;

  return {
    completedQuantity,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    departmentId: "sewing",
    id: input.id,
    inOutsourceQuantity: 0,
    inputReadyQuantity: input.inputReadyQuantity,
    plannedQuantity: input.plannedQuantity,
    productRouteStepId: `step-${input.id}`,
    productionOrder: {
      completedDay: null,
      completedQuantity: 0,
      customerOrderId: `customer-${input.id}`,
      customerOrderItemId: `item-${input.id}`,
      id: `order-${input.id}`,
      plannedQuantity: input.plannedQuantity,
      priority: 100,
      productId: `product-${input.id}`,
      remainingQuantity: input.plannedQuantity,
      routeProgress: [],
      startedDay: null,
      targetDeliveryDay: 20,
    },
    remainingQuantity: input.plannedQuantity - completedQuantity,
    sequence: 1,
    setupPoints: input.setupPoints ?? 0,
    status:
      completedQuantity > 0
        ? RouteProgressStatus.IN_PROGRESS
        : RouteProgressStatus.READY,
    workloadPointsPerUnit: input.workloadPointsPerUnit,
  };
}

function allocation(id: string, plannedQuantity: number, plannedSetupPoints = 0) {
  return {
    plannedQuantity,
    plannedSetupPoints,
    plannedTotalPoints: plannedQuantity * 10 + plannedSetupPoints,
    productionAllocationId: `allocation-${id}`,
    remainingQuantity: plannedQuantity,
  };
}

test("kümülatif girdiden yalnızca henüz işlenmemiş miktarı ayırır", () => {
  assert.equal(
    getAvailableQuantity({
      completedQuantity: 3,
      inOutsourceQuantity: 1,
      inputReadyQuantity: 9,
      plannedQuantity: 12,
    }),
    5,
  );
});

test("küçük iş bitince hat kalan puanla sıradaki kuyruğa devam eder", () => {
  const results = buildDailyLineResults({
    allocationQuantityByLineAndRouteProgressId: new Map([
      [
        "line-1",
        new Map([
          ["first", allocation("first", 3)],
          ["second", allocation("second", 10)],
        ]),
      ],
    ]),
    lines: [buildLine("line-1", 100)],
    queue: [
      buildQueueItem({
        id: "first",
        inputReadyQuantity: 3,
        plannedQuantity: 3,
        workloadPointsPerUnit: 10,
      }),
      buildQueueItem({
        id: "second",
        inputReadyQuantity: 10,
        plannedQuantity: 10,
        workloadPointsPerUnit: 10,
      }),
    ],
  });

  assert.deepEqual(
    results.map((result) => [result.routeProgress?.id, result.producedQuantity]),
    [
      ["first", 3],
      ["second", 7],
    ],
  );
  assert.equal(results.reduce((total, result) => total + result.usedPoints, 0), 100);
  assert.deepEqual(
    results.map((result) => result.productionAllocationId),
    ["allocation-first", "allocation-second"],
  );
});

test("bir hat kapasitesi yettiği sürece tüm hazır kuyruk kayıtlarını işler", () => {
  const results = buildDailyLineResults({
    allocationQuantityByLineAndRouteProgressId: new Map([
      [
        "line-1",
        new Map(
          ["one", "two", "three", "four", "five", "six"].map(
            (id) => [id, allocation(id, 1)] as const,
          ),
        ),
      ],
    ]),
    lines: [buildLine("line-1", 100)],
    queue: ["one", "two", "three", "four", "five", "six"].map((id) =>
      buildQueueItem({
        id,
        inputReadyQuantity: 1,
        plannedQuantity: 1,
        workloadPointsPerUnit: 10,
      }),
    ),
  });

  assert.deepEqual(
    results.map((result) => result.routeProgress?.id),
    ["one", "two", "three", "four", "five", "six"],
  );
  assert.equal(results.reduce((total, result) => total + result.unusedPoints, 0), 40);
});

test("aynı kuyruk işi birden fazla hatta kapasiteye göre bölünebilir", () => {
  const results = buildDailyLineResults({
    allocationQuantityByLineAndRouteProgressId: new Map([
      ["line-1", new Map([["shared", allocation("line-1", 3)]])],
      ["line-2", new Map([["shared", allocation("line-2", 3)]])],
    ]),
    lines: [buildLine("line-1", 30), buildLine("line-2", 30)],
    queue: [
      buildQueueItem({
        id: "shared",
        inputReadyQuantity: 10,
        plannedQuantity: 10,
        workloadPointsPerUnit: 10,
      }),
    ],
  });

  assert.deepEqual(
    results.map((result) => result.producedQuantity),
    [3, 3],
  );
  assert.ok(results.every((result) => result.routeProgress?.id === "shared"));
});

test("otomatik planın allocation kapsamına almadığı WIP üretilmez", () => {
  const results = buildDailyLineResults({
    allocationQuantityByLineAndRouteProgressId: new Map(),
    lines: [buildLine("line-1", 100)],
    queue: [
      buildQueueItem({
        id: "unallocated",
        inputReadyQuantity: 10,
        plannedQuantity: 10,
        workloadPointsPerUnit: 10,
      }),
    ],
  });

  assert.equal(results.length, 1);
  assert.equal(results[0]?.producedQuantity, 0);
  assert.equal(results[0]?.routeProgress, null);
});

test("staff coverage requirement ve assignment toplamından hesaplanır", () => {
  assert.equal(
    getLineStaffCoverageBps({
      assignedStaffQuantity: 12,
      requiredStaffQuantity: 15,
    }),
    8_000,
  );
  assert.equal(
    getLineStaffCoverageBps({
      assignedStaffQuantity: 20,
      requiredStaffQuantity: 15,
    }),
    10_000,
  );
  assert.equal(
    getLineStaffCoverageBps({
      assignedStaffQuantity: 0,
      requiredStaffQuantity: 0,
    }),
    0,
  );
});

test("allocation map aynı hat ve route kayıtlarını aggregate eder", () => {
  const allocationMap = buildAllocationMap([
    {
      factoryProductionLineId: "line-1",
      id: "allocation-1",
      plannedQuantity: 3,
      plannedSetupPoints: 2,
      plannedTotalPoints: 32,
      productionOrderRouteProgressId: "route-1",
    },
    {
      factoryProductionLineId: "line-1",
      id: "allocation-2",
      plannedQuantity: 4,
      plannedSetupPoints: 0,
      plannedTotalPoints: 40,
      productionOrderRouteProgressId: "route-2",
    },
  ]);

  assert.deepEqual(
    Array.from(allocationMap.get("line-1") ?? []),
    [
      [
        "route-1",
        {
          plannedQuantity: 3,
          plannedSetupPoints: 2,
          plannedTotalPoints: 32,
          productionAllocationId: "allocation-1",
          remainingQuantity: 3,
        },
      ],
      [
        "route-2",
        {
          plannedQuantity: 4,
          plannedSetupPoints: 0,
          plannedTotalPoints: 40,
          productionAllocationId: "allocation-2",
          remainingQuantity: 4,
        },
      ],
    ],
  );
});

test("kısmi fason varken iç hatta hazır kalan batch üretilebilir", () => {
  const common = {
    activeDepartmentIds: new Set(["printing"]),
    canOutsource: true,
    completedQuantity: 0,
    departmentId: "printing",
    inOutsourceQuantity: 40,
    isRequired: true,
    plannedQuantity: 100,
    processingMode: RouteProcessingMode.INTERNAL,
  };

  assert.equal(
    getRouteProgressStatus({ ...common, inputReadyQuantity: 100 }),
    RouteProgressStatus.READY,
  );
  assert.equal(
    getRouteProgressStatus({ ...common, inputReadyQuantity: 40 }),
    RouteProgressStatus.WAITING_OUTSOURCE,
  );
});

test("factory ve simulatedGameDay için deterministik shift claim anahtarı üretir", () => {
  assert.equal(
    buildShiftIdempotencyKey("factory-1", 14),
    "factory-day:factory-1:14",
  );
});

test("aynı factory ve gameDay claim edildiğinde ikinci denemeyi reddeder", async () => {
  let claimed = false;
  const createCalls: Array<Record<string, unknown>> = [];
  const prisma = {
    shiftSimulation: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createCalls.push(data);

        if (claimed) {
          throw new Prisma.PrismaClientKnownRequestError("duplicate claim", {
            clientVersion: "test",
            code: "P2002",
          });
        }

        claimed = true;
        return { id: "shift-1" };
      },
    },
  } as unknown as Parameters<typeof claimFactoryDayShift>[0]["prisma"];
  const input = {
    factoryId: "factory-1",
    idempotencyKey: buildShiftIdempotencyKey("factory-1", 14),
    prisma,
    sectorId: "sector-1",
    simulatedGameDay: 14,
  };

  assert.deepEqual(await claimFactoryDayShift(input), { id: "shift-1" });
  await assert.rejects(
    claimFactoryDayShift(input),
    ShiftClaimConflictError,
  );

  assert.equal(createCalls[0]?.gameDay, 14);
  assert.equal(createCalls[0]?.status, ShiftSimulationStatus.RUNNING);
  assert.equal(createCalls[0]?.simulationDurationSeconds, 25);
});
