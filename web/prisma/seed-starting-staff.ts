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

const starterLineRequirements = [
  {
    templateKey: "cutting_workshop",
    expectedIdealStaff: 6,
    roles: [
      { roleKey: "cutting_operator", quantity: 1 },
      { roleKey: "fabric_spreading_staff", quantity: 2 },
      { roleKey: "marker_staff", quantity: 1 },
      { roleKey: "bundling_staff", quantity: 1 },
      { roleKey: "cutting_qc_staff", quantity: 1 },
    ],
  },
  {
    templateKey: "sewing_workshop",
    expectedIdealStaff: 15,
    roles: [
      { roleKey: "sewing_line_leader", quantity: 1 },
      { roleKey: "sewing_operator", quantity: 12 },
      { roleKey: "sewing_helper", quantity: 1 },
      { roleKey: "inline_qc_staff", quantity: 1 },
    ],
  },
  {
    templateKey: "ironing_packing_workshop",
    expectedIdealStaff: 8,
    roles: [
      { roleKey: "ironing_operator", quantity: 3 },
      { roleKey: "final_qc_staff", quantity: 2 },
      { roleKey: "packing_staff", quantity: 2 },
      { roleKey: "carton_flow_staff", quantity: 1 },
    ],
  },
] as const;

const supportRequirements = [
  { roleKey: "factory_manager", quantity: 1 },
  { roleKey: "planning_outsource_coordinator", quantity: 1 },
  { roleKey: "warehouse_supervisor", quantity: 1 },
  { roleKey: "material_flow_staff", quantity: 1 },
  { roleKey: "dispatch_staff", quantity: 1 },
  { roleKey: "maintenance_technician", quantity: 1 },
  { roleKey: "quality_supervisor", quantity: 1 },
  { roleKey: "admin_finance_hr", quantity: 1 },
  { roleKey: "facility_support_staff", quantity: 1 },
] as const;

function assertSeedData() {
  const directTotal = starterLineRequirements.reduce(
    (total, line) =>
      total +
      line.roles.reduce(
        (lineTotal, requirement) => lineTotal + requirement.quantity,
        0,
      ),
    0,
  );
  const supportTotal = supportRequirements.reduce(
    (total, requirement) => total + requirement.quantity,
    0,
  );

  if (directTotal !== 29 || supportTotal !== 9) {
    throw new Error(
      `Başlangıç kadrosu toplamı geçersiz: ${directTotal} direkt + ${supportTotal} destek.`,
    );
  }
  for (const line of starterLineRequirements) {
    const requirementTotal = line.roles.reduce(
      (total, requirement) => total + requirement.quantity,
      0,
    );
    if (requirementTotal !== line.expectedIdealStaff) {
      throw new Error(
        `${line.templateKey}: rol toplamı ideal personel sayısıyla eşleşmiyor.`,
      );
    }
  }
}

