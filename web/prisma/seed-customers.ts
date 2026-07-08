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

type WeightMap = Record<string, number>;
type TierQuantityCaps = Record<string, { min: number; max: number }>;

type SegmentSeed = {
  key: string;
  nameTr: string;
  nameEn: string;
  descriptionTr: string;
  descriptionEn: string;
  tierWeights: WeightMap;
  productTypeWeights: WeightMap;
  priceMultiplierBps: number;
  qualityExpectationBps: number;
  deliveryPressureBps: number;
  complaintRiskBps: number;
  repeatOrderChanceBps: number;
  trustGainMultiplierBps: number;
  trustLossMultiplierBps: number;
};

type VolumeClassSeed = {
  key: string;
  nameTr: string;
  nameEn: string;
  descriptionTr: string;
  descriptionEn: string;
  quantityMultiplierBps: number;
  priceMultiplierBps: number;
  targetProductionDayMin: number;
  targetProductionDayMax: number;
  itemCountMin: number;
  itemCountMax: number;
  maxOfferLoadBps: number;
  tierQuantityCaps: TierQuantityCaps;
};

type CustomerSeed = {
  key: string;
  name: string;
  countryCode: string;
  segmentKey: string;
  volumeClassKey: string;
  sourceMinStage: string;
  minOperatingStageKey: string;
  trustRequirement: number;
  offerWeight: number;
  descriptionTr: string;
};

