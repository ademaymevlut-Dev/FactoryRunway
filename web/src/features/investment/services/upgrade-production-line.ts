import {
  ContentStatus,
  FactoryProductionLineStatus,
  FactoryStatus,
  FinanceCategory,
  FinanceDirection,
  FinanceSourceType,
  LeasingContractStatus,
  Prisma,
  ProductionAllocationStatus,
  ProductionGrade,
  ShiftSimulationStatus,
  StaffAssignmentStatus,
  StaffType,
  XpReason,
  type PrismaClient,
} from "@/generated/prisma/client";
import { grantFactoryXp } from "@/features/game/services/factory-progression";
import { getActiveShiftPlayback } from "@/features/game/services/shift-playback-view";
import type {
  UpgradeProductionLineInput,
  UpgradeProductionLineResult,
} from "../types";

const UPGRADE_TRANSACTION_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 5_000,
  timeout: 15_000,
} as const;

const MAX_UPGRADE_ATTEMPTS = 3;
const UPGRADE_XP_REWARD = 100;
const PRODUCTION_GRADES = [
  ProductionGrade.WORKSHOP,
  ProductionGrade.INDUSTRIAL,
  ProductionGrade.PRECISION,
  ProductionGrade.SMART,
] as const;

export function buildLineUpgradeReferenceKey(input: {
  factoryId: string;
  factoryProductionLineId: string;
  requestId: string;
}) {
  return `LINE_UPGRADE:${input.factoryId}:${input.factoryProductionLineId}:${input.requestId}`;
}

export function getNextProductionGrade(grade: ProductionGrade) {
  const index = PRODUCTION_GRADES.indexOf(grade);

  return index >= 0 ? (PRODUCTION_GRADES[index + 1] ?? null) : null;
}

export function calculateProductionLineUpgradePricing(input: {
  currentPurchaseCostCents: number;
  nextPurchaseCostCents: number;
}) {
  const tradeInRefundCents = Math.floor(
    Math.max(0, input.currentPurchaseCostCents) / 2,
  );
  const grossUpgradeCostCents = Math.max(0, input.nextPurchaseCostCents);

  return {
    grossUpgradeCostCents,
    netUpgradeCostCents: Math.max(
      0,
      grossUpgradeCostCents - tradeInRefundCents,
    ),
    tradeInRefundCents,
  };
}

export function calculateCapacityIncreaseBps(input: {
  currentDailyPointCapacity: number;
  nextDailyPointCapacity: number;
}) {
  if (input.currentDailyPointCapacity <= 0) return 0;

  return Math.round(
    ((input.nextDailyPointCapacity - input.currentDailyPointCapacity) * 10_000) /
      input.currentDailyPointCapacity,
  );
}

