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
import { recalculateFactoryOperatingStage } from "@/features/game/services/factory-operating-stage";
import { advanceFactoryTaskProgress } from "@/features/tasks/services/task-definition-service";
import { getActiveShiftPlayback } from "@/features/game/services/shift-playback-view";

import type {
  LeaseProductionLineInput,
  LeaseProductionLineResult,
} from "../types";
import { calculateNextLinePlacement } from "./purchase-production-line";
import { calculateProductionLineInvestmentPreview } from "./production-line-investment";

const LEASING_PERIOD_DAYS = 22;
const TRANSACTION_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 5_000,
  timeout: 15_000,
} as const;
const MAX_ATTEMPTS = 3;
const LINE_LEASING_XP_REWARD = 250;
const OPERATING_STAGE_UP_XP_BONUS = 500;

export function buildLineLeasingReferenceKey(input: {
  factoryId: string;
  requestId: string;
}) {
  return `LINE_LEASING_CREATE:${input.factoryId}:${input.requestId}`;
}

export function buildLeasingDueReferenceKey(input: {
  contractId: string;
  installmentIndex: number;
}) {
  return `LEASING_DUE:${input.contractId}:${input.installmentIndex}`;
}

export function calculateFirstLeasingDueDay(startedDay: number) {
  return startedDay + LEASING_PERIOD_DAYS;
}

