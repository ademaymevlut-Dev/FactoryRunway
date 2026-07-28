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
  ProductionLineInstallationStatus,
  ShiftSimulationStatus,
  StaffType,
  type PrismaClient,
} from "@/generated/prisma/client";
import { getActiveShiftPlayback } from "@/features/game/services/shift-playback-view";
import {
  normalizeLocale,
  type SupportedLocale,
} from "@/lib/i18n/locales";

import type {
  PurchaseProductionLineInput,
  PurchaseProductionLineResult,
} from "../types";
import { activateProductionLineInstallation } from "./production-line-installation-activation";
import {
  buildProductionLineInstallationReferenceKey,
  reserveProductionLineAcquisitionSequence,
  resolveProductionLineInstallationSchedule,
} from "./production-line-installation-policy";

const PURCHASE_TRANSACTION_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 5_000,
  timeout: 20_000,
} as const;

const MAX_PURCHASE_ATTEMPTS = 3;

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
  locale?: SupportedLocale | string | null;
  prisma: PrismaClient;
  purchase: PurchaseProductionLineInput;
  userId: string;
}): Promise<PurchaseProductionLineResult> {
  normalizeLocale(input.locale);
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
              where: { referenceKey },
              select: { id: true },
            }),
          ]);

        if (activePlayback || runningShift) return failure("PLAYBACK_ACTIVE");
        if (duplicateTransaction) return failure("DUPLICATE_REQUEST");

        const template = await tx.productionLineTemplate.findUnique({
          where: { id: input.purchase.productionLineTemplateId },
          select: {
            departmentId: true,
            id: true,
            purchaseCostCents: true,
            sectorId: true,
            status: true,
            department: {
              select: {
                departmentGroupId: true,
                kind: true,
              },
            },
            staffRequirements: {
              select: {
                staffRole: {
                  select: { staffType: true },
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
              requirement.staffRole.staffType !==
              StaffType.DIRECT_PRODUCTION,
          )
        ) {
          throw new Error(
            "Production line direct staff config is incomplete.",
          );
        }

        const paidAmountCents = BigInt(template.purchaseCostCents);

        if (factory.cashBalanceCents < paidAmountCents) {
          return failure("INSUFFICIENT_FUNDS");
        }

        const [placement, acquisitionSequence] = await Promise.all([
          resolveNextLinePlacement({
            departmentGroupId: template.department.departmentGroupId,
            departmentId: template.departmentId,
            factoryId: factory.id,
            tx,
          }),
          reserveProductionLineAcquisitionSequence({
            factoryId: factory.id,
            tx,
          }),
        ]);
        const schedule =
          await resolveProductionLineInstallationSchedule({
            acquisitionSequence,
            factoryId: factory.id,
            prisma: tx,
            requestedDay: factory.currentDay,
            sectorId: factory.sectorId,
          });
        const remainingCashBalanceCents =
          factory.cashBalanceCents - paidAmountCents;
        const cashUpdate = await tx.factory.updateMany({
          where: {
            cashBalanceCents: { gte: paidAmountCents },
            id: factory.id,
            status: FactoryStatus.ACTIVE,
          },
          data: {
            cashBalanceCents: { decrement: paidAmountCents },
          },
        });

        if (cashUpdate.count !== 1) return failure("INSUFFICIENT_FUNDS");

        const productionLineId = randomUUID();
        const installationId = randomUUID();
        const installationReferenceKey =
          buildProductionLineInstallationReferenceKey({
            acquisitionReferenceKey: referenceKey,
            factoryId: factory.id,
          });

        await tx.factoryProductionLine.create({
          data: {
            acquisitionSequence,
            acquisitionType: LineAcquisitionType.PURCHASED,
            conditionBps: 10_000,
            departmentId: template.departmentId,
            factoryId: factory.id,
            id: productionLineId,
            installedDay: factory.currentDay,
            lineNumber: placement.lineNumber,
            metadata: {
              installationId,
              purchaseReferenceKey: referenceKey,
              requestId: input.purchase.requestId,
            },
            productionLineTemplateId: template.id,
            purchasePriceCents: paidAmountCents,
            sortOrder: placement.sortOrder,
            status: FactoryProductionLineStatus.INSTALLING,
          },
        });
        await tx.factoryProductionLineInstallation.create({
          data: {
            acceleratedDays: 0,
            concurrentSlot: schedule.concurrentSlot,
            delayDays: schedule.delayDays,
            factoryId: factory.id,
            factoryProductionLineId: productionLineId,
            id: installationId,
            metadata: {
              acquisitionSequence,
              acquisitionType: LineAcquisitionType.PURCHASED,
              policyReadyDay: schedule.originalReadyDay,
              requestId: input.purchase.requestId,
            },
            originalReadyDay: schedule.readyDay,
            readyDay: schedule.readyDay,
            referenceKey: installationReferenceKey,
            requestedDay: factory.currentDay,
            ruleId: schedule.rule.id,
            status: ProductionLineInstallationStatus.PENDING,
            tokensSpent: 0,
          },
        });
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
              acquisitionSequence,
              currencyCode: factory.currencyCode,
              installationId,
              productionLineId,
              productionLineTemplateId: template.id,
              readyDay: schedule.readyDay,
              requestId: input.purchase.requestId,
              translationKey: "finance.linePurchase",
            },
            periodIndex: factory.currentFinancePeriod,
            referenceKey,
            sourceId: productionLineId,
            sourceType: FinanceSourceType.FACTORY_PRODUCTION_LINE,
          },
        });

        const activation =
          schedule.readyDay <= factory.currentDay
            ? await activateProductionLineInstallation({
                currentDay: factory.currentDay,
                installationId,
                tx,
              })
            : null;

        return {
          acquisitionSequence,
          acquisitionType: LineAcquisitionType.PURCHASED,
          delayDays: schedule.delayDays,
          departmentId: template.departmentId,
          directStaffCreated: activation?.directStaffCreated ?? 0,
          factoryId: factory.id,
          installationId,
          installationStatus: activation
            ? ProductionLineInstallationStatus.ACTIVATED
            : ProductionLineInstallationStatus.PENDING,
          lineNumber: placement.lineNumber,
          ok: true,
          operatingStageChanged:
            activation?.operatingStageChanged ?? false,
          operatingStageKey: activation?.operatingStageKey ?? null,
          paidAmountCents: paidAmountCents.toString(),
          productionLineId,
          readyDay: schedule.readyDay,
          remainingCashBalanceCents:
            remainingCashBalanceCents.toString(),
          requestedDay: factory.currentDay,
          sortOrder: placement.sortOrder,
          supportStaffCreated: activation?.supportStaffCreated ?? 0,
        };
      }, PURCHASE_TRANSACTION_OPTIONS);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const duplicate =
          await input.prisma.factoryFinanceTransaction.findUnique({
            where: { referenceKey },
            select: { id: true },
          });

        if (duplicate) return failure("DUPLICATE_REQUEST");
        if (attempt < MAX_PURCHASE_ATTEMPTS) continue;
      }

      if (
        isSerializableConflict(error) &&
        attempt < MAX_PURCHASE_ATTEMPTS
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    "Production line purchase retry loop exited unexpectedly.",
  );
}

export async function resolveNextLinePlacement(input: {
  departmentGroupId: string | null;
  departmentId: string;
  factoryId: string;
  tx: Prisma.TransactionClient;
}) {
  const departmentIds = input.departmentGroupId
    ? (
        await input.tx.department.findMany({
          where: { departmentGroupId: input.departmentGroupId },
          select: { id: true },
        })
      ).map((department) => department.id)
    : [input.departmentId];
  const [lineNumberAggregate, sortOrderAggregate] = await Promise.all([
    input.tx.factoryProductionLine.aggregate({
      where: {
        departmentId: input.departmentId,
        factoryId: input.factoryId,
      },
      _max: { lineNumber: true },
    }),
    input.tx.factoryProductionLine.aggregate({
      where: {
        departmentId: { in: departmentIds },
        factoryId: input.factoryId,
      },
      _max: { sortOrder: true },
    }),
  ]);

  return calculateNextLinePlacement({
    maximumDepartmentGroupSortOrder:
      sortOrderAggregate._max.sortOrder ?? null,
    maximumDepartmentLineNumber:
      lineNumberAggregate._max.lineNumber ?? null,
  });
}

function failure(
  code: Extract<
    PurchaseProductionLineResult,
    { ok: false }
  >["code"],
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
