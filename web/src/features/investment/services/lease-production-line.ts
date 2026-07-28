import { randomUUID } from "node:crypto";

import {
  ContentStatus,
  DepartmentKind,
  FactoryProductionLineStatus,
  FactoryStatus,
  FinanceCategory,
  FinanceDirection,
  FinanceSourceType,
  LeasingContractStatus,
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
  LeaseProductionLineInput,
  LeaseProductionLineResult,
} from "../types";
import {
  evaluateLeasingCreditPolicy,
  type LeasingCreditDecision,
} from "./leasing-credit-policy";
import {
  buildLeasingDueReferenceKey,
  calculateFirstLeasingDueDay,
} from "./leasing-contract-schedule";
import { calculateProductionLineLeasingPricing } from "./production-line-leasing-pricing";
import { activateProductionLineInstallation } from "./production-line-installation-activation";
import {
  buildProductionLineInstallationReferenceKey,
  reserveProductionLineAcquisitionSequence,
  resolveProductionLineInstallationSchedule,
} from "./production-line-installation-policy";
import { resolveNextLinePlacement } from "./purchase-production-line";

const TRANSACTION_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 5_000,
  timeout: 20_000,
} as const;
const MAX_ATTEMPTS = 3;

export {
  buildLeasingDueReferenceKey,
  calculateFirstLeasingDueDay,
};

export function buildLineLeasingReferenceKey(input: {
  factoryId: string;
  requestId: string;
}) {
  return `LINE_LEASING_CREATE:${input.factoryId}:${input.requestId}`;
}

