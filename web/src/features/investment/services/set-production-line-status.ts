import {
  FactoryProductionLineStatus,
  FactoryStatus,
  Prisma,
  ProductionAllocationStatus,
  ShiftSimulationStatus,
  StaffAssignmentStatus,
  StaffType,
  type PrismaClient,
} from "@/generated/prisma/client";
import { recalculateFactoryOperatingStage } from "@/features/game/services/factory-operating-stage";
import { getActiveShiftPlayback } from "@/features/game/services/shift-playback-view";

import type {
  ProductionLineStatusChangeMode,
  SetProductionLineStatusInput,
  SetProductionLineStatusResult,
} from "../types";

const STATUS_CHANGE_TRANSACTION_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 5_000,
  timeout: 15_000,
} as const;

const MAX_STATUS_CHANGE_ATTEMPTS = 3;

type StaffAssignmentSnapshot = {
  id: string;
  metadata: Prisma.JsonValue | null;
  quantity: number;
  staffRoleId: string;
};

type StaffRequirementSnapshot = {
  requiredQuantity: number;
  staffRole: {
    id: string;
    staffType: StaffType;
  };
};

export function getProductionLineStatusTarget(
  mode: ProductionLineStatusChangeMode,
) {
  return mode === "disable"
    ? FactoryProductionLineStatus.DISABLED
    : FactoryProductionLineStatus.IDLE;
}

export function countReleasedDirectStaff(
  assignments: ReadonlyArray<{ quantity: number }>,
) {
  return assignments.reduce(
    (total, assignment) => total + Math.max(0, assignment.quantity),
    0,
  );
}

export function countRequiredDirectStaff(
  requirements: ReadonlyArray<{ requiredQuantity: number }>,
) {
  return requirements.reduce(
    (total, requirement) => total + Math.max(0, requirement.requiredQuantity),
    0,
  );
}