export async function leaseProductionLine(input: {
  prisma: PrismaClient;
  lease: LeaseProductionLineInput;
  userId: string;
}): Promise<LeaseProductionLineResult> {
  const requestReferenceKey = buildLineLeasingReferenceKey(input.lease);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await input.prisma.$transaction(async (tx) => {
        const factory = await tx.factory.findFirst({
          where: {
            id: input.lease.factoryId,
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
            operatingStageState: { select: { currentStageId: true } },
          },
        });

        if (!factory) return failure("FACTORY_NOT_FOUND");
        if (factory.status !== FactoryStatus.ACTIVE) {
          return failure("FACTORY_NOT_ACTIVE");
        }

        const [activePlayback, runningShift, duplicateTransaction] =
          await Promise.all([
            getActiveShiftPlayback({ factoryId: factory.id, prisma: tx }),
            tx.shiftSimulation.findFirst({
              where: {
                factoryId: factory.id,
                status: ShiftSimulationStatus.RUNNING,
              },
              select: { id: true },
            }),
            tx.factoryFinanceTransaction.findUnique({
              where: { referenceKey: requestReferenceKey },
              select: { id: true },
            }),
          ]);

        if (activePlayback || runningShift) return failure("PLAYBACK_ACTIVE");
        if (duplicateTransaction) return failure("DUPLICATE_REQUEST");

        const template = await tx.productionLineTemplate.findUnique({
          where: { id: input.lease.productionLineTemplateId },
          select: {
            areaM2: true,
            departmentId: true,
            id: true,
            idealStaff: true,
            monthlyElectricityBaseCents: true,
            purchaseCostCents: true,
            sectorId: true,
            status: true,
            department: {
              select: {
                departmentGroupId: true,
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

        const offer = await tx.productionLineLeasingOffer.findUnique({
          where: { id: input.lease.leasingOfferId },
        });

        if (!offer) return failure("OFFER_NOT_FOUND");
        if (offer.status !== ContentStatus.ACTIVE) {
          return failure("OFFER_NOT_ACTIVE");
        }
        if (offer.productionLineTemplateId !== template.id) {
          return failure("OFFER_TEMPLATE_MISMATCH");
        }
        if (
          !isSupportedTerm(offer.termYears, offer.installmentCount) ||
          offer.downPaymentCents < 0 ||
          offer.installmentAmountCents <= 0 ||
          offer.totalCostCents <= offer.downPaymentCents
        ) {
          throw new Error("Production line leasing offer is invalid.");
        }

        const downPaymentCents = BigInt(offer.downPaymentCents);

        if (factory.cashBalanceCents < downPaymentCents) {
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
          tx.sectorOperatingCostConfig.findUniqueOrThrow({
            where: { sectorId: factory.sectorId },
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
          currentStageId: factory.operatingStageState?.currentStageId ?? null,
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
          factory.cashBalanceCents - downPaymentCents;
        const cashUpdate = await tx.factory.updateMany({
          where: {
            cashBalanceCents: { gte: downPaymentCents },
            id: factory.id,
            status: FactoryStatus.ACTIVE,
          },
          data: { cashBalanceCents: { decrement: downPaymentCents } },
        });

        if (cashUpdate.count !== 1) return failure("INSUFFICIENT_FUNDS");

        const productionLineId = randomUUID();
        const leasingContractId = randomUUID();
        const nextDueDay = calculateFirstLeasingDueDay(factory.currentDay);

        await tx.factoryProductionLine.create({
          data: {
            acquisitionType: LineAcquisitionType.LEASED,
            conditionBps: 10_000,
            departmentId: template.departmentId,
            factoryId: factory.id,
            id: productionLineId,
            installedDay: factory.currentDay,
            lineNumber: placement.lineNumber,
            metadata: {
              leasingOfferId: offer.id,
              requestId: input.lease.requestId,
              requestReferenceKey,
            },
            productionLineTemplateId: template.id,
            purchasePriceCents: BigInt(offer.totalCostCents),
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
              source: "production-line-leasing",
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
        await tx.factoryLeasingContract.create({
          data: {
            downPaymentCents,
            durationMonths: offer.installmentCount,
            factoryId: factory.id,
            id: leasingContractId,
            installmentCount: offer.installmentCount,
            interestRateBps: 0,
            leasingOfferId: offer.id,
            metadata: {
              productionLineTemplateId: template.id,
              requestId: input.lease.requestId,
              requestReferenceKey,
            },
            monthlyPaymentCents: BigInt(offer.installmentAmountCents),
            nextDueDay,
            ownershipTransfer: true,
            principalCents:
              BigInt(offer.totalCostCents) - downPaymentCents,
            productionLineId,
            remainingInstallments: offer.installmentCount,
            remainingMonths: offer.installmentCount,
            startedDay: factory.currentDay,
            termYears: offer.termYears,
            totalCostCents: BigInt(offer.totalCostCents),
          },
        });
        await tx.factoryFinanceDue.create({
          data: {
            amountCents: BigInt(offer.installmentAmountCents),
            category: FinanceCategory.LEASING_PAYMENT,
            createdDay: factory.currentDay,
            description: "finance.leasingInstallment",
            direction: FinanceDirection.EXPENSE,
            dueDay: nextDueDay,
            factoryId: factory.id,
            metadata: {
              installmentCount: offer.installmentCount,
              installmentIndex: 1,
              translationKey: "finance.leasingInstallment",
            },
            periodIndex: 1,
            referenceKey: buildLeasingDueReferenceKey({
              contractId: leasingContractId,
              installmentIndex: 1,
            }),
            sourceId: leasingContractId,
            sourceType: FinanceSourceType.LEASING_CONTRACT,
          },
        });
        await tx.factoryFinanceTransaction.create({
          data: {
            amountCents: downPaymentCents,
            balanceAfterCents: remainingCashBalanceCents,
            balanceBeforeCents: factory.cashBalanceCents,
            category: FinanceCategory.LEASING_DOWN_PAYMENT,
            description: "finance.leasingDownPayment",
            direction: FinanceDirection.EXPENSE,
            factoryId: factory.id,
            gameDay: factory.currentDay,
            metadata: {
              leasingContractId,
              leasingOfferId: offer.id,
              productionLineId,
              requestId: input.lease.requestId,
              translationKey: "finance.leasingDownPayment",
            },
            periodIndex: factory.currentFinancePeriod,
            referenceKey: requestReferenceKey,
            sourceId: leasingContractId,
            sourceType: FinanceSourceType.LEASING_CONTRACT,
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
              acquisitionType: LineAcquisitionType.LEASED,
              productionLineId,
            },
          },
          tx,
        });
        await grantFactoryXp({
          amountXp:
            LINE_LEASING_XP_REWARD +
            (stage.stageChanged ? OPERATING_STAGE_UP_XP_BONUS : 0),
          factoryId: factory.id,
          gameDay: factory.currentDay,
          metadata: {
            baseXp: LINE_LEASING_XP_REWARD,
            leasingContractId,
            leasingOfferId: offer.id,
            operatingStageChanged: stage.stageChanged,
            operatingStageKey: stage.currentStageKey,
            productionLineId,
            productionLineTemplateId: template.id,
            requestId: input.lease.requestId,
            source: "production-line-leasing",
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
          acquisitionType: LineAcquisitionType.LEASED,
          departmentId: template.departmentId,
          directStaffCreated: preview.directStaffCount,
          downPaymentCents: downPaymentCents.toString(),
          factoryId: factory.id,
          installmentAmountCents: String(offer.installmentAmountCents),
          installmentCount: offer.installmentCount,
          leasingContractId,
          leasingOfferId: offer.id,
          lineNumber: placement.lineNumber,
          nextDueDay,
          ok: true,
          operatingStageChanged: stage.stageChanged,
          operatingStageKey: stage.currentStageKey,
          productionLineId,
          remainingCashBalanceCents: remainingCashBalanceCents.toString(),
          sortOrder: placement.sortOrder,
          supportStaffCreated: preview.supportStaffCount,
          totalCostCents: String(offer.totalCostCents),
          totalRecurringCostIncreaseCents:
            preview.totalRecurringCostIncreaseCents,
        };
      }, TRANSACTION_OPTIONS);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const duplicate = await input.prisma.factoryFinanceTransaction.findUnique(
          {
            where: { referenceKey: requestReferenceKey },
            select: { id: true },
          },
        );

        if (duplicate) return failure("DUPLICATE_REQUEST");
        if (attempt < MAX_ATTEMPTS) continue;
      }
      if (isSerializableConflict(error) && attempt < MAX_ATTEMPTS) continue;

      throw error;
    }
  }

  throw new Error("Production line leasing retry loop exited unexpectedly.");
}

function isSupportedTerm(termYears: number, installmentCount: number) {
  return (
    (termYears === 2 && installmentCount === 24) ||
    (termYears === 3 && installmentCount === 36) ||
    (termYears === 5 && installmentCount === 60)
  );
}

function failure(
  code: Extract<LeaseProductionLineResult, { ok: false }>["code"],
): LeaseProductionLineResult {
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
