"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  ContentStatus,
  FactoryStandard,
  Gender,
  MarketSlotRole,
  OrderOfferType,
  ProductTier,
  ProductionGrade,
  SupplyType,
} from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";

import { requireAdminUser } from "./admin-auth";
import { assertMinMax, bigint, bool, integer, json, optionalText, text } from "./admin-data";

const productPath = (id: string) => `/admin/products/${id}`;

function refresh(...paths: string[]) {
  for (const path of paths) revalidatePath(path);
}

export async function saveProductAction(productId: string | null, formData: FormData) {
  await requireAdminUser();
  const prisma = getPrisma();
  const sectorId = text(formData, "sectorId");
  const categoryId = text(formData, "categoryId");
  const productTypeId = text(formData, "productTypeId");
  const valueAddCategoryId = text(formData, "valueAddCategoryId");
  const [category, productType, valueAddCategory] = await Promise.all([
    prisma.productCategory.findFirst({ where: { id: categoryId, sectorId }, select: { id: true } }),
    prisma.productType.findFirst({ where: { id: productTypeId, categoryId, sectorId }, select: { id: true } }),
    prisma.productValueAddCategory.findFirst({ where: { id: valueAddCategoryId, sectorId }, select: { id: true } }),
  ]);
  if (!category || !productType || !valueAddCategory) {
    throw new Error("Kategori, ürün tipi ve katma değer seçili sektörle uyumlu olmalı.");
  }

  const certificationIds = formData.getAll("certificationIds").filter((value): value is string => typeof value === "string");
  if (certificationIds.length) {
    const validCount = await prisma.certification.count({ where: { id: { in: certificationIds }, sectorId } });
    if (validCount !== certificationIds.length) throw new Error("Sertifikalar seçili sektörle uyumlu olmalı.");
  }

  const data = {
    sectorId,
    categoryId,
    productTypeId,
    valueAddCategoryId,
    code: text(formData, "code").toUpperCase(),
    productName: text(formData, "productName"),
    nameKey: text(formData, "nameKey"),
    descriptionKey: optionalText(formData, "descriptionKey"),
    tier: text(formData, "tier") as ProductTier,
    gender: (optionalText(formData, "gender") as Gender | null),
    status: text(formData, "status") as ContentStatus,
    calculatedBaseCostCents: bigint(formData, "calculatedBaseCostCents"),
    calculatedBasePriceCents: bigint(formData, "calculatedBasePriceCents"),
    basePriceOverrideCents: bigint(formData, "basePriceOverrideCents", true),
    basePriceCents: bigint(formData, "basePriceCents"),
    targetMarginBps: integer(formData, "targetMarginBps", { max: 10000 }),
    difficultyScore: integer(formData, "difficultyScore"),
    progressionMultiplierBps: integer(formData, "progressionMultiplierBps", { max: 10000 }),
    deliveryRiskBps: integer(formData, "deliveryRiskBps", { max: 10000 }),
    requiredPlayerLevel: integer(formData, "requiredPlayerLevel", { min: 1 }),
    requiredQualityScore: integer(formData, "requiredQualityScore"),
    requiredFactoryStandard: text(formData, "requiredFactoryStandard") as FactoryStandard,
    cardPrimaryColor: text(formData, "cardPrimaryColor"),
    cardSecondaryColor: text(formData, "cardSecondaryColor"),
    cardGradientFrom: text(formData, "cardGradientFrom"),
    cardGradientTo: text(formData, "cardGradientTo"),
    cardTextColor: text(formData, "cardTextColor"),
    cardSvgIconColor: text(formData, "cardSvgIconColor"),
    cardSvgIconAccentColor: text(formData, "cardSvgIconAccentColor"),
    cardForegroundTone: text(formData, "cardForegroundTone"),
    metadata: json(formData),
  };

  if (productId) {
    await prisma.product.update({
      where: { id: productId },
      data: {
        ...data,
        certifications: {
          deleteMany: {},
          create: certificationIds.map((certificationId) => ({ certificationId })),
        },
      },
    });
    refresh("/admin/products", productPath(productId));
    return;
  }

  const product = await prisma.product.create({
    data: {
      ...data,
      certifications: { create: certificationIds.map((certificationId) => ({ certificationId })) },
    },
    select: { id: true },
  });
  refresh("/admin", "/admin/products");
  redirect(productPath(product.id));
}