const segmentSeeds: SegmentSeed[] = [
  {
    key: "budget_retailer",
    nameTr: "Bütçe Perakendecisi",
    nameEn: "Budget Retailer",
    descriptionTr:
      "Fiyat hassasiyeti yüksek, BASIC ürün ağırlıklı düşük bütçeli perakende müşterisi.",
    descriptionEn:
      "A price-sensitive, low-budget retail customer focused on BASIC products.",
    tierWeights: { BASIC: 75, STANDARD: 25, PREMIUM: 0, LUXURY: 0 },
    productTypeWeights: {
      tshirt: 45,
      hoodie: 20,
      pants: 20,
      dress: 10,
      jacket: 5,
    },
    priceMultiplierBps: 9000,
    qualityExpectationBps: 6000,
    deliveryPressureBps: 7000,
    complaintRiskBps: 6000,
    repeatOrderChanceBps: 7500,
    trustGainMultiplierBps: 8000,
    trustLossMultiplierBps: 9000,
  },
  {
    key: "mass_brand",
    nameTr: "Ana Akım Marka",
    nameEn: "Mass Brand",
    descriptionTr:
      "Düzenli ve orta-büyük hacimli, BASIC ve STANDARD ürünleri birlikte kullanan ana akım marka.",
    descriptionEn:
      "A mainstream brand placing regular medium-to-large BASIC and STANDARD orders.",
    tierWeights: { BASIC: 45, STANDARD: 45, PREMIUM: 10, LUXURY: 0 },
    productTypeWeights: {
      tshirt: 35,
      hoodie: 25,
      pants: 20,
      dress: 10,
      jacket: 10,
    },
    priceMultiplierBps: 10000,
    qualityExpectationBps: 7000,
    deliveryPressureBps: 8000,
    complaintRiskBps: 7000,
    repeatOrderChanceBps: 8000,
    trustGainMultiplierBps: 10000,
    trustLossMultiplierBps: 10000,
  },
  {
    key: "fashion_brand",
    nameTr: "Moda Markası",
    nameEn: "Fashion Brand",
    descriptionTr:
      "STANDARD ve PREMIUM ürünlere yönelen, sezonluk koleksiyon mantığıyla çalışan moda markası.",
    descriptionEn:
      "A seasonal fashion brand focused on STANDARD and PREMIUM collections.",
    tierWeights: { BASIC: 10, STANDARD: 45, PREMIUM: 40, LUXURY: 5 },
    productTypeWeights: {
      tshirt: 20,
      hoodie: 20,
      pants: 20,
      dress: 25,
      jacket: 15,
    },
    priceMultiplierBps: 11250,
    qualityExpectationBps: 8000,
    deliveryPressureBps: 8500,
    complaintRiskBps: 8000,
    repeatOrderChanceBps: 7000,
    trustGainMultiplierBps: 12000,
    trustLossMultiplierBps: 11500,
  },
  {
    key: "premium_brand",
    nameTr: "Premium Marka",
    nameEn: "Premium Brand",
    descriptionTr:
      "Kalite beklentisi yüksek, orta adetli ve PREMIUM ürün ağırlıklı marka.",
    descriptionEn:
      "A quality-focused brand placing medium-volume, PREMIUM-heavy orders.",
    tierWeights: { BASIC: 0, STANDARD: 20, PREMIUM: 60, LUXURY: 20 },
    productTypeWeights: {
      tshirt: 10,
      hoodie: 20,
      pants: 20,
      dress: 25,
      jacket: 25,
    },
    priceMultiplierBps: 13000,
    qualityExpectationBps: 9000,
    deliveryPressureBps: 8500,
    complaintRiskBps: 9000,
    repeatOrderChanceBps: 6500,
    trustGainMultiplierBps: 13500,
    trustLossMultiplierBps: 13000,
  },
  {
    key: "luxury_boutique",
    nameTr: "Lüks Butik",
    nameEn: "Luxury Boutique",
    descriptionTr:
      "Az adetli, yüksek fiyatlı ve LUXURY ürünlere odaklanan seçici butik müşteri.",
    descriptionEn:
      "A selective boutique focused on low-volume, high-value LUXURY products.",
    tierWeights: { BASIC: 0, STANDARD: 0, PREMIUM: 25, LUXURY: 75 },
    productTypeWeights: {
      tshirt: 5,
      hoodie: 10,
      pants: 15,
      dress: 35,
      jacket: 35,
    },
    priceMultiplierBps: 16000,
    qualityExpectationBps: 9800,
    deliveryPressureBps: 7500,
    complaintRiskBps: 9500,
    repeatOrderChanceBps: 5500,
    trustGainMultiplierBps: 16000,
    trustLossMultiplierBps: 16000,
  },
  {
    key: "luxury_retail_group",
    nameTr: "Lüks Perakende Grubu",
    nameEn: "Luxury Retail Group",
    descriptionTr:
      "LUXURY ürün isteyen, butik müşteriden daha yüksek sipariş potansiyeline sahip perakende grubu.",
    descriptionEn:
      "A luxury retail group with greater order potential than a boutique.",
    tierWeights: { BASIC: 0, STANDARD: 10, PREMIUM: 35, LUXURY: 55 },
    productTypeWeights: {
      tshirt: 5,
      hoodie: 15,
      pants: 20,
      dress: 30,
      jacket: 30,
    },
    priceMultiplierBps: 14500,
    qualityExpectationBps: 9500,
    deliveryPressureBps: 9000,
    complaintRiskBps: 9500,
    repeatOrderChanceBps: 6000,
    trustGainMultiplierBps: 15000,
    trustLossMultiplierBps: 15500,
  },
  {
    key: "export_buyer",
    nameTr: "İhracat Alıcısı",
    nameEn: "Export Buyer",
    descriptionTr:
      "Termin, kalite, evrak ve üretim disiplini yüksek ihracat müşterisi.",
    descriptionEn:
      "An export customer with strict delivery, quality and production discipline.",
    tierWeights: { BASIC: 20, STANDARD: 50, PREMIUM: 25, LUXURY: 5 },
    productTypeWeights: {
      tshirt: 30,
      hoodie: 25,
      pants: 20,
      dress: 10,
      jacket: 15,
    },
    priceMultiplierBps: 11000,
    qualityExpectationBps: 8800,
    deliveryPressureBps: 9500,
    complaintRiskBps: 8500,
    repeatOrderChanceBps: 8500,
    trustGainMultiplierBps: 13000,
    trustLossMultiplierBps: 14000,
  },
];

