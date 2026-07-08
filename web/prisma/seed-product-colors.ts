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

const colors = [
  {
    group: "BASIC",
    groupNameTr: "Temel",
    groupNameEn: "Basic",
    key: "basic_black",
    nameTr: "Siyah",
    nameEn: "Black",
    hexCode: "#000000",
  },
  {
    group: "BASIC",
    groupNameTr: "Temel",
    groupNameEn: "Basic",
    key: "basic_white",
    nameTr: "Beyaz",
    nameEn: "White",
    hexCode: "#FFFFFF",
  },
  {
    group: "BASIC",
    groupNameTr: "Temel",
    groupNameEn: "Basic",
    key: "basic_red",
    nameTr: "Kırmızı",
    nameEn: "Red",
    hexCode: "#D42323",
  },
  {
    group: "BASIC",
    groupNameTr: "Temel",
    groupNameEn: "Basic",
    key: "basic_navy",
    nameTr: "Lacivert",
    nameEn: "Navy",
    hexCode: "#1F2A44",
  },
  {
    group: "BASIC",
    groupNameTr: "Temel",
    groupNameEn: "Basic",
    key: "basic_brown",
    nameTr: "Kahve",
    nameEn: "Brown",
    hexCode: "#7A4A2E",
  },
  {
    group: "BASIC",
    groupNameTr: "Temel",
    groupNameEn: "Basic",
    key: "basic_camel",
    nameTr: "Camel",
    nameEn: "Camel",
    hexCode: "#C19A6B",
  },
  {
    group: "FW",
    groupNameTr: "Sonbahar / Kış",
    groupNameEn: "Fall / Winter",
    key: "fw_muted_clay",
    nameTr: "Kil Beji",
    nameEn: "Muted Clay",
    hexCode: "#D9B4A0",
  },
  {
    group: "FW",
    groupNameTr: "Sonbahar / Kış",
    groupNameEn: "Fall / Winter",
    key: "fw_neptune_green",
    nameTr: "Petrol",
    nameEn: "Neptune Green",
    hexCode: "#1C5D54",
  },
  {
    group: "FW",
    groupNameTr: "Sonbahar / Kış",
    groupNameEn: "Fall / Winter",
    key: "fw_green_envy",
    nameTr: "Fıstık",
    nameEn: "Green Envy",
    hexCode: "#9BAF52",
  },
  {
    group: "FW",
    groupNameTr: "Sonbahar / Kış",
    groupNameEn: "Fall / Winter",
    key: "fw_arabian_spice",
    nameTr: "Baharat",
    nameEn: "Arabian Spice",
    hexCode: "#9C2A44",
  },
  {
    group: "FW",
    groupNameTr: "Sonbahar / Kış",
    groupNameEn: "Fall / Winter",
    key: "fw_foxglove",
    nameTr: "Leylak",
    nameEn: "Foxglove",
    hexCode: "#D8A1C4",
  },
  {
    group: "FW",
    groupNameTr: "Sonbahar / Kış",
    groupNameEn: "Fall / Winter",
    key: "fw_festival_fuchsia",
    nameTr: "Fuşya",
    nameEn: "Festival Fuchsia",
    hexCode: "#C92A61",
  },
  {
    group: "FW",
    groupNameTr: "Sonbahar / Kış",
    groupNameEn: "Fall / Winter",
    key: "fw_red_mahogany",
    nameTr: "Maun",
    nameEn: "Red Mahogany",
    hexCode: "#751B24",
  },
  {
    group: "FW",
    groupNameTr: "Sonbahar / Kış",
    groupNameEn: "Fall / Winter",
    key: "fw_acacia",
    nameTr: "Akasya",
    nameEn: "Acacia",
    hexCode: "#D9C338",
  },
  {
    group: "FW",
    groupNameTr: "Sonbahar / Kış",
    groupNameEn: "Fall / Winter",
    key: "fw_all_aboard",
    nameTr: "Denizci",
    nameEn: "All Aboard",
    hexCode: "#1F4A6E",
  },
  {
    group: "FW",
    groupNameTr: "Sonbahar / Kış",
    groupNameEn: "Fall / Winter",
    key: "fw_burnt_olive",
    nameTr: "Zeytin",
    nameEn: "Burnt Olive",
    hexCode: "#5A5A46",
  },
  {
    group: "SS",
    groupNameTr: "İlkbahar / Yaz",
    groupNameEn: "Spring / Summer",
    key: "ss_acacia",
    nameTr: "Altın Akasya",
    nameEn: "Acacia",
    hexCode: "#EBB62D",
  },
  {
    group: "SS",
    groupNameTr: "İlkbahar / Yaz",
    groupNameEn: "Spring / Summer",
    key: "ss_marina",
    nameTr: "Marina",
    nameEn: "Marina",
    hexCode: "#4D88C2",
  },
  {
    group: "SS",
    groupNameTr: "İlkbahar / Yaz",
    groupNameEn: "Spring / Summer",
    key: "ss_muskmelon",
    nameTr: "Kavun",
    nameEn: "Muskmelon",
    hexCode: "#E67F43",
  },
  {
    group: "SS",
    groupNameTr: "İlkbahar / Yaz",
    groupNameEn: "Spring / Summer",
    key: "ss_alexandrite",
    nameTr: "Alexandrit",
    nameEn: "Alexandrite",
    hexCode: "#198592",
  },
  {
    group: "SS",
    groupNameTr: "İlkbahar / Yaz",
    groupNameEn: "Spring / Summer",
    key: "ss_lava_falls",
    nameTr: "Lav Kırmızı",
    nameEn: "Lava Falls",
    hexCode: "#D42323",
  },
  {
    group: "SS",
    groupNameTr: "İlkbahar / Yaz",
    groupNameEn: "Spring / Summer",
    key: "ss_dusty_rose",
    nameTr: "Gül Kurusu",
    nameEn: "Dusty Rose",
    hexCode: "#D58E9B",
  },
  {
    group: "SS",
    groupNameTr: "İlkbahar / Yaz",
    groupNameEn: "Spring / Summer",
    key: "ss_tea_rose",
    nameTr: "Çay Gülü",
    nameEn: "Tea Rose",
    hexCode: "#CE5B78",
  },
  {
    group: "SS",
    groupNameTr: "İlkbahar / Yaz",
    groupNameEn: "Spring / Summer",
    key: "ss_amaranth",
    nameTr: "Amarant",
    nameEn: "Amaranth",
    hexCode: "#983E7D",
  },
  {
    group: "SS",
    groupNameTr: "İlkbahar / Yaz",
    groupNameEn: "Spring / Summer",
    key: "ss_burnt_sienna",
    nameTr: "Sienna",
    nameEn: "Burnt Sienna",
    hexCode: "#C75D35",
  },
  {
    group: "SS",
    groupNameTr: "İlkbahar / Yaz",
    groupNameEn: "Spring / Summer",
    key: "ss_burnished_lilac",
    nameTr: "Lavanta",
    nameEn: "Burnished Lilac",
    hexCode: "#9C8CB9",
  },
] as const;

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

  for (const [index, color] of colors.entries()) {
    await prisma.productColorVariant.upsert({
      where: {
        sectorId_key: {
          sectorId: sector.id,
          key: color.key,
        },
      },
      update: {
        hexCode: color.hexCode,
        sortOrder: (index + 1) * 10,
        status: ContentStatus.ACTIVE,
        metadata: {
          palette: "textile",
          group: color.group,
          groupNameTr: color.groupNameTr,
          groupNameEn: color.groupNameEn,
        },
        translations: {
          deleteMany: {},
          create: [
            { locale: "tr", name: color.nameTr },
            { locale: "en", name: color.nameEn },
          ],
        },
      },
      create: {
        sectorId: sector.id,
        key: color.key,
        hexCode: color.hexCode,
        sortOrder: (index + 1) * 10,
        status: ContentStatus.ACTIVE,
        metadata: {
          palette: "textile",
          group: color.group,
          groupNameTr: color.groupNameTr,
          groupNameEn: color.groupNameEn,
        },
        translations: {
          create: [
            { locale: "tr", name: color.nameTr },
            { locale: "en", name: color.nameEn },
          ],
        },
      },
    });
  }

  console.log(`${colors.length} textile renk kaydı eklendi veya güncellendi.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