export async function updateProductBasicsAction(productId: string, formData: FormData) {
  await requireAdminUser();
  const prisma = getPrisma();
  const sectorId = text(formData, "sectorId");
  const categoryId = text(formData, "categoryId");
  const productTypeId = text(formData, "productTypeId");
  const valueAddCategoryId = text(formData, "valueAddCategoryId");
  const [category, productType, valueAddCategory] = await Promise.all([
    prisma.productCategory.findFirst({ where: { id: categoryId, sectorId }, select: { id: true } }),
    prisma.productType.findFirst({ where: { id: productTypeId, categoryId, sectorId }, select: { id: true } }),
    prisma.productValueAddCategory.findFirst({ where: { id: valueAddCategoryId, sectorId }, select: { id: true } }),
  ]);
  if (!category || !productType || !valueAddCategory) {
    throw new Error("Kategori, ürün tipi ve katma değer seçili sektörle uyumlu olmalı.");
  }
  const certificationIds = formData.getAll("certificationIds").filter((value): value is string => typeof value === "string");
  if (certificationIds.length) {
    const count = await prisma.certification.count({ where: { id: { in: certificationIds }, sectorId } });
    if (count !== certificationIds.length) throw new Error("Sertifikalar seçili sektörle uyumlu olmalı.");
  }
  await prisma.product.update({
    where: { id: productId },
    data: {
      sectorId,
      categoryId,
      productTypeId,
      valueAddCategoryId,
      code: text(formData, "code").toUpperCase(),
      productName: text(formData, "productName"),
      nameKey: text(formData, "nameKey"),
      descriptionKey: optionalText(formData, "descriptionKey"),
      tier: text(formData, "tier") as ProductTier,
      gender: optionalText(formData, "gender") as Gender | null,
      status: text(formData, "status") as ContentStatus,
      certifications: { deleteMany: {}, create: certificationIds.map((certificationId) => ({ certificationId })) },
    },
  });
  refresh("/admin/products", productPath(productId));
}

export async function updateProductBalanceAction(productId: string, formData: FormData) {
  await requireAdminUser();
  await getPrisma().product.update({
    where: { id: productId },
    data: {
      calculatedBaseCostCents: bigint(formData, "calculatedBaseCostCents"),
      calculatedBasePriceCents: bigint(formData, "calculatedBasePriceCents"),
      basePriceOverrideCents: bigint(formData, "basePriceOverrideCents", true),
      basePriceCents: bigint(formData, "basePriceCents"),
      targetMarginBps: integer(formData, "targetMarginBps", { max: 10000 }),
      difficultyScore: integer(formData, "difficultyScore"),
      progressionMultiplierBps: integer(formData, "progressionMultiplierBps", { max: 10000 }),
      deliveryRiskBps: integer(formData, "deliveryRiskBps", { max: 10000 }),
      requiredPlayerLevel: integer(formData, "requiredPlayerLevel", { min: 1 }),
      requiredQualityScore: integer(formData, "requiredQualityScore"),
      requiredFactoryStandard: text(formData, "requiredFactoryStandard") as FactoryStandard,
    },
  });
  refresh("/admin/products", productPath(productId));
}

export async function updateProductCardAction(productId: string, formData: FormData) {
  await requireAdminUser();
  await getPrisma().product.update({
    where: { id: productId },
    data: {
      cardPrimaryColor: text(formData, "cardPrimaryColor"),
      cardSecondaryColor: text(formData, "cardSecondaryColor"),
      cardGradientFrom: text(formData, "cardGradientFrom"),
      cardGradientTo: text(formData, "cardGradientTo"),
      cardTextColor: text(formData, "cardTextColor"),
      cardSvgIconColor: text(formData, "cardSvgIconColor"),
      cardSvgIconAccentColor: text(formData, "cardSvgIconAccentColor"),
      cardForegroundTone: text(formData, "cardForegroundTone"),
      metadata: json(formData),
    },
  });
  refresh(productPath(productId));
}

export async function saveRouteStepAction(productId: string, routeStepId: string | null, formData: FormData) {
  await requireAdminUser();
  const prisma = getPrisma();
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { sectorId: true } });
  if (!product) throw new Error("Ürün bulunamadı.");
  const departmentId = text(formData, "departmentId");
  const department = await prisma.department.findFirst({ where: { id: departmentId, sectorId: product.sectorId } });
  if (!department) throw new Error("Departman ürün sektörüyle uyumlu olmalı.");
  const data = {
    productId,
    departmentId,
    stepOrder: integer(formData, "stepOrder", { min: 1 }),
    workloadPointsPerUnit: integer(formData, "workloadPointsPerUnit", { min: 1 }),
    minimumProductionGrade: text(formData, "minimumProductionGrade") as ProductionGrade,
    canUseOutsource: bool(formData, "canUseOutsource"),
    outsourceBaseCostCents: bigint(formData, "outsourceBaseCostCents"),
    qualityCheckRequired: bool(formData, "qualityCheckRequired"),
    expectedWasteBps: integer(formData, "expectedWasteBps", { max: 10000 }),
    internalCostPerUnitCents: bigint(formData, "internalCostPerUnitCents"),
    status: text(formData, "status") as ContentStatus,
    metadata: json(formData),
  };
  if (routeStepId) await prisma.productRouteStep.update({ where: { id: routeStepId, productId }, data });
  else await prisma.productRouteStep.create({ data });
  refresh(productPath(productId));
}

