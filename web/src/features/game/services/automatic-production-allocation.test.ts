import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@/generated/prisma/client";

import {
  buildAutomaticProductionAllocations,
  createLockedAutomaticProductionPlan,
  type AutomaticAllocationLine,
  type AutomaticAllocationQueueItem,
} from "./automatic-production-allocation";

function line(
  id: string,
  effectivePointCapacity: number,
  departmentId = "cutting",
): AutomaticAllocationLine {
  return {
    conditionBps: 10_000,
    dailyPointCapacity: effectivePointCapacity,
    departmentId,
    effectivePointCapacity,
    id,
    lineNumber: Number(id.replace(/\D/g, "")) || 1,
    productionLineTemplateId: `template-${id}`,
    sortOrder: Number(id.replace(/\D/g, "")) || 1,
    staffCoverageBps: effectivePointCapacity > 0 ? 10_000 : 0,
  };
}

function queueItem(input: {
  availableQuantity: number;
  departmentId?: string;
  id: string;
  priority: number;
  workloadPointsPerUnit?: number;
}): AutomaticAllocationQueueItem {
  return {
    availableQuantity: input.availableQuantity,
    createdAt: new Date(`2026-01-${String(input.priority / 100).padStart(2, "0")}T00:00:00.000Z`),
    customerOrderId: `customer-${input.id}`,
    customerOrderItemId: `item-${input.id}`,
    departmentId: input.departmentId ?? "cutting",
    id: input.id,
    priority: input.priority,
    productId: `product-${input.id}`,
    productionOrderId: `order-${input.id}`,
    productRouteStepId: `step-${input.id}`,
    remainingQuantity: input.availableQuantity,
    setupPoints: 0,
    targetDeliveryDay: 20,
    workloadPointsPerUnit: input.workloadPointsPerUnit ?? 10,
  };
}

function allocate(
  lines: AutomaticAllocationLine[],
  queue: AutomaticAllocationQueueItem[],
) {
  let id = 0;
  return buildAutomaticProductionAllocations({
    createId: () => `allocation-${++id}`,
    lines,
    queue,
  });
}

test("tek hat en yüksek öncelikli üretilebilir siparişi otomatik alır", () => {
  const result = allocate([line("line-1", 100)], [
    queueItem({ availableQuantity: 20, id: "a", priority: 100 }),
  ]);

  assert.equal(result.length, 1);
  assert.equal(result[0]?.productionOrderId, "order-a");
  assert.equal(result[0]?.plannedQuantity, 10);
});

test("iki hat aynı departman kapasitesine katılır ve aynı WIP iki kez tüketilmez", () => {
  const result = allocate(
    [line("line-1", 100), line("line-2", 100)],
    [queueItem({ availableQuantity: 15, id: "a", priority: 100 })],
  );

  assert.equal(result.length, 2);
  assert.deepEqual(result.map((item) => item.plannedQuantity), [10, 5]);
  assert.equal(
    result.reduce((total, item) => total + item.plannedQuantity, 0),
    15,
  );
});

test("ilk sipariş bitince hattın kalan kapasitesini ikinci siparişe aktarır", () => {
  const result = allocate([line("line-1", 100)], [
    queueItem({ availableQuantity: 4, id: "a", priority: 100 }),
    queueItem({ availableQuantity: 20, id: "b", priority: 200 }),
  ]);

  assert.deepEqual(
    result.map((item) => [item.productionOrderId, item.plannedQuantity]),
    [
      ["order-a", 4],
      ["order-b", 6],
    ],
  );
});

test("ilk priority siparişinde WIP yoksa sonraki üretilebilir siparişe geçer", () => {
  const result = allocate([line("line-1", 100)], [
    queueItem({ availableQuantity: 0, id: "a", priority: 100 }),
    queueItem({ availableQuantity: 10, id: "b", priority: 200 }),
  ]);

  assert.equal(result[0]?.productionOrderId, "order-b");
  assert.equal(result[0]?.plannedQuantity, 10);
});

test("WIP yoksa veya staff coverage nedeniyle kapasite sıfırsa allocation üretmez", () => {
  assert.deepEqual(
    allocate([line("line-1", 100)], [
      queueItem({ availableQuantity: 0, id: "a", priority: 100 }),
    ]),
    [],
  );
  assert.deepEqual(
    allocate([line("line-1", 0)], [
      queueItem({ availableQuantity: 10, id: "a", priority: 100 }),
    ]),
    [],
  );
});

test("farklı departmanlar aynı global priority sırasını kendi WIP'lerine uygular", () => {
  const result = allocate(
    [line("cut-1", 100, "cutting"), line("sew-1", 100, "sewing")],
    [
      queueItem({ availableQuantity: 10, id: "cut-a", priority: 100 }),
      queueItem({
        availableQuantity: 10,
        departmentId: "sewing",
        id: "sew-a",
        priority: 100,
      }),
    ],
  );

  assert.equal(result.length, 2);
  assert.deepEqual(
    new Set(result.map((item) => item.departmentId)),
    new Set(["cutting", "sewing"]),
  );
});

test("aynı plan yeniden oluşturulursa allocation satırlarını çoğaltmaz", async () => {
  const allocations: Array<Record<string, unknown>> = [];
  const tx = {
    productionPlan: {
      upsert: async () => ({ id: "plan-1" }),
    },
    productionAllocation: {
      deleteMany: async () => {
        allocations.splice(0, allocations.length);
        return { count: 0 };
      },
      createMany: async ({ data }: { data: Array<Record<string, unknown>> }) => {
        allocations.push(...data);
        return { count: data.length };
      },
    },
    shiftSimulation: {
      update: async () => ({ id: "shift-1" }),
    },
  } as unknown as Prisma.TransactionClient;
  const input = {
    factoryId: "factory-1",
    gameDay: 4,
    lines: [line("line-1", 100)],
    queue: [queueItem({ availableQuantity: 10, id: "a", priority: 100 })],
    sectorId: "textile",
    shiftSimulationId: "shift-1",
    tx,
  };

  await createLockedAutomaticProductionPlan(input);
  assert.equal(allocations.length, 1);
  await createLockedAutomaticProductionPlan(input);
  assert.equal(allocations.length, 1);
});
