import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

import { DEPARTMENT_GROUP_SEMANTIC_KEYS } from "../src/features/tasks/department-group-semantics";
import { PrismaClient } from "../src/generated/prisma/client";

loadEnv({ path: ".env.local" });
loadEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL bulunamadı.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const semanticAssignments = [
  {
    sectorKey: "textile",
    departmentGroupKeys: ["pre_sewing", "post_sewing"],
    semanticKey: DEPARTMENT_GROUP_SEMANTIC_KEYS.VALUE_ADDED_PROCESS,
  },
] as const;

async function main() {
  let updatedGroupCount = 0;

  for (const assignment of semanticAssignments) {
    const sector = await prisma.sector.findUnique({
      where: { key: assignment.sectorKey },
      select: { id: true },
    });

    if (!sector) continue;

    const result = await prisma.departmentGroup.updateMany({
      where: {
        key: { in: [...assignment.departmentGroupKeys] },
        sectorId: sector.id,
      },
      data: { semanticKey: assignment.semanticKey },
    });

    updatedGroupCount += result.count;
  }

  console.log(
    `${updatedGroupCount} departman grubu sektörler arası semantik görev sınıfına bağlandı.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
