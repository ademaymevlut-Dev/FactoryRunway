import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

import {
  ContentStatus,
  PrismaClient,
} from "../src/generated/prisma/client";

loadEnv({ path: ".env.local" });
loadEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL bulunamadı.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const supportRoleKeys = [
  "factory_manager",
  "planning_outsource_coordinator",
  "warehouse_supervisor",
  "material_flow_staff",
  "dispatch_staff",
  "maintenance_technician",
  "quality_supervisor",
  "admin_finance_hr",
  "facility_support_staff",
] as const;

type SupportRoleKey = (typeof supportRoleKeys)[number];

type StageSeed = {
  key: string;
  nameTr: string;
  nameEn: string;
  descriptionTr: string;
  descriptionEn: string;
  unlockMessageTr: string;
  unlockMessageEn: string;
  sortOrder: number;
  minProductionLines: number;
  maxProductionLines: number | null;
  fabricWarehouseM2: number;
  accessoryWarehouseM2: number;
  productWarehouseM2: number;
  officeSocialTechnicalM2: number;
  commonAreaBps: number;
  facilityElectricityCents: number;
  staffElectricityExtraCents: number;
  dailySupportMealPerStaffCents: number;
  canteenFixedCents: number;
  overheadBaseCents: number;
  supportOverheadPerStaffCents: number;
  staff: Partial<Record<SupportRoleKey, number>>;
};