export async function leaseProductionLine(input: {
  prisma: PrismaClient;
  lease: LeaseProductionLineInput;
  locale?: SupportedLocale | string | null;
  userId: string;
}): Promise<LeaseProductionLineResult> {
  normalizeLocale(input.locale);
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

        const offer =
          await tx.productionLineLeasingOffer.findUnique({
            where: { id: input.lease.leasingOfferId },
            select: {
              id: true,
              installmentCount: true,
              productionLineTemplateId: true,
              status: true,
              termYears: true,
            },
          });

        if (!offer) return failure("OFFER_NOT_FOUND");
        if (offer.status !== ContentStatus.ACTIVE) {
          return failure("OFFER_NOT_ACTIVE");
        }
        if (offer.productionLineTemplateId !== template.id) {
          return failure("OFFER_TEMPLATE_MISMATCH");
        }

        const pricing = calculateProductionLineLeasingPricing({
          installmentCount: offer.installmentCount,
          purchaseCostCents: template.purchaseCostCents,
          termYears: offer.termYears,
        });
        const downPaymentCents = BigInt(pricing.downPaymentCents);
        const installmentAmountCents = BigInt(
          pricing.installmentAmountCents,
        );
        const candidateExposureCents =
          installmentAmountCents * BigInt(pricing.installmentCount);
        const creditDecision = await evaluateLeasingCreditPolicy({
          candidateCyclePaymentCents: installmentAmountCents,
          candidateExposureCents,
          downPaymentCents,
          factoryId: factory.id,
          prisma: tx,
        });

        if (!creditDecision.approved) {
          return creditFailure(creditDecision);
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
          factory.cashBalanceCents - downPaymentCents;
        const cashUpdate = await tx.factory.updateMany({
          where: {
            cashBalanceCents: { gte: downPaymentCents },
            id: factory.id,
            status: FactoryStatus.ACTIVE,
          },
          data: {
            cashBalanceCents: { decrement: downPaymentCents },
          },
        });

        if (cashUpdate.count !== 1) {
          return failure("INSUFFICIENT_FUNDS");
        }

        const productionLineId = randomUUID();
        const leasingContractId = randomUUID();
        const installationId = randomUUID();
        const installationReferenceKey =
          buildProductionLineInstallationReferenceKey({
            acquisitionReferenceKey: requestReferenceKey,
            factoryId: factory.id,
          });

        await tx.factoryProductionLine.create({
          data: {
            acquisitionSequence,
            acquisitionType: LineAcquisitionType.LEASED,
            conditionBps: 10_000,
            departmentId: template.departmentId,
            factoryId: factory.id,
            id: productionLineId,
            installedDay: factory.currentDay,
            lineNumber: placement.lineNumber,
            metadata: {
              installationId,
              leasingContractId,
              leasingOfferId: offer.id,
              requestId: input.lease.requestId,
              requestReferenceKey,
            },
            productionLineTemplateId: template.id,
            purchasePriceCents: BigInt(pricing.totalCostCents),
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
              acquisitionType: LineAcquisitionType.LEASED,
              leasingContractId,
              policyReadyDay: schedule.originalReadyDay,
              requestId: input.lease.requestId,
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
        await tx.factoryLeasingContract.create({
          data: {
            downPaymentCents,
            durationMonths: pricing.installmentCount,
            factoryId: factory.id,
            id: leasingContractId,
            installmentCount: pricing.installmentCount,
            interestRateBps: 0,
            leasingOfferId: offer.id,
            metadata: {
              creditDecision,
              installationId,
              productionLineTemplateId: template.id,
              requestId: input.lease.requestId,
              requestReferenceKey,
            },
            monthlyPaymentCents: installmentAmountCents,
            nextDueDay: null,
            ownershipTransfer: true,
            principalCents:
              BigInt(pricing.totalCostCents) - downPaymentCents,
            productionLineId,
            remainingInstallments: pricing.installmentCount,
            remainingMonths: pricing.installmentCount,
            startedDay: factory.currentDay,
            status: LeasingContractStatus.PENDING_ACTIVATION,
            termYears: pricing.termYears,
            totalCostCents: BigInt(pricing.totalCostCents),
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
              acquisitionSequence,
              installationId,
              leasingContractId,
              leasingOfferId: offer.id,
              productionLineId,
              readyDay: schedule.readyDay,
              requestId: input.lease.requestId,
              translationKey: "finance.leasingDownPayment",
            },
            periodIndex: factory.currentFinancePeriod,
            referenceKey: requestReferenceKey,
            sourceId: leasingContractId,
            sourceType: FinanceSourceType.LEASING_CONTRACT,
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
          acquisitionType: LineAcquisitionType.LEASED,
          creditDecision,
          delayDays: schedule.delayDays,
          departmentId: template.departmentId,
          directStaffCreated: activation?.directStaffCreated ?? 0,
          downPaymentCents: downPaymentCents.toString(),
          factoryId: factory.id,
          installmentAmountCents: installmentAmountCents.toString(),
          installmentCount: pricing.installmentCount,
          installationId,
          installationStatus: activation
            ? ProductionLineInstallationStatus.ACTIVATED
            : ProductionLineInstallationStatus.PENDING,
          leasingContractId,
          leasingOfferId: offer.id,
          lineNumber: placement.lineNumber,
          nextDueDay: activation?.nextDueDay ?? null,
          ok: true,
          operatingStageChanged:
            activation?.operatingStageChanged ?? false,
          operatingStageKey: activation?.operatingStageKey ?? null,
          productionLineId,
          readyDay: schedule.readyDay,
          remainingCashBalanceCents:
            remainingCashBalanceCents.toString(),
          requestedDay: factory.currentDay,
          sortOrder: placement.sortOrder,
          supportStaffCreated: activation?.supportStaffCreated ?? 0,
          totalCostCents: String(pricing.totalCostCents),
        };
      }, TRANSACTION_OPTIONS);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const duplicate =
          await input.prisma.factoryFinanceTransaction.findUnique({
            where: { referenceKey: requestReferenceKey },
            select: { id: true },
          });

        if (duplicate) return failure("DUPLICATE_REQUEST");
        if (attempt < MAX_ATTEMPTS) continue;
      }
      if (isSerializableConflict(error) && attempt < MAX_ATTEMPTS) {
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    "Production line leasing retry loop exited unexpectedly.",
  );
}

function failure(
  code: Exclude<
    Extract<LeaseProductionLineResult, { ok: false }>["code"],
    "CREDIT_DECLINED"
  >,
): LeaseProductionLineResult {
  return { code, ok: false };
}

function creditFailure(
  creditDecision: LeasingCreditDecision,
): LeaseProductionLineResult {
  return {
    code: "CREDIT_DECLINED",
    creditDecision,
    ok: false,
  };
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
