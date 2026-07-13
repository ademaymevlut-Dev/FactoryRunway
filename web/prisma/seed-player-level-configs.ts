import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

import {
  ContentStatus,
  PrismaClient,
} from "../src/generated/prisma/client";

loadEnv({ path: ".env.local" });
loadEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL bulunamadı.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const levelRequiredXp = [
  0, 500, 1_200, 2_200, 3_500, 5_100, 7_000, 9_200, 11_700, 14_500,
  17_600, 21_000, 24_700, 28_700, 33_000, 37_600, 42_500, 47_700, 53_200,
  59_000, 65_100, 71_500, 78_200, 85_200, 92_500, 100_100, 108_000,
  116_200, 124_700, 133_500, 142_600, 152_000, 161_700, 171_700, 182_000,
  192_600, 203_500, 214_700, 226_200, 238_000, 250_100, 262_500, 275_200,
  288_200, 301_500, 315_100, 329_000, 343_200, 357_700, 372_500,
] as const;

const unlockByLevel = new Map<number, string>([
  [1, "starter_factory"],
  [2, "basic_daily_goals"],
  [3, "new_customer_offers"],
  [5, "production_line_purchase"],
  [8, "small_premium_offer_chance"],
  [10, "industrial_grade_access"],
  [12, "advanced_finance_dashboard"],
  [15, "ranking_screen"],
  [18, "small_luxury_boutique_offers"],
  [20, "precision_grade_access"],
  [25, "advanced_leasing_options"],
  [30, "large_retail_customer_access"],
  [35, "premium_luxury_collection_offers"],
  [40, "smart_grade_access"],
  [50, "enterprise_ranking_segment"],
]);

async function main() {
  const sector = await prisma.sector.findUnique({
    where: { key: "textile" },
    select: { id: true },
  });

  if (!sector) {
    throw new Error('"textile" sektör kaydı bulunamadı.');
  }

  for (const [index, requiredXp] of levelRequiredXp.entries()) {
    const level = index + 1;

    await prisma.playerLevelConfig.upsert({
      where: {
        scopeKey_level: {
          level,
          scopeKey: sector.id,
        },
      },
      update: {
        requiredXp,
        rewardCashCents: null,
        rewardXp: 0,
        status: ContentStatus.ACTIVE,
        unlockKey: unlockByLevel.get(level) ?? null,
        metadata: {
          balanceVersion: 1,
          seedSource: "12-PlayerLevel_Ranking_and_Awards",
        },
      },
      create: {
        level,
        requiredXp,
        rewardCashCents: null,
        rewardXp: 0,
        scopeKey: sector.id,
        sectorId: sector.id,
        status: ContentStatus.ACTIVE,
        unlockKey: unlockByLevel.get(level) ?? null,
        metadata: {
          balanceVersion: 1,
          seedSource: "12-PlayerLevel_Ranking_and_Awards",
        },
      },
    });
  }

  const configs = levelRequiredXp.map((requiredXp, index) => ({
    level: index + 1,
    requiredXp,
  }));
  const factories = await prisma.factory.findMany({
    where: { sectorId: sector.id },
    select: {
      currentLevel: true,
      currentXp: true,
      id: true,
      name: true,
    },
  });
  let syncedFactoryCount = 0;

  for (const factory of factories) {
    const computedLevel = resolveLevelFromXp({
      configs,
      currentLevel: factory.currentLevel,
      currentXp: factory.currentXp,
    });

    if (computedLevel === factory.currentLevel) continue;

    await prisma.factory.update({
      where: { id: factory.id },
      data: {
        currentLevel: computedLevel,
      },
    });
    syncedFactoryCount += 1;
  }

  console.log(
    `${levelRequiredXp.length} textile level config eklendi/güncellendi. ${syncedFactoryCount} fabrika level değeri current XP ile senkronlandı.`,
  );
}

function resolveLevelFromXp(input: {
  configs: Array<{ level: number; requiredXp: number }>;
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

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