const volumeClassSeeds: VolumeClassSeed[] = [
  {
    key: "small_batch",
    nameTr: "Küçük Parti",
    nameEn: "Small Batch",
    descriptionTr: "Küçük adetli butik veya deneme siparişleri.",
    descriptionEn: "Small boutique or trial orders.",
    quantityMultiplierBps: 6000,
    priceMultiplierBps: 11500,
    targetProductionDayMin: 2,
    targetProductionDayMax: 6,
    itemCountMin: 1,
    itemCountMax: 2,
    maxOfferLoadBps: 3000,
    tierQuantityCaps: {
      BASIC: { min: 300, max: 3000 },
      STANDARD: { min: 200, max: 2000 },
      PREMIUM: { min: 100, max: 1200 },
      LUXURY: { min: 50, max: 600 },
    },
  },
  {
    key: "regular",
    nameTr: "Standart Hacim",
    nameEn: "Regular",
    descriptionTr: "Oyuncunun ana sipariş havuzunu oluşturan normal fabrika siparişleri.",
    descriptionEn: "Regular factory orders forming the main offer pool.",
    quantityMultiplierBps: 10000,
    priceMultiplierBps: 10000,
    targetProductionDayMin: 4,
    targetProductionDayMax: 10,
    itemCountMin: 1,
    itemCountMax: 3,
    maxOfferLoadBps: 5000,
    tierQuantityCaps: {
      BASIC: { min: 1000, max: 12000 },
      STANDARD: { min: 800, max: 8000 },
      PREMIUM: { min: 300, max: 4000 },
      LUXURY: { min: 100, max: 2000 },
    },
  },
  {
    key: "large_retail",
    nameTr: "Büyük Perakende",
    nameEn: "Large Retail",
    descriptionTr: "Büyük perakende zincirleri ve geniş dağıtım siparişleri.",
    descriptionEn: "Large retail-chain and wide-distribution orders.",
    quantityMultiplierBps: 17000,
    priceMultiplierBps: 9300,
    targetProductionDayMin: 8,
    targetProductionDayMax: 16,
    itemCountMin: 2,
    itemCountMax: 4,
    maxOfferLoadBps: 7000,
    tierQuantityCaps: {
      BASIC: { min: 5000, max: 30000 },
      STANDARD: { min: 3000, max: 20000 },
      PREMIUM: { min: 1000, max: 10000 },
      LUXURY: { min: 300, max: 5000 },
    },
  },
  {
    key: "mass_distribution",
    nameTr: "Kitlesel Dağıtım",
    nameEn: "Mass Distribution",
    descriptionTr: "Çok yüksek adetli, düşük marjlı ve kapasiteyi yoğun kullanan siparişler.",
    descriptionEn: "Very-high-volume, low-margin, capacity-heavy orders.",
    quantityMultiplierBps: 25000,
    priceMultiplierBps: 8500,
    targetProductionDayMin: 12,
    targetProductionDayMax: 20,
    itemCountMin: 1,
    itemCountMax: 3,
    maxOfferLoadBps: 8500,
    tierQuantityCaps: {
      BASIC: { min: 15000, max: 60000 },
      STANDARD: { min: 8000, max: 40000 },
      PREMIUM: { min: 3000, max: 15000 },
      LUXURY: { min: 1000, max: 8000 },
    },
  },
  {
    key: "capsule_collection",
    nameTr: "Kapsül Koleksiyon",
    nameEn: "Capsule Collection",
    descriptionTr: "Birden fazla üründen oluşan koleksiyon siparişleri.",
    descriptionEn: "Collection orders containing multiple product lines.",
    quantityMultiplierBps: 9000,
    priceMultiplierBps: 12000,
    targetProductionDayMin: 6,
    targetProductionDayMax: 14,
    itemCountMin: 3,
    itemCountMax: 6,
    maxOfferLoadBps: 6500,
    tierQuantityCaps: {
      BASIC: { min: 500, max: 8000 },
      STANDARD: { min: 400, max: 6000 },
      PREMIUM: { min: 200, max: 3000 },
      LUXURY: { min: 80, max: 1500 },
    },
  },
];

