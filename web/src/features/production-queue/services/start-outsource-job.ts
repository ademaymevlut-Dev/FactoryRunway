import {
  ContentStatus,
  FactoryProductionLineStatus,
  FactoryStatus,
  Prisma,
  ProductionOrderStatus,
  ProductionPlanStatus,
  RouteProcessingMode,
  ShiftSimulationStatus,
  type OutsourceOptionType,
  type PrismaClient,
} from "@/generated/prisma/client";
import {
  calculateRouteProgressQuantities,
  getRouteProgressStatus,
} from "@/features/game/services/route-progress-availability";
import { getActiveShiftPlayback } from "@/features/game/services/shift-playback-view";

import { calculateOutsourceUnitCostCents } from "./outsource-cost";

const TRANSACTION_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 5_000,
  timeout: 10_000,
} as const;
const MAX_ATTEMPTS = 3;

export type StartOutsourceJobInput = {
  factoryId: string;
  optionType: OutsourceOptionType;
  quantity: number;
  requestId: string;
  routeProgressId: string;
};

export type StartOutsourceJobResult =
  | {
      alreadyStarted: boolean;
      jobId: string;
      ok: true;
      quantity: number;
      readyDay: number;
    }
  | {
      code:
        | "DUPLICATE_REQUEST"
        | "FACTORY_NOT_ACTIVE"
        | "FACTORY_NOT_FOUND"
        | "INVALID_QUANTITY"
        | "OUTSOURCE_CONFIG_NOT_FOUND"
        | "PLAYBACK_ACTIVE"
        | "PROGRESS_NOT_FOUND"
        | "QUANTITY_CHANGED"
        | "ROUTE_NOT_OUTSOURCEABLE";
      ok: false;
    };

export function resolveOutsourceReservationState(input: {
  activeLineCount: number;
  canOutsource: boolean;
  completedQuantity: number;
  departmentId: string;
  inOutsourceQuantity: number;
  inputReadyQuantity: number;
  plannedQuantity: number;
  reservedQuantity: number;
}) {
  const nextInOutsourceQuantity =
    input.inOutsourceQuantity + input.reservedQuantity;
  const quantities = calculateRouteProgressQuantities({
    ...input,
    inOutsourceQuantity: nextInOutsourceQuantity,
  });
  const hasActiveInternalLine = input.activeLineCount > 0;

  return {
    hasActiveInternalLine,
    nextInOutsourceQuantity,
    orderStatus:
      hasActiveInternalLine && quantities.internalAvailableQuantity > 0
        ? ProductionOrderStatus.IN_PROGRESS
        : ProductionOrderStatus.WAITING_OUTSOURCE,
    processingMode:
      hasActiveInternalLine && quantities.internalAvailableQuantity > 0
        ? RouteProcessingMode.INTERNAL
        : RouteProcessingMode.OUTSOURCE,
    quantities,
    routeStatus: getRouteProgressStatus({
      activeDepartmentIds: hasActiveInternalLine
        ? new Set([input.departmentId])
        : new Set(),
      canOutsource: input.canOutsource,
      completedQuantity: input.completedQuantity,
      departmentId: input.departmentId,
      inOutsourceQuantity: nextInOutsourceQuantity,
      inputReadyQuantity: input.inputReadyQuantity,
      isRequired: true,
      plannedQuantity: input.plannedQuantity,
    }),
  };
}

