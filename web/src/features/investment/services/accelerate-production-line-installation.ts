import {
  FactoryProductionLineStatus,
  FactoryStatus,
  Prisma,
  ProductionLineInstallationStatus,
  ShiftSimulationStatus,
  TokenTransactionReason,
  type PrismaClient,
} from "@/generated/prisma/client";
import { getActiveShiftPlayback } from "@/features/game/services/shift-playback-view";
import {
  InsufficientRunwayTokenBalanceError,
  RunwayTokenConcurrencyError,
  spendRunwayTokens,
} from "@/features/tokens/services/runway-token-service";

import type {
  AccelerateProductionLineInstallationInput,
  AccelerateProductionLineInstallationResult,
} from "../types";
import { activateProductionLineInstallation } from "./production-line-installation-activation";

const TRANSACTION_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 5_000,
  timeout: 20_000,
} as const;
const MAX_ATTEMPTS = 3;

export function buildInstallationAccelerationReferenceKey(input: {
  factoryId: string;
  requestId: string;
}) {
  return `LINE_INSTALLATION_ACCELERATION:${input.factoryId}:${input.requestId}`;
}

export async function accelerateProductionLineInstallation(input: {
  acceleration: AccelerateProductionLineInstallationInput;
  prisma: PrismaClient;
  userId: string;
}): Promise<AccelerateProductionLineInstallationResult> {
  const referenceKey = buildInstallationAccelerationReferenceKey(
    input.acceleration,
  );

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await input.prisma.$transaction(async (tx) => {
        const factory = await tx.factory.findFirst({
          where: {
            id: input.acceleration.factoryId,
            playerProfile: { userId: input.userId },
          },
          select: {
            currentDay: true,
            id: true,
            playerProfileId: true,
            status: true,
          },
        });

        if (!factory) return failure("FACTORY_NOT_FOUND");
        if (factory.status !== FactoryStatus.ACTIVE) {
          return failure("FACTORY_NOT_ACTIVE");
        }
        if (
          !Number.isInteger(input.acceleration.days) ||
          input.acceleration.days <= 0
        ) {
          return failure("INVALID_ACCELERATION_DAYS");
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
            tx.playerTokenTransaction.findUnique({
              where: { referenceKey },
              select: { id: true },
            }),
          ]);

        if (activePlayback || runningShift) {
          return failure("PLAYBACK_ACTIVE");
        }
        if (duplicateTransaction) return failure("DUPLICATE_REQUEST");

        const installation =
          await tx.factoryProductionLineInstallation.findFirst({
            where: {
              factoryId: factory.id,
              factoryProductionLineId:
                input.acceleration.factoryProductionLineId,
            },
            select: {
              acceleratedDays: true,
              concurrentSlot: true,
              factoryProductionLineId: true,
              id: true,
              readyDay: true,
              ruleId: true,
              status: true,
              tokensSpent: true,
              factoryProductionLine: {
                select: { status: true },
              },
              rule: {
                select: {
                  minimumRemainingDays: true,
                  tokenSkipCostPerDay: true,
                },
              },
            },
          });

        if (!installation) return failure("INSTALLATION_NOT_FOUND");
        if (
          !installation.rule ||
          installation.status ===
            ProductionLineInstallationStatus.ACTIVATED ||
          installation.status ===
            ProductionLineInstallationStatus.CANCELLED ||
          installation.factoryProductionLine.status !==
            FactoryProductionLineStatus.INSTALLING
        ) {
          return failure("INSTALLATION_NOT_PENDING");
        }

        const previousReadyDay = installation.readyDay;
        const requestedReadyDay =
          previousReadyDay - input.acceleration.days;
        const minimumByPolicy =
          factory.currentDay +
          installation.rule.minimumRemainingDays;
        const previousSlotInstallation =
          installation.concurrentSlot && installation.ruleId
            ? await tx.factoryProductionLineInstallation.findFirst({
                where: {
                  concurrentSlot: installation.concurrentSlot,
                  factoryId: factory.id,
                  id: { not: installation.id },
                  readyDay: { lt: previousReadyDay },
                  ruleId: installation.ruleId,
                  status: {
                    in: [
                      ProductionLineInstallationStatus.PENDING,
                      ProductionLineInstallationStatus.READY,
                    ],
                  },
                },
                orderBy: [
                  { readyDay: "desc" },
                  { createdAt: "desc" },
                  { id: "desc" },
                ],
                select: { readyDay: true },
              })
            : null;
        const minimumReadyDay = Math.max(
          minimumByPolicy,
          previousSlotInstallation?.readyDay ?? factory.currentDay,
        );

        if (requestedReadyDay < minimumReadyDay) {
          return failure("MINIMUM_REMAINING_DAYS");
        }

        const tokensToSpend =
          input.acceleration.days *
          installation.rule.tokenSkipCostPerDay;

        let tokenResult;

        try {
          tokenResult = await spendRunwayTokens({
            amount: tokensToSpend,
            metadata: {
              acceleratedDays: input.acceleration.days,
              installationId: installation.id,
              newReadyDay: requestedReadyDay,
              previousReadyDay,
            },
            playerProfileId: factory.playerProfileId,
            reason:
              TokenTransactionReason.INSTALLATION_ACCELERATION,
            referenceKey,
            sourceId: installation.id,
            sourceType: "production_line_installation",
            tx,
          });
        } catch (error) {
          if (error instanceof InsufficientRunwayTokenBalanceError) {
            return failure("INSUFFICIENT_TOKENS");
          }

          throw error;
        }

        const update =
          await tx.factoryProductionLineInstallation.updateMany({
            where: {
              id: installation.id,
              readyDay: previousReadyDay,
              status: installation.status,
            },
            data: {
              acceleratedDays: {
                increment: input.acceleration.days,
              },
              readyDay: requestedReadyDay,
              tokensSpent: { increment: tokensToSpend },
            },
          });

        if (update.count !== 1) {
          throw new RunwayTokenConcurrencyError();
        }

        if (requestedReadyDay <= factory.currentDay) {
          await activateProductionLineInstallation({
            currentDay: factory.currentDay,
            installationId: installation.id,
            tx,
          });
        }

        return {
          acceleratedDays:
            installation.acceleratedDays +
            input.acceleration.days,
          factoryId: factory.id,
          installationId: installation.id,
          newReadyDay: requestedReadyDay,
          ok: true,
          previousReadyDay,
          productionLineId:
            installation.factoryProductionLineId,
          remainingDays: Math.max(
            0,
            requestedReadyDay - factory.currentDay,
          ),
          tokenBalance: tokenResult.balance,
          tokensSpent:
            installation.tokensSpent + tokensToSpend,
        };
      }, TRANSACTION_OPTIONS);
    } catch (error) {
      if (
        (isSerializableConflict(error) ||
          error instanceof RunwayTokenConcurrencyError) &&
        attempt < MAX_ATTEMPTS
      ) {
        continue;
      }
      if (isUniqueConstraintError(error)) {
        const duplicate =
          await input.prisma.playerTokenTransaction.findUnique({
            where: { referenceKey },
            select: { id: true },
          });

        if (duplicate) return failure("DUPLICATE_REQUEST");
        if (attempt < MAX_ATTEMPTS) continue;
      }

      throw error;
    }
  }

  throw new Error(
    "Installation acceleration retry loop exited unexpectedly.",
  );
}

function failure(
  code: Extract<
    AccelerateProductionLineInstallationResult,
    { ok: false }
  >["code"],
): AccelerateProductionLineInstallationResult {
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