const customerSeeds: CustomerSeed[] = [
  {
    key: "easywear_market",
    name: "EasyWear Market",
    countryCode: "PL",
    segmentKey: "budget_retailer",
    volumeClassKey: "regular",
    sourceMinStage: "WORKSHOP",
    minOperatingStageKey: "micro_workshop",
    trustRequirement: 0,
    offerWeight: 100,
    descriptionTr: "Başlangıç oyuncusuna düzenli ve öğretici BASIC siparişleri sunar.",
  },
  {
    key: "cottonbay_outlet",
    name: "CottonBay Outlet",
    countryCode: "RO",
    segmentKey: "budget_retailer",
    volumeClassKey: "small_batch",
    sourceMinStage: "WORKSHOP",
    minOperatingStageKey: "micro_workshop",
    trustRequirement: 0,
    offerWeight: 80,
    descriptionTr: "Küçük partili, düşük riskli başlangıç siparişleri sunar.",
  },
  {
    key: "dailyfit_stores",
    name: "DailyFit Stores",
    countryCode: "BG",
    segmentKey: "budget_retailer",
    volumeClassKey: "regular",
    sourceMinStage: "WORKSHOP",
    minOperatingStageKey: "micro_workshop",
    trustRequirement: 500,
    offerWeight: 90,
    descriptionTr: "Başlangıç seviyesinde düzenli BASIC siparişler üretir.",
  },
  {
    key: "urbannest_retail",
    name: "UrbanNest Retail",
    countryCode: "DE",
    segmentKey: "mass_brand",
    volumeClassKey: "regular",
    sourceMinStage: "SMALL_FACTORY",
    minOperatingStageKey: "small_workshop",
    trustRequirement: 1000,
    offerWeight: 70,
    descriptionTr: "BASIC ve STANDARD ürünleri dengeli kullanan perakende markası.",
  },
  {
    key: "blueriver_outfitters",
    name: "BlueRiver Outfitters",
    countryCode: "NL",
    segmentKey: "mass_brand",
    volumeClassKey: "large_retail",
    sourceMinStage: "SMALL_FACTORY",
    minOperatingStageKey: "small_workshop",
    trustRequirement: 1800,
    offerWeight: 45,
    descriptionTr: "Küçük fabrikalara daha yüksek adetli perakende işleri sunar.",
  },
  {
    key: "modalane_basics",
    name: "ModaLane Basics",
    countryCode: "IT",
    segmentKey: "mass_brand",
    volumeClassKey: "regular",
    sourceMinStage: "SMALL_FACTORY",
    minOperatingStageKey: "small_workshop",
    trustRequirement: 1200,
    offerWeight: 65,
    descriptionTr: "Dengeli BASIC ve STANDARD siparişleri sunan ana akım marka.",
  },
  {
    key: "northline_fashion",
    name: "Northline Fashion",
    countryCode: "DE",
    segmentKey: "fashion_brand",
    volumeClassKey: "regular",
    sourceMinStage: "SMALL_FACTORY",
    minOperatingStageKey: "small_workshop",
    trustRequirement: 2500,
    offerWeight: 30,
    descriptionTr: "STANDARD ve PREMIUM ürünlere geçiş sağlayan moda markası.",
  },
  {
    key: "vela_studio",
    name: "Vela Studio",
    countryCode: "IT",
    segmentKey: "fashion_brand",
    volumeClassKey: "capsule_collection",
    sourceMinStage: "GROWING_FACTORY",
    minOperatingStageKey: "stable_workshop",
    trustRequirement: 3500,
    offerWeight: 25,
    descriptionTr: "Çok ürünlü kapsül koleksiyon siparişleri sunar.",
  },
  {
    key: "aure_streetwear",
    name: "Aure Streetwear",
    countryCode: "FR",
    segmentKey: "fashion_brand",
    volumeClassKey: "capsule_collection",
    sourceMinStage: "GROWING_FACTORY",
    minOperatingStageKey: "stable_workshop",
    trustRequirement: 4000,
    offerWeight: 20,
    descriptionTr: "Kapasiteyi ürünler arasında bölmeyi gerektiren streetwear markası.",
  },
  {
    key: "elara_mode",
    name: "Elara Mode",
    countryCode: "FR",
    segmentKey: "premium_brand",
    volumeClassKey: "small_batch",
    sourceMinStage: "GROWING_FACTORY",
    minOperatingStageKey: "stable_workshop",
    trustRequirement: 5000,
    offerWeight: 18,
    descriptionTr: "Küçük partili, kalite beklentisi yüksek PREMIUM siparişleri sunar.",
  },
  {
    key: "nordvale_apparel",
    name: "NordVale Apparel",
    countryCode: "SE",
    segmentKey: "premium_brand",
    volumeClassKey: "regular",
    sourceMinStage: "ESTABLISHED_FACTORY",
    minOperatingStageKey: "growing_factory",
    trustRequirement: 6500,
    offerWeight: 15,
    descriptionTr: "Oturmuş fabrikalara düzenli PREMIUM siparişler sunar.",
  },
  {
    key: "casa_miren",
    name: "Casa Miren",
    countryCode: "ES",
    segmentKey: "premium_brand",
    volumeClassKey: "capsule_collection",
    sourceMinStage: "ESTABLISHED_FACTORY",
    minOperatingStageKey: "growing_factory",
    trustRequirement: 7000,
    offerWeight: 12,
    descriptionTr: "Kalite ve çeşitlilik isteyen premium koleksiyon markası.",
  },
  {
    key: "maison_valeo",
    name: "Maison Valeo",
    countryCode: "FR",
    segmentKey: "luxury_boutique",
    volumeClassKey: "small_batch",
    sourceMinStage: "ESTABLISHED_FACTORY",
    minOperatingStageKey: "growing_factory",
    trustRequirement: 8500,
    offerWeight: 10,
    descriptionTr: "Az adetli ve yüksek fiyatlı LUXURY butik siparişleri sunar.",
  },
  {
    key: "bellora_atelier",
    name: "Bellora Atelier",
    countryCode: "IT",
    segmentKey: "luxury_boutique",
    volumeClassKey: "small_batch",
    sourceMinStage: "ESTABLISHED_FACTORY",
    minOperatingStageKey: "growing_factory",
    trustRequirement: 9000,
    offerWeight: 8,
    descriptionTr: "Hata toleransı düşük, seçici lüks atölye müşterisidir.",
  },
  {
    key: "elanor_group",
    name: "Élanor Group",
    countryCode: "FR",
    segmentKey: "luxury_retail_group",
    volumeClassKey: "capsule_collection",
    sourceMinStage: "INDUSTRIAL_FACTORY",
    minOperatingStageKey: "mass_factory",
    trustRequirement: 12000,
    offerWeight: 6,
    descriptionTr: "Yüksek kalite isteyen büyük lüks koleksiyon grubu.",
  },
  {
    key: "crown_and_loom",
    name: "Crown & Loom",
    countryCode: "GB",
    segmentKey: "luxury_retail_group",
    volumeClassKey: "regular",
    sourceMinStage: "INDUSTRIAL_FACTORY",
    minOperatingStageKey: "mass_factory",
    trustRequirement: 13000,
    offerWeight: 5,
    descriptionTr: "Büyük ödül ve yüksek kalite riski taşıyan lüks perakende grubu.",
  },
  {
    key: "eurotrade_apparel",
    name: "EuroTrade Apparel",
    countryCode: "DE",
    segmentKey: "export_buyer",
    volumeClassKey: "large_retail",
    sourceMinStage: "GROWING_FACTORY",
    minOperatingStageKey: "stable_workshop",
    trustRequirement: 5000,
    offerWeight: 20,
    descriptionTr: "Termin ve kapasite disiplini isteyen büyük ihracat alıcısı.",
  },
  {
    key: "baltic_sourcing_co",
    name: "Baltic Sourcing Co.",
    countryCode: "LT",
    segmentKey: "export_buyer",
    volumeClassKey: "regular",
    sourceMinStage: "ESTABLISHED_FACTORY",
    minOperatingStageKey: "growing_factory",
    trustRequirement: 7500,
    offerWeight: 15,
    descriptionTr: "Kalite ve evrak disiplini yüksek düzenli ihracat müşterisi.",
  },
  {
    key: "continental_buyers",
    name: "Continental Buyers",
    countryCode: "AT",
    segmentKey: "export_buyer",
    volumeClassKey: "mass_distribution",
    sourceMinStage: "INDUSTRIAL_FACTORY",
    minOperatingStageKey: "mass_factory",
    trustRequirement: 11000,
    offerWeight: 8,
    descriptionTr: "Çok yüksek adetli ve baskılı ihracat siparişleri sunar.",
  },
];

