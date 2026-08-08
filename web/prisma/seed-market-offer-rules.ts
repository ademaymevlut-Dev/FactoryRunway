import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  CANONICAL_MARKET_SCALE_CONFIG,
  CANONICAL_MARKET_PRICING_CONFIG,
  CANONICAL_MARKET_OFFER_TYPE_RULES,
  MARKET_OFFER_BALANCE_VERSION,
  getFallbackMarketStageRule,
} from "../src/lib/order-market/market-offer-config";

loadEnv({ path: ".env.local" });
loadEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL bulunamadi.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

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
    for (const rule of CANONICAL_MARKET_OFFER_TYPE_RULES) {
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
            balanceVersion: MARKET_OFFER_BALANCE_VERSION,
            configAuthority: "db-admin",
            marketPricing: CANONICAL_MARKET_PRICING_CONFIG,
            marketScale: CANONICAL_MARKET_SCALE_CONFIG,
            seedSource: "market-offer-rules",
          },
        },
        update: {
          ...rule,
          metadata: {
            balanceVersion: MARKET_OFFER_BALANCE_VERSION,
            configAuthority: "db-admin",
            marketPricing: CANONICAL_MARKET_PRICING_CONFIG,
            marketScale: CANONICAL_MARKET_SCALE_CONFIG,
            seedSource: "market-offer-rules",
          },
        },
      });
    }

    for (const stage of sector.operatingStages) {
      const cadence = getFallbackMarketStageRule(stage.sortOrder);

      await prisma.sectorMarketOfferStageRule.upsert({
        where: { operatingStageId: stage.id },
        create: {
          ...cadence,
          sectorId: sector.id,
          operatingStageId: stage.id,
          metadata: {
            balanceVersion: 3,
            configAuthority: "db-admin",
            seedSource: "market-offer-rules",
          },
        },
        update: {
          ...cadence,
          metadata: {
            balanceVersion: 3,
            configAuthority: "db-admin",
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
