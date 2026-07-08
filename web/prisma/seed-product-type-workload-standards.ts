import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

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

const coreStandards = {
  tank_top: { cutting: 8, sewing: 12, ironing_packing: 8 },
  t_shirt: { cutting: 10, sewing: 20, ironing_packing: 10 },
  sweatshirt: { cutting: 16, sewing: 40, ironing_packing: 18 },
  shirt: { cutting: 18, sewing: 80, ironing_packing: 25 },
  blouse: { cutting: 18, sewing: 80, ironing_packing: 25 },
  jacket: { cutting: 40, sewing: 240, ironing_packing: 60 },
  blazer: { cutting: 45, sewing: 280, ironing_packing: 70 },
  coat: { cutting: 50, sewing: 300, ironing_packing: 75 },
  pants: { cutting: 18, sewing: 80, ironing_packing: 25 },
  skirt: { cutting: 18, sewing: 80, ironing_packing: 20 },
  shorts: { cutting: 14, sewing: 45, ironing_packing: 15 },
  mini_dress: { cutting: 20, sewing: 80, ironing_packing: 28 },
  midi_dress: { cutting: 22, sewing: 100, ironing_packing: 35 },
  long_dress: { cutting: 26, sewing: 130, ironing_packing: 42 },
} as const;

const optionalProcessStandards = {
  embroidery: 8,
  printing: 10,
  washing: 15,
  dyeing: 15,
} as const;

async function main() {
  const sector = await prisma.sector.findUnique({
    where: { key: "textile" },
    select: { id: true },
  });

  if (!sector) {
    throw new Error('"textile" sektör kaydı bulunamadı.');
  }

  const productTypeKeys = Object.keys(coreStandards);
  const departmentKeys = [
    "cutting",
    "sewing",
    "ironing_packing",
    ...Object.keys(optionalProcessStandards),
  ];
  const [productTypes, departments] = await Promise.all([
    prisma.productType.findMany({
      where: {
        sectorId: sector.id,
        key: { in: productTypeKeys },
      },
      select: { id: true, key: true },
    }),
    prisma.department.findMany({
      where: {
        sectorId: sector.id,
        kind: "PRODUCTION",
        key: { in: departmentKeys },
      },
      select: { id: true, key: true },
    }),
  ]);

  const productTypeIds = new Map(
    productTypes.map((productType) => [productType.key, productType.id]),
  );
  const departmentIds = new Map(
    departments.map((department) => [department.key, department.id]),
  );
  const missingProductTypes = productTypeKeys.filter(
    (key) => !productTypeIds.has(key),
  );
  const missingDepartments = departmentKeys.filter(
    (key) => !departmentIds.has(key),
  );

  if (missingProductTypes.length) {
    throw new Error(
      `Eksik product type kayıtları: ${missingProductTypes.join(", ")}`,
    );
  }

  if (missingDepartments.length) {
    throw new Error(
      `Eksik production departmanları: ${missingDepartments.join(", ")}`,
    );
  }

  let upsertCount = 0;

  for (const [productTypeKey, coreDepartmentStandards] of Object.entries(
    coreStandards,
  )) {
    const productTypeId = productTypeIds.get(productTypeKey);
    if (!productTypeId) continue;

    const standards = {
      ...coreDepartmentStandards,
      ...optionalProcessStandards,
    };

    for (const [departmentKey, workloadPointsPerUnit] of Object.entries(
      standards,
    )) {
      const departmentId = departmentIds.get(departmentKey);
      if (!departmentId) continue;

      await prisma.productTypeWorkloadStandard.upsert({
        where: {
          productTypeId_departmentId: {
            productTypeId,
            departmentId,
          },
        },
        update: {
          workloadPointsPerUnit,
          metadata: {
            seedSource: "03-Production_lines",
            standardGroup:
              departmentKey in optionalProcessStandards
                ? "OPTIONAL_PROCESS"
                : "CORE_PRODUCTION",
          },
        },
        create: {
          productTypeId,
          departmentId,
          workloadPointsPerUnit,
          metadata: {
            seedSource: "03-Production_lines",
            standardGroup:
              departmentKey in optionalProcessStandards
                ? "OPTIONAL_PROCESS"
                : "CORE_PRODUCTION",
          },
        },
      });

      upsertCount += 1;
    }
  }

  console.log(
    `${upsertCount} product type workload standardı eklendi veya güncellendi.`,
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
