import {
  FinanceCategory,
  FinanceDirection,
  FinanceSourceType,
  Prisma,
  TaskProgressStatus,
  TokenTransactionReason,
  XpReason,
} from "@/generated/prisma/client";
import { grantFactoryXp } from "@/features/game/services/factory-progression";
import { creditRunwayTokens } from "@/features/tokens/services/runway-token-service";

import {
  refreshFactoryTaskAvailability,
  type TaskRewardSnapshot,
} from "./task-definition-service";

type TaskRewardClient = Prisma.TransactionClient;

export type ClaimTaskRewardResult = {
  alreadyClaimed: boolean;
  cashRewardCents: string;
  currentXp: number;
  currentTokenBalance: number;
  taskProgressId: string;
  taskStatus: "CLAIMED";
  tokensAwarded: number;
  xpAwarded: number;
};

export async function claimTaskReward(input: {
  factoryId: string;
  taskProgressId: string;
  tx: TaskRewardClient;
}): Promise<ClaimTaskRewardResult> {
  const progress = await input.tx.factoryTaskProgress.findFirstOrThrow({
    where: {
      factoryId: input.factoryId,
      id: input.taskProgressId,
    },
    select: {
      claimedDay: true,
      id: true,
      rewardSnapshot: true,
      status: true,
      taskDefinition: {
        select: {
          key: true,
          rewardCashCents: true,
          rewardRunwayTokens: true,
          rewardXp: true,
          targetValue: true,
        },
      },
      factory: {
        select: {
          cashBalanceCents: true,
          currentDay: true,
          currentFinancePeriod: true,
          currentLevel: true,
          currentXp: true,
          playerProfileId: true,
        },
      },
    },
  });

  if (progress.status === TaskProgressStatus.CLAIMED) {
    const wallet = await input.tx.playerTokenWallet.findUnique({
      where: { playerProfileId: progress.factory.playerProfileId },
      select: { balance: true },
    });

    return {
      alreadyClaimed: true,
      cashRewardCents: "0",
      currentXp: progress.factory.currentXp,
      currentTokenBalance: wallet?.balance ?? 0,
      taskProgressId: progress.id,
      taskStatus: TaskProgressStatus.CLAIMED,
      tokensAwarded: 0,
      xpAwarded: 0,
    };
  }

  if (progress.status !== TaskProgressStatus.COMPLETED) {
    throw new Error("Görev henüz tamamlanmadı.");
  }

  const reward = resolveRewardSnapshot(progress.rewardSnapshot, {
    rewardCashCents: progress.taskDefinition.rewardCashCents?.toString() ?? null,
    rewardRunwayTokens: progress.taskDefinition.rewardRunwayTokens,
    rewardXp: progress.taskDefinition.rewardXp,
    targetValue: progress.taskDefinition.targetValue,
  });
  let currentXp = progress.factory.currentXp;
  let currentLevel = progress.factory.currentLevel;

  if (reward.rewardXp > 0) {
    const xpResult = await grantFactoryXp({
      amountXp: reward.rewardXp,
      factoryId: input.factoryId,
      gameDay: progress.factory.currentDay,
      metadata: { taskKey: progress.taskDefinition.key },
      reason: XpReason.TASK_CLAIM,
      sourceId: progress.id,
      sourceType: "factory_task_progress",
      tx: input.tx,
    });
    currentXp = xpResult.currentXp;
    currentLevel = xpResult.currentLevel;
  }

  const tokenResult = await creditRunwayTokens({
    amount: reward.rewardRunwayTokens,
    metadata: { taskKey: progress.taskDefinition.key },
    playerProfileId: progress.factory.playerProfileId,
    reason: TokenTransactionReason.TASK_REWARD,
    referenceKey: `TASK_REWARD:${progress.id}`,
    sourceId: progress.id,
    sourceType: "factory_task_progress",
    tx: input.tx,
  });
  let cashRewardCents = BigInt(0);

  if (reward.rewardCashCents && BigInt(reward.rewardCashCents) > BigInt(0)) {
    cashRewardCents = BigInt(reward.rewardCashCents);
    const balanceAfter = progress.factory.cashBalanceCents + cashRewardCents;
    await input.tx.factory.update({
      where: { id: input.factoryId },
      data: { cashBalanceCents: balanceAfter },
    });
    await input.tx.factoryFinanceTransaction.create({
      data: {
        amountCents: cashRewardCents,
        balanceAfterCents: balanceAfter,
        balanceBeforeCents: progress.factory.cashBalanceCents,
        category: FinanceCategory.BONUS,
        description: "Görev ödülü",
        direction: FinanceDirection.INCOME,
        factoryId: input.factoryId,
        gameDay: progress.factory.currentDay,
        metadata: { taskKey: progress.taskDefinition.key },
        periodIndex: progress.factory.currentFinancePeriod,
        referenceKey: `TASK_CASH_REWARD:${progress.id}`,
        sourceId: progress.id,
        sourceType: FinanceSourceType.MANUAL_ADJUSTMENT,
      },
    });
  }

  await input.tx.factoryTaskProgress.update({
    where: { id: progress.id },
    data: {
      claimedDay: progress.factory.currentDay,
      status: TaskProgressStatus.CLAIMED,
    },
  });
  await refreshFactoryTaskAvailability({
    currentDay: progress.factory.currentDay,
    currentLevel,
    factoryId: input.factoryId,
    tx: input.tx,
  });

  return {
    alreadyClaimed: false,
    cashRewardCents: cashRewardCents.toString(),
    currentXp,
    currentTokenBalance: tokenResult.balance ?? 0,
    taskProgressId: progress.id,
    taskStatus: TaskProgressStatus.CLAIMED,
    tokensAwarded: tokenResult.amount,
    xpAwarded: reward.rewardXp,
  };
}

function resolveRewardSnapshot(
  snapshot: Prisma.JsonValue | null,
  fallback: TaskRewardSnapshot,
): TaskRewardSnapshot {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return fallback;
  }

  const record = snapshot as Record<string, unknown>;
  const rewardCashCents = record.rewardCashCents;

  return {
    rewardCashCents:
      typeof rewardCashCents === "string" ? rewardCashCents : fallback.rewardCashCents,
    rewardRunwayTokens:
      typeof record.rewardRunwayTokens === "number"
        ? Math.max(0, Math.trunc(record.rewardRunwayTokens))
        : fallback.rewardRunwayTokens,
    rewardXp:
      typeof record.rewardXp === "number"
        ? Math.max(0, Math.trunc(record.rewardXp))
        : fallback.rewardXp,
    targetValue:
      typeof record.targetValue === "number"
        ? Math.max(1, Math.trunc(record.targetValue))
        : fallback.targetValue,
  };
}
