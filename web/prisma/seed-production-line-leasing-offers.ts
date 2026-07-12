import "dotenv/config";

import { ContentStatus } from "../src/generated/prisma/client";
import { getPrisma } from "../src/lib/db";

const terms = [
  { downPaymentBps: 2_000, installmentCount: 24, sortOrder: 10, termYears: 2, totalCostBps: 11_500 },
  { downPaymentBps: 1_500, installmentCount: 36, sortOrder: 20, termYears: 3, totalCostBps: 12_500 },
  { downPaymentBps: 1_000, installmentCount: 60, sortOrder: 30, termYears: 5, totalCostBps: 14_500 },
] as const;

async function main() {
  const prisma = getPrisma();
  const templates = await prisma.productionLineTemplate.findMany({
    where: { status: ContentStatus.ACTIVE },
    select: { id: true, purchaseCostCents: true },
  });

  for (const template of templates) {
    for (const term of terms) {
      const downPaymentCents = divideRounded(
        template.purchaseCostCents * term.downPaymentBps,
        10_000,
      );
      const targetTotalCents = divideRounded(
        template.purchaseCostCents * term.totalCostBps,
        10_000,
      );
      const installmentAmountCents = Math.ceil(
        (targetTotalCents - downPaymentCents) / term.installmentCount,
      );
      const totalCostCents =
        downPaymentCents + installmentAmountCents * term.installmentCount;

      await prisma.productionLineLeasingOffer.upsert({
        where: {
          productionLineTemplateId_termYears: {
            productionLineTemplateId: template.id,
            termYears: term.termYears,
          },
        },
        create: {
          downPaymentCents,
          installmentAmountCents,
          installmentCount: term.installmentCount,
          metadata: { balanceVersion: "leasing-v1" },
          productionLineTemplateId: template.id,
          sortOrder: term.sortOrder,
          status: ContentStatus.ACTIVE,
          termYears: term.termYears,
          totalCostCents,
        },
        update: {
          downPaymentCents,
          installmentAmountCents,
          installmentCount: term.installmentCount,
          metadata: { balanceVersion: "leasing-v1" },
          sortOrder: term.sortOrder,
          status: ContentStatus.ACTIVE,
          totalCostCents,
        },
      });
    }
  }

  console.log(`Leasing offers synced for ${templates.length} active templates.`);
  await prisma.$disconnect();
}

function divideRounded(value: number, divisor: number) {
  return Math.round(value / divisor);
}

void main();