export async function startOutsourceJob(input: {
  job: StartOutsourceJobInput;
  prisma: PrismaClient;
  userId: string;
}): Promise<StartOutsourceJobResult> {
  if (!Number.isSafeInteger(input.job.quantity) || input.job.quantity <= 0) {
    return failure("INVALID_QUANTITY");
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await input.prisma.$transaction(async (tx) => {
        const factory = await tx.factory.findFirst({
          where: {
            id: input.job.factoryId,
            playerProfile: { userId: input.userId },
          },
          select: {
            currentDay: true,
            id: true,
            sectorId: true,
            status: true,
          },
        });

        if (!factory) return failure("FACTORY_NOT_FOUND");
        if (factory.status !== FactoryStatus.ACTIVE) {
          return failure("FACTORY_NOT_ACTIVE");
        }

        const existingJob = await tx.productionOutsourceJob.findUnique({
          where: { id: input.job.requestId },
          select: {
            factoryId: true,
            id: true,
            optionType: true,
            productionOrderRouteProgressId: true,
            quantity: true,
            readyDay: true,
          },
        });

        if (existingJob) {
          return matchesExistingRequest(existingJob, input.job)
            ? {
                alreadyStarted: true,
                jobId: existingJob.id,
                ok: true,
                quantity: existingJob.quantity,
                readyDay: existingJob.readyDay,
              }
            : failure("DUPLICATE_REQUEST");
        }

        const [activePlayback, runningShift, lockedPlan, progress] =
          await Promise.all([
            getActiveShiftPlayback({ factoryId: factory.id, prisma: tx }),
            tx.shiftSimulation.findFirst({
              where: {
                factoryId: factory.id,
                status: ShiftSimulationStatus.RUNNING,
              },
              select: { id: true },
            }),
            tx.productionPlan.findFirst({
              where: {
                factoryId: factory.id,
                gameDay: factory.currentDay,
                status: ProductionPlanStatus.LOCKED,
              },
              select: { id: true },
            }),
            tx.productionOrderRouteProgress.findFirst({
              where: {
                factoryId: factory.id,
                id: input.job.routeProgressId,
                isRequired: true,
                remainingQuantity: { gt: 0 },
              },
              select: {
                canOutsource: true,
                completedQuantity: true,
                departmentId: true,
                inOutsourceQuantity: true,
                inputReadyQuantity: true,
                outsourceReadyDay: true,
                plannedQuantity: true,
                productionOrderId: true,
                workloadPointsPerUnit: true,
                department: {
                  select: { supportsOutsource: true },
                },
                productionOrder: {
                  select: { productId: true },
                },
              },
            }),
          ]);

        if (activePlayback || runningShift || lockedPlan) {
          return failure("PLAYBACK_ACTIVE");
        }
        if (!progress) return failure("PROGRESS_NOT_FOUND");
        if (!progress.canOutsource || !progress.department.supportsOutsource) {
          return failure("ROUTE_NOT_OUTSOURCEABLE");
        }

        const quantities = calculateRouteProgressQuantities(progress);

        if (input.job.quantity > quantities.internalAvailableQuantity) {
          return failure("QUANTITY_CHANGED");
        }

        const [config, activeLineCount] = await Promise.all([
          tx.outsourceOptionConfig.findFirst({
            where: {
              baseCostPer1000PointsCents: { gt: 0 },
              departmentId: progress.departmentId,
              optionType: input.job.optionType,
              sectorId: factory.sectorId,
              status: ContentStatus.ACTIVE,
            },
            select: {
              baseCostPer1000PointsCents: true,
              costMultiplierBps: true,
              delayRiskBps: true,
              leadTimeDays: true,
              qualityRiskBps: true,
            },
          }),
          tx.factoryProductionLine.count({
            where: {
              departmentId: progress.departmentId,
              factoryId: factory.id,
              status: {
                in: [
                  FactoryProductionLineStatus.IDLE,
                  FactoryProductionLineStatus.RUNNING,
                ],
              },
            },
          }),
        ]);

        if (!config) return failure("OUTSOURCE_CONFIG_NOT_FOUND");

        const costPerUnitCents = calculateOutsourceUnitCostCents({
          costMultiplierBps: config.costMultiplierBps,
          costPer1000Points: config.baseCostPer1000PointsCents,
          workloadPointsPerUnit: progress.workloadPointsPerUnit,
        });
        const totalCostCents =
          BigInt(costPerUnitCents) * BigInt(input.job.quantity);
        const readyDay = factory.currentDay + config.leadTimeDays;
        const reservation = resolveOutsourceReservationState({
          activeLineCount,
          canOutsource: progress.canOutsource,
          completedQuantity: progress.completedQuantity,
          departmentId: progress.departmentId,
          inOutsourceQuantity: progress.inOutsourceQuantity,
          inputReadyQuantity: progress.inputReadyQuantity,
          plannedQuantity: progress.plannedQuantity,
          reservedQuantity: input.job.quantity,
        });
        const progressUpdate =
          await tx.productionOrderRouteProgress.updateMany({
            where: {
              completedQuantity: progress.completedQuantity,
              factoryId: factory.id,
              id: input.job.routeProgressId,
              inOutsourceQuantity: progress.inOutsourceQuantity,
              inputReadyQuantity: progress.inputReadyQuantity,
            },
            data: {
              inOutsourceQuantity: { increment: input.job.quantity },
              outsourceReadyDay:
                progress.outsourceReadyDay === null
                  ? readyDay
                  : Math.min(progress.outsourceReadyDay, readyDay),
              processingMode: reservation.processingMode,
              status: reservation.routeStatus,
            },
          });

        if (progressUpdate.count !== 1) {
          return failure("QUANTITY_CHANGED");
        }

        await tx.productionOutsourceJob.create({
          data: {
            costPerUnitCents,
            delayRiskBps: config.delayRiskBps,
            departmentId: progress.departmentId,
            factoryId: factory.id,
            id: input.job.requestId,
            metadata: {
              baseCostPer1000PointsCents:
                config.baseCostPer1000PointsCents,
              costMultiplierBps: config.costMultiplierBps,
              requestId: input.job.requestId,
              source: "department-queue",
              workloadPointsPerUnit: progress.workloadPointsPerUnit,
            },
            optionType: input.job.optionType,
            productId: progress.productionOrder.productId,
            productionOrderId: progress.productionOrderId,
            productionOrderRouteProgressId: input.job.routeProgressId,
            qualityRiskBps: config.qualityRiskBps,
            quantity: input.job.quantity,
            readyDay,
            sentDay: factory.currentDay,
            totalCostCents,
          },
        });
        await Promise.all([
          tx.productionOrder.update({
            where: { id: progress.productionOrderId },
            data: {
              status: reservation.orderStatus,
            },
          }),
          tx.productionPlan.updateMany({
            where: {
              factoryId: factory.id,
              gameDay: factory.currentDay,
              status: ProductionPlanStatus.DRAFT,
            },
            data: { status: ProductionPlanStatus.DIRTY },
          }),
        ]);

        return {
          alreadyStarted: false,
          jobId: input.job.requestId,
          ok: true,
          quantity: input.job.quantity,
          readyDay,
        };
      }, TRANSACTION_OPTIONS);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const existing = await readExistingJob(input.prisma, input.job);

        if (existing) return existing;
        if (attempt < MAX_ATTEMPTS) continue;
      }

      if (isSerializableConflict(error) && attempt < MAX_ATTEMPTS) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Outsource job retry loop exited unexpectedly.");
}

