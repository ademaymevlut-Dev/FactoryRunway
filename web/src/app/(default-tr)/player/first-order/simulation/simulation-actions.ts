"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  CustomerOrderItemStatus,
  CustomerOrderStatus,
  Prisma,
  ProductionOrderStatus,
  RouteProgressStatus,
  ShiftLineResultStatus,
  ShiftSimulationStatus,
  TutorialKey,
  TutorialStatus,
  TutorialStep,
  XpReason,
} from "@/generated/prisma/client";
import { USER_ROLES } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db";
import { grantFactoryXp } from "@/features/game/services/factory-progression";
import { ensureFactoryTaskProgress } from "@/features/tasks/services/task-definition-service";

import {
  buildFirstSimulationSchedule,
  type FirstSimulationRouteStatus,
  type FirstSimulationStepInput,
} from "./simulation-math";
import { FIRST_ORDER_SIMULATION_DURATION_SECONDS } from "./simulation-config";
import { FIRST_SIMULATION_SHIFT_XP } from "./reward-config";

export async function completeFirstSimulationAction() {
  const auth = await getCurrentUser();

  if (!auth) redirect("/");
  if (auth.role === USER_ROLES.ADMIN || auth.role === USER_ROLES.SUPER_ADMIN) {
    redirect("/admin");
  }

  const prisma = getPrisma();

  await prisma.$transaction(async (tx) => {
    const playerProfile = await tx.playerProfile.findUnique({
      where: { userId: auth.id },
      include: {
        factories: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            sectorId: true,
            currentDay: true,
            currentXp: true,
            playerProfileId: true,
            productionLines: {
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
                  },
                },
              },
            },
          },
        },
      },
    });

    const factory = playerProfile?.factories[0];
    if (!playerProfile || !factory) {
      throw new Error("Fabrika bulunamadı.");
    }

    const tutorial = await tx.tutorialProgress.findUnique({
      where: {
        factoryId_tutorialKey: {
          factoryId: factory.id,
          tutorialKey: TutorialKey.FIRST_ORDER,
        },
      },
      include: {
        productionOrder: {
          include: {
            customerOrder: true,
            customerOrderItem: true,
            routeProgress: {
              orderBy: { sequence: "asc" },
            },
          },
        },
      },
    });

    if (!tutorial?.productionOrder) {
      throw new Error("İlk sipariş üretim kaydı bulunamadı.");
    }

    if (tutorial.status === TutorialStatus.COMPLETED) {
      return;
    }

    const productionOrder = tutorial.productionOrder;
    const plannedQuantity = productionOrder.plannedQuantity;
    const completedDay = tutorial.currentDay + 2;
    const nextFactoryDay = Math.max(factory.currentDay, completedDay + 1);
    const stepInputs = buildStepInputs({
      productionLines: factory.productionLines,
      routeProgress: productionOrder.routeProgress,
    });
    const schedule = buildFirstSimulationSchedule(stepInputs, tutorial.currentDay);
    const finishedQuantity = Math.min(plannedQuantity, schedule.finishedQuantity);
    const orderIsReady = finishedQuantity >= plannedQuantity;

    for (const day of schedule.days) {
      const shiftSimulation = await tx.shiftSimulation.upsert({
        where: {
          factoryId_gameDay: {
            factoryId: factory.id,
            gameDay: day.gameDay,
          },
        },
        update: {
          status: ShiftSimulationStatus.COMPLETED,
          simulationDurationSeconds: FIRST_ORDER_SIMULATION_DURATION_SECONDS,
          completedAt: new Date(),
          idempotencyKey: `first-order:${tutorial.id}:day:${day.dayIndex + 1}`,
          totalAvailablePoints: day.totalAvailablePoints,
          totalEffectivePoints: day.totalEffectivePoints,
          totalUsedPoints: day.totalUsedPoints,
          totalUnusedPoints: day.totalUnusedPoints,
          totalProducedQuantity: day.totalProducedQuantity,
          activeLineCount: day.activeLineCount,
          blockedLineCount: day.blockedLineCount,
          averageUtilizationBps: day.averageUtilizationBps,
          metadata: {
            source: "first-order-tutorial",
            tutorialKey: TutorialKey.FIRST_ORDER,
            productionOrderId: productionOrder.id,
            customerOrderId: productionOrder.customerOrderId,
            dayIndex: day.dayIndex,
          },
        },
        create: {
          factoryId: factory.id,
          sectorId: factory.sectorId,
          gameDay: day.gameDay,
          status: ShiftSimulationStatus.COMPLETED,
          simulationDurationSeconds: FIRST_ORDER_SIMULATION_DURATION_SECONDS,
          completedAt: new Date(),
          idempotencyKey: `first-order:${tutorial.id}:day:${day.dayIndex + 1}`,
          totalAvailablePoints: day.totalAvailablePoints,
          totalEffectivePoints: day.totalEffectivePoints,
          totalUsedPoints: day.totalUsedPoints,
          totalUnusedPoints: day.totalUnusedPoints,
          totalProducedQuantity: day.totalProducedQuantity,
          activeLineCount: day.activeLineCount,
          blockedLineCount: day.blockedLineCount,
          averageUtilizationBps: day.averageUtilizationBps,
          metadata: {
            source: "first-order-tutorial",
            tutorialKey: TutorialKey.FIRST_ORDER,
            productionOrderId: productionOrder.id,
            customerOrderId: productionOrder.customerOrderId,
            dayIndex: day.dayIndex,
          },
        },
        select: { id: true },
      });

      await tx.shiftLineResult.deleteMany({
        where: { shiftSimulationId: shiftSimulation.id },
      });

      await tx.shiftLineResult.createMany({
        data: schedule.steps.map((step) => {
          const result = step.dailyResults[day.dayIndex];

          return {
            shiftSimulationId: shiftSimulation.id,
            factoryId: factory.id,
            factoryProductionLineId: step.productionLineId,
            productionLineTemplateId: step.productionLineTemplateId,
            productionOrderId: productionOrder.id,
            productionOrderRouteProgressId: step.routeProgressId,
            productRouteStepId: step.productRouteStepId,
            departmentId: step.departmentId,
            productId: productionOrder.productId,
            status: mapLineStatus(result.status),
            lineNumber: step.lineNumber,
            lineSortOrder: step.lineSortOrder,
            templateDailyPointCapacity: result.templateDailyPointCapacity,
            plannedPointCapacity: result.templateDailyPointCapacity,
            effectivePointCapacity: result.effectivePointCapacity,
            workloadPointsPerUnit: step.workloadPointsPerUnit,
            setupPointsUsed: result.setupPointsUsed,
            inputReadyQuantity: result.inputReadyQuantity,
            plannedQuantity: step.plannedQuantity,
            producedQuantity: result.producedQuantity,
            usedPoints: result.usedPoints,
            unusedPoints: result.unusedPoints,
            utilizationBps: result.utilizationBps,
            conditionBps: step.conditionBps,
            blockedReason:
              result.status === "BLOCKED_NO_INPUT"
                ? "Önceki departmandan hazır adet yok."
                : null,
            metadata: {
              source: "first-order-tutorial",
              tutorialKey: TutorialKey.FIRST_ORDER,
              dayIndex: day.dayIndex,
              isActive: result.isActive,
            },
          };
        }),
      });
    }

    for (const step of schedule.steps) {
      await tx.productionOrderRouteProgress.update({
        where: { id: step.routeProgressId },
        data: {
          inputReadyQuantity: step.inputReadyAfterSimulation,
          completedQuantity: step.completedQuantityAfterSimulation,
          remainingQuantity: step.remainingQuantityAfterSimulation,
          status: mapRouteStatus(step.routeStatusAfterSimulation),
          metadata: mergeMetadata(
            productionOrder.routeProgress.find((route) => route.id === step.routeProgressId)?.metadata,
            {
              firstSimulationDailyCounts: step.dailyCounts,
              firstSimulationTotalProduced: step.totalProducedQuantity,
            },
          ),
        },
      });
    }

    await tx.productionOrder.update({
      where: { id: productionOrder.id },
      data: {
        completedQuantity: finishedQuantity,
        remainingQuantity: Math.max(0, plannedQuantity - finishedQuantity),
        startedDay: productionOrder.startedDay ?? tutorial.currentDay,
        completedDay: orderIsReady ? completedDay : productionOrder.completedDay,
        status: orderIsReady
          ? ProductionOrderStatus.READY_TO_SHIP
          : ProductionOrderStatus.IN_PROGRESS,
        metadata: mergeMetadata(productionOrder.metadata, {
          firstSimulationCompleted: orderIsReady,
          firstSimulationFinishedQuantity: finishedQuantity,
          firstSimulationRemainingQuantity: Math.max(0, plannedQuantity - finishedQuantity),
          completedByTutorial: TutorialKey.FIRST_ORDER,
        }),
      },
    });

    await tx.customerOrderItem.update({
      where: { id: productionOrder.customerOrderItemId },
      data: {
        completedQuantity: finishedQuantity,
        status: orderIsReady
          ? CustomerOrderItemStatus.READY_TO_SHIP
          : CustomerOrderItemStatus.IN_PRODUCTION,
      },
    });

    await tx.customerOrder.update({
      where: { id: productionOrder.customerOrderId },
      data: {
        completedQuantity: finishedQuantity,
        completedDay: orderIsReady ? completedDay : productionOrder.customerOrder.completedDay,
        status: orderIsReady
          ? CustomerOrderStatus.READY_TO_SHIP
          : CustomerOrderStatus.IN_PRODUCTION,
      },
    });

    await tx.factory.update({
      where: { id: factory.id },
      data: {
        currentDay: nextFactoryDay,
        lastSimulatedAt: new Date(),
      },
    });

    await ensureFactoryTaskProgress({
      currentDay: nextFactoryDay,
      factoryId: factory.id,
      tx,
    });

    await grantFactoryXp({
      amountXp: FIRST_SIMULATION_SHIFT_XP,
      factoryId: factory.id,
      gameDay: completedDay,
      metadata: {
        customerOrderId: productionOrder.customerOrderId,
        finishedQuantity,
        plannedQuantity,
        productionOrderId: productionOrder.id,
        tutorialKey: TutorialKey.FIRST_ORDER,
      },
      reason: XpReason.SHIFT_COMPLETED,
      sourceId: tutorial.id,
      sourceType: "tutorial",
      tx,
    });

    await tx.tutorialProgress.update({
      where: { id: tutorial.id },
      data: {
        status: TutorialStatus.COMPLETED,
        step: TutorialStep.COMPLETED,
        currentDay: nextFactoryDay,
        completedAt: new Date(),
        metadata: mergeMetadata(tutorial.metadata, {
          completedDay,
          nextFactoryDay,
          rewardXp: FIRST_SIMULATION_SHIFT_XP,
          finishedQuantity,
          plannedQuantity,
          orderIsReady,
        }),
      },
    });
  });

  revalidatePath("/player");
  revalidatePath("/player/first-order");
  revalidatePath("/player/first-order/simulation");
  revalidatePath("/shift");
  redirect("/player");
}