const stages: StageSeed[] = [
  {
    key: "micro_workshop",
    nameTr: "Mikro Atölye",
    nameEn: "Micro Workshop",
    descriptionTr: "1–2 aktif üretim hattına sahip küçük atölye yapısı.",
    descriptionEn: "A compact workshop with 1–2 active production lines.",
    unlockMessageTr: "Mikro Atölye kademesi aktif.",
    unlockMessageEn: "Micro Workshop stage is active.",
    sortOrder: 10,
    minProductionLines: 1,
    maxProductionLines: 2,
    fabricWarehouseM2: 70,
    accessoryWarehouseM2: 20,
    productWarehouseM2: 45,
    officeSocialTechnicalM2: 60,
    commonAreaBps: 1200,
    facilityElectricityCents: 25_000,
    staffElectricityExtraCents: 0,
    dailySupportMealPerStaffCents: 220,
    canteenFixedCents: 0,
    overheadBaseCents: 35_000,
    supportOverheadPerStaffCents: 500,
    staff: {
      factory_manager: 1,
      planning_outsource_coordinator: 1,
      warehouse_supervisor: 1,
      material_flow_staff: 1,
      dispatch_staff: 1,
      quality_supervisor: 1,
      admin_finance_hr: 1,
      facility_support_staff: 1,
    },
  },
  {
    key: "small_workshop",
    nameTr: "Küçük Atölye",
    nameEn: "Small Workshop",
    descriptionTr: "3–5 aktif üretim hattına sahip başlangıç fabrikası.",
    descriptionEn: "The starter factory stage with 3–5 active production lines.",
    unlockMessageTr: "Küçük Atölye kademesine ulaştın.",
    unlockMessageEn: "You reached the Small Workshop stage.",
    sortOrder: 20,
    minProductionLines: 3,
    maxProductionLines: 5,
    fabricWarehouseM2: 100,
    accessoryWarehouseM2: 30,
    productWarehouseM2: 70,
    officeSocialTechnicalM2: 120,
    commonAreaBps: 1200,
    facilityElectricityCents: 45_000,
    staffElectricityExtraCents: 10_000,
    dailySupportMealPerStaffCents: 235,
    canteenFixedCents: 12_000,
    overheadBaseCents: 65_000,
    supportOverheadPerStaffCents: 600,
    staff: {
      factory_manager: 1,
      planning_outsource_coordinator: 1,
      warehouse_supervisor: 1,
      material_flow_staff: 1,
      dispatch_staff: 1,
      maintenance_technician: 1,
      quality_supervisor: 1,
      admin_finance_hr: 1,
      facility_support_staff: 1,
    },
  },
  {
    key: "stable_workshop",
    nameTr: "Dengeli Atölye",
    nameEn: "Stable Workshop",
    descriptionTr: "6–9 aktif üretim hattıyla düzenli üretime geçen atölye.",
    descriptionEn: "A stable operation with 6–9 active production lines.",
    unlockMessageTr: "Dengeli Atölye kademesine ulaştın. Destek ekibini büyüt.",
    unlockMessageEn: "You reached Stable Workshop. Expand the support team.",
    sortOrder: 30,
    minProductionLines: 6,
    maxProductionLines: 9,
    fabricWarehouseM2: 160,
    accessoryWarehouseM2: 50,
    productWarehouseM2: 120,
    officeSocialTechnicalM2: 220,
    commonAreaBps: 1200,
    facilityElectricityCents: 80_000,
    staffElectricityExtraCents: 25_000,
    dailySupportMealPerStaffCents: 255,
    canteenFixedCents: 30_000,
    overheadBaseCents: 120_000,
    supportOverheadPerStaffCents: 700,
    staff: {
      factory_manager: 1,
      planning_outsource_coordinator: 1,
      warehouse_supervisor: 1,
      material_flow_staff: 2,
      dispatch_staff: 2,
      maintenance_technician: 1,
      quality_supervisor: 1,
      admin_finance_hr: 1,
      facility_support_staff: 2,
    },
  },
  {
    key: "growing_factory",
    nameTr: "Büyüyen Fabrika",
    nameEn: "Growing Factory",
    descriptionTr: "10–15 aktif üretim hattına sahip büyüyen fabrika.",
    descriptionEn: "A growing factory with 10–15 active production lines.",
    unlockMessageTr: "Büyüyen Fabrika kademesine ulaştın. Organizasyon katmanı genişledi.",
    unlockMessageEn: "You reached Growing Factory. The organization layer expanded.",
    sortOrder: 40,
    minProductionLines: 10,
    maxProductionLines: 15,
    fabricWarehouseM2: 250,
    accessoryWarehouseM2: 80,
    productWarehouseM2: 180,
    officeSocialTechnicalM2: 400,
    commonAreaBps: 1200,
    facilityElectricityCents: 140_000,
    staffElectricityExtraCents: 50_000,
    dailySupportMealPerStaffCents: 275,
    canteenFixedCents: 65_000,
    overheadBaseCents: 220_000,
    supportOverheadPerStaffCents: 900,
    staff: {
      factory_manager: 1,
      planning_outsource_coordinator: 2,
      warehouse_supervisor: 1,
      material_flow_staff: 3,
      dispatch_staff: 3,
      maintenance_technician: 2,
      quality_supervisor: 2,
      admin_finance_hr: 2,
      facility_support_staff: 3,
    },
  },
  {
    key: "mass_factory",
    nameTr: "Seri Üretim Fabrikası",
    nameEn: "Mass Factory",
    descriptionTr: "16–22 aktif üretim hattına sahip seri üretim fabrikası.",
    descriptionEn: "A mass-production factory with 16–22 active production lines.",
    unlockMessageTr: "Seri Üretim Fabrikası kademesine ulaştın.",
    unlockMessageEn: "You reached the Mass Factory stage.",
    sortOrder: 50,
    minProductionLines: 16,
    maxProductionLines: 22,
    fabricWarehouseM2: 360,
    accessoryWarehouseM2: 120,
    productWarehouseM2: 260,
    officeSocialTechnicalM2: 550,
    commonAreaBps: 1200,
    facilityElectricityCents: 190_000,
    staffElectricityExtraCents: 75_000,
    dailySupportMealPerStaffCents: 290,
    canteenFixedCents: 90_000,
    overheadBaseCents: 300_000,
    supportOverheadPerStaffCents: 1_000,
    staff: {
      factory_manager: 1,
      planning_outsource_coordinator: 3,
      warehouse_supervisor: 2,
      material_flow_staff: 5,
      dispatch_staff: 5,
      maintenance_technician: 3,
      quality_supervisor: 3,
      admin_finance_hr: 3,
      facility_support_staff: 4,
    },
  },
  {
    key: "large_factory",
    nameTr: "Büyük Fabrika",
    nameEn: "Large Factory",
    descriptionTr: "23–30 aktif üretim hattına sahip büyük fabrika.",
    descriptionEn: "A large factory with 23–30 active production lines.",
    unlockMessageTr: "Büyük Fabrika kademesine ulaştın.",
    unlockMessageEn: "You reached the Large Factory stage.",
    sortOrder: 60,
    minProductionLines: 23,
    maxProductionLines: 30,
    fabricWarehouseM2: 500,
    accessoryWarehouseM2: 160,
    productWarehouseM2: 350,
    officeSocialTechnicalM2: 650,
    commonAreaBps: 1200,
    facilityElectricityCents: 230_000,
    staffElectricityExtraCents: 100_000,
    dailySupportMealPerStaffCents: 300,
    canteenFixedCents: 120_000,
    overheadBaseCents: 400_000,
    supportOverheadPerStaffCents: 1_100,
    staff: {
      factory_manager: 2,
      planning_outsource_coordinator: 4,
      warehouse_supervisor: 2,
      material_flow_staff: 7,
      dispatch_staff: 7,
      maintenance_technician: 4,
      quality_supervisor: 4,
      admin_finance_hr: 4,
      facility_support_staff: 6,
    },
  },
  {
    key: "enterprise_factory",
    nameTr: "Kurumsal Fabrika",
    nameEn: "Enterprise Factory",
    descriptionTr: "31 veya daha fazla aktif üretim hattına sahip kurumsal fabrika.",
    descriptionEn: "An enterprise factory with 31 or more active production lines.",
    unlockMessageTr: "Kurumsal Fabrika kademesine ulaştın.",
    unlockMessageEn: "You reached the Enterprise Factory stage.",
    sortOrder: 70,
    minProductionLines: 31,
    maxProductionLines: null,
    fabricWarehouseM2: 700,
    accessoryWarehouseM2: 220,
    productWarehouseM2: 500,
    officeSocialTechnicalM2: 900,
    commonAreaBps: 1200,
    facilityElectricityCents: 320_000,
    staffElectricityExtraCents: 150_000,
    dailySupportMealPerStaffCents: 320,
    canteenFixedCents: 180_000,
    overheadBaseCents: 600_000,
    supportOverheadPerStaffCents: 1_200,
    staff: {
      factory_manager: 2,
      planning_outsource_coordinator: 6,
      warehouse_supervisor: 3,
      material_flow_staff: 10,
      dispatch_staff: 10,
      maintenance_technician: 6,
      quality_supervisor: 6,
      admin_finance_hr: 6,
      facility_support_staff: 8,
    },
  },
];