const categoryKeyByProductType = {
  tshirt: "upper_wear",
  hoodie: "upper_wear",
  pants: "bottom_wear",
  dress: "dresswear",
  jacket: "outerwear",
} as const;

function sumWeights(weights: WeightMap) {
  return Object.values(weights).reduce((sum, value) => sum + value, 0);
}

function categoryWeightsFromProductTypes(productTypeWeights: WeightMap) {
  const categoryWeights: WeightMap = {};

  for (const [productTypeKey, weight] of Object.entries(productTypeWeights)) {
    const categoryKey =
      categoryKeyByProductType[
        productTypeKey as keyof typeof categoryKeyByProductType
      ];
    if (!categoryKey) {
      throw new Error(`Kategori eşlemesi olmayan ürün tipi: ${productTypeKey}`);
    }
    categoryWeights[categoryKey] =
      (categoryWeights[categoryKey] ?? 0) + weight;
  }

  return categoryWeights;
}

function assertSeedData() {
  for (const segment of segmentSeeds) {
    if (sumWeights(segment.tierWeights) !== 100) {
      throw new Error(`${segment.key}: tierWeights toplamı 100 olmalı.`);
    }
    if (sumWeights(segment.productTypeWeights) !== 100) {
      throw new Error(`${segment.key}: productTypeWeights toplamı 100 olmalı.`);
    }
  }

  for (const volumeClass of volumeClassSeeds) {
    if (volumeClass.targetProductionDayMin > volumeClass.targetProductionDayMax) {
      throw new Error(`${volumeClass.key}: üretim günü aralığı geçersiz.`);
    }
    if (volumeClass.itemCountMin > volumeClass.itemCountMax) {
      throw new Error(`${volumeClass.key}: ürün satırı aralığı geçersiz.`);
    }
    for (const [tier, limits] of Object.entries(volumeClass.tierQuantityCaps)) {
      if (limits.min > limits.max) {
        throw new Error(`${volumeClass.key}/${tier}: adet aralığı geçersiz.`);
      }
    }
  }

  const segmentKeys = new Set(segmentSeeds.map((segment) => segment.key));
  const volumeClassKeys = new Set(
    volumeClassSeeds.map((volumeClass) => volumeClass.key),
  );
  for (const customer of customerSeeds) {
    if (!segmentKeys.has(customer.segmentKey)) {
      throw new Error(`${customer.key}: segment bulunamadı.`);
    }
    if (!volumeClassKeys.has(customer.volumeClassKey)) {
      throw new Error(`${customer.key}: hacim sınıfı bulunamadı.`);
    }
    if (!/^[A-Z]{2}$/.test(customer.countryCode)) {
      throw new Error(`${customer.key}: ülke kodu geçersiz.`);
    }
  }
}

