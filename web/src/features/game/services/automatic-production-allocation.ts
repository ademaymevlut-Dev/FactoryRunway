import { randomUUID } from "node:crypto";

import {
  ProductionAllocationSource,
  ProductionAllocationStatus,
  ProductionPlanStatus,
  type Prisma,
} from "@/generated/prisma/client";
import {
  buildAutomaticProductionAllocations,
  compareAutomaticAllocationQueueItems,
  type AutomaticAllocationLine,
  type AutomaticAllocationQueueItem,
} from "./production-allocation-math";

export {
  buildAutomaticProductionAllocations,
  type AutomaticAllocationLine,
  type AutomaticAllocationQueueItem,
} from "./production-allocation-math";

export async function createLockedAutomaticProductionPlan(input: {
  factoryId: string;
  gameDay: number;
  lines: AutomaticAllocationLine[];
  queue: AutomaticAllocationQueueItem[];
  sectorId: string;
  shiftSimulationId: string;
  tx: Prisma.TransactionClient;
}) {
  const segments = buildAutomaticProductionAllocations({
    createId: randomUUID,
    lines: input.lines,
    queue: input.queue,
  });
  const prioritySnapshot = Array.from(
    new Map(
      [...input.queue]
        .sort(compareAutomaticAllocationQueueItems)
        .map((item) => [
          item.productionOrderId,
          {
            priority: item.priority,
            productionOrderId: item.productionOrderId,
          },
        ]),
    ).values(),
  );
  const plannedLineCount = new Set(
    segments.map((segment) => segment.factoryProductionLineId),
  ).size;
  const totalEffectivePoints = input.lines.reduce(
    (total, line) => total + Math.max(0, line.effectivePointCapacity),
    0,
  );
  const totalPlannedPoints = segments.reduce(
    (total, segment) => total + segment.plannedTotalPoints,
    0,
  );
  const plan = await input.tx.productionPlan.upsert({
    where: {
      factoryId_gameDay: {
        factoryId: input.factoryId,
        gameDay: input.gameDay,
      },
    },
    create: {
      activeLineCount: input.lines.length,
      averagePlannedUtilizationBps:
        totalEffectivePoints > 0
          ? Math.min(
              10_000,
              Math.round(
                (totalPlannedPoints * 10_000) / totalEffectivePoints,
              ),
            )
          : 0,
      factoryId: input.factoryId,
      gameDay: input.gameDay,
      idleLineCount: input.lines.length - plannedLineCount,
      lockedAt: new Date(),
      metadata: {
        prioritySnapshot,
        source: "automatic-order-priority-allocation",
      },
      plannedLineCount,
      sectorId: input.sectorId,
      status: ProductionPlanStatus.LOCKED,
      totalPlannedPoints,
      totalPlannedQuantity: segments.reduce(
        (total, segment) => total + segment.plannedQuantity,
        0,
      ),
    },
    update: {
      activeLineCount: input.lines.length,
      averagePlannedUtilizationBps:
        totalEffectivePoints > 0
          ? Math.min(
              10_000,
              Math.round(
                (totalPlannedPoints * 10_000) / totalEffectivePoints,
              ),
            )
          : 0,
      idleLineCount: input.lines.length - plannedLineCount,
      lockedAt: new Date(),
      metadata: {
        prioritySnapshot,
        source: "automatic-order-priority-allocation",
      },
      plannedLineCount,
      sectorId: input.sectorId,
      status: ProductionPlanStatus.LOCKED,
      totalPlannedPoints,
      totalPlannedQuantity: segments.reduce(
        (total, segment) => total + segment.plannedQuantity,
        0,
      ),
    },
    select: { id: true },
  });

  await input.tx.productionAllocation.deleteMany({
    where: { productionPlanId: plan.id },
  });
  if (segments.length > 0) {
    await input.tx.productionAllocation.createMany({
      data: segments.map((segment) => ({
        ...segment,
        factoryId: input.factoryId,
        gameDay: input.gameDay,
        lockedAt: new Date(),
        metadata: { source: "automatic-order-priority-allocation" },
        productionPlanId: plan.id,
        sectorId: input.sectorId,
        source: ProductionAllocationSource.AUTO,
        status: ProductionAllocationStatus.LOCKED,
      })),
    });
  }
  await input.tx.shiftSimulation.update({
    where: { id: input.shiftSimulationId },
    data: { productionPlanId: plan.id },
  });

  return { planId: plan.id, segments };
}

export async function markAutomaticProductionPlanExecuted(input: {
  planId: string;
  tx: Prisma.TransactionClient;
}) {
  const executedAt = new Date();

  await Promise.all([
    input.tx.productionAllocation.updateMany({
      where: { productionPlanId: input.planId },
      data: {
        status: ProductionAllocationStatus.EXECUTED,
      },
    }),
    input.tx.productionPlan.update({
      where: { id: input.planId },
      data: {
        executedAt,
        status: ProductionPlanStatus.EXECUTED,
      },
    }),
  ]);
}
