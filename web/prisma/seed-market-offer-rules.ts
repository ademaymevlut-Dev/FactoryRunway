import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

import {
  MarketOrderOfferType,
  PrismaClient,
} from "../src/generated/prisma/client";

loadEnv({ path: ".env.local" });
loadEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL bulunamadi.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const offerTypeRules = [
  {
    offerType: MarketOrderOfferType.NORMAL,
    generationWeightBps: 7200,
    minDeliveryDays: 20,
    maxDeliveryDays: 24,
    offerExpiryDays: 3,
    minimumIntervalDays: 0,
    priceMultiplierMinBps: 10_000,
    priceMultiplierMaxBps: 10_000,
  },
  {
    offerType: MarketOrderOfferType.OPPORTUNITY,
    generationWeightBps: 900,
    minDeliveryDays: 12,
    maxDeliveryDays: 15,
    offerExpiryDays: 2,
    minimumIntervalDays: 5,
    priceMultiplierMinBps: 10_400,
    priceMultiplierMaxBps: 10_800,
  },
  {
    offerType: MarketOrderOfferType.EXPRESS,
    generationWeightBps: 700,
    minDeliveryDays: 7,
    maxDeliveryDays: 10,
    offerExpiryDays: 1,
    minimumIntervalDays: 2,
    priceMultiplierMinBps: 11_000,
    priceMultiplierMaxBps: 11_600,
  },
  {
    offerType: MarketOrderOfferType.REPEAT,
    generationWeightBps: 1200,
    minDeliveryDays: 18,
    maxDeliveryDays: 24,
    offerExpiryDays: 3,
    minimumIntervalDays: 3,
    priceMultiplierMinBps: 9_900,
    priceMultiplierMaxBps: 10_200,
  },
] as const;

function getStageRule(sortOrder: number) {
  if (sortOrder <= 10) {
    return { maxNewOffersPerDay: 1, targetActiveOfferCount: 3 };
  }

  if (sortOrder <= 20) {
    return { maxNewOffersPerDay: 1, targetActiveOfferCount: 4 };
  }

  if (sortOrder <= 30) {
    return { maxNewOffersPerDay: 2, targetActiveOfferCount: 5 };
  }

  if (sortOrder <= 40) {
    return { maxNewOffersPerDay: 2, targetActiveOfferCount: 6 };
  }

  if (sortOrder <= 50) {
    return { maxNewOffersPerDay: 2, targetActiveOfferCount: 7 };
  }

  return { maxNewOffersPerDay: 3, targetActiveOfferCount: 8 };
}

async function main() {
  const sectors = await prisma.sector.findMany({
    include: {
      operatingStages: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, sortOrder: true },
      },
    },
  });

  for (const sector of sectors) {
    for (const rule of offerTypeRules) {
      await prisma.sectorMarketOfferTypeRule.upsert({
        where: {
          sectorId_offerType: {
            sectorId: sector.id,
            offerType: rule.offerType,
          },
        },
        create: {
          ...rule,
          sectorId: sector.id,
          metadata: {
            balanceVersion: 2,
            seedSource: "market-offer-rules",
          },
        },
        update: {
          ...rule,
          metadata: {
            balanceVersion: 2,
            seedSource: "market-offer-rules",
          },
        },
      });
    }

    for (const stage of sector.operatingStages) {
      const cadence = getStageRule(stage.sortOrder);

      await prisma.sectorMarketOfferStageRule.upsert({
        where: { operatingStageId: stage.id },
        create: {
          ...cadence,
          sectorId: sector.id,
          operatingStageId: stage.id,
          metadata: {
            balanceVersion: 2,
            seedSource: "market-offer-rules",
          },
        },
        update: {
          ...cadence,
          metadata: {
            balanceVersion: 2,
            seedSource: "market-offer-rules",
          },
        },
      });
    }
  }

  console.log(`${sectors.length} sektor icin pazar kurallari hazirlandi.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
