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
    generationWeightBps: 6500,
    minDeliveryDays: 18,
    maxDeliveryDays: 24,
    offerExpiryDays: 3,
    minimumIntervalDays: 0,
    priceMultiplierMinBps: 9800,
    priceMultiplierMaxBps: 10300,
  },
  {
    offerType: MarketOrderOfferType.OPPORTUNITY,
    generationWeightBps: 1200,
    minDeliveryDays: 12,
    maxDeliveryDays: 20,
    offerExpiryDays: 2,
    minimumIntervalDays: 5,
    priceMultiplierMinBps: 11000,
    priceMultiplierMaxBps: 12500,
  },
  {
    offerType: MarketOrderOfferType.EXPRESS,
    generationWeightBps: 1000,
    minDeliveryDays: 7,
    maxDeliveryDays: 12,
    offerExpiryDays: 1,
    minimumIntervalDays: 2,
    priceMultiplierMinBps: 11500,
    priceMultiplierMaxBps: 13500,
  },
  {
    offerType: MarketOrderOfferType.REPEAT,
    generationWeightBps: 1300,
    minDeliveryDays: 14,
    maxDeliveryDays: 20,
    offerExpiryDays: 3,
    minimumIntervalDays: 3,
    priceMultiplierMinBps: 10000,
    priceMultiplierMaxBps: 10800,
  },
] as const;

function getStageRule(sortOrder: number) {
  if (sortOrder <= 10) {
    return { maxNewOffersPerDay: 2, targetActiveOfferCount: 5 };
  }

  if (sortOrder <= 20) {
    return { maxNewOffersPerDay: 2, targetActiveOfferCount: 6 };
  }

  if (sortOrder <= 30) {
    return { maxNewOffersPerDay: 3, targetActiveOfferCount: 8 };
  }

  if (sortOrder <= 40) {
    return { maxNewOffersPerDay: 3, targetActiveOfferCount: 10 };
  }

  if (sortOrder <= 50) {
    return { maxNewOffersPerDay: 4, targetActiveOfferCount: 12 };
  }

  return { maxNewOffersPerDay: 5, targetActiveOfferCount: 14 };
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
            balanceVersion: 1,
            seedSource: "market-offer-rules",
          },
        },
        update: {
          ...rule,
          metadata: {
            balanceVersion: 1,
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
            balanceVersion: 1,
            seedSource: "market-offer-rules",
          },
        },
        update: {
          ...cadence,
          metadata: {
            balanceVersion: 1,
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
