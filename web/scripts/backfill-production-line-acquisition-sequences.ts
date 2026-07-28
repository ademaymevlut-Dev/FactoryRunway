import "dotenv/config";

import { Prisma } from "../src/generated/prisma/client";
import { getPrisma } from "../src/lib/db";

const STARTER_TEMPLATE_ORDER = new Map([
  ["cutting_workshop", 1],
  ["sewing_workshop", 2],
  ["ironing_packing_workshop", 3],
]);

async function main() {
  const prisma = getPrisma();
  const factories = await prisma.factory.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, name: true },
  });
  let assignedLineCount = 0;
  let skippedLineCount = 0;

  for (const factory of factories) {
    const result = await prisma.$transaction(
      async (tx) => {
        const lines = await tx.factoryProductionLine.findMany({
          where: { factoryId: factory.id },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: {
            acquisitionSequence: true,
            acquisitionType: true,
            createdAt: true,
            id: true,
            productionLineTemplate: { select: { key: true } },
          },
        });
        const usedSequences = new Set(
          lines
            .map((line) => line.acquisitionSequence)
            .filter((value): value is number => value !== null),
        );
        const missingLines = lines
          .filter((line) => line.acquisitionSequence === null)
          .sort((first, second) => {
            const firstStarterOrder =
              first.acquisitionType === "STARTER"
                ? STARTER_TEMPLATE_ORDER.get(
                    first.productionLineTemplate.key,
                  ) ?? Number.MAX_SAFE_INTEGER
                : Number.MAX_SAFE_INTEGER;
            const secondStarterOrder =
              second.acquisitionType === "STARTER"
                ? STARTER_TEMPLATE_ORDER.get(
                    second.productionLineTemplate.key,
                  ) ?? Number.MAX_SAFE_INTEGER
                : Number.MAX_SAFE_INTEGER;

            return (
              firstStarterOrder - secondStarterOrder ||
              first.createdAt.getTime() - second.createdAt.getTime() ||
              first.id.localeCompare(second.id)
            );
          });
        let nextAvailableSequence = 1;

        for (const line of missingLines) {
          while (usedSequences.has(nextAvailableSequence)) {
            nextAvailableSequence += 1;
          }

          await tx.factoryProductionLine.update({
            where: { id: line.id },
            data: { acquisitionSequence: nextAvailableSequence },
          });
          usedSequences.add(nextAvailableSequence);
          nextAvailableSequence += 1;
        }

        const maximumSequence =
          usedSequences.size > 0 ? Math.max(...usedSequences) : 0;

        await tx.factory.update({
          where: { id: factory.id },
          data: {
            nextProductionLineAcquisitionSequence: maximumSequence + 1,
          },
        });

        return {
          assigned: missingLines.length,
          skipped: lines.length - missingLines.length,
          nextSequence: maximumSequence + 1,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 30_000,
      },
    );

    assignedLineCount += result.assigned;
    skippedLineCount += result.skipped;
    console.log(
      `${factory.name}: assigned=${result.assigned}, skipped=${result.skipped}, next=${result.nextSequence}`,
    );
  }

  console.log(
    `Backfill complete. factories=${factories.length}, assigned=${assignedLineCount}, skipped=${skippedLineCount}`,
  );
  await prisma.$disconnect();
}

void main();