function buildStepInputs({
  productionLines,
  routeProgress,
}: {
  productionLines: Array<{
    id: string;
    departmentId: string;
    productionLineTemplateId: string;
    lineNumber: number;
    sortOrder: number;
    conditionBps: number;
    productionLineTemplate: {
      dailyPointCapacity: number;
    };
  }>;
  routeProgress: Array<{
    id: string;
    productRouteStepId: string;
    departmentId: string;
    workloadPointsPerUnit: number;
    setupPoints: number;
    plannedQuantity: number;
    inputReadyQuantity: number;
    completedQuantity: number;
  }>;
}): FirstSimulationStepInput[] {
  const usedLineIds = new Set<string>();

  return routeProgress.slice(0, 3).map((routeRow) => {
    const productionLine = productionLines.find(
      (line) => line.departmentId === routeRow.departmentId && !usedLineIds.has(line.id),
    );

    if (!productionLine) {
      throw new Error("Üretim rotası için uygun fabrika hattı bulunamadı.");
    }

    usedLineIds.add(productionLine.id);

    return {
      routeProgressId: routeRow.id,
      productRouteStepId: routeRow.productRouteStepId,
      departmentId: routeRow.departmentId,
      productionLineId: productionLine.id,
      productionLineTemplateId: productionLine.productionLineTemplateId,
      lineNumber: productionLine.lineNumber,
      lineSortOrder: productionLine.sortOrder,
      templateDailyPointCapacity: productionLine.productionLineTemplate.dailyPointCapacity,
      conditionBps: productionLine.conditionBps,
      workloadPointsPerUnit: routeRow.workloadPointsPerUnit,
      setupPoints: routeRow.setupPoints,
      plannedQuantity: routeRow.plannedQuantity,
      inputReadyQuantity: routeRow.inputReadyQuantity,
      completedQuantity: routeRow.completedQuantity,
    };
  });
}

function mapLineStatus(status: "PRODUCED" | "IDLE" | "BLOCKED_NO_INPUT") {
  if (status === "PRODUCED") return ShiftLineResultStatus.PRODUCED;
  if (status === "BLOCKED_NO_INPUT") return ShiftLineResultStatus.BLOCKED_NO_INPUT;

  return ShiftLineResultStatus.IDLE;
}

function mapRouteStatus(status: FirstSimulationRouteStatus) {
  if (status === "COMPLETED") return RouteProgressStatus.COMPLETED;
  if (status === "IN_PROGRESS") return RouteProgressStatus.IN_PROGRESS;
  if (status === "READY") return RouteProgressStatus.READY;

  return RouteProgressStatus.WAITING_INPUT;
}

function mergeMetadata(
  source: unknown,
  next: Prisma.InputJsonObject,
): Prisma.InputJsonObject {
  const base = source && typeof source === "object" && !Array.isArray(source)
    ? (source as Prisma.InputJsonObject)
    : {};

  return {
    ...base,
    ...next,
  };
}
