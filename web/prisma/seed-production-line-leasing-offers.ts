import "dotenv/config";

import { ContentStatus } from "../src/generated/prisma/client";
import { syncProductionLineLeasingOffers } from "../src/features/investment/services/production-line-leasing-pricing";
import { getPrisma } from "../src/lib/db";

async function main() {
  const prisma = getPrisma();
  const templates = await prisma.productionLineTemplate.findMany({
    where: { status: ContentStatus.ACTIVE },
    select: { id: true, purchaseCostCents: true },
  });

  for (const template of templates) {
    await syncProductionLineLeasingOffers(prisma, {
      activateExistingOffers: true,
      productionLineTemplateId: template.id,
      purchaseCostCents: template.purchaseCostCents,
    });
  }

  console.log(`Leasing offers synced for ${templates.length} active templates.`);
  await prisma.$disconnect();
}

void main();