export async function deleteRouteStepAction(productId: string, routeStepId: string) {
  await requireAdminUser();
  await getPrisma().productRouteStep.delete({ where: { id: routeStepId, productId } });
  refresh(productPath(productId));
}

export async function saveInputRequirementAction(productId: string, requirementId: string | null, formData: FormData) {
  await requireAdminUser();
  const prisma = getPrisma();
  const blockingRouteStepId = optionalText(formData, "blockingRouteStepId");
  if (blockingRouteStepId) {
    const step = await prisma.productRouteStep.findFirst({ where: { id: blockingRouteStepId, productId } });
    if (!step) throw new Error("Bloklayan adım bu ürüne ait olmalı.");
  }
  const data = {
    productId,
    blockingRouteStepId,
    type: text(formData, "type") as SupplyType,
    key: text(formData, "key").toUpperCase(),
    nameKey: text(formData, "nameKey"),
    quantityPerUnit: integer(formData, "quantityPerUnit", { min: 1 }),
    quantityScale: integer(formData, "quantityScale", { min: 1 }),
    unitKey: text(formData, "unitKey"),
    unitCostCents: bigint(formData, "unitCostCents"),
    defaultLeadDays: integer(formData, "defaultLeadDays"),
    delayRiskBps: integer(formData, "delayRiskBps", { max: 10000 }),
    isRequired: bool(formData, "isRequired"),
  };
  if (requirementId) await prisma.productInputRequirement.update({ where: { id: requirementId, productId }, data });
  else await prisma.productInputRequirement.create({ data });
  refresh(productPath(productId));
}

export async function deleteInputRequirementAction(productId: string, requirementId: string) {
  await requireAdminUser();
  await getPrisma().productInputRequirement.delete({ where: { id: requirementId, productId } });
  refresh(productPath(productId));
}

export async function saveMarketConfigAction(configId: string | null, formData: FormData) {
  await requireAdminUser();
  const playerLevelMin = integer(formData, "playerLevelMin", { min: 1 });
  const playerLevelMax = integer(formData, "playerLevelMax", { min: 1, nullable: true });
  if (playerLevelMax !== null) assertMinMax(playerLevelMin, playerLevelMax, "Oyuncu seviyesi");
  const minQuantity = integer(formData, "minQuantity", { min: 1 });
  const maxQuantity = integer(formData, "maxQuantity", { min: 1 });
  const minTargetDays = integer(formData, "minTargetDays", { min: 1 });
  const maxTargetDays = integer(formData, "maxTargetDays", { min: 1 });
  const minMarginBps = integer(formData, "minMarginBps", { max: 10000 });
  const maxMarginBps = integer(formData, "maxMarginBps", { max: 10000 });
  assertMinMax(minQuantity, maxQuantity, "Miktar");
  assertMinMax(minTargetDays, maxTargetDays, "Hedef gün");
  assertMinMax(minMarginBps, maxMarginBps, "Marj");
  const data = {
    sectorId: text(formData, "sectorId"),
    playerLevelMin,
    playerLevelMax,
    factoryStandard: text(formData, "factoryStandard") as FactoryStandard,
    offerType: text(formData, "offerType") as OrderOfferType,
    marketSlotRole: text(formData, "marketSlotRole") as MarketSlotRole,
    minQuantity,
    maxQuantity,
    minTargetDays,
    maxTargetDays,
    minMarginBps,
    maxMarginBps,
    deliveryRiskBps: integer(formData, "deliveryRiskBps", { max: 10000 }),
    qualityRiskBps: integer(formData, "qualityRiskBps", { max: 10000 }),
    weight: integer(formData, "weight", { min: 1 }),
    isEnabled: bool(formData, "isEnabled"),
    metadata: json(formData),
  };
  const prisma = getPrisma();
  if (configId) await prisma.marketGenerationConfig.update({ where: { id: configId }, data });
  else await prisma.marketGenerationConfig.create({ data });
  refresh("/admin/market-config");
}

export async function deleteMarketConfigAction(configId: string) {
  await requireAdminUser();
  await getPrisma().marketGenerationConfig.delete({ where: { id: configId } });
  refresh("/admin/market-config");
}
