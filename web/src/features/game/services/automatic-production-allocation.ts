import { randomUUID } from "node:crypto";

import {
  ProductionAllocationSource,
  ProductionAllocationStatus,
  ProductionPlanStatus,
  type Prisma,
} from "@/generated/prisma/client";

export type AutomaticAllocationLine = {
  id: string;
  departmentId: string;
  productionLineTemplateId: string;
  effectivePointCapacity: number;
  dailyPointCapacity: number;
  conditionBps: number;
  staffCoverageBps: number;
  sortOrder: number;
  lineNumber: number;
};

export type AutomaticAllocationQueueItem = {
  id: string;
  departmentId: string;
  productRouteStepId: string;
  productId: string;
  productionOrderId: string;
  customerOrderId: string;
  customerOrderItemId: string;
  availableQuantity: number;
  remainingQuantity: number;
  workloadPointsPerUnit: number;
  setupPoints: number;
  priority: number;
  targetDeliveryDay: number;
  createdAt: Date;
};

export type AutomaticAllocationSegment = {
  id: string;
  factoryProductionLineId: string;
  productionLineTemplateId: string;
  productionOrderRouteProgressId: string;
  productionOrderId: string;
  customerOrderId: string;
  customerOrderItemId: string;
  productId: string;
  departmentId: string;
  productRouteStepId: string;
  lineSequence: number;
  planSortOrder: number;
  plannedQuantity: number;
  plannedWorkloadPoints: number;
  plannedSetupPoints: number;
  plannedTotalPoints: number;
  workloadPointsPerUnit: number;
  lineDailyPointCapacitySnapshot: number;
  lineConditionBpsSnapshot: number;
  staffCoverageBpsSnapshot: number;
  plannedAvailablePointsSnapshot: number;
};

export function buildAutomaticProductionAllocations(input: {
  lines: AutomaticAllocationLine[];
  queue: AutomaticAllocationQueueItem[];
  createId?: () => string;
}) {
  const createId = input.createId ?? randomUUID;
  const queue = [...input.queue].sort(compareQueueItems);
  const remainingByRouteProgressId = new Map(
    queue.map((item) => [
      item.id,
      Math.max(
        0,
        Math.min(item.availableQuantity, item.remainingQuantity),
      ),
    ]),
  );
  const setupAppliedRouteProgressIds = new Set<string>();
  const segments: AutomaticAllocationSegment[] = [];
  let planSortOrder = 0;

  for (const line of [...input.lines].sort(compareLines)) {
    let remainingPoints = Math.max(0, line.effectivePointCapacity);
    let lineSequence = 0;

    if (remainingPoints <= 0) continue;

    for (const queueItem of queue) {
      if (queueItem.departmentId !== line.departmentId) continue;

      const availableQuantity =
        remainingByRouteProgressId.get(queueItem.id) ?? 0;

      if (availableQuantity <= 0) continue;

      const workloadPointsPerUnit = Math.max(
        1,
        queueItem.workloadPointsPerUnit,
      );
      const plannedSetupPoints = setupAppliedRouteProgressIds.has(queueItem.id)
        ? 0
        : Math.min(Math.max(0, queueItem.setupPoints), remainingPoints);
      const capacityQuantity = Math.floor(
        Math.max(0, remainingPoints - plannedSetupPoints) /
          workloadPointsPerUnit,
      );
      const plannedQuantity = Math.min(
        availableQuantity,
        capacityQuantity,
      );

      if (plannedQuantity <= 0) continue;

      const plannedWorkloadPoints =
        plannedQuantity * workloadPointsPerUnit;
      const plannedTotalPoints =
        plannedWorkloadPoints + plannedSetupPoints;
      lineSequence += 1;
      planSortOrder += 1;
      segments.push({
        customerOrderId: queueItem.customerOrderId,
        customerOrderItemId: queueItem.customerOrderItemId,
        departmentId: queueItem.departmentId,
        factoryProductionLineId: line.id,
        id: createId(),
        lineConditionBpsSnapshot: line.conditionBps,
        lineDailyPointCapacitySnapshot: line.dailyPointCapacity,
        lineSequence,
        planSortOrder,
        plannedAvailablePointsSnapshot: line.effectivePointCapacity,
        plannedQuantity,
        plannedSetupPoints,
        plannedTotalPoints,
        plannedWorkloadPoints,
        productId: queueItem.productId,
        productionLineTemplateId: line.productionLineTemplateId,
        productionOrderId: queueItem.productionOrderId,
        productionOrderRouteProgressId: queueItem.id,
        productRouteStepId: queueItem.productRouteStepId,
        staffCoverageBpsSnapshot: line.staffCoverageBps,
        workloadPointsPerUnit,
      });
      remainingByRouteProgressId.set(
        queueItem.id,
        availableQuantity - plannedQuantity,
      );
      remainingPoints -= plannedTotalPoints;
      setupAppliedRouteProgressIds.add(queueItem.id);

      if (remainingPoints <= 0) break;
    }
  }

  return segments;
}

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
    lines: input.lines,
    queue: input.queue,
  });
  const prioritySnapshot = Array.from(
    new Map(
      [...input.queue]
        .sort(compareQueueItems)
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

function compareQueueItems(
  first: AutomaticAllocationQueueItem,
  second: AutomaticAllocationQueueItem,
) {
  return (
    first.priority - second.priority ||
    first.targetDeliveryDay - second.targetDeliveryDay ||
    first.createdAt.getTime() - second.createdAt.getTime() ||
    first.id.localeCompare(second.id)
  );
}

function compareLines(
  first: AutomaticAllocationLine,
  second: AutomaticAllocationLine,
) {
  return (
    first.sortOrder - second.sortOrder ||
    first.lineNumber - second.lineNumber ||
    first.id.localeCompare(second.id)
  );
}