async function main() {
  assertSeedData();

  if (process.argv.includes("--validate-only")) {
    console.log(
      `Doğrulama başarılı: ${segmentSeeds.length} segment, ${volumeClassSeeds.length} hacim sınıfı ve ${customerSeeds.length} sanal müşteri.`,
    );
    return;
  }

  const sector = await prisma.sector.findUnique({
    where: { key: "textile" },
    select: { id: true },
  });
  if (!sector) {
    throw new Error(
      '"textile" sektör kaydı bulunamadı. Önce textile sektörünü oluştur.',
    );
  }

  const requiredStageKeys = [
    ...new Set(customerSeeds.map((customer) => customer.minOperatingStageKey)),
  ];
  const [operatingStages, productCategories] = await Promise.all([
    prisma.sectorFactoryOperatingStage.findMany({
      where: {
        sectorId: sector.id,
        key: { in: requiredStageKeys },
      },
      select: { id: true, key: true },
    }),
    prisma.productCategory.findMany({
      where: {
        sectorId: sector.id,
        key: {
          in: [...new Set(Object.values(categoryKeyByProductType))],
        },
      },
      select: { key: true },
    }),
  ]);

  const operatingStageIds = new Map(
    operatingStages.map((stage) => [stage.key, stage.id]),
  );
  const missingStageKeys = requiredStageKeys.filter(
    (key) => !operatingStageIds.has(key),
  );
  if (missingStageKeys.length) {
    throw new Error(
      `Eksik işletme aşamaları: ${missingStageKeys.join(", ")}. Önce seed-factory-operating-stages.ts çalıştırılmalı.`,
    );
  }

  const existingCategoryKeys = new Set(
    productCategories.map((category) => category.key),
  );
  const requiredCategoryKeys = [
    ...new Set(Object.values(categoryKeyByProductType)),
  ];
  const missingCategoryKeys = requiredCategoryKeys.filter(
    (key) => !existingCategoryKeys.has(key),
  );
  if (missingCategoryKeys.length) {
    throw new Error(
      `Eksik ürün kategorileri: ${missingCategoryKeys.join(", ")}. Müşteri kategori ağırlıkları için önce bu kategorileri oluştur.`,
    );
  }

  const segmentIds = new Map<string, string>();
  for (const [index, segment] of segmentSeeds.entries()) {
    const categoryWeights = categoryWeightsFromProductTypes(
      segment.productTypeWeights,
    );
    const metadata = {
      seedSource: "16-customer_creator",
      balanceVersion: 1,
      testingBaseline: true,
      complaintRiskBps: segment.complaintRiskBps,
      repeatOrderChanceBps: segment.repeatOrderChanceBps,
      trustGainMultiplierBps: segment.trustGainMultiplierBps,
      trustLossMultiplierBps: segment.trustLossMultiplierBps,
      sourceProductTypeWeights: segment.productTypeWeights,
    };
    const translations = [
      {
        locale: "tr",
        name: segment.nameTr,
        description: segment.descriptionTr,
      },
      {
        locale: "en",
        name: segment.nameEn,
        description: segment.descriptionEn,
      },
    ];

    const record = await prisma.customerSegment.upsert({
      where: {
        sectorId_key: {
          sectorId: sector.id,
          key: segment.key,
        },
      },
      update: {
        sortOrder: (index + 1) * 10,
        status: ContentStatus.ACTIVE,
        tierWeights: segment.tierWeights,
        categoryWeights,
        priceMultiplierBps: segment.priceMultiplierBps,
        qualityExpectationBps: segment.qualityExpectationBps,
        deliveryPressureBps: segment.deliveryPressureBps,
        metadata,
        translations: {
          deleteMany: {},
          create: translations,
        },
      },
      create: {
        sectorId: sector.id,
        key: segment.key,
        sortOrder: (index + 1) * 10,
        status: ContentStatus.ACTIVE,
        tierWeights: segment.tierWeights,
        categoryWeights,
        priceMultiplierBps: segment.priceMultiplierBps,
        qualityExpectationBps: segment.qualityExpectationBps,
        deliveryPressureBps: segment.deliveryPressureBps,
        metadata,
        translations: { create: translations },
      },
      select: { id: true },
    });
    segmentIds.set(segment.key, record.id);
  }

  const volumeClassIds = new Map<string, string>();
  for (const [index, volumeClass] of volumeClassSeeds.entries()) {
    const metadata = {
      seedSource: "16-customer_creator",
      balanceVersion: 1,
      testingBaseline: true,
    };
    const translations = [
      {
        locale: "tr",
        name: volumeClass.nameTr,
        description: volumeClass.descriptionTr,
      },
      {
        locale: "en",
        name: volumeClass.nameEn,
        description: volumeClass.descriptionEn,
      },
    ];

    const record = await prisma.customerVolumeClass.upsert({
      where: {
        sectorId_key: {
          sectorId: sector.id,
          key: volumeClass.key,
        },
      },
      update: {
        sortOrder: (index + 1) * 10,
        status: ContentStatus.ACTIVE,
        quantityMultiplierBps: volumeClass.quantityMultiplierBps,
        priceMultiplierBps: volumeClass.priceMultiplierBps,
        targetProductionDayMin: volumeClass.targetProductionDayMin,
        targetProductionDayMax: volumeClass.targetProductionDayMax,
        itemCountMin: volumeClass.itemCountMin,
        itemCountMax: volumeClass.itemCountMax,
        maxOfferLoadBps: volumeClass.maxOfferLoadBps,
        tierQuantityCaps: volumeClass.tierQuantityCaps,
        metadata,
        translations: {
          deleteMany: {},
          create: translations,
        },
      },
      create: {
        sectorId: sector.id,
        key: volumeClass.key,
        sortOrder: (index + 1) * 10,
        status: ContentStatus.ACTIVE,
        quantityMultiplierBps: volumeClass.quantityMultiplierBps,
        priceMultiplierBps: volumeClass.priceMultiplierBps,
        targetProductionDayMin: volumeClass.targetProductionDayMin,
        targetProductionDayMax: volumeClass.targetProductionDayMax,
        itemCountMin: volumeClass.itemCountMin,
        itemCountMax: volumeClass.itemCountMax,
        maxOfferLoadBps: volumeClass.maxOfferLoadBps,
        tierQuantityCaps: volumeClass.tierQuantityCaps,
        metadata,
        translations: { create: translations },
      },
      select: { id: true },
    });
    volumeClassIds.set(volumeClass.key, record.id);
  }

  for (const customer of customerSeeds) {
    const customerSegmentId = segmentIds.get(customer.segmentKey);
    const customerVolumeClassId = volumeClassIds.get(customer.volumeClassKey);
    const minOperatingStageId = operatingStageIds.get(
      customer.minOperatingStageKey,
    );
    if (
      !customerSegmentId ||
      !customerVolumeClassId ||
      !minOperatingStageId
    ) {
      throw new Error(`${customer.key}: ilişkiler çözümlenemedi.`);
    }

    const data = {
      customerSegmentId,
      customerVolumeClassId,
      name: customer.name,
      countryCode: customer.countryCode,
      minOperatingStageId,
      maxOperatingStageId: null,
      trustRequirementBps: customer.trustRequirement,
      status: ContentStatus.ACTIVE,
      metadata: {
        seedSource: "16-customer_creator",
        balanceVersion: 1,
        testingBaseline: true,
        offerWeight: customer.offerWeight,
        descriptionTr: customer.descriptionTr,
        sourceMinStage: customer.sourceMinStage,
      },
    };

    await prisma.virtualCustomer.upsert({
      where: {
        sectorId_key: {
          sectorId: sector.id,
          key: customer.key,
        },
      },
      update: data,
      create: {
        sectorId: sector.id,
        key: customer.key,
        ...data,
      },
    });
  }

  console.log(
    `${segmentSeeds.length} müşteri segmenti, ${volumeClassSeeds.length} hacim sınıfı ve ${customerSeeds.length} sanal müşteri eklendi veya güncellendi.`,
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
