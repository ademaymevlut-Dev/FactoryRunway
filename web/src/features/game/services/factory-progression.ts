import {
  ContentStatus,
  type Prisma,
  type XpReason,
} from "@/generated/prisma/client";

export const GLOBAL_LEVEL_SCOPE_KEY = "GLOBAL";

export type PlayerLevelThreshold = {
  level: number;
  requiredXp: number;
  scopeKey: string;
  unlockKey: string | null;
};

export type FactoryLevelProgress = {
  currentLevelRequiredXp: number;
  nextLevel: number | null;
  nextLevelRequiredXp: number | null;
  progressBps: number | null;
  xpForNextLevel: number | null;
  xpIntoCurrentLevel: number;
  xpRemainingForNextLevel: number | null;
};

type ProgressionClient = Prisma.TransactionClient;

export function pickApplicableLevelConfigs(
  configs: PlayerLevelThreshold[],
  sectorId: string,
) {
  const sectorConfigs = configs.filter((config) => config.scopeKey === sectorId);

  return (sectorConfigs.length > 0
    ? sectorConfigs
    : configs.filter((config) => config.scopeKey === GLOBAL_LEVEL_SCOPE_KEY)
  ).sort((first, second) => first.level - second.level);
}

export function resolveFactoryLevelFromXp(input: {
  configs: PlayerLevelThreshold[];
  currentLevel: number;
  currentXp: number;
}) {
  const eligibleLevel =
    input.configs
      .filter((config) => config.requiredXp <= input.currentXp)
      .sort((first, second) => second.level - first.level)[0]?.level ??
    input.currentLevel;

  return Math.max(input.currentLevel, eligibleLevel);
}

export function buildFactoryLevelProgress(input: {
  configs: PlayerLevelThreshold[];
  currentLevel: number;
  currentXp: number;
}): FactoryLevelProgress {
  const sortedConfigs = [...input.configs].sort(
    (first, second) => first.level - second.level,
  );
  const currentConfig =
    sortedConfigs.find((config) => config.level === input.currentLevel) ??
    sortedConfigs
      .filter((config) => config.level < input.currentLevel)
      .at(-1) ??
    null;
  const nextConfig =
    sortedConfigs.find((config) => config.level > input.currentLevel) ?? null;
  const currentLevelRequiredXp = currentConfig?.requiredXp ?? 0;

  if (!nextConfig) {
    return {
      currentLevelRequiredXp,
      nextLevel: null,
      nextLevelRequiredXp: null,
      progressBps: null,
      xpForNextLevel: null,
      xpIntoCurrentLevel: Math.max(0, input.currentXp - currentLevelRequiredXp),
      xpRemainingForNextLevel: null,
    };
  }

  const xpForNextLevel = Math.max(
    1,
    nextConfig.requiredXp - currentLevelRequiredXp,
  );
  const xpIntoCurrentLevel = Math.max(0, input.currentXp - currentLevelRequiredXp);
  const xpRemainingForNextLevel = Math.max(
    0,
    nextConfig.requiredXp - input.currentXp,
  );

  return {
    currentLevelRequiredXp,
    nextLevel: nextConfig.level,
    nextLevelRequiredXp: nextConfig.requiredXp,
    progressBps: clampBps(
      Math.floor((xpIntoCurrentLevel * 10_000) / xpForNextLevel),
    ),
    xpForNextLevel,
    xpIntoCurrentLevel,
    xpRemainingForNextLevel,
  };
}

export async function getFactoryLevelConfigs(input: {
  sectorId: string;
  tx: Pick<ProgressionClient, "playerLevelConfig">;
}) {
  const configs = await input.tx.playerLevelConfig.findMany({
    where: {
      scopeKey: { in: [input.sectorId, GLOBAL_LEVEL_SCOPE_KEY] },
      status: ContentStatus.ACTIVE,
    },
    orderBy: [{ level: "asc" }, { requiredXp: "asc" }],
    select: {
      level: true,
      requiredXp: true,
      scopeKey: true,
      unlockKey: true,
    },
  });

  return pickApplicableLevelConfigs(configs, input.sectorId);
}

export async function grantFactoryXp(input: {
  amountXp: number;
  factoryId: string;
  gameDay?: number;
  metadata?: Prisma.InputJsonObject;
  reason: XpReason;
  sourceId?: string | null;
  sourceType?: string | null;
  tx: ProgressionClient;
}) {
  const amountXp = Math.trunc(input.amountXp);

  if (amountXp <= 0) {
    throw new Error("XP amount must be positive.");
  }

  const factory = await input.tx.factory.findUniqueOrThrow({
    where: { id: input.factoryId },
    select: {
      currentDay: true,
      currentLevel: true,
      currentXp: true,
      playerProfileId: true,
      sectorId: true,
    },
  });
  const configs = await getFactoryLevelConfigs({
    sectorId: factory.sectorId,
    tx: input.tx,
  });
  const nextXp = factory.currentXp + amountXp;
  const nextLevel = resolveFactoryLevelFromXp({
    configs,
    currentLevel: factory.currentLevel,
    currentXp: nextXp,
  });
  const updatedFactory = await input.tx.factory.update({
    where: { id: input.factoryId },
    data: {
      currentLevel: nextLevel,
      currentXp: { increment: amountXp },
    },
    select: {
      currentLevel: true,
      currentXp: true,
    },
  });
  const leveledUp = updatedFactory.currentLevel > factory.currentLevel;

  await input.tx.playerProfile.update({
    where: { id: factory.playerProfileId },
    data: { totalXp: { increment: BigInt(amountXp) } },
  });
  await input.tx.factoryXpTransaction.create({
    data: {
      amountXp,
      balanceAfterXp: updatedFactory.currentXp,
      factoryId: input.factoryId,
      gameDay: input.gameDay ?? factory.currentDay,
      metadata: {
        ...(input.metadata ?? {}),
        currentLevel: updatedFactory.currentLevel,
        leveledUp,
        previousLevel: factory.currentLevel,
        previousXp: factory.currentXp,
      },
      reason: input.reason,
      sourceId: input.sourceId ?? null,
      sourceType: input.sourceType ?? null,
    },
  });

  return {
    amountXp,
    currentLevel: updatedFactory.currentLevel,
    currentXp: updatedFactory.currentXp,
    leveledUp,
    previousLevel: factory.currentLevel,
    previousXp: factory.currentXp,
  };
}

function clampBps(value: number) {
  return Math.max(0, Math.min(10_000, value));
}
