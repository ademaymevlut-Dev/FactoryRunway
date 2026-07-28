import "dotenv/config";

import { ContentStatus } from "../src/generated/prisma/client";
import { getPrisma } from "../src/lib/db";

const INSTALLATION_RULES = [
  {
    delayDays: 0,
    maxAcquisitionSequence: 5,
    maxConcurrentInstalls: 1,
    minAcquisitionSequence: 1,
    minimumRemainingDays: 0,
    tokenSkipCostPerDay: 2,
  },
  {
    delayDays: 2,
    maxAcquisitionSequence: 10,
    maxConcurrentInstalls: 1,
    minAcquisitionSequence: 6,
    minimumRemainingDays: 0,
    tokenSkipCostPerDay: 2,
  },
  {
    delayDays: 5,
    maxAcquisitionSequence: 15,
    maxConcurrentInstalls: 2,
    minAcquisitionSequence: 11,
    minimumRemainingDays: 1,
    tokenSkipCostPerDay: 3,
  },
  {
    delayDays: 7,
    maxAcquisitionSequence: 25,
    maxConcurrentInstalls: 2,
    minAcquisitionSequence: 16,
    minimumRemainingDays: 1,
    tokenSkipCostPerDay: 5,
  },
  {
    delayDays: 10,
    maxAcquisitionSequence: 35,
    maxConcurrentInstalls: 3,
    minAcquisitionSequence: 26,
    minimumRemainingDays: 2,
    tokenSkipCostPerDay: 8,
  },
  {
    delayDays: 14,
    maxAcquisitionSequence: null,
    maxConcurrentInstalls: 4,
    minAcquisitionSequence: 36,
    minimumRemainingDays: 3,
    tokenSkipCostPerDay: 12,
  },
] as const;

const LEASING_CREDIT_RULES = [
  {
    configuredMinimumReserveCents: BigInt(5_000_000),
    maxActiveContracts: 2,
    maxCyclePaymentCents: BigInt(2_500_000),
    maxExposureCents: BigInt(25_000_000),
    maxOwnedProductionLines: 10,
    minOwnedProductionLines: 1,
  },
  {
    configuredMinimumReserveCents: BigInt(7_500_000),
    maxActiveContracts: 4,
    maxCyclePaymentCents: BigInt(4_500_000),
    maxExposureCents: BigInt(50_000_000),
    maxOwnedProductionLines: 15,
    minOwnedProductionLines: 11,
  },
  {
    configuredMinimumReserveCents: BigInt(10_000_000),
    maxActiveContracts: 6,
    maxCyclePaymentCents: BigInt(7_500_000),
    maxExposureCents: BigInt(90_000_000),
    maxOwnedProductionLines: 25,
    minOwnedProductionLines: 16,
  },
  {
    configuredMinimumReserveCents: BigInt(15_000_000),
    maxActiveContracts: 8,
    maxCyclePaymentCents: BigInt(11_500_000),
    maxExposureCents: BigInt(140_000_000),
    maxOwnedProductionLines: 35,
    minOwnedProductionLines: 26,
  },
  {
    configuredMinimumReserveCents: BigInt(20_000_000),
    maxActiveContracts: 10,
    maxCyclePaymentCents: BigInt(15_000_000),
    maxExposureCents: BigInt(200_000_000),
    maxOwnedProductionLines: null,
    minOwnedProductionLines: 36,
  },
] as const;

async function main() {
  const prisma = getPrisma();
  const sectors = await prisma.sector.findMany({
    where: { status: { not: "ARCHIVED" } },
    select: { id: true, key: true },
  });

  for (const sector of sectors) {
    await prisma.$transaction(async (tx) => {
      for (const rule of INSTALLATION_RULES) {
        await tx.sectorProductionLineInstallationRule.upsert({
          where: {
            sectorId_minAcquisitionSequence: {
              minAcquisitionSequence: rule.minAcquisitionSequence,
              sectorId: sector.id,
            },
          },
          create: {
            ...rule,
            metadata: {
              balanceVersion: "production-line-installation-v1",
              seedSource: "27-uretim-hatti-kurulum-leasing-kredi-politikasi",
            },
            sectorId: sector.id,
            status: ContentStatus.ACTIVE,
          },
          update: {
            ...rule,
            metadata: {
              balanceVersion: "production-line-installation-v1",
              seedSource: "27-uretim-hatti-kurulum-leasing-kredi-politikasi",
            },
            status: ContentStatus.ACTIVE,
          },
        });
      }

      for (const rule of LEASING_CREDIT_RULES) {
        await tx.sectorLeasingCreditRule.upsert({
          where: {
            sectorId_minOwnedProductionLines: {
              minOwnedProductionLines: rule.minOwnedProductionLines,
              sectorId: sector.id,
            },
          },
          create: {
            ...rule,
            metadata: {
              balanceVersion: "leasing-credit-v1",
              seedSource: "27-uretim-hatti-kurulum-leasing-kredi-politikasi",
            },
            sectorId: sector.id,
            status: ContentStatus.ACTIVE,
          },
          update: {
            ...rule,
            metadata: {
              balanceVersion: "leasing-credit-v1",
              seedSource: "27-uretim-hatti-kurulum-leasing-kredi-politikasi",
            },
            status: ContentStatus.ACTIVE,
          },
        });
      }
    });

    console.log(`Investment policies synced for sector ${sector.key}.`);
  }

  await prisma.$disconnect();
}

void main();
