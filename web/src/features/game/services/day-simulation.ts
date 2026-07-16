import {
  CustomerOrderItemStatus,
  CustomerOrderStatus,
  FactoryProductionLineStatus,
  OutsourceJobStatus,
  Prisma,
  ProductionOrderStatus,
  RouteProcessingMode,
  RouteProgressStatus,
  ShiftLineResultStatus,
  ShiftSimulationStatus,
  XpReason,
} from "@/generated/prisma/client";
import { calculateOutsourceCompletion } from "@/features/production-queue/services/outsource-math";
import { processDueLeasingPayments } from "@/features/investment/services/leasing-payment";
import { runFinancePeriodClosing } from "@/features/finance/services/finance-period-closing";
import { processShippingAndReceivables } from "@/features/warehouse/services/shipping-service";
import { grantFactoryXp } from "./factory-progression";
import {
  processOutsourceCompletionPayments,
  processPeriodicFinancialTriggers,
} from "./financial-triggers";
import { processLateDeliveryPenalties } from "./order-penalties";
import { processShippedOrderXpRewards } from "./order-xp-rewards";
import {
  createLockedAutomaticProductionPlan,
  markAutomaticProductionPlanExecuted,
} from "./automatic-production-allocation";
import {
  calculateEffectiveLinePointCapacity,
  getLineStaffCoverageBps,
} from "./production-capacity";

export { getLineStaffCoverageBps } from "./production-capacity";

import { SHIFT_PLAYBACK_DURATION_SECONDS } from "../shift-playback";
import type { ShiftPlayback } from "../types";
import {
  getActiveShiftPlayback,
  getShiftPlaybackById,
} from "./shift-playback-view";
import {
  isUniqueConstraintError,
  ShiftClaimConflictError,
} from "./shift-transaction";
import {
  addDepartmentQueueEntry,
  buildDepartmentQueueSnapshot,
  buildShiftDepartmentResultRows,
  getAvailableQuantity,
} from "./shift-department-result";

export { getAvailableQuantity } from "./shift-department-result";

const SHIFT_COMPLETED_XP = 30;

type TransactionClient = Prisma.TransactionClient;
type DaySimulationClient = TransactionClient;

export type FactoryDaySimulationResult = {
  outcome: "STARTED" | "ACTIVE_PLAYBACK";
  playback: ShiftPlayback;
};

type ProductionLineForSimulation = {
  id: string;
  departmentId: string;
  productionLineTemplateId: string;
  lineNumber: number;
  sortOrder: number;
  conditionBps: number;
  assignedStaffQuantity: number;
  requiredStaffQuantity: number;
  productionLineTemplate: {
    dailyPointCapacity: number;
  };
};

type OrderRouteStepForSimulation = {
  id: string;
  canOutsource: boolean;
  completedQuantity: number;
  departmentId: string;
  inOutsourceQuantity: number;
  inputReadyQuantity: number;
  manualPriorityOverride: boolean;
  plannedQuantity: number;
  processingMode: RouteProcessingMode;
  queueEnteredDay: number | null;
  queuePriority: number;
  sequence: number;
  status: RouteProgressStatus;
};

type RouteProgressForSimulation = {
  id: string;
  productRouteStepId: string;
  departmentId: string;
  sequence: number;
  workloadPointsPerUnit: number;
  setupPoints: number;
  plannedQuantity: number;
  inputReadyQuantity: number;
  completedQuantity: number;
  inOutsourceQuantity: number;
  remainingQuantity: number;
  status: RouteProgressStatus;
  createdAt: Date;
  productionOrder: {
    id: string;
    productId: string;
    plannedQuantity: number;
    completedQuantity: number;
    remainingQuantity: number;
    priority: number;
    targetDeliveryDay: number;
    startedDay: number | null;
    completedDay: number | null;
    customerOrderId: string;
    customerOrderItemId: string;
    routeProgress: OrderRouteStepForSimulation[];
  };
};

type DailyLineResult = {
  blockedReason: string | null;
  conditionBps: number;
  departmentId: string;
  effectivePointCapacity: number;
  inputReadyQuantity: number;
  line: ProductionLineForSimulation;
  plannedPointCapacity: number;
  plannedQuantity: number;
  producedQuantity: number;
  routeProgress: RouteProgressForSimulation | null;
  setupPointsUsed: number;
  status: ShiftLineResultStatus;
  staffCoverageBps: number;
  templateDailyPointCapacity: number;
  unusedPoints: number;
  usedPoints: number;
  utilizationBps: number;
  workloadPointsPerUnit: number | null;
  productionAllocationId: string | null;
};

type AllocationExecution = {
  plannedQuantity: number;
  plannedSetupPoints: number;
  plannedTotalPoints: number;
  productionAllocationId: string;
  remainingQuantity: number;
};