async function main() {
  assertSeedData();

  if (process.argv.includes("--validate-only")) {
    console.log(
      "Doğrulama başarılı: 29 doğrudan üretim + 9 destek = 38 başlangıç personeli.",
    );
    return;
  }

  const sector = await prisma.sector.findUnique({
    where: { key: "textile" },
    select: { id: true },
  });
  if (!sector) {
    throw new Error(
      '"textile" sektörü bulunamadı. Önce Admin > Sektörler kaydını oluştur.',
    );
  }

  const templateKeys = starterLineRequirements.map(
    (line) => line.templateKey,
  );
  const roleKeys = [
    ...new Set([
      ...starterLineRequirements.flatMap((line) =>
        line.roles.map((requirement) => requirement.roleKey),
      ),
      ...supportRequirements.map((requirement) => requirement.roleKey),
    ]),
  ];
  const [templates, roles, startingStage] = await Promise.all([
    prisma.productionLineTemplate.findMany({
      where: {
        sectorId: sector.id,
        key: { in: templateKeys },
      },
      select: { id: true, key: true, idealStaff: true },
    }),
    prisma.staffRole.findMany({
      where: {
        sectorId: sector.id,
        key: { in: roleKeys },
      },
      select: { id: true, key: true },
    }),
    prisma.sectorFactoryOperatingStage.findUnique({
      where: {
        sectorId_key: {
          sectorId: sector.id,
          key: "small_workshop",
        },
      },
      select: { id: true },
    }),
  ]);

  const templateByKey = new Map(
    templates.map((template) => [template.key, template]),
  );
  const roleIdByKey = new Map(roles.map((role) => [role.key, role.id]));
  const missingTemplateKeys = templateKeys.filter(
    (key) => !templateByKey.has(key),
  );
  const missingRoleKeys = roleKeys.filter((key) => !roleIdByKey.has(key));

  if (missingTemplateKeys.length) {
    throw new Error(
      `Eksik starter hat şablonları: ${missingTemplateKeys.join(", ")}`,
    );
  }
  if (missingRoleKeys.length) {
    throw new Error(
      `Eksik personel rolleri: ${missingRoleKeys.join(", ")}. Önce seed-staff-roles.ts çalıştırılmalı.`,
    );
  }
  if (!startingStage) {
    throw new Error(
      "small_workshop aşaması bulunamadı. Önce seed-factory-operating-stages.ts çalıştırılmalı.",
    );
  }

  let directRequirementCount = 0;
  for (const line of starterLineRequirements) {
    const template = templateByKey.get(line.templateKey);
    if (!template) throw new Error(`${line.templateKey} çözümlenemedi.`);
    if (template.idealStaff !== line.expectedIdealStaff) {
      throw new Error(
        `${line.templateKey}: idealStaff=${template.idealStaff}, beklenen=${line.expectedIdealStaff}. Önce üretim hattı tanımını düzelt.`,
      );
    }

    for (const [index, requirement] of line.roles.entries()) {
      const staffRoleId = roleIdByKey.get(requirement.roleKey);
      if (!staffRoleId) {
        throw new Error(`${requirement.roleKey} rolü çözümlenemedi.`);
      }
      await prisma.productionLineTemplateStaffRequirement.upsert({
        where: {
          productionLineTemplateId_staffRoleId: {
            productionLineTemplateId: template.id,
            staffRoleId,
          },
        },
        update: {
          requiredQuantity: requirement.quantity,
          sortOrder: (index + 1) * 10,
          metadata: {
            seedSource: "13-Staff_and_Organization",
            startingStaffBaseline: true,
          },
        },
        create: {
          productionLineTemplateId: template.id,
          staffRoleId,
          requiredQuantity: requirement.quantity,
          sortOrder: (index + 1) * 10,
          metadata: {
            seedSource: "13-Staff_and_Organization",
            startingStaffBaseline: true,
          },
        },
      });
      directRequirementCount += 1;
    }
  }

  for (const [index, requirement] of supportRequirements.entries()) {
    const staffRoleId = roleIdByKey.get(requirement.roleKey);
    if (!staffRoleId) {
      throw new Error(`${requirement.roleKey} rolü çözümlenemedi.`);
    }
    await prisma.sectorFactoryOperatingStageStaffRequirement.upsert({
      where: {
        sectorFactoryOperatingStageId_staffRoleId: {
          sectorFactoryOperatingStageId: startingStage.id,
          staffRoleId,
        },
      },
      update: {
        requiredQuantity: requirement.quantity,
        sortOrder: (index + 1) * 10,
        metadata: {
          seedSource: "13-Staff_and_Organization",
          startingStaffBaseline: true,
        },
      },
      create: {
        sectorFactoryOperatingStageId: startingStage.id,
        staffRoleId,
        requiredQuantity: requirement.quantity,
        sortOrder: (index + 1) * 10,
        metadata: {
          seedSource: "13-Staff_and_Organization",
          startingStaffBaseline: true,
        },
      },
    });
  }

  console.log(
    `${directRequirementCount} hat rol gereksinimi ve ${supportRequirements.length} small_workshop destek gereksinimi eklendi veya güncellendi.`,
  );
  console.log("Başlangıç toplamı: 29 doğrudan + 9 destek = 38 personel.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
