import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

import {
  ContentStatus,
  PrismaClient,
  StaffType,
  SupportCategory,
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

const departmentKeyCorrections = [
  { current: "accecories_warehouse", canonical: "accessory_warehouse" },
  { current: "print", canonical: "printing" },
  { current: "embrodery", canonical: "embroidery" },
  { current: "dye", canonical: "dyeing" },
  { current: "iron_packing", canonical: "ironing_packing" },
] as const;

type StaffRoleSeed = {
  key: string;
  nameTr: string;
  nameEn: string;
  staffType: StaffType;
  departmentKey: string | null;
  supportCategories: SupportCategory[];
  monthlySalaryCents: number;
  starterRole: boolean;
};

const directRoles: StaffRoleSeed[] = [
  {
    key: "cutting_operator",
    nameTr: "Kesim Operatörü",
    nameEn: "Cutting Operator",
    staffType: StaffType.DIRECT_PRODUCTION,
    departmentKey: "cutting",
    supportCategories: [],
    monthlySalaryCents: 130000,
    starterRole: true,
  },
  {
    key: "fabric_spreading_staff",
    nameTr: "Kumaş Serim Personeli",
    nameEn: "Fabric Spreading Staff",
    staffType: StaffType.DIRECT_PRODUCTION,
    departmentKey: "cutting",
    supportCategories: [],
    monthlySalaryCents: 85000,
    starterRole: true,
  },
  {
    key: "marker_staff",
    nameTr: "Marker / Şablon Personeli",
    nameEn: "Marker Staff",
    staffType: StaffType.DIRECT_PRODUCTION,
    departmentKey: "cutting",
    supportCategories: [],
    monthlySalaryCents: 110000,
    starterRole: true,
  },
  {
    key: "bundling_staff",
    nameTr: "Numaralama / Bundle Personeli",
    nameEn: "Bundling Staff",
    staffType: StaffType.DIRECT_PRODUCTION,
    departmentKey: "cutting",
    supportCategories: [],
    monthlySalaryCents: 75000,
    starterRole: true,
  },
  {
    key: "cutting_qc_staff",
    nameTr: "Kesim Kalite Personeli",
    nameEn: "Cutting QC Staff",
    staffType: StaffType.DIRECT_PRODUCTION,
    departmentKey: "cutting",
    supportCategories: [],
    monthlySalaryCents: 95000,
    starterRole: true,
  },
  {
    key: "sewing_line_leader",
    nameTr: "Dikim Hat Sorumlusu",
    nameEn: "Sewing Line Leader",
    staffType: StaffType.DIRECT_PRODUCTION,
    departmentKey: "sewing",
    supportCategories: [],
    monthlySalaryCents: 130000,
    starterRole: true,
  },
  {
    key: "sewing_operator",
    nameTr: "Dikim Operatörü",
    nameEn: "Sewing Operator",
    staffType: StaffType.DIRECT_PRODUCTION,
    departmentKey: "sewing",
    supportCategories: [],
    monthlySalaryCents: 90000,
    starterRole: true,
  },
  {
    key: "sewing_helper",
    nameTr: "Dikim Yardımcı Personeli",
    nameEn: "Sewing Helper",
    staffType: StaffType.DIRECT_PRODUCTION,
    departmentKey: "sewing",
    supportCategories: [],
    monthlySalaryCents: 75000,
    starterRole: true,
  },
  {
    key: "inline_qc_staff",
    nameTr: "Hat İçi Kalite Personeli",
    nameEn: "Inline QC Staff",
    staffType: StaffType.DIRECT_PRODUCTION,
    departmentKey: "sewing",
    supportCategories: [],
    monthlySalaryCents: 95000,
    starterRole: true,
  },
  {
    key: "ironing_operator",
    nameTr: "Ütü / Press Operatörü",
    nameEn: "Ironing Operator",
    staffType: StaffType.DIRECT_PRODUCTION,
    departmentKey: "ironing_packing",
    supportCategories: [],
    monthlySalaryCents: 85000,
    starterRole: true,
  },
  {
    key: "final_qc_staff",
    nameTr: "Son Kontrol Personeli",
    nameEn: "Final QC Staff",
    staffType: StaffType.DIRECT_PRODUCTION,
    departmentKey: "ironing_packing",
    supportCategories: [],
    monthlySalaryCents: 95000,
    starterRole: true,
  },
  {
    key: "packing_staff",
    nameTr: "Katlama / Paket Personeli",
    nameEn: "Packing Staff",
    staffType: StaffType.DIRECT_PRODUCTION,
    departmentKey: "ironing_packing",
    supportCategories: [],
    monthlySalaryCents: 75000,
    starterRole: true,
  },
  {
    key: "carton_flow_staff",
    nameTr: "Koli / Akış Personeli",
    nameEn: "Carton Flow Staff",
    staffType: StaffType.DIRECT_PRODUCTION,
    departmentKey: "ironing_packing",
    supportCategories: [],
    monthlySalaryCents: 75000,
    starterRole: true,
  },
  {
    key: "embroidery_operator",
    nameTr: "Nakış Operatörü",
    nameEn: "Embroidery Operator",
    staffType: StaffType.DIRECT_PRODUCTION,
    departmentKey: "embroidery",
    supportCategories: [],
    monthlySalaryCents: 100000,
    starterRole: false,
  },
  {
    key: "embroidery_helper",
    nameTr: "Nakış Yardımcı Personeli",
    nameEn: "Embroidery Helper",
    staffType: StaffType.DIRECT_PRODUCTION,
    departmentKey: "embroidery",
    supportCategories: [],
    monthlySalaryCents: 75000,
    starterRole: false,
  },
  {
    key: "printing_operator",
    nameTr: "Baskı Operatörü",
    nameEn: "Printing Operator",
    staffType: StaffType.DIRECT_PRODUCTION,
    departmentKey: "printing",
    supportCategories: [],
    monthlySalaryCents: 105000,
    starterRole: false,
  },
  {
    key: "printing_helper",
    nameTr: "Baskı Yardımcı Personeli",
    nameEn: "Printing Helper",
    staffType: StaffType.DIRECT_PRODUCTION,
    departmentKey: "printing",
    supportCategories: [],
    monthlySalaryCents: 80000,
    starterRole: false,
  },
  {
    key: "washing_operator",
    nameTr: "Yıkama Operatörü",
    nameEn: "Washing Operator",
    staffType: StaffType.DIRECT_PRODUCTION,
    departmentKey: "washing",
    supportCategories: [],
    monthlySalaryCents: 105000,
    starterRole: false,
  },
  {
    key: "washing_helper",
    nameTr: "Yıkama Yardımcı Personeli",
    nameEn: "Washing Helper",
    staffType: StaffType.DIRECT_PRODUCTION,
    departmentKey: "washing",
    supportCategories: [],
    monthlySalaryCents: 85000,
    starterRole: false,
  },
  {
    key: "dyeing_operator",
    nameTr: "Boyama Operatörü",
    nameEn: "Dyeing Operator",
    staffType: StaffType.DIRECT_PRODUCTION,
    departmentKey: "dyeing",
    supportCategories: [],
    monthlySalaryCents: 120000,
    starterRole: false,
  },
  {
    key: "dyeing_helper",
    nameTr: "Boyama Yardımcı Personeli",
    nameEn: "Dyeing Helper",
    staffType: StaffType.DIRECT_PRODUCTION,
    departmentKey: "dyeing",
    supportCategories: [],
    monthlySalaryCents: 90000,
    starterRole: false,
  },
];

const supportRoles: StaffRoleSeed[] = [
  {
    key: "factory_manager",
    nameTr: "Fabrika / Üretim Müdürü",
    nameEn: "Factory / Production Manager",
    staffType: StaffType.MANAGEMENT,
    departmentKey: null,
    supportCategories: [SupportCategory.MANAGEMENT],
    monthlySalaryCents: 220000,
    starterRole: true,
  },
  {
    key: "planning_outsource_coordinator",
    nameTr: "Planlama + Fason Takip Sorumlusu",
    nameEn: "Planning + Outsource Coordinator",
    staffType: StaffType.SUPPORT,
    departmentKey: null,
    supportCategories: [
      SupportCategory.PLANNING,
      SupportCategory.OUTSOURCE_FOLLOWUP,
    ],
    monthlySalaryCents: 140000,
    starterRole: true,
  },
  {
    key: "warehouse_supervisor",
    nameTr: "Depo Sorumlusu",
    nameEn: "Warehouse Supervisor",
    staffType: StaffType.SUPPORT,
    departmentKey: null,
    supportCategories: [SupportCategory.WAREHOUSE],
    monthlySalaryCents: 110000,
    starterRole: true,
  },
  {
    key: "material_flow_staff",
    nameTr: "Malzeme Akış Personeli",
    nameEn: "Material Flow Staff",
    staffType: StaffType.SUPPORT,
    departmentKey: null,
    supportCategories: [SupportCategory.WAREHOUSE],
    monthlySalaryCents: 80000,
    starterRole: true,
  },
  {
    key: "dispatch_staff",
    nameTr: "Ürün Deposu / Sevkiyat Personeli",
    nameEn: "Product Warehouse / Dispatch Staff",
    staffType: StaffType.SUPPORT,
    departmentKey: null,
    supportCategories: [SupportCategory.LOGISTICS],
    monthlySalaryCents: 85000,
    starterRole: true,
  },
  {
    key: "maintenance_technician",
    nameTr: "Bakım Teknisyeni",
    nameEn: "Maintenance Technician",
    staffType: StaffType.SUPPORT,
    departmentKey: null,
    supportCategories: [SupportCategory.MAINTENANCE],
    monthlySalaryCents: 130000,
    starterRole: true,
  },
  {
    key: "quality_supervisor",
    nameTr: "Kalite Sorumlusu",
    nameEn: "Quality Supervisor",
    staffType: StaffType.SUPPORT,
    departmentKey: null,
    supportCategories: [SupportCategory.QUALITY],
    monthlySalaryCents: 130000,
    starterRole: true,
  },
  {
    key: "admin_finance_hr",
    nameTr: "Admin / Finans / HR Personeli",
    nameEn: "Admin / Finance / HR Staff",
    staffType: StaffType.SUPPORT,
    departmentKey: null,
    supportCategories: [
      SupportCategory.FINANCE,
      SupportCategory.HR_ADMIN,
    ],
    monthlySalaryCents: 120000,
    starterRole: true,
  },
  {
    key: "facility_support_staff",
    nameTr: "Temizlik / Tesis Destek Personeli",
    nameEn: "Facility Support Staff",
    staffType: StaffType.SUPPORT,
    departmentKey: null,
    supportCategories: [SupportCategory.FACILITY],
    monthlySalaryCents: 70000,
    starterRole: true,
  },
];

const staffRoles = [...directRoles, ...supportRoles];

async function normalizeDepartmentKeys(sectorId: string) {
  for (const correction of departmentKeyCorrections) {
    const matches = await prisma.department.findMany({
      where: {
        sectorId,
        key: { in: [correction.current, correction.canonical] },
      },
      select: { id: true, key: true },
    });
    const current = matches.find(
      (department) => department.key === correction.current,
    );
    const canonical = matches.find(
      (department) => department.key === correction.canonical,
    );

    if (current && canonical && current.id !== canonical.id) {
      throw new Error(
        `"${correction.current}" ve "${correction.canonical}" departmanları birlikte mevcut. Otomatik birleştirme güvenli değil.`,
      );
    }

    if (current && !canonical) {
      await prisma.department.update({
        where: { id: current.id },
        data: { key: correction.canonical },
      });
      console.log(
        `Departman anahtarı düzeltildi: ${correction.current} -> ${correction.canonical}`,
      );
    }
  }
}

async function main() {
  const sector = await prisma.sector.findUnique({
    where: { key: "textile" },
    select: { id: true },
  });

  if (!sector) {
    throw new Error(
      '"textile" sektör kaydı bulunamadı. Önce Admin > Sektörler ekranından textile sektörünü oluştur.',
    );
  }

  await normalizeDepartmentKeys(sector.id);

  const requiredDepartmentKeys = [
    ...new Set(
      directRoles
        .map((role) => role.departmentKey)
        .filter((key): key is string => key !== null),
    ),
  ];
  const departments = await prisma.department.findMany({
    where: {
      sectorId: sector.id,
      key: { in: requiredDepartmentKeys },
    },
    select: { id: true, key: true },
  });
  const departmentIds = new Map(
    departments.map((department) => [department.key, department.id]),
  );
  const missingDepartmentKeys = requiredDepartmentKeys.filter(
    (key) => !departmentIds.has(key),
  );

  if (missingDepartmentKeys.length) {
    throw new Error(
      `Personel rolleri için gerekli departmanlar bulunamadı: ${missingDepartmentKeys.join(", ")}`,
    );
  }

  for (const [index, role] of staffRoles.entries()) {
    const departmentId = role.departmentKey
      ? departmentIds.get(role.departmentKey)
      : null;

    await prisma.staffRole.upsert({
      where: {
        sectorId_key: {
          sectorId: sector.id,
          key: role.key,
        },
      },
      update: {
        departmentId,
        staffType: role.staffType,
        monthlySalaryCents: role.monthlySalaryCents,
        sortOrder: (index + 1) * 10,
        status: ContentStatus.ACTIVE,
        metadata: {
          seedSource: "13-Staff_and_Organization",
          starterRole: role.starterRole,
          assignmentScope:
            role.staffType === StaffType.DIRECT_PRODUCTION
              ? "PRODUCTION_LINE"
              : "FACTORY",
        },
        translations: {
          deleteMany: {},
          create: [
            { locale: "tr", name: role.nameTr },
            { locale: "en", name: role.nameEn },
          ],
        },
        supportCategories: {
          deleteMany: {},
          create: role.supportCategories.map((supportCategory) => ({
            supportCategory,
          })),
        },
      },
      create: {
        sectorId: sector.id,
        departmentId,
        key: role.key,
        staffType: role.staffType,
        monthlySalaryCents: role.monthlySalaryCents,
        sortOrder: (index + 1) * 10,
        status: ContentStatus.ACTIVE,
        metadata: {
          seedSource: "13-Staff_and_Organization",
          starterRole: role.starterRole,
          assignmentScope:
            role.staffType === StaffType.DIRECT_PRODUCTION
              ? "PRODUCTION_LINE"
              : "FACTORY",
        },
        translations: {
          create: [
            { locale: "tr", name: role.nameTr },
            { locale: "en", name: role.nameEn },
          ],
        },
        supportCategories: {
          create: role.supportCategories.map((supportCategory) => ({
            supportCategory,
          })),
        },
      },
    });
  }

  console.log(
    `${staffRoles.length} textile personel rolü eklendi veya güncellendi.`,
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