export async function setProductionLineStatus(input: {
  prisma: PrismaClient;
  statusChange: SetProductionLineStatusInput;
  userId: string;
}): Promise<SetProductionLineStatusResult> {
  for (let attempt = 1; attempt <= MAX_STATUS_CHANGE_ATTEMPTS; attempt += 1) {
    try {
      return await input.prisma.$transaction(async (tx) => {
        const factory = await tx.factory.findFirst({
          where: {
            id: input.statusChange.factoryId,
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

        const [activePlayback, runningShift] = await Promise.all([
          getActiveShiftPlayback({ factoryId: factory.id, prisma: tx }),
          tx.shiftSimulation.findFirst({
            where: {
              factoryId: factory.id,
              status: ShiftSimulationStatus.RUNNING,
            },
            select: { id: true },
          }),
        ]);

        if (activePlayback || runningShift) return failure("PLAYBACK_ACTIVE");

        const line = await tx.factoryProductionLine.findFirst({
          where: {
            factoryId: factory.id,
            id: input.statusChange.factoryProductionLineId,
          },
          select: {
            departmentId: true,
            factoryId: true,
            id: true,
            metadata: true,
            status: true,
            productionAllocations: {
              where: {
                gameDay: factory.currentDay,
                status: {
                  in: [
                    ProductionAllocationStatus.PLANNED,
                    ProductionAllocationStatus.LOCKED,
                  ],
                },
              },
              take: 1,
              select: { id: true },
            },
            productionLineTemplate: {
              select: {
                departmentId: true,
                id: true,
                sectorId: true,
                staffRequirements: {
                  orderBy: { sortOrder: "asc" },
                  select: {
                    requiredQuantity: true,
                    staffRole: {
                      select: {
                        id: true,
                        staffType: true,
                      },
                    },
                  },
                },
              },
            },
            productionLineTemplateId: true,
            staffAssignments: {
              where: { status: StaffAssignmentStatus.ACTIVE },
              select: {
                id: true,
                metadata: true,
                quantity: true,
                staffRoleId: true,
              },
            },
          },
        });

        if (!line) return failure("LINE_NOT_FOUND");
        if (line.productionAllocations.length > 0) {
          return failure("PRODUCTION_PLAN_ACTIVE");
        }
        if (line.productionLineTemplate.sectorId !== factory.sectorId) {
          return failure("SECTOR_MISMATCH");
        }

        if (input.statusChange.mode === "disable") {
          if (!canDisableLine(line.status)) {
            return failure("LINE_STATUS_LOCKED");
          }

          return disableProductionLine({
            activeAssignments: line.staffAssignments,
            currentDay: factory.currentDay,
            factoryId: factory.id,
            line,
            requestId: input.statusChange.requestId,
            tx,
          });
        }

        if (!canActivateLine(line.status)) {
          return failure("LINE_STATUS_LOCKED");
        }

        if (!hasValidDirectStaffRequirements(line.productionLineTemplate.staffRequirements)) {
          return failure("STAFF_CONFIG_INCOMPLETE");
        }

        return activateProductionLine({
          activeAssignments: line.staffAssignments,
          currentDay: factory.currentDay,
          factoryId: factory.id,
          line,
          requestId: input.statusChange.requestId,
          requirements: line.productionLineTemplate.staffRequirements,
          tx,
        });
      }, STATUS_CHANGE_TRANSACTION_OPTIONS);
    } catch (error) {
      if (isSerializableConflict(error) && attempt < MAX_STATUS_CHANGE_ATTEMPTS) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Production line status change retry loop exited unexpectedly.");
}

async function disableProductionLine(input: {
  activeAssignments: StaffAssignmentSnapshot[];
  currentDay: number;
  factoryId: string;
  line: {
    id: string;
    metadata: Prisma.JsonValue | null;
    status: FactoryProductionLineStatus;
  };
  requestId: string;
  tx: Prisma.TransactionClient;
}): Promise<SetProductionLineStatusResult> {
  const releasedDirectStaffCount = countReleasedDirectStaff(
    input.activeAssignments,
  );
  const nextStatus = FactoryProductionLineStatus.DISABLED;
  const changedAt = new Date().toISOString();

  await updateLineStatus({
    changedAt,
    currentDay: input.currentDay,
    factoryId: input.factoryId,
    line: input.line,
    mode: "disable",
    nextStatus,
    releasedDirectStaffCount,
    requestId: input.requestId,
    restoredDirectStaffCount: 0,
    tx: input.tx,
  });

  await releaseLineStaffAssignments({
    assignments: input.activeAssignments,
    changedAt,
    currentDay: input.currentDay,
    factoryId: input.factoryId,
    lineId: input.line.id,
    mode: "disable",
    requestId: input.requestId,
    tx: input.tx,
  });

  const stage = await recalculateFactoryOperatingStage({
    factoryId: input.factoryId,
    source: "production-line-disable",
    tx: input.tx,
  });

  return {
    activeProductionLineCount: stage.activeProductionLineCount,
    factoryId: input.factoryId,
    nextStatus,
    ok: true,
    operatingStageChanged: stage.stageChanged,
    operatingStageKey: stage.currentStageKey,
    previousStatus: input.line.status,
    productionLineId: input.line.id,
    releasedDirectStaffCount,
    restoredDirectStaffCount: 0,
  };
}

async function activateProductionLine(input: {
  activeAssignments: StaffAssignmentSnapshot[];
  currentDay: number;
  factoryId: string;
  line: {
    id: string;
    metadata: Prisma.JsonValue | null;
    status: FactoryProductionLineStatus;
  };
  requestId: string;
  requirements: StaffRequirementSnapshot[];
  tx: Prisma.TransactionClient;
}): Promise<SetProductionLineStatusResult> {
  const restoredDirectStaffCount = countRequiredDirectStaff(input.requirements);
  const requirementRoleIds = new Set(
    input.requirements.map((requirement) => requirement.staffRole.id),
  );
  const staleAssignments = input.activeAssignments.filter(
    (assignment) => !requirementRoleIds.has(assignment.staffRoleId),
  );
  const nextStatus = FactoryProductionLineStatus.IDLE;
  const changedAt = new Date().toISOString();

  await updateLineStatus({
    changedAt,
    currentDay: input.currentDay,
    factoryId: input.factoryId,
    line: input.line,
    mode: "activate",
    nextStatus,
    releasedDirectStaffCount: staleAssignments.length > 0
      ? countReleasedDirectStaff(staleAssignments)
      : 0,
    requestId: input.requestId,
    restoredDirectStaffCount,
    tx: input.tx,
  });

  for (const requirement of input.requirements) {
    await input.tx.factoryStaffAssignment.upsert({
      where: {
        factoryId_staffRoleId_scopeKey: {
          factoryId: input.factoryId,
          scopeKey: input.line.id,
          staffRoleId: requirement.staffRole.id,
        },
      },
      create: {
        factoryId: input.factoryId,
        factoryProductionLineId: input.line.id,
        metadata: {
          changedAt,
          lineStatusChangeMode: "activate",
          requestId: input.requestId,
          source: "production-line-activate",
        },
        quantity: requirement.requiredQuantity,
        scopeKey: input.line.id,
        staffRoleId: requirement.staffRole.id,
        status: StaffAssignmentStatus.ACTIVE,
      },
      update: {
        factoryProductionLineId: input.line.id,
        metadata: {
          changedAt,
          lineStatusChangeMode: "activate",
          requestId: input.requestId,
          source: "production-line-activate",
        },
        quantity: requirement.requiredQuantity,
        status: StaffAssignmentStatus.ACTIVE,
      },
    });
  }

  if (staleAssignments.length > 0) {
    await releaseLineStaffAssignments({
      assignments: staleAssignments,
      changedAt,
      currentDay: input.currentDay,
      factoryId: input.factoryId,
      lineId: input.line.id,
      mode: "activate",
      requestId: input.requestId,
      tx: input.tx,
    });
  }

  const stage = await recalculateFactoryOperatingStage({
    factoryId: input.factoryId,
    source: "production-line-activate",
    tx: input.tx,
  });

  return {
    activeProductionLineCount: stage.activeProductionLineCount,
    factoryId: input.factoryId,
    nextStatus,
    ok: true,
    operatingStageChanged: stage.stageChanged,
    operatingStageKey: stage.currentStageKey,
    previousStatus: input.line.status,
    productionLineId: input.line.id,
    releasedDirectStaffCount: staleAssignments.length > 0
      ? countReleasedDirectStaff(staleAssignments)
      : 0,
    restoredDirectStaffCount,
  };
}

async function updateLineStatus(input: {
  changedAt: string;
  currentDay: number;
  factoryId: string;
  line: {
    id: string;
    metadata: Prisma.JsonValue | null;
    status: FactoryProductionLineStatus;
  };
  mode: ProductionLineStatusChangeMode;
  nextStatus: Extract<FactoryProductionLineStatus, "DISABLED" | "IDLE">;
  releasedDirectStaffCount: number;
  requestId: string;
  restoredDirectStaffCount: number;
  tx: Prisma.TransactionClient;
}) {
  const update = await input.tx.factoryProductionLine.updateMany({
    where: {
      factoryId: input.factoryId,
      id: input.line.id,
      status: input.line.status,
    },
    data: {
      metadata: mergeMetadata(input.line.metadata, {
        lastStatusChange: {
          changedAt: input.changedAt,
          currentDay: input.currentDay,
          mode: input.mode,
          previousStatus: input.line.status,
          releasedDirectStaffCount: input.releasedDirectStaffCount,
          requestId: input.requestId,
          restoredDirectStaffCount: input.restoredDirectStaffCount,
          source: `production-line-${input.mode}`,
          targetStatus: input.nextStatus,
        },
      }),
      status: input.nextStatus,
    },
  });

  if (update.count !== 1) {
    throw new Error("Production line changed while status was being updated.");
  }
}

async function releaseLineStaffAssignments(input: {
  assignments: StaffAssignmentSnapshot[];
  changedAt: string;
  currentDay: number;
  factoryId: string;
  lineId: string;
  mode: ProductionLineStatusChangeMode;
  requestId: string;
  tx: Prisma.TransactionClient;
}) {
  for (const assignment of input.assignments) {
    await input.tx.factoryStaffAssignment.update({
      where: { id: assignment.id },
      data: {
        metadata: mergeMetadata(assignment.metadata, {
          lastLineStatusChange: {
            changedAt: input.changedAt,
            currentDay: input.currentDay,
            lineId: input.lineId,
            mode: input.mode,
            previousQuantity: assignment.quantity,
            requestId: input.requestId,
            source:
              input.mode === "disable"
                ? "production-line-disable"
                : "production-line-activate-stale-role",
          },
        }),
        quantity: 0,
        status: StaffAssignmentStatus.PASSIVE,
      },
    });
  }
}

function canDisableLine(status: FactoryProductionLineStatus) {
  return (
    status !== FactoryProductionLineStatus.SOLD &&
    status !== FactoryProductionLineStatus.INSTALLING &&
    status !== FactoryProductionLineStatus.RUNNING
  );
}

function canActivateLine(status: FactoryProductionLineStatus) {
  return (
    status === FactoryProductionLineStatus.DISABLED ||
    status === FactoryProductionLineStatus.IDLE
  );
}

function hasValidDirectStaffRequirements(
  requirements: ReadonlyArray<StaffRequirementSnapshot>,
) {
  return (
    requirements.length > 0 &&
    requirements.every(
      (requirement) =>
        requirement.staffRole.staffType === StaffType.DIRECT_PRODUCTION,
    )
  );
}

function mergeMetadata(
  metadata: Prisma.JsonValue | null,
  updates: Record<string, Prisma.InputJsonValue>,
): Prisma.InputJsonValue {
  return {
    ...(isJsonRecord(metadata) ? metadata : {}),
    ...updates,
  };
}

function isJsonRecord(
  value: Prisma.JsonValue | null,
): value is Record<string, Prisma.JsonValue> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function failure(
  code: Extract<SetProductionLineStatusResult, { ok: false }>["code"],
): SetProductionLineStatusResult {
  return { code, ok: false };
}

function isSerializableConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}
