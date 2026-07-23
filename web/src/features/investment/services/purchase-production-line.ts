import { randomUUID } from "node:crypto";

import {
  ContentStatus,
  DepartmentKind,
  FactoryProductionLineStatus,
  FactoryStatus,
  FinanceCategory,
  FinanceDirection,
  FinanceSourceType,
  LineAcquisitionType,
  Prisma,
  ShiftSimulationStatus,
  StaffAssignmentStatus,
  StaffType,
  XpReason,
  type PrismaClient,
} from "@/generated/prisma/client";
import { grantFactoryXp } from "@/features/game/services/factory-progression";
import { getActiveShiftPlayback } from "@/features/game/services/shift-playback-view";
import { recalculateFactoryOperatingStage } from "@/features/game/services/factory-operating-stage";
import { advanceFactoryTaskProgress } from "@/features/tasks/services/task-definition-service";
import { calculateProductionLineInvestmentPreview } from "./production-line-investment";
import type {
  PurchaseProductionLineInput,
  PurchaseProductionLineResult,
} from "../types";

const PURCHASE_TRANSACTION_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 5_000,
  timeout: 15_000,
} as const;

const MAX_PURCHASE_ATTEMPTS = 3;
const LINE_PURCHASE_XP_REWARD = 250;
const OPERATING_STAGE_UP_XP_BONUS = 500;

export function buildLinePurchaseReferenceKey(input: {
  factoryId: string;
  requestId: string;
}) {
  return `LINE_PURCHASE:${input.factoryId}:${input.requestId}`;
}

export function calculateNextLinePlacement(input: {
  maximumDepartmentLineNumber: number | null;
  maximumDepartmentGroupSortOrder: number | null;
}) {
  return {
    lineNumber: (input.maximumDepartmentLineNumber ?? 0) + 1,
    sortOrder: (input.maximumDepartmentGroupSortOrder ?? 0) + 10,
  };
}