export async function simulateFactoryDay(input: {
  factoryId: string;
  prisma: DaySimulationClient;
}): Promise<FactoryDaySimulationResult> {
  const { factoryId, prisma } = input;
  const factory = await prisma.factory.findUniqueOrThrow({
    where: { id: factoryId },
    select: {
      id: true,
      sectorId: true,
      currentDay: true,
      playerProfileId: true,
      productionLines: {
        where: {
          status: {
            in: [
              FactoryProductionLineStatus.IDLE,
              FactoryProductionLineStatus.RUNNING,
            ],
          },
        },
        orderBy: [{ sortOrder: "asc" }, { lineNumber: "asc" }],
        select: {
          id: true,
          departmentId: true,
          productionLineTemplateId: true,
          lineNumber: true,
          sortOrder: true,
          conditionBps: true,
          productionLineTemplate: {
            select: {
              dailyPointCapacity: true,
              staffRequirements: {
                select: { requiredQuantity: true },
              },
            },
          },
          staffAssignments: {
            where: { status: "ACTIVE" },
            select: { quantity: true },
          },
        },
      },
    },
  });
  const activePlayback = await getActiveShiftPlayback({
    factoryId: factory.id,
    prisma,
  });

  if (activePlayback) {
    return {
      outcome: "ACTIVE_PLAYBACK",
      playback: activePlayback,
    };
  }

  const simulatedGameDay = factory.currentDay;
  const nextGameDay = simulatedGameDay + 1;
  const idempotencyKey = buildShiftIdempotencyKey(
    factory.id,
    simulatedGameDay,
  );
  const shiftSimulation = await claimFactoryDayShift({
    factoryId: factory.id,
    idempotencyKey,
    prisma,
    sectorId: factory.sectorId,
    simulatedGameDay,
  });
  const activeDepartmentIds = new Set(
    factory.productionLines.map((line) => line.departmentId),
  );

  await reconcileRouteInputQuantities({
    activeDepartmentIds,
    factoryId,
    prisma,
  });
  const startingQueueByDepartmentId = await getFactoryQueueSnapshot({
    factoryId,
    prisma,
  });
  const queueEnteredByDepartmentId = new Map<string, number>();

  const queue = await prisma.productionOrderRouteProgress.findMany({
    where: {
      factoryId,
      inputReadyQuantity: { gt: 0 },
      isRequired: true,
      processingMode: RouteProcessingMode.INTERNAL,
      remainingQuantity: { gt: 0 },
      status: {
        in: [
          RouteProgressStatus.READY,
          RouteProgressStatus.IN_PROGRESS,
        ],
      },
      productionOrder: {
        status: {
          in: [
            ProductionOrderStatus.PLANNED,
            ProductionOrderStatus.RELEASED,
            ProductionOrderStatus.IN_PROGRESS,
            ProductionOrderStatus.WAITING_INPUT,
            ProductionOrderStatus.WAITING_OUTSOURCE,
          ],
        },
      },
    },
    orderBy: [
      { department: { routeOrder: "asc" } },
      { productionOrder: { priority: "asc" } },
      { productionOrder: { targetDeliveryDay: "asc" } },
      { productionOrder: { createdAt: "asc" } },
      { createdAt: "asc" },
      { id: "asc" },
    ],
    select: {
      completedQuantity: true,
      createdAt: true,
      departmentId: true,
      id: true,
      inOutsourceQuantity: true,
      inputReadyQuantity: true,
      plannedQuantity: true,
      productRouteStepId: true,
      remainingQuantity: true,
      sequence: true,
      setupPoints: true,
      status: true,
      workloadPointsPerUnit: true,
      productionOrder: {
        select: {
          completedDay: true,
          completedQuantity: true,
          customerOrderId: true,
          customerOrderItemId: true,
          id: true,
          plannedQuantity: true,
          priority: true,
          productId: true,
          remainingQuantity: true,
          targetDeliveryDay: true,
          startedDay: true,
          routeProgress: {
            where: { isRequired: true },
            orderBy: { sequence: "asc" },
            select: {
              canOutsource: true,
              completedQuantity: true,
              departmentId: true,
              id: true,
              inOutsourceQuantity: true,
              inputReadyQuantity: true,
              manualPriorityOverride: true,
              plannedQuantity: true,
              processingMode: true,
              queueEnteredDay: true,
              queuePriority: true,
              sequence: true,
              status: true,
            },
          },
        },
      },
    },
  }).then((items) => items.filter((item) => getAvailableQuantity(item) > 0));
  const simulationLines = factory.productionLines.map((line) => ({
    assignedStaffQuantity: line.staffAssignments.reduce(
      (total, assignment) => total + assignment.quantity,
      0,
    ),
    conditionBps: line.conditionBps,
    departmentId: line.departmentId,
    id: line.id,
    lineNumber: line.lineNumber,
    productionLineTemplate: {
      dailyPointCapacity: line.productionLineTemplate.dailyPointCapacity,
    },
    productionLineTemplateId: line.productionLineTemplateId,
    requiredStaffQuantity:
      line.productionLineTemplate.staffRequirements.reduce(
        (total, requirement) => total + requirement.requiredQuantity,
        0,
      ),
    sortOrder: line.sortOrder,
  }));
  const automaticPlan = await createLockedAutomaticProductionPlan({
    factoryId: factory.id,
    gameDay: simulatedGameDay,
    lines: simulationLines.map((line) => ({
      conditionBps: line.conditionBps,
      dailyPointCapacity: line.productionLineTemplate.dailyPointCapacity,
      departmentId: line.departmentId,
      effectivePointCapacity: getEffectivePointCapacity(line),
      id: line.id,
      lineNumber: line.lineNumber,
      productionLineTemplateId: line.productionLineTemplateId,
      sortOrder: line.sortOrder,
      staffCoverageBps: getLineStaffCoverageBps(line),
    })),
    queue: queue.map((item) => ({
      availableQuantity: getAvailableQuantity(item),
      createdAt: item.createdAt,
      customerOrderId: item.productionOrder.customerOrderId,
      customerOrderItemId: item.productionOrder.customerOrderItemId,
      departmentId: item.departmentId,
      id: item.id,
      priority: item.productionOrder.priority,
      productId: item.productionOrder.productId,
      productionOrderId: item.productionOrder.id,
      productRouteStepId: item.productRouteStepId,
      remainingQuantity: item.remainingQuantity,
      setupPoints: item.setupPoints,
      targetDeliveryDay: item.productionOrder.targetDeliveryDay,
      workloadPointsPerUnit: item.workloadPointsPerUnit,
    })),
    sectorId: factory.sectorId,
    shiftSimulationId: shiftSimulation.id,
    tx: prisma,
  });
  const allocationQuantityByLineAndRouteProgressId = buildAllocationMap(
    automaticPlan.segments,
  );
  const lineResults = buildDailyLineResults({
    allocationQuantityByLineAndRouteProgressId,
    lines: simulationLines,
    queue,
  });
  const day = summarizeLineResults(simulationLines, lineResults);
  const productionOrderIds = Array.from(
    new Set(
      lineResults
        .map((result) => result.routeProgress?.productionOrder.id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  await prisma.shiftLineResult.createMany({
    data: buildShiftLineResults({
      factoryId: factory.id,
      lineResults,
      shiftSimulationId: shiftSimulation.id,
    }),
  });

  await updateProductionProgress({
    activeDepartmentIds,
    factoryDay: simulatedGameDay,
    factoryId: factory.id,
    lineResults,
    prisma,
    queueEnteredByDepartmentId,
  });
  const outsourceCompletionResult = await completeReadyOutsourceJobs({
    activeDepartmentIds,
    factoryDay: simulatedGameDay,
    factoryId: factory.id,
    prisma,
    queueEnteredByDepartmentId,
  });
  const endingQueueByDepartmentId = await getFactoryQueueSnapshot({
    factoryId,
    prisma,
  });
  const departmentResults = buildShiftDepartmentResultRows({
    endingQueueByDepartmentId,
    factoryId: factory.id,
    lineResults,
    queueEnteredByDepartmentId,
    shiftSimulationId: shiftSimulation.id,
    startingQueueByDepartmentId,
  });

  if (departmentResults.length > 0) {
    await prisma.shiftDepartmentResult.createMany({
      data: departmentResults,
    });
  }

  await markAutomaticProductionPlanExecuted({
    planId: automaticPlan.planId,
    tx: prisma,
  });

  const shippingResult = await processShippingAndReceivables({
    factoryDay: simulatedGameDay,
    factoryId: factory.id,
    prisma,
  });
  const orderXpRewardResult = await processShippedOrderXpRewards({
    factoryDay: simulatedGameDay,
    factoryId: factory.id,
    orderIds: shippingResult.shippedOrderIds,
    tx: prisma,
  });
  const latePenaltyResult = await processLateDeliveryPenalties({
    factoryDay: simulatedGameDay,
    factoryId: factory.id,
    orderIds: shippingResult.shippedOrderIds,
    tx: prisma,
  });
  const periodicFinanceResult = await processPeriodicFinancialTriggers({
    factoryDay: simulatedGameDay,
    factoryId: factory.id,
    tx: prisma,
  });
  const leasingPaymentResult = await processDueLeasingPayments({
    factoryDay: simulatedGameDay,
    factoryId: factory.id,
    tx: prisma,
  });
  const financeClosingResult = await runFinancePeriodClosing({
    factoryDay: simulatedGameDay,
    factoryId: factory.id,
    tx: prisma,
  });

  const factoryAdvance = await prisma.factory.updateMany({
    where: {
      id: factory.id,
      currentDay: simulatedGameDay,
    },
    data: {
      currentDay: nextGameDay,
      lastSimulatedAt: new Date(),
    },
  });

  if (factoryAdvance.count !== 1) {
    throw new Error(
      `Factory day changed while simulating day ${simulatedGameDay}.`,
    );
  }

  const updatedFactory = await prisma.factory.findUniqueOrThrow({
    where: { id: factory.id },
    select: { currentDay: true },
  });

  if (updatedFactory.currentDay !== nextGameDay) {
    throw new Error(
      `Factory advanced to unexpected day ${updatedFactory.currentDay}.`,
    );
  }

  await grantFactoryXp({
    amountXp: SHIFT_COMPLETED_XP,
    factoryId: factory.id,
    gameDay: simulatedGameDay,
    metadata: {
      financePeriodClosed: financeClosingResult.closed,
      financePeriodIndex: financeClosingResult.periodIndex,
      overdueLeasingDueCount: leasingPaymentResult.overdueDueIds.length,
      overduePeriodicFinanceDueCount:
        periodicFinanceResult.overdueDueIds.length,
      paidLeasingDueCount: leasingPaymentResult.paidDueIds.length,
      paidOutsourceCompletionCount:
        outsourceCompletionResult.paidTransactionIds.length,
      paidPeriodicFinanceCount:
        periodicFinanceResult.paidTransactionIds.length,
      partialLeasingDueCount: leasingPaymentResult.partialDueIds.length,
      partialPeriodicFinanceDueCount:
        periodicFinanceResult.partialDueIds.length,
      producedQuantity: day.totalProducedQuantity,
      productionOrderIds,
      orderXpAwarded: orderXpRewardResult.totalAwardedXp,
      orderXpRewardedOrderCount: orderXpRewardResult.awardedOrderIds.length,
      orderXpRewardTransactionCount: orderXpRewardResult.transactionCount,
      latePenaltyDueCount: latePenaltyResult.dueIds.length,
      latePenaltyOrderCount: latePenaltyResult.penalizedOrderIds.length,
      latePenaltyPaidTransactionCount:
        latePenaltyResult.paidTransactionIds.length,
      latePenaltyTotalCents: latePenaltyResult.totalPenaltyCents.toString(),
      lateOrderCount: shippingResult.lateOrderIds.length,
      settledReceivableCount: shippingResult.settledDueIds.length,
      shippedOrderCount: shippingResult.shippedOrderIds.length,
      source: "main-factory-day",
    },
    reason: XpReason.SHIFT_COMPLETED,
    sourceId: shiftSimulation.id,
    sourceType: "shift",
    tx: prisma,
  });

  const playbackStartedAt = new Date();

  await prisma.shiftSimulation.update({
    where: { id: shiftSimulation.id },
    data: {
      activeLineCount: day.activeLineCount,
      averageUtilizationBps: day.averageUtilizationBps,
      blockedLineCount: day.blockedLineCount,
      completedAt: playbackStartedAt,
      metadata: {
        productionOrderIds,
        source: "main-factory-day",
      },
      status: ShiftSimulationStatus.COMPLETED,
      totalAvailablePoints: day.totalAvailablePoints,
      totalEffectivePoints: day.totalEffectivePoints,
      totalProducedQuantity: day.totalProducedQuantity,
      totalUnusedPoints: day.totalUnusedPoints,
      totalUsedPoints: day.totalUsedPoints,
    },
  });

  const playback = await getShiftPlaybackById({
    now: playbackStartedAt,
    prisma,
    shiftId: shiftSimulation.id,
  });

  if (!playback) {
    throw new Error("Completed shift playback could not be created.");
  }

  return {
    outcome: "STARTED",
    playback,
  };
}

export function buildShiftIdempotencyKey(
  factoryId: string,
  simulatedGameDay: number,
) {
  return `factory-day:${factoryId}:${simulatedGameDay}`;
}

export async function claimFactoryDayShift(input: {
  factoryId: string;
  idempotencyKey: string;
  prisma: DaySimulationClient;
  sectorId: string;
  simulatedGameDay: number;
}) {
  try {
    return await input.prisma.shiftSimulation.create({
      data: {
        factoryId: input.factoryId,
        gameDay: input.simulatedGameDay,
        idempotencyKey: input.idempotencyKey,
        metadata: {
          claimedGameDay: input.simulatedGameDay,
          source: "main-factory-day",
        },
        sectorId: input.sectorId,
        simulationDurationSeconds: SHIFT_PLAYBACK_DURATION_SECONDS,
        status: ShiftSimulationStatus.RUNNING,
      },
      select: { id: true },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ShiftClaimConflictError({
        cause: error,
        factoryId: input.factoryId,
        simulatedGameDay: input.simulatedGameDay,
      });
    }

    throw error;
  }
}

export function buildDailyLineResults({
  allocationQuantityByLineAndRouteProgressId,
  lines,
  queue,
}: {
    allocationQuantityByLineAndRouteProgressId: ReadonlyMap<
      string,
      ReadonlyMap<string, AllocationExecution>
    >;
  lines: ProductionLineForSimulation[];
  queue: RouteProgressForSimulation[];
}): DailyLineResult[] {
  const queueByDepartmentId = new Map<
    string,
    Array<{ availableQuantity: number; routeProgress: RouteProgressForSimulation }>
  >();
  const results: DailyLineResult[] = [];

  for (const routeProgress of queue) {
    const current = queueByDepartmentId.get(routeProgress.departmentId) ?? [];
    current.push({
      availableQuantity: getAvailableQuantity(routeProgress),
      routeProgress,
    });
    queueByDepartmentId.set(routeProgress.departmentId, current);
  }

  for (const line of lines) {
    const allocationQuantityByRouteProgressId =
      allocationQuantityByLineAndRouteProgressId.get(line.id);
    const departmentQueue = (
      queueByDepartmentId.get(line.departmentId) ?? []
    )
      .map((item) => ({
        ...item,
        allocation:
          allocationQuantityByRouteProgressId?.get(item.routeProgress.id) ??
          null,
      }))
      .filter((item) => (item.allocation?.remainingQuantity ?? 0) > 0);
    const lineResults: DailyLineResult[] = [];
    let remainingPointCapacity = getEffectivePointCapacity(line);

    while (remainingPointCapacity > 0) {
      const queueItem = departmentQueue.find(
        (item) =>
          item.availableQuantity > 0 &&
          (item.allocation?.remainingQuantity ?? 0) > 0,
      );

      if (!queueItem?.allocation) break;

      const result = simulateLineAllocation({
        availableQuantity: Math.min(
          queueItem.availableQuantity,
          queueItem.allocation.remainingQuantity,
        ),
        plannedQuantity: queueItem.allocation.plannedQuantity,
        plannedPointCapacity: queueItem.allocation.plannedTotalPoints,
        productionAllocationId: queueItem.allocation.productionAllocationId,
        line,
        pointCapacity: remainingPointCapacity,
        routeProgress: queueItem.routeProgress,
        setupPoints: queueItem.allocation.plannedSetupPoints,
      });

      if (result.producedQuantity <= 0) break;

      queueItem.availableQuantity -= result.producedQuantity;
      queueItem.allocation.remainingQuantity -= result.producedQuantity;
      remainingPointCapacity = Math.max(0, remainingPointCapacity - result.usedPoints);
      lineResults.push(result);
    }

    if (lineResults.length === 0) {
      results.push(buildIdleLineResult(line));
      continue;
    }

    for (const result of lineResults) {
      result.effectivePointCapacity = result.usedPoints;
    }
    lineResults[lineResults.length - 1].effectivePointCapacity += remainingPointCapacity;
    lineResults[lineResults.length - 1].unusedPoints = remainingPointCapacity;
    results.push(...lineResults);
  }

  return results;
}

function simulateLineAllocation({
  availableQuantity,
  plannedQuantity,
  plannedPointCapacity,
  productionAllocationId,
  line,
  pointCapacity,
  routeProgress,
  setupPoints,
}: {
  availableQuantity: number;
  plannedQuantity: number;
  plannedPointCapacity: number;
  productionAllocationId: string;
  line: ProductionLineForSimulation;
  pointCapacity: number;
  routeProgress: RouteProgressForSimulation;
  setupPoints: number;
}): DailyLineResult {
  const templateDailyPointCapacity = Math.max(0, line.productionLineTemplate.dailyPointCapacity);
  const effectivePointCapacity = Math.max(0, pointCapacity);
  const setupPointsUsed = Math.min(
    Math.max(0, setupPoints),
    effectivePointCapacity,
  );
  const pointsAvailableForUnits = Math.max(
    0,
    effectivePointCapacity - setupPointsUsed,
  );
  const workloadPointsPerUnit = Math.max(1, routeProgress.workloadPointsPerUnit);
  const capacityQuantity = Math.floor(pointsAvailableForUnits / workloadPointsPerUnit);
  const producedQuantity = Math.max(
    0,
    Math.min(capacityQuantity, availableQuantity, routeProgress.remainingQuantity),
  );
  const usedPoints = producedQuantity * workloadPointsPerUnit + setupPointsUsed;
  const utilizationBps =
    getEffectivePointCapacity(line) > 0
      ? Math.min(
          10_000,
          Math.round((usedPoints * 10_000) / getEffectivePointCapacity(line)),
        )
      : 0;

  return {
    blockedReason: null,
    conditionBps: line.conditionBps,
    departmentId: line.departmentId,
    effectivePointCapacity,
    inputReadyQuantity: availableQuantity,
    line,
    plannedQuantity,
    plannedPointCapacity,
    productionAllocationId,
    producedQuantity,
    routeProgress,
    setupPointsUsed,
    status:
      producedQuantity > 0
        ? ShiftLineResultStatus.PRODUCED
        : ShiftLineResultStatus.IDLE,
    staffCoverageBps: getLineStaffCoverageBps(line),
    templateDailyPointCapacity,
    unusedPoints: 0,
    usedPoints,
    utilizationBps,
    workloadPointsPerUnit,
  };
}

function buildIdleLineResult(line: ProductionLineForSimulation): DailyLineResult {
  const templateDailyPointCapacity = Math.max(
    0,
    line.productionLineTemplate.dailyPointCapacity,
  );
  const effectivePointCapacity = getEffectivePointCapacity(line);

  return {
    blockedReason: null,
    conditionBps: line.conditionBps,
    departmentId: line.departmentId,
    effectivePointCapacity,
    inputReadyQuantity: 0,
    line,
    plannedQuantity: 0,
    plannedPointCapacity: 0,
    productionAllocationId: null,
    producedQuantity: 0,
    routeProgress: null,
    setupPointsUsed: 0,
    status: ShiftLineResultStatus.IDLE,
    staffCoverageBps: getLineStaffCoverageBps(line),
    templateDailyPointCapacity,
    unusedPoints: effectivePointCapacity,
    usedPoints: 0,
    utilizationBps: 0,
    workloadPointsPerUnit: null,
  };
}

function summarizeLineResults(
  lines: ProductionLineForSimulation[],
  lineResults: DailyLineResult[],
) {
  const totalAvailablePoints = getTotalAvailablePoints(lines);
  const totalEffectivePoints = getTotalEffectivePoints(lines);
  const totalUsedPoints = lineResults.reduce((total, result) => total + result.usedPoints, 0);
  const totalUnusedPoints = Math.max(0, totalEffectivePoints - totalUsedPoints);

  return {
    activeLineCount: new Set(
      lineResults
        .filter((result) => result.producedQuantity > 0)
        .map((result) => result.line.id),
    ).size,
    averageUtilizationBps:
      totalEffectivePoints > 0
        ? Math.round((totalUsedPoints * 10_000) / totalEffectivePoints)
        : 0,
    blockedLineCount: lineResults.filter((result) => result.status === ShiftLineResultStatus.BLOCKED_NO_INPUT).length,
    gameDay: 0,
    totalAvailablePoints,
    totalEffectivePoints,
    totalProducedQuantity: lineResults.reduce((total, result) => total + result.producedQuantity, 0),
    totalUnusedPoints,
    totalUsedPoints,
  };
}

function buildShiftLineResults({
  factoryId,
  lineResults,
  shiftSimulationId,
}: {
  factoryId: string;
  lineResults: DailyLineResult[];
  shiftSimulationId: string;
}): Prisma.ShiftLineResultCreateManyInput[] {
  return lineResults.map((result) => ({
    blockedReason: result.blockedReason,
    conditionBps: result.conditionBps,
    departmentId: result.departmentId,
    effectivePointCapacity: result.effectivePointCapacity,
    factoryId,
    factoryProductionLineId: result.line.id,
    inputReadyQuantity: result.inputReadyQuantity,
    lineNumber: result.line.lineNumber,
    lineSortOrder: result.line.sortOrder,
    metadata: {
      source: "main-factory-day",
    },
    plannedPointCapacity: result.plannedPointCapacity,
    plannedQuantity: result.plannedQuantity,
    productId: result.routeProgress?.productionOrder.productId ?? null,
    productRouteStepId: result.routeProgress?.productRouteStepId ?? null,
    producedQuantity: result.producedQuantity,
    productionLineTemplateId: result.line.productionLineTemplateId,
    productionAllocationId: result.productionAllocationId,
    productionOrderId: result.routeProgress?.productionOrder.id ?? null,
    productionOrderRouteProgressId: result.routeProgress?.id ?? null,
    setupPointsUsed: result.setupPointsUsed,
    shiftSimulationId,
    status: result.status,
    staffCoverageBps: result.staffCoverageBps,
    templateDailyPointCapacity: result.templateDailyPointCapacity,
    unusedPoints: result.unusedPoints,
    usedPoints: result.usedPoints,
    utilizationBps: result.utilizationBps,
    workloadPointsPerUnit: result.workloadPointsPerUnit,
  }));
}

async function updateProductionProgress({
  activeDepartmentIds,
  factoryDay,
  factoryId,
  lineResults,
  prisma,
  queueEnteredByDepartmentId,
}: {
  activeDepartmentIds: Set<string>;
  factoryDay: number;
  factoryId: string;
  lineResults: DailyLineResult[];
  prisma: DaySimulationClient;
  queueEnteredByDepartmentId: Map<string, number>;
}) {
  const affectedOrderIds = new Set<string>();
  const completedProductionOrderIds: string[] = [];
  const nextQueuePriorityByDepartmentId = new Map<string, number>();
  const producedByRouteProgressId = new Map<
    string,
    { producedQuantity: number; routeProgress: RouteProgressForSimulation }
  >();
  const affectedRouteProgressIds = new Set<string>();

  for (const result of lineResults) {
    const routeProgress = result.routeProgress;

    if (!routeProgress || result.producedQuantity <= 0) continue;

    const current = producedByRouteProgressId.get(routeProgress.id);

    producedByRouteProgressId.set(routeProgress.id, {
      producedQuantity: (current?.producedQuantity ?? 0) + result.producedQuantity,
      routeProgress,
    });
  }

  // First consume every department's start-of-day input. Transfers are applied
  // only after this phase so downstream updates cannot overwrite fresh input.
  for (const { producedQuantity, routeProgress } of producedByRouteProgressId.values()) {
    const completedQuantityAfterSimulation = Math.min(
      routeProgress.plannedQuantity,
      routeProgress.completedQuantity + producedQuantity,
    );
    const remainingQuantityAfterSimulation = Math.max(
      0,
      routeProgress.plannedQuantity - completedQuantityAfterSimulation,
    );

    await prisma.productionOrderRouteProgress.update({
      where: { id: routeProgress.id },
      data: {
        completedQuantity: completedQuantityAfterSimulation,
        remainingQuantity: remainingQuantityAfterSimulation,
      },
    });

    affectedOrderIds.add(routeProgress.productionOrder.id);
    affectedRouteProgressIds.add(routeProgress.id);
  }

  // Then append today's output to the next required route step. inputReadyQuantity
  // is cumulative; completedQuantity is subtracted only when availability is read.
  for (const { producedQuantity, routeProgress } of producedByRouteProgressId.values()) {
    const nextRouteProgress = getNextRouteProgress(routeProgress);

    if (nextRouteProgress) {
      const isFirstQueueEntry = nextRouteProgress.queueEnteredDay === null;
      const queuePriority =
        isFirstQueueEntry && !nextRouteProgress.manualPriorityOverride
          ? await getNextQueuePriority({
              departmentId: nextRouteProgress.departmentId,
              factoryId,
              nextQueuePriorityByDepartmentId,
              prisma,
            })
          : undefined;

      await prisma.productionOrderRouteProgress.update({
        where: { id: nextRouteProgress.id },
        data: {
          inputReadyQuantity: { increment: producedQuantity },
          queueEnteredDay: isFirstQueueEntry ? factoryDay + 1 : undefined,
          queuePriority,
        },
      });
      addDepartmentQueueEntry(
        queueEnteredByDepartmentId,
        nextRouteProgress.departmentId,
        producedQuantity,
      );
      affectedRouteProgressIds.add(nextRouteProgress.id);
    }
  }

  await syncRouteProgressStatuses({
    activeDepartmentIds,
    prisma,
    routeProgressIds: Array.from(affectedRouteProgressIds),
  });

  for (const productionOrderId of affectedOrderIds) {
    const completedProductionOrderId = await updateOrderProgress({
      factoryDay,
      prisma,
      productionOrderId,
    });

    if (completedProductionOrderId) {
      completedProductionOrderIds.push(completedProductionOrderId);
    }
  }

  return completedProductionOrderIds;
}

async function completeReadyOutsourceJobs({
  activeDepartmentIds,
  factoryDay,
  factoryId,
  prisma,
  queueEnteredByDepartmentId,
}: {
  activeDepartmentIds: Set<string>;
  factoryDay: number;
  factoryId: string;
  prisma: DaySimulationClient;
  queueEnteredByDepartmentId: Map<string, number>;
}) {
  const dueJobs = await prisma.productionOutsourceJob.findMany({
    where: {
      factoryId,
      readyDay: { lte: factoryDay },
      status: OutsourceJobStatus.IN_PROGRESS,
    },
    orderBy: [{ readyDay: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      quantity: true,
      productionOrderRouteProgress: {
        select: {
          canOutsource: true,
          completedQuantity: true,
          departmentId: true,
          id: true,
          inOutsourceQuantity: true,
          inputReadyQuantity: true,
          plannedQuantity: true,
          processingMode: true,
          productionOrderId: true,
          queueEnteredDay: true,
          remainingQuantity: true,
          sequence: true,
          productionOrder: {
            select: {
              routeProgress: {
                where: { isRequired: true },
                orderBy: { sequence: "asc" },
                select: {
                  canOutsource: true,
                  completedQuantity: true,
                  departmentId: true,
                  id: true,
                  inOutsourceQuantity: true,
                  inputReadyQuantity: true,
                  manualPriorityOverride: true,
                  plannedQuantity: true,
                  processingMode: true,
                  queueEnteredDay: true,
                  queuePriority: true,
                  sequence: true,
                  status: true,
                },
              },
            },
          },
        },
      },
    },
  });
  const jobsByRouteProgressId = new Map<
    string,
    {
      jobIds: string[];
      quantity: number;
      routeProgress: (typeof dueJobs)[number]["productionOrderRouteProgress"];
    }
  >();

  for (const job of dueJobs) {
    const routeProgress = job.productionOrderRouteProgress;
    const current = jobsByRouteProgressId.get(routeProgress.id);

    if (current) {
      current.jobIds.push(job.id);
      current.quantity += job.quantity;
    } else {
      jobsByRouteProgressId.set(routeProgress.id, {
        jobIds: [job.id],
        quantity: job.quantity,
        routeProgress,
      });
    }
  }

  const affectedOrderIds = new Set<string>();
  const affectedRouteProgressIds = new Set<string>();
  const completedJobIds: string[] = [];
  const nextQueuePriorityByDepartmentId = new Map<string, number>();

  for (const group of jobsByRouteProgressId.values()) {
    const routeProgress = group.routeProgress;
    const completion = calculateOutsourceCompletion({
      completedQuantity: routeProgress.completedQuantity,
      inOutsourceQuantity: routeProgress.inOutsourceQuantity,
      jobQuantity: group.quantity,
      plannedQuantity: routeProgress.plannedQuantity,
    });

    await prisma.productionOrderRouteProgress.update({
      where: { id: routeProgress.id },
      data: {
        completedQuantity: completion.completedQuantity,
        inOutsourceQuantity: completion.inOutsourceQuantity,
        remainingQuantity: completion.remainingQuantity,
      },
    });
    await prisma.productionOutsourceJob.updateMany({
      where: { id: { in: group.jobIds }, status: OutsourceJobStatus.IN_PROGRESS },
      data: {
        actualReadyDay: factoryDay,
        status: OutsourceJobStatus.COMPLETED,
      },
    });
    completedJobIds.push(...group.jobIds);

    const nextActiveJob = await prisma.productionOutsourceJob.findFirst({
      where: {
        productionOrderRouteProgressId: routeProgress.id,
        status: {
          in: [OutsourceJobStatus.IN_PROGRESS, OutsourceJobStatus.DELAYED],
        },
      },
      orderBy: { readyDay: "asc" },
      select: { readyDay: true },
    });

    await prisma.productionOrderRouteProgress.update({
      where: { id: routeProgress.id },
      data: { outsourceReadyDay: nextActiveJob?.readyDay ?? null },
    });

    const nextRouteProgress = routeProgress.productionOrder.routeProgress.find(
      (step) => step.sequence > routeProgress.sequence,
    );

    if (nextRouteProgress) {
      const isFirstQueueEntry = nextRouteProgress.queueEnteredDay === null;
      const queuePriority =
        isFirstQueueEntry && !nextRouteProgress.manualPriorityOverride
          ? await getNextQueuePriority({
              departmentId: nextRouteProgress.departmentId,
              factoryId,
              nextQueuePriorityByDepartmentId,
              prisma,
            })
          : undefined;

      await prisma.productionOrderRouteProgress.update({
        where: { id: nextRouteProgress.id },
        data: {
          inputReadyQuantity: { increment: completion.completedByOutsource },
          queueEnteredDay: isFirstQueueEntry ? factoryDay + 1 : undefined,
          queuePriority,
        },
      });
      addDepartmentQueueEntry(
        queueEnteredByDepartmentId,
        nextRouteProgress.departmentId,
        completion.completedByOutsource,
      );
      affectedRouteProgressIds.add(nextRouteProgress.id);
    }

    affectedOrderIds.add(routeProgress.productionOrderId);
    affectedRouteProgressIds.add(routeProgress.id);
  }

  await syncRouteProgressStatuses({
    activeDepartmentIds,
    prisma,
    routeProgressIds: Array.from(affectedRouteProgressIds),
  });

  const completedProductionOrderIds: string[] = [];

  for (const productionOrderId of affectedOrderIds) {
    const completedProductionOrderId = await updateOrderProgress({
      factoryDay,
      prisma,
      productionOrderId,
    });

    if (completedProductionOrderId) {
      completedProductionOrderIds.push(completedProductionOrderId);
    }
  }

  void completedProductionOrderIds;

  return processOutsourceCompletionPayments({
    factoryDay,
    factoryId,
    jobIds: completedJobIds,
    tx: prisma,
  });
}

async function getFactoryQueueSnapshot({
  factoryId,
  prisma,
}: {
  factoryId: string;
  prisma: DaySimulationClient;
}) {
  const rows = await prisma.productionOrderRouteProgress.findMany({
    where: {
      factoryId,
      isRequired: true,
      remainingQuantity: { gt: 0 },
      productionOrder: {
        status: {
          in: [
            ProductionOrderStatus.PLANNED,
            ProductionOrderStatus.RELEASED,
            ProductionOrderStatus.IN_PROGRESS,
            ProductionOrderStatus.WAITING_INPUT,
            ProductionOrderStatus.WAITING_OUTSOURCE,
          ],
        },
      },
    },
    select: {
      completedQuantity: true,
      departmentId: true,
      inOutsourceQuantity: true,
      inputReadyQuantity: true,
      plannedQuantity: true,
    },
  });

  return buildDepartmentQueueSnapshot(rows);
}

async function reconcileRouteInputQuantities({
  activeDepartmentIds,
  factoryId,
  prisma,
}: {
  activeDepartmentIds: Set<string>;
  factoryId: string;
  prisma: DaySimulationClient;
}) {
  const productionOrders = await prisma.productionOrder.findMany({
    where: {
      factoryId,
      status: {
        in: [
          ProductionOrderStatus.PLANNED,
          ProductionOrderStatus.RELEASED,
          ProductionOrderStatus.IN_PROGRESS,
          ProductionOrderStatus.WAITING_INPUT,
          ProductionOrderStatus.WAITING_OUTSOURCE,
        ],
      },
    },
    select: {
      routeProgress: {
        orderBy: { sequence: "asc" },
        select: {
          canOutsource: true,
          completedQuantity: true,
          departmentId: true,
          id: true,
          inOutsourceQuantity: true,
          inputReadyQuantity: true,
          isRequired: true,
          plannedQuantity: true,
          processingMode: true,
          status: true,
        },
      },
    },
  });

  for (const productionOrder of productionOrders) {
    let previousRequiredCompletedQuantity: number | null = null;

    for (const routeProgress of productionOrder.routeProgress) {
      if (!routeProgress.isRequired) {
        if (routeProgress.status !== RouteProgressStatus.SKIPPED) {
          await prisma.productionOrderRouteProgress.update({
            where: { id: routeProgress.id },
            data: { status: RouteProgressStatus.SKIPPED },
          });
        }
        continue;
      }

      const upstreamCompletedQuantity =
        previousRequiredCompletedQuantity ?? routeProgress.plannedQuantity;
      const expectedInputReadyQuantity = Math.max(
        routeProgress.completedQuantity,
        Math.min(routeProgress.plannedQuantity, upstreamCompletedQuantity),
      );
      const expectedStatus = getRouteProgressStatus({
        activeDepartmentIds,
        ...routeProgress,
        inputReadyQuantity: expectedInputReadyQuantity,
      });

      if (
        routeProgress.inputReadyQuantity !== expectedInputReadyQuantity ||
        routeProgress.status !== expectedStatus
      ) {
        await prisma.productionOrderRouteProgress.update({
          where: { id: routeProgress.id },
          data: {
            inputReadyQuantity: expectedInputReadyQuantity,
            status: expectedStatus,
          },
        });
      }

      previousRequiredCompletedQuantity = routeProgress.completedQuantity;
    }
  }
}

async function syncRouteProgressStatuses({
  activeDepartmentIds,
  prisma,
  routeProgressIds,
}: {
  activeDepartmentIds: Set<string>;
  prisma: DaySimulationClient;
  routeProgressIds: string[];
}) {
  if (routeProgressIds.length === 0) return;

  const routeProgress = await prisma.productionOrderRouteProgress.findMany({
    where: { id: { in: routeProgressIds } },
    select: {
      canOutsource: true,
      completedQuantity: true,
      departmentId: true,
      id: true,
      inOutsourceQuantity: true,
      inputReadyQuantity: true,
      isRequired: true,
      plannedQuantity: true,
      processingMode: true,
      status: true,
    },
  });

  for (const progress of routeProgress) {
    const status = getRouteProgressStatus({
      activeDepartmentIds,
      ...progress,
    });

    if (status !== progress.status) {
      await prisma.productionOrderRouteProgress.update({
        where: { id: progress.id },
        data: { status },
      });
    }
  }
}

export function getRouteProgressStatus(input: {
  activeDepartmentIds: Set<string>;
  canOutsource: boolean;
  completedQuantity: number;
  departmentId: string;
  inOutsourceQuantity: number;
  inputReadyQuantity: number;
  isRequired: boolean;
  plannedQuantity: number;
  processingMode: RouteProcessingMode;
}) {
  if (!input.isRequired) return RouteProgressStatus.SKIPPED;
  if (input.completedQuantity >= input.plannedQuantity) {
    return RouteProgressStatus.COMPLETED;
  }

  const availableQuantity = getAvailableQuantity(input);

  if (availableQuantity <= 0) {
    if (input.inOutsourceQuantity > 0) {
      return RouteProgressStatus.WAITING_OUTSOURCE;
    }

    return input.completedQuantity > 0
      ? RouteProgressStatus.IN_PROGRESS
      : RouteProgressStatus.WAITING_INPUT;
  }

  if (input.processingMode === RouteProcessingMode.OUTSOURCE) {
    return RouteProgressStatus.WAITING_OUTSOURCE;
  }

  if (input.activeDepartmentIds.has(input.departmentId)) {
    return input.completedQuantity > 0
      ? RouteProgressStatus.IN_PROGRESS
      : RouteProgressStatus.READY;
  }

  return input.canOutsource
    ? RouteProgressStatus.WAITING_OUTSOURCE
    : RouteProgressStatus.BLOCKED;
}

async function getNextQueuePriority({
  departmentId,
  factoryId,
  nextQueuePriorityByDepartmentId,
  prisma,
}: {
  departmentId: string;
  factoryId: string;
  nextQueuePriorityByDepartmentId: Map<string, number>;
  prisma: DaySimulationClient;
}) {
  const cached = nextQueuePriorityByDepartmentId.get(departmentId);

  if (typeof cached === "number") {
    const next = cached + 100;
    nextQueuePriorityByDepartmentId.set(departmentId, next);

    return next;
  }

  const aggregate = await prisma.productionOrderRouteProgress.aggregate({
    _max: { queuePriority: true },
    where: {
      departmentId,
      factoryId,
      OR: [
        { inputReadyQuantity: { gt: 0 } },
        { queueEnteredDay: { not: null } },
      ],
    },
  });
  const next = (aggregate._max.queuePriority ?? 0) + 100;

  nextQueuePriorityByDepartmentId.set(departmentId, next);

  return next;
}

function getNextRouteProgress(routeProgress: RouteProgressForSimulation) {
  return routeProgress.productionOrder.routeProgress.find(
    (step) => step.sequence > routeProgress.sequence,
  ) ?? null;
}

async function updateOrderProgress({
  factoryDay,
  prisma,
  productionOrderId,
}: {
  factoryDay: number;
  prisma: DaySimulationClient;
  productionOrderId: string;
}) {
  const productionOrder = await prisma.productionOrder.findUniqueOrThrow({
    where: { id: productionOrderId },
    select: {
      completedDay: true,
      customerOrderId: true,
      customerOrderItemId: true,
      id: true,
      plannedQuantity: true,
      startedDay: true,
      routeProgress: {
        where: { isRequired: true },
        orderBy: { sequence: "asc" },
        select: {
          completedQuantity: true,
          status: true,
        },
      },
    },
  });
  const lastRouteProgress = productionOrder.routeProgress.at(-1);
  const finishedQuantity = Math.min(
    productionOrder.plannedQuantity,
    lastRouteProgress?.completedQuantity ?? 0,
  );
  const orderHasStarted = productionOrder.routeProgress.some(
    (progress) => progress.completedQuantity > 0,
  );
  const orderWaitsForOutsource = productionOrder.routeProgress.some(
    (progress) => progress.status === RouteProgressStatus.WAITING_OUTSOURCE,
  );
  const orderIsReady = finishedQuantity >= productionOrder.plannedQuantity;

  await prisma.productionOrder.update({
    where: { id: productionOrder.id },
    data: {
      completedDay: orderIsReady ? factoryDay : productionOrder.completedDay,
      completedQuantity: finishedQuantity,
      remainingQuantity: Math.max(0, productionOrder.plannedQuantity - finishedQuantity),
      startedDay: orderHasStarted ? productionOrder.startedDay ?? factoryDay : productionOrder.startedDay,
      status: orderIsReady
        ? ProductionOrderStatus.READY_TO_SHIP
        : orderWaitsForOutsource
          ? ProductionOrderStatus.WAITING_OUTSOURCE
        : orderHasStarted
          ? ProductionOrderStatus.IN_PROGRESS
          : ProductionOrderStatus.WAITING_INPUT,
    },
  });

  await prisma.customerOrderItem.update({
    where: { id: productionOrder.customerOrderItemId },
    data: {
      completedQuantity: finishedQuantity,
      status: orderIsReady
        ? CustomerOrderItemStatus.READY_TO_SHIP
        : CustomerOrderItemStatus.IN_PRODUCTION,
    },
  });

  await prisma.customerOrder.update({
    where: { id: productionOrder.customerOrderId },
    data: {
      completedQuantity: finishedQuantity,
      ...(orderIsReady ? { completedDay: factoryDay } : {}),
      status: orderIsReady
        ? CustomerOrderStatus.READY_TO_SHIP
        : CustomerOrderStatus.IN_PRODUCTION,
    },
  });

  return orderIsReady ? productionOrder.id : null;
}

function getEffectivePointCapacity(line: ProductionLineForSimulation) {
  return calculateEffectiveLinePointCapacity({
    conditionBps: line.conditionBps,
    dailyPointCapacity: line.productionLineTemplate.dailyPointCapacity,
    staffCoverageBps: getLineStaffCoverageBps(line),
  });
}

export function buildAllocationMap(
  allocations: Array<{
    id: string;
    factoryProductionLineId: string;
    plannedQuantity: number;
    plannedSetupPoints: number;
    plannedTotalPoints: number;
    productionOrderRouteProgressId: string;
  }>,
) {
  const result = new Map<string, Map<string, AllocationExecution>>();

  for (const allocation of allocations) {
    const allocationByRouteProgressId =
      result.get(allocation.factoryProductionLineId) ??
      new Map<string, AllocationExecution>();
    allocationByRouteProgressId.set(
      allocation.productionOrderRouteProgressId,
      {
        plannedQuantity: Math.max(0, allocation.plannedQuantity),
        plannedSetupPoints: Math.max(0, allocation.plannedSetupPoints),
        plannedTotalPoints: Math.max(0, allocation.plannedTotalPoints),
        productionAllocationId: allocation.id,
        remainingQuantity: Math.max(0, allocation.plannedQuantity),
      },
    );
    result.set(allocation.factoryProductionLineId, allocationByRouteProgressId);
  }

  return result;
}

function getTotalAvailablePoints(lines: ProductionLineForSimulation[]) {
  return lines.reduce(
    (total, line) => total + line.productionLineTemplate.dailyPointCapacity,
    0,
  );
}

function getTotalEffectivePoints(lines: ProductionLineForSimulation[]) {
  return lines.reduce((total, line) => total + getEffectivePointCapacity(line), 0);
}