export async function upgradeProductionLine(input: {
  prisma: PrismaClient;
  upgrade: UpgradeProductionLineInput;
  userId: string;
}): Promise<UpgradeProductionLineResult> {
  const referenceKey = buildLineUpgradeReferenceKey({
    factoryId: input.upgrade.factoryId,
    factoryProductionLineId: input.upgrade.factoryProductionLineId,
    requestId: input.upgrade.requestId,
  });

  for (let attempt = 1; attempt <= MAX_UPGRADE_ATTEMPTS; attempt += 1) {
    try {
      return await input.prisma.$transaction(async (tx) => {
        const factory = await tx.factory.findFirst({
          where: {
            id: input.upgrade.factoryId,
            playerProfile: { userId: input.userId },
          },
          select: {
            cashBalanceCents: true,
            currencyCode: true,
            currentDay: true,
            currentFinancePeriod: true,
            currentXp: true,
            id: true,
            playerProfileId: true,
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

        const existingTransaction =
          await tx.factoryFinanceTransaction.findUnique({
            where: { referenceKey },
            select: { id: true },
          });

        if (existingTransaction) return failure("DUPLICATE_REQUEST");

        const line = await tx.factoryProductionLine.findFirst({
          where: {
            factoryId: factory.id,
            id: input.upgrade.factoryProductionLineId,
          },
          select: {
            acquisitionType: true,
            departmentId: true,
            id: true,
            productionLineTemplateId: true,
            status: true,
            leasingContracts: {
              where: { status: LeasingContractStatus.ACTIVE },
              take: 1,
              select: { id: true },
            },
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
                dailyPointCapacity: true,
                departmentId: true,
                grade: true,
                id: true,
                purchaseCostCents: true,
                sectorId: true,
              },
            },
            staffAssignments: {
              where: { status: StaffAssignmentStatus.ACTIVE },
              select: {
                quantity: true,
                staffRoleId: true,
                staffRole: {
                  select: { monthlySalaryCents: true },
                },
              },
            },
          },
        });

        if (!line) return failure("LINE_NOT_FOUND");
        if (
          line.status === FactoryProductionLineStatus.SOLD ||
          line.status === FactoryProductionLineStatus.DISABLED ||
          line.status === FactoryProductionLineStatus.RUNNING
        ) {
          return failure("LINE_NOT_UPGRADABLE");
        }
        if (line.leasingContracts.length > 0) {
          return failure("LEASING_ACTIVE");
        }
        if (line.productionAllocations.length > 0) {
          return failure("PRODUCTION_PLAN_ACTIVE");
        }
        if (line.productionLineTemplate.sectorId !== factory.sectorId) {
          return failure("SECTOR_MISMATCH");
        }

        const nextGrade = getNextProductionGrade(
          line.productionLineTemplate.grade,
        );

        if (!nextGrade) return failure("MAX_GRADE_REACHED");

        const nextTemplate = await tx.productionLineTemplate.findUnique({
          where: { id: input.upgrade.targetProductionLineTemplateId },
          select: {
            dailyPointCapacity: true,
            departmentId: true,
            grade: true,
            id: true,
            purchaseCostCents: true,
            sectorId: true,
            status: true,
            staffRequirements: {
              orderBy: { sortOrder: "asc" },
              select: {
                requiredQuantity: true,
                staffRole: {
                  select: {
                    id: true,
                    monthlySalaryCents: true,
                    staffType: true,
                  },
                },
              },
            },
          },
        });

        if (!nextTemplate) return failure("TEMPLATE_NOT_FOUND");
        if (nextTemplate.status !== ContentStatus.ACTIVE) {
          return failure("TEMPLATE_NOT_ACTIVE");
        }
        if (nextTemplate.sectorId !== factory.sectorId) {
          return failure("SECTOR_MISMATCH");
        }
        if (nextTemplate.departmentId !== line.departmentId) {
          return failure("DEPARTMENT_MISMATCH");
        }
        if (nextTemplate.grade !== nextGrade) {
          return failure("INVALID_UPGRADE_PATH");
        }
        if (
          nextTemplate.staffRequirements.length === 0 ||
          nextTemplate.staffRequirements.some(
            (requirement) =>
              requirement.staffRole.staffType !== StaffType.DIRECT_PRODUCTION,
          )
        ) {
          throw new Error("Production line direct staff config is incomplete.");
        }

        const pricing = calculateProductionLineUpgradePricing({
          currentPurchaseCostCents:
            line.productionLineTemplate.purchaseCostCents,
          nextPurchaseCostCents: nextTemplate.purchaseCostCents,
        });
        const netUpgradeCostCents = BigInt(pricing.netUpgradeCostCents);

        if (factory.cashBalanceCents < netUpgradeCostCents) {
          return failure("INSUFFICIENT_FUNDS");
        }

        const previousDirectStaffCount = line.staffAssignments.reduce(
          (total, assignment) => total + assignment.quantity,
          0,
        );
        const previousDirectPayrollCents = line.staffAssignments.reduce(
          (total, assignment) =>
            total +
            assignment.quantity * assignment.staffRole.monthlySalaryCents,
          0,
        );
        const nextDirectStaffCount = nextTemplate.staffRequirements.reduce(
          (total, requirement) => total + requirement.requiredQuantity,
          0,
        );
        const nextDirectPayrollCents = nextTemplate.staffRequirements.reduce(
          (total, requirement) =>
            total +
            requirement.requiredQuantity *
              requirement.staffRole.monthlySalaryCents,
          0,
        );
        const nextRequirementRoleIds = new Set(
          nextTemplate.staffRequirements.map(
            (requirement) => requirement.staffRole.id,
          ),
        );
        const balanceAfterCents =
          factory.cashBalanceCents - netUpgradeCostCents;

        const factoryUpdate = await tx.factory.updateMany({
          where: {
            cashBalanceCents: { gte: netUpgradeCostCents },
            id: factory.id,
            status: FactoryStatus.ACTIVE,
          },
          data: {
            cashBalanceCents: { decrement: netUpgradeCostCents },
          },
        });

        if (factoryUpdate.count !== 1) return failure("INSUFFICIENT_FUNDS");

        const lineUpdate = await tx.factoryProductionLine.updateMany({
          where: {
            id: line.id,
            productionLineTemplateId: line.productionLineTemplateId,
          },
          data: {
            metadata: {
              lastUpgrade: {
                grossUpgradeCostCents: String(
                  pricing.grossUpgradeCostCents,
                ),
                netUpgradeCostCents: String(pricing.netUpgradeCostCents),
                previousProductionLineTemplateId:
                  line.productionLineTemplate.id,
                nextProductionLineTemplateId: nextTemplate.id,
                previousGrade: line.productionLineTemplate.grade,
                nextGrade: nextTemplate.grade,
                referenceKey,
                requestId: input.upgrade.requestId,
                tradeInRefundCents: String(pricing.tradeInRefundCents),
              },
            },
            productionLineTemplateId: nextTemplate.id,
            purchasePriceCents: BigInt(nextTemplate.purchaseCostCents),
          },
        });

        if (lineUpdate.count !== 1) {
          throw new Error("Production line changed while upgrading.");
        }

        for (const requirement of nextTemplate.staffRequirements) {
          await tx.factoryStaffAssignment.upsert({
            where: {
              factoryId_staffRoleId_scopeKey: {
                factoryId: factory.id,
                scopeKey: line.id,
                staffRoleId: requirement.staffRole.id,
              },
            },
            create: {
              factoryId: factory.id,
              factoryProductionLineId: line.id,
              metadata: {
                nextProductionLineTemplateId: nextTemplate.id,
                previousProductionLineTemplateId:
                  line.productionLineTemplate.id,
                referenceKey,
                source: "production-line-upgrade",
              },
              quantity: requirement.requiredQuantity,
              scopeKey: line.id,
              staffRoleId: requirement.staffRole.id,
              status: StaffAssignmentStatus.ACTIVE,
            },
            update: {
              factoryProductionLineId: line.id,
              metadata: {
                nextProductionLineTemplateId: nextTemplate.id,
                previousProductionLineTemplateId:
                  line.productionLineTemplate.id,
                referenceKey,
                source: "production-line-upgrade",
              },
              quantity: requirement.requiredQuantity,
              status: StaffAssignmentStatus.ACTIVE,
            },
          });
        }

        const removedRoleIds = line.staffAssignments
          .map((assignment) => assignment.staffRoleId)
          .filter((staffRoleId) => !nextRequirementRoleIds.has(staffRoleId));

        if (removedRoleIds.length > 0) {
          await tx.factoryStaffAssignment.updateMany({
            where: {
              factoryId: factory.id,
              scopeKey: line.id,
              staffRoleId: { in: removedRoleIds },
            },
            data: {
              metadata: {
                nextProductionLineTemplateId: nextTemplate.id,
                previousProductionLineTemplateId:
                  line.productionLineTemplate.id,
                referenceKey,
                source: "production-line-upgrade-removed-role",
              },
              quantity: 0,
              status: StaffAssignmentStatus.PASSIVE,
            },
          });
        }

        await tx.factoryFinanceTransaction.create({
          data: {
            amountCents: netUpgradeCostCents,
            balanceAfterCents,
            balanceBeforeCents: factory.cashBalanceCents,
            category: FinanceCategory.MACHINE_PURCHASE,
            description: "finance.lineUpgrade",
            direction: FinanceDirection.EXPENSE,
            factoryId: factory.id,
            gameDay: factory.currentDay,
            metadata: {
              capacityIncreaseBps: calculateCapacityIncreaseBps({
                currentDailyPointCapacity:
                  line.productionLineTemplate.dailyPointCapacity,
                nextDailyPointCapacity: nextTemplate.dailyPointCapacity,
              }),
              currencyCode: factory.currencyCode,
              directPayrollDeltaCents:
                nextDirectPayrollCents - previousDirectPayrollCents,
              directStaffDelta:
                nextDirectStaffCount - previousDirectStaffCount,
              grossUpgradeCostCents: String(pricing.grossUpgradeCostCents),
              netUpgradeCostCents: String(pricing.netUpgradeCostCents),
              nextGrade: nextTemplate.grade,
              nextProductionLineTemplateId: nextTemplate.id,
              previousGrade: line.productionLineTemplate.grade,
              previousProductionLineTemplateId:
                line.productionLineTemplate.id,
              productionLineId: line.id,
              requestId: input.upgrade.requestId,
              tradeInRefundCents: String(pricing.tradeInRefundCents),
              translationKey: "finance.lineUpgrade",
              xpAwarded: UPGRADE_XP_REWARD,
            },
            periodIndex: factory.currentFinancePeriod,
            referenceKey,
            sourceId: line.id,
            sourceType: FinanceSourceType.FACTORY_PRODUCTION_LINE,
          },
        });

        const progression = await grantFactoryXp({
          amountXp: UPGRADE_XP_REWARD,
          factoryId: factory.id,
          gameDay: factory.currentDay,
          metadata: {
            nextGrade: nextTemplate.grade,
            nextProductionLineTemplateId: nextTemplate.id,
            previousGrade: line.productionLineTemplate.grade,
            previousProductionLineTemplateId:
              line.productionLineTemplate.id,
            productionLineId: line.id,
            referenceKey,
            source: "production-line-upgrade",
          },
          reason: XpReason.FACTORY_EXPANSION,
          sourceId: line.id,
          sourceType: "factory_production_line",
          tx,
        });

        return {
          capacityIncreaseBps: calculateCapacityIncreaseBps({
            currentDailyPointCapacity:
              line.productionLineTemplate.dailyPointCapacity,
            nextDailyPointCapacity: nextTemplate.dailyPointCapacity,
          }),
          currentXp: progression.currentXp,
          directPayrollDeltaCents: String(
            nextDirectPayrollCents - previousDirectPayrollCents,
          ),
          directStaffDelta: nextDirectStaffCount - previousDirectStaffCount,
          factoryId: factory.id,
          grossUpgradeCostCents: String(pricing.grossUpgradeCostCents),
          netUpgradeCostCents: String(pricing.netUpgradeCostCents),
          nextDirectStaffCount,
          nextGrade: nextTemplate.grade,
          nextProductionLineTemplateId: nextTemplate.id,
          ok: true,
          previousDirectStaffCount,
          previousGrade: line.productionLineTemplate.grade,
          previousProductionLineTemplateId: line.productionLineTemplate.id,
          productionLineId: line.id,
          remainingCashBalanceCents: balanceAfterCents.toString(),
          tradeInRefundCents: String(pricing.tradeInRefundCents),
          xpAwarded: UPGRADE_XP_REWARD,
        };
      }, UPGRADE_TRANSACTION_OPTIONS);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const duplicate = await input.prisma.factoryFinanceTransaction.findUnique({
          where: { referenceKey },
          select: { id: true },
        });

        if (duplicate) return failure("DUPLICATE_REQUEST");
        if (attempt < MAX_UPGRADE_ATTEMPTS) continue;
      }

      if (isSerializableConflict(error) && attempt < MAX_UPGRADE_ATTEMPTS) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Production line upgrade retry loop exited unexpectedly.");
}

function failure(
  code: Extract<UpgradeProductionLineResult, { ok: false }>["code"],
): UpgradeProductionLineResult {
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