export async function purchaseProductionLine(input: {
  prisma: PrismaClient;
  purchase: PurchaseProductionLineInput;
  userId: string;
}): Promise<PurchaseProductionLineResult> {
  const referenceKey = buildLinePurchaseReferenceKey(input.purchase);

  for (let attempt = 1; attempt <= MAX_PURCHASE_ATTEMPTS; attempt += 1) {
    try {
      return await input.prisma.$transaction(async (tx) => {
        const factory = await tx.factory.findFirst({
          where: {
            id: input.purchase.factoryId,
            playerProfile: { userId: input.userId },
          },
          select: {
            cashBalanceCents: true,
            currencyCode: true,
            currentDay: true,
            currentFinancePeriod: true,
            id: true,
            sectorId: true,
            status: true,
            operatingStageState: {
              select: { currentStageId: true },
            },
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

        const template = await tx.productionLineTemplate.findUnique({
          where: { id: input.purchase.productionLineTemplateId },
          select: {
            departmentId: true,
            id: true,
            purchaseCostCents: true,
            areaM2: true,
            idealStaff: true,
            monthlyElectricityBaseCents: true,
            sectorId: true,
            status: true,
            department: {
              select: {
                key: true,
                departmentGroupId: true,
                departmentGroup: {
                  select: { key: true },
                },
                kind: true,
                monthlyOverheadPerLineCents: true,
              },
            },
            staffRequirements: {
              orderBy: { sortOrder: "asc" },
              select: {
                requiredQuantity: true,
                staffRole: {
                  select: {
                    id: true,
                    key: true,
                    monthlySalaryCents: true,
                    staffType: true,
                    translations: {
                      where: { locale: "tr" },
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
        });

        if (!template) return failure("TEMPLATE_NOT_FOUND");
        if (template.status !== ContentStatus.ACTIVE) {
          return failure("TEMPLATE_NOT_ACTIVE");
        }
        if (template.sectorId !== factory.sectorId) {
          return failure("SECTOR_MISMATCH");
        }
        if (template.department.kind !== DepartmentKind.PRODUCTION) {
          return failure("INVALID_DEPARTMENT_KIND");
        }
        if (
          template.staffRequirements.length === 0 ||
          template.staffRequirements.some(
            (requirement) =>
              requirement.staffRole.staffType !== StaffType.DIRECT_PRODUCTION,
          )
        ) {
          throw new Error("Production line direct staff config is incomplete.");
        }

        const paidAmountCents = BigInt(template.purchaseCostCents);

        if (factory.cashBalanceCents < paidAmountCents) {
          return failure("INSUFFICIENT_FUNDS");
        }

        const departmentIds = template.department.departmentGroupId
          ? (
              await tx.department.findMany({
                where: {
                  departmentGroupId: template.department.departmentGroupId,
                },
                select: { id: true },
              })
            ).map((department) => department.id)
          : [template.departmentId];
        const [
          lineNumberAggregate,
          sortOrderAggregate,
          activeProductionLineCount,
          activeDepartmentGroupLineCount,
          costConfig,
          stages,
          supportAssignments,
        ] = await Promise.all([
          tx.factoryProductionLine.aggregate({
            where: {
              departmentId: template.departmentId,
              factoryId: factory.id,
            },
            _max: { lineNumber: true },
          }),
          tx.factoryProductionLine.aggregate({
            where: {
              departmentId: { in: departmentIds },
              factoryId: factory.id,
            },
            _max: { sortOrder: true },
          }),
          tx.factoryProductionLine.count({
            where: {
              factoryId: factory.id,
              status: {
                notIn: [
                  FactoryProductionLineStatus.SOLD,
                  FactoryProductionLineStatus.DISABLED,
                ],
              },
            },
          }),
          tx.factoryProductionLine.count({
            where: {
              departmentId: { in: departmentIds },
              factoryId: factory.id,
              status: {
                notIn: [
                  FactoryProductionLineStatus.SOLD,
                  FactoryProductionLineStatus.DISABLED,
                ],
              },
            },
          }),
          tx.sectorOperatingCostConfig.findUniqueOrThrow({
            where: { sectorId: factory.sectorId },
            select: {
              dailyMealPerDirectStaffCents: true,
              directStaffOverheadPerStaffCents: true,
              monthlyWorkDays: true,
              rentPerM2Cents: true,
            },
          }),
          tx.sectorFactoryOperatingStage.findMany({
            where: {
              sectorId: factory.sectorId,
              status: ContentStatus.ACTIVE,
            },
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              key: true,
              sortOrder: true,
              minProductionLines: true,
              maxProductionLines: true,
              dailySupportMealPerStaffCents: true,
              supportOverheadPerStaffCents: true,
              translations: {
                where: { locale: "tr" },
                select: { name: true },
              },
              staffRequirements: {
                orderBy: { sortOrder: "asc" },
                select: {
                  requiredQuantity: true,
                  staffRole: {
                    select: {
                      id: true,
                      key: true,
                      monthlySalaryCents: true,
                      translations: {
                        where: { locale: "tr" },
                        select: { name: true },
                      },
                    },
                  },
                },
              },
            },
          }),
          tx.factoryStaffAssignment.findMany({
            where: {
              factoryId: factory.id,
              factoryProductionLineId: null,
              status: StaffAssignmentStatus.ACTIVE,
            },
            select: { quantity: true, staffRoleId: true },
          }),
        ]);
        const supportStaffByRoleId = new Map(
          supportAssignments.map((assignment) => [
            assignment.staffRoleId,
            assignment.quantity,
          ]),
        );
        const preview = calculateProductionLineInvestmentPreview({
          activeProductionLineCount,
          costConfig,
          currentStageId:
            factory.operatingStageState?.currentStageId ?? null,
          stages,
          supportStaffByRoleId,
          template,
        });
        const placement = calculateNextLinePlacement({
          maximumDepartmentGroupSortOrder:
            sortOrderAggregate._max.sortOrder ?? null,
          maximumDepartmentLineNumber:
            lineNumberAggregate._max.lineNumber ?? null,
        });
        const remainingCashBalanceCents =
          factory.cashBalanceCents - paidAmountCents;
        const cashUpdate = await tx.factory.updateMany({
          where: {
            cashBalanceCents: { gte: paidAmountCents },
            id: factory.id,
            status: FactoryStatus.ACTIVE,
          },
          data: { cashBalanceCents: { decrement: paidAmountCents } },
        });

        if (cashUpdate.count !== 1) return failure("INSUFFICIENT_FUNDS");

        const productionLineId = randomUUID();

        await tx.factoryProductionLine.create({
          data: {
            acquisitionType: LineAcquisitionType.PURCHASED,
            conditionBps: 10_000,
            departmentId: template.departmentId,
            factoryId: factory.id,
            id: productionLineId,
            installedDay: factory.currentDay,
            lineNumber: placement.lineNumber,
            metadata: {
              purchaseReferenceKey: referenceKey,
              requestId: input.purchase.requestId,
            },
            productionLineTemplateId: template.id,
            purchasePriceCents: paidAmountCents,
            sortOrder: placement.sortOrder,
            status: FactoryProductionLineStatus.IDLE,
          },
        });
        await tx.factoryStaffAssignment.createMany({
          data: template.staffRequirements.map((requirement) => ({
            factoryId: factory.id,
            factoryProductionLineId: productionLineId,
            metadata: {
              productionLineTemplateId: template.id,
              source: "production-line-purchase",
            },
            quantity: requirement.requiredQuantity,
            scopeKey: productionLineId,
            staffRoleId: requirement.staffRole.id,
            status: StaffAssignmentStatus.ACTIVE,
          })),
        });
        for (const addition of preview.supportStaff) {
          const currentQuantity =
            supportStaffByRoleId.get(addition.staffRoleId) ?? 0;

          await tx.factoryStaffAssignment.upsert({
            where: {
              factoryId_staffRoleId_scopeKey: {
                factoryId: factory.id,
                scopeKey: "FACTORY",
                staffRoleId: addition.staffRoleId,
              },
            },
            create: {
              factoryId: factory.id,
              factoryProductionLineId: null,
              metadata: { source: "operating-stage-provisioning" },
              quantity: addition.quantity,
              scopeKey: "FACTORY",
              staffRoleId: addition.staffRoleId,
              status: StaffAssignmentStatus.ACTIVE,
            },
            update: {
              factoryProductionLineId: null,
              metadata: { source: "operating-stage-provisioning" },
              quantity: currentQuantity + addition.quantity,
              status: StaffAssignmentStatus.ACTIVE,
            },
          });
        }
        await tx.factoryFinanceTransaction.create({
          data: {
            amountCents: paidAmountCents,
            balanceAfterCents: remainingCashBalanceCents,
            balanceBeforeCents: factory.cashBalanceCents,
            category: FinanceCategory.MACHINE_PURCHASE,
            description: "finance.linePurchase",
            direction: FinanceDirection.EXPENSE,
            factoryId: factory.id,
            gameDay: factory.currentDay,
            metadata: {
              currencyCode: factory.currencyCode,
              directStaffCreated: preview.directStaffCount,
              productionLineId,
              productionLineTemplateId: template.id,
              requestId: input.purchase.requestId,
              supportStaffCreated: preview.supportStaffCount,
              translationKey: "finance.linePurchase",
            },
            periodIndex: factory.currentFinancePeriod,
            referenceKey,
            sourceId: productionLineId,
            sourceType: FinanceSourceType.FACTORY_PRODUCTION_LINE,
          },
        });
        const stage = await recalculateFactoryOperatingStage({
          factoryId: factory.id,
          tx,
        });
        await advanceFactoryTaskProgress({
          currentDay: factory.currentDay,
          factoryId: factory.id,
          event: {
            objectiveType: "ACQUIRE_PRODUCTION_LINE",
            metadata: {
              activeDepartmentGroupLineCount:
                activeDepartmentGroupLineCount + 1,
              acquisitionType: LineAcquisitionType.PURCHASED,
              departmentKey: template.department.key,
              ...(template.department.departmentGroup?.key
                ? {
                    departmentGroupKey:
                      template.department.departmentGroup.key,
                  }
                : {}),
              productionLineId,
            },
          },
          tx,
        });
        await grantFactoryXp({
          amountXp:
            LINE_PURCHASE_XP_REWARD +
            (stage.stageChanged ? OPERATING_STAGE_UP_XP_BONUS : 0),
          factoryId: factory.id,
          gameDay: factory.currentDay,
          metadata: {
            baseXp: LINE_PURCHASE_XP_REWARD,
            operatingStageChanged: stage.stageChanged,
            operatingStageKey: stage.currentStageKey,
            productionLineId,
            productionLineTemplateId: template.id,
            requestId: input.purchase.requestId,
            source: "production-line-purchase",
            stageUpBonusXp: stage.stageChanged ? OPERATING_STAGE_UP_XP_BONUS : 0,
          },
          reason: stage.stageChanged
            ? XpReason.SCALE_UP
            : XpReason.FACTORY_EXPANSION,
          sourceId: productionLineId,
          sourceType: "factory_production_line",
          tx,
        });

        return {
          acquisitionType: LineAcquisitionType.PURCHASED,
          departmentId: template.departmentId,
          factoryId: factory.id,
          lineNumber: placement.lineNumber,
          ok: true,
          operatingStageChanged: stage.stageChanged,
          operatingStageKey: stage.currentStageKey,
          paidAmountCents: paidAmountCents.toString(),
          productionLineId,
          directStaffCreated: preview.directStaffCount,
          supportStaffCreated: preview.supportStaffCount,
          directPayrollIncreaseCents: preview.directPayrollIncreaseCents,
          supportPayrollIncreaseCents: preview.supportPayrollIncreaseCents,
          totalRecurringCostIncreaseCents:
            preview.totalRecurringCostIncreaseCents,
          remainingCashBalanceCents: remainingCashBalanceCents.toString(),
          sortOrder: placement.sortOrder,
        };
      }, PURCHASE_TRANSACTION_OPTIONS);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const duplicate = await input.prisma.factoryFinanceTransaction.findUnique({
          where: { referenceKey },
          select: { id: true },
        });

        if (duplicate) return failure("DUPLICATE_REQUEST");
        if (attempt < MAX_PURCHASE_ATTEMPTS) continue;
      }

      if (isSerializableConflict(error) && attempt < MAX_PURCHASE_ATTEMPTS) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Production line purchase retry loop exited unexpectedly.");
}

function failure(
  code: Extract<PurchaseProductionLineResult, { ok: false }>["code"],
): PurchaseProductionLineResult {
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