async function readExistingJob(
  prisma: PrismaClient,
  job: StartOutsourceJobInput,
): Promise<StartOutsourceJobResult | null> {
  const existing = await prisma.productionOutsourceJob.findUnique({
    where: { id: job.requestId },
    select: {
      factoryId: true,
      id: true,
      optionType: true,
      productionOrderRouteProgressId: true,
      quantity: true,
      readyDay: true,
    },
  });

  if (!existing) return null;
  if (!matchesExistingRequest(existing, job)) {
    return failure("DUPLICATE_REQUEST");
  }

  return {
    alreadyStarted: true,
    jobId: existing.id,
    ok: true,
    quantity: existing.quantity,
    readyDay: existing.readyDay,
  };
}

function matchesExistingRequest(
  existing: {
    factoryId: string;
    optionType: OutsourceOptionType;
    productionOrderRouteProgressId: string;
    quantity: number;
  },
  request: StartOutsourceJobInput,
) {
  return (
    existing.factoryId === request.factoryId &&
    existing.optionType === request.optionType &&
    existing.productionOrderRouteProgressId === request.routeProgressId &&
    existing.quantity === request.quantity
  );
}

function failure(
  code: Extract<StartOutsourceJobResult, { ok: false }>["code"],
): StartOutsourceJobResult {
  return { code, ok: false };
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function isSerializableConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}