function assertStageRanges() {
  for (const [index, stage] of stages.entries()) {
    if (stage.minProductionLines < 1) {
      throw new Error(`${stage.key}: minProductionLines en az 1 olmalı.`);
    }

    if (
      stage.maxProductionLines !== null &&
      stage.maxProductionLines < stage.minProductionLines
    ) {
      throw new Error(`${stage.key}: line aralığı geçersiz.`);
    }

    const nextStage = stages[index + 1];
    if (
      nextStage &&
      stage.maxProductionLines !== null &&
      stage.maxProductionLines + 1 !== nextStage.minProductionLines
    ) {
      throw new Error(
        `${stage.key} ile ${nextStage.key} arasında line aralığı boşluğu var.`,
      );
    }
  }
}

async function main() {
  assertStageRanges();

  const sector = await prisma.sector.findUnique({
    where: { key: "textile" },
    select: { id: true },
  });

  if (!sector) {
    throw new Error(
      '"textile" sektör kaydı bulunamadı. Önce textile sektörünü oluştur.',
    );
  }

  const staffRoles = await prisma.staffRole.findMany({
    where: {
      sectorId: sector.id,
      key: { in: [...supportRoleKeys] },
      status: ContentStatus.ACTIVE,
    },
    select: { id: true, key: true },
  });
  const staffRoleIds = new Map(
    staffRoles.map((staffRole) => [staffRole.key, staffRole.id]),
  );
  const missingStaffRoleKeys = supportRoleKeys.filter(
    (key) => !staffRoleIds.has(key),
  );

  if (missingStaffRoleKeys.length) {
    throw new Error(
      `Eksik personel rolleri: ${missingStaffRoleKeys.join(", ")}. Önce seed-staff-roles.ts çalıştırılmalı.`,
    );
  }

  await prisma.sectorOperatingCostConfig.upsert({
    where: { sectorId: sector.id },
    update: {
      rentPerM2Cents: 200,
      monthlyWorkDays: 22,
      dailyMealPerDirectStaffCents: 235,
      directStaffOverheadPerStaffCents: 600,
      lineElectricityIdleMultiplierBps: 5500,
      lineElectricityUtilizationWeightBps: 4500,
      metadata: {
        seedSource: "14-ProductionLine_Cost_Config",
        balanceVersion: 1,
      },
    },
    create: {
      sectorId: sector.id,
      rentPerM2Cents: 200,
      monthlyWorkDays: 22,
      dailyMealPerDirectStaffCents: 235,
      directStaffOverheadPerStaffCents: 600,
      lineElectricityIdleMultiplierBps: 5500,
      lineElectricityUtilizationWeightBps: 4500,
      metadata: {
        seedSource: "14-ProductionLine_Cost_Config",
        balanceVersion: 1,
      },
    },
  });

  let requirementCount = 0;

  for (const stage of stages) {
    const operatingStage = await prisma.sectorFactoryOperatingStage.upsert({
      where: {
        sectorId_key: {
          sectorId: sector.id,
          key: stage.key,
        },
      },
      update: {
        sortOrder: stage.sortOrder,
        minProductionLines: stage.minProductionLines,
        maxProductionLines: stage.maxProductionLines,
        fabricWarehouseM2: stage.fabricWarehouseM2,
        accessoryWarehouseM2: stage.accessoryWarehouseM2,
        productWarehouseM2: stage.productWarehouseM2,
        officeSocialTechnicalM2: stage.officeSocialTechnicalM2,
        commonAreaBps: stage.commonAreaBps,
        facilityElectricityCents: stage.facilityElectricityCents,
        staffElectricityExtraCents: stage.staffElectricityExtraCents,
        dailySupportMealPerStaffCents:
          stage.dailySupportMealPerStaffCents,
        canteenFixedCents: stage.canteenFixedCents,
        overheadBaseCents: stage.overheadBaseCents,
        supportOverheadPerStaffCents:
          stage.supportOverheadPerStaffCents,
        status: ContentStatus.ACTIVE,
        metadata: {
          seedSource: "15-Factory_Operating_Stage_and_Shared_Cost",
          balanceVersion: 1,
          testingBaseline: true,
        },
        translations: {
          deleteMany: {},
          create: [
            {
              locale: "tr",
              name: stage.nameTr,
              description: stage.descriptionTr,
              unlockMessage: stage.unlockMessageTr,
            },
            {
              locale: "en",
              name: stage.nameEn,
              description: stage.descriptionEn,
              unlockMessage: stage.unlockMessageEn,
            },
          ],
        },
      },
      create: {
        sectorId: sector.id,
        key: stage.key,
        sortOrder: stage.sortOrder,
        minProductionLines: stage.minProductionLines,
        maxProductionLines: stage.maxProductionLines,
        fabricWarehouseM2: stage.fabricWarehouseM2,
        accessoryWarehouseM2: stage.accessoryWarehouseM2,
        productWarehouseM2: stage.productWarehouseM2,
        officeSocialTechnicalM2: stage.officeSocialTechnicalM2,
        commonAreaBps: stage.commonAreaBps,
        facilityElectricityCents: stage.facilityElectricityCents,
        staffElectricityExtraCents: stage.staffElectricityExtraCents,
        dailySupportMealPerStaffCents:
          stage.dailySupportMealPerStaffCents,
        canteenFixedCents: stage.canteenFixedCents,
        overheadBaseCents: stage.overheadBaseCents,
        supportOverheadPerStaffCents:
          stage.supportOverheadPerStaffCents,
        status: ContentStatus.ACTIVE,
        metadata: {
          seedSource: "15-Factory_Operating_Stage_and_Shared_Cost",
          balanceVersion: 1,
          testingBaseline: true,
        },
        translations: {
          create: [
            {
              locale: "tr",
              name: stage.nameTr,
              description: stage.descriptionTr,
              unlockMessage: stage.unlockMessageTr,
            },
            {
              locale: "en",
              name: stage.nameEn,
              description: stage.descriptionEn,
              unlockMessage: stage.unlockMessageEn,
            },
          ],
        },
      },
      select: { id: true },
    });

    await prisma.sectorFactoryOperatingStageStaffRequirement.deleteMany({
      where: {
        sectorFactoryOperatingStageId: operatingStage.id,
      },
    });

    const requirements = Object.entries(stage.staff).map(
      ([staffRoleKey, requiredQuantity], index) => {
        const staffRoleId = staffRoleIds.get(staffRoleKey);
        if (!staffRoleId || requiredQuantity === undefined) {
          throw new Error(
            `${stage.key}: ${staffRoleKey} personel rolü çözümlenemedi.`,
          );
        }

        return {
          sectorFactoryOperatingStageId: operatingStage.id,
          staffRoleId,
          requiredQuantity,
          sortOrder: (index + 1) * 10,
          metadata: {
            seedSource: "15-Factory_Operating_Stage_and_Shared_Cost",
            balanceVersion: 1,
          },
        };
      },
    );

    await prisma.sectorFactoryOperatingStageStaffRequirement.createMany({
      data: requirements,
    });
    requirementCount += requirements.length;
  }

  console.log(
    `${stages.length} operating stage ve ${requirementCount} personel gereksinimi eklendi veya güncellendi.`,
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
