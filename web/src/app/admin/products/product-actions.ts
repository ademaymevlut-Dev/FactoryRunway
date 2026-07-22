"use server";

import { revalidatePath } from "next/cache";

import {
  ContentStatus,
  DepartmentKind,
  Gender,
  Prisma,
  ProductTier,
} from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { getProductTierMinimumLevel } from "@/features/orders/product-tier-rules";

import { requireAdminUser } from "../admin-auth";
import {
  bool,
  integer,
  json,
  optionalText,
  text,
} from "../admin-data";
import type { AdminActionState } from "../product-form-state";

const productTiers = new Set<string>(Object.values(ProductTier));
const genders = new Set<string>(Object.values(Gender));
const statuses = new Set<string>(Object.values(ContentStatus));

const success = (message: string, entityId?: string): AdminActionState => ({
  status: "success",
  message,
  entityId,
});

const error = (message: string): AdminActionState => ({
  status: "error",
  message,
});

function productPath(productId: string) {
  return `/admin/products/${productId}`;
}

function refreshProduct(productId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  if (productId) revalidatePath(productPath(productId));
}

function actionError(cause: unknown) {
  if (cause instanceof Prisma.PrismaClientKnownRequestError) {
    if (cause.code === "P2002") {
      return error("Ürün anahtarı veya ürün kodu daha önce kullanılmış.");
    }
    if (cause.code === "P2003") {
      return error("Seçilen tanımlardan biri artık kullanılamıyor.");
    }
  }

  return error(cause instanceof Error ? cause.message : "İşlem tamamlanamadı.");
}

function technicalKey(formData: FormData) {
  const value = text(formData, "key")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!value) {
    throw new Error("Teknik anahtar en az bir harf veya rakam içermeli.");
  }

  return value;
}

function enumValue<T extends string>(
  formData: FormData,
  key: string,
  allowed: Set<string>,
): T {
  const value = text(formData, key);
  if (!allowed.has(value)) throw new Error(`${key} geçerli bir seçim olmalı.`);
  return value as T;
}

function optionalEnumValue<T extends string>(
  formData: FormData,
  key: string,
  allowed: Set<string>,
): T | null {
  const value = optionalText(formData, key);
  if (value && !allowed.has(value)) {
    throw new Error(`${key} geçerli bir seçim olmalı.`);
  }
  return value as T | null;
}

function currencyToCents(formData: FormData, key: string) {
  const raw = text(formData, key).replace(",", ".");

  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
    throw new Error(
      `${key} para birimi olarak 0 veya daha büyük ve en fazla iki ondalıklı olmalı.`,
    );
  }

  const [wholePart, decimalPart = ""] = raw.split(".");
  const cents =
    Number(wholePart) * 100 + Number(decimalPart.padEnd(2, "0"));

  if (!Number.isSafeInteger(cents) || cents > 2_147_483_647) {
    throw new Error(`${key} desteklenen para aralığını aşıyor.`);
  }

  return cents;
}

function productUnitPriceCents(formData: FormData) {
  return formData.has("baseUnitPrice")
    ? currencyToCents(formData, "baseUnitPrice")
    : integer(formData, "baseUnitPriceCents", { min: 0 });
}

async function assertProductScope(
  sectorId: string,
  categoryId: string,
  productTypeId: string,
) {
  const prisma = getPrisma();
  const [category, productType] = await Promise.all([
    prisma.productCategory.findFirst({
      where: { id: categoryId, sectorId },
      select: { id: true },
    }),
    prisma.productType.findFirst({
      where: { id: productTypeId, sectorId, categoryId },
      select: { id: true },
    }),
  ]);

  if (!category || !productType) {
    throw new Error("Kategori ve ürün tipi seçilen sektörle uyumlu olmalı.");
  }
}

function mainProductInput(formData: FormData) {
  const tier = enumValue<ProductTier>(formData, "tier", productTiers);
  const requiredPlayerLevel = formData.has("requiredPlayerLevel")
    ? integer(formData, "requiredPlayerLevel", { min: 1 })
    : null;
  const minimumLevel = getProductTierMinimumLevel(tier);

  if (requiredPlayerLevel !== null && requiredPlayerLevel < minimumLevel) {
    throw new Error(
      `${tier} ürünler için gerekli oyuncu seviyesi en az ${minimumLevel} olmalı.`,
    );
  }

  return {
    sectorId: text(formData, "sectorId"),
    categoryId: text(formData, "categoryId"),
    productTypeId: text(formData, "productTypeId"),
    key: technicalKey(formData),
    code: optionalText(formData, "code")?.toUpperCase() ?? null,
    name: text(formData, "name"),
    tier,
    gender: optionalEnumValue<Gender>(formData, "gender", genders),
    status: enumValue<ContentStatus>(formData, "status", statuses),
    sortOrder: integer(formData, "sortOrder", { min: 0 }),
    requiredPlayerLevel,
  };
}

export async function createProductAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdminUser();

  try {
    const input = mainProductInput(formData);
    await assertProductScope(
      input.sectorId,
      input.categoryId,
      input.productTypeId,
    );

    const { requiredPlayerLevel, ...mainInput } = input;
    const product = await getPrisma().product.create({
      data: {
        ...mainInput,
        requiredPlayerLevel:
          requiredPlayerLevel ?? getProductTierMinimumLevel(input.tier),
      },
      select: { id: true },
    });

    refreshProduct(product.id);
    return success("Ürün ana kaydı oluşturuldu. Tablodaki Details bağlantısından devam edebilirsin.", product.id);
  } catch (cause) {
    return actionError(cause);
  }
}

export async function updateProductMainAction(
  productId: string,
  formData: FormData,
) {
  await requireAdminUser();
  const prisma = getPrisma();
  const input = mainProductInput(formData);
  await assertProductScope(
    input.sectorId,
    input.categoryId,
    input.productTypeId,
  );

  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      sectorId: true,
      requiredPlayerLevel: true,
      _count: { select: { allowedColors: true, routeSteps: true } },
    },
  });

  if (!existing) throw new Error("Ürün bulunamadı.");
  if (
    existing.sectorId !== input.sectorId &&
    (existing._count.routeSteps > 0 || existing._count.allowedColors > 0)
  ) {
    throw new Error(
      "Üretim rotası veya renk tanımı bulunan ürünün sektörü değiştirilemez. Önce bağlı tanımları kaldırmalısın.",
    );
  }

  const { requiredPlayerLevel, ...mainInput } = input;
  await prisma.product.update({
    where: { id: productId },
    data: {
      ...mainInput,
      requiredPlayerLevel: Math.max(
        requiredPlayerLevel ?? existing.requiredPlayerLevel,
        getProductTierMinimumLevel(input.tier),
      ),
    },
  });
  refreshProduct(productId);
}

export async function updateProductDefinitionsAction(
  productId: string,
  formData: FormData,
) {
  await requireAdminUser();

  const descriptionTr = optionalText(formData, "descriptionTr");
  const descriptionEn = optionalText(formData, "descriptionEn");

  const prisma = getPrisma();
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { tier: true },
  });

  if (!product) throw new Error("Ürün bulunamadı.");

  const requiredPlayerLevel = integer(formData, "requiredPlayerLevel", {
    min: 1,
  });
  const minimumLevel = getProductTierMinimumLevel(product.tier);

  if (requiredPlayerLevel < minimumLevel) {
    throw new Error(
      `${product.tier} ürünler için gerekli oyuncu seviyesi en az ${minimumLevel} olmalı.`,
    );
  }

  await prisma.product.update({
    where: { id: productId },
    data: {
      baseUnitPriceCents: productUnitPriceCents(formData),
      requiredPlayerLevel,
      translations: {
        deleteMany: {},
        create: [
          ...(descriptionTr
            ? [{ locale: "tr", description: descriptionTr }]
            : []),
          ...(descriptionEn
            ? [{ locale: "en", description: descriptionEn }]
            : []),
        ],
      },
      metadata: json(formData),
    },
  });
  refreshProduct(productId);
}

export async function saveProductColorsAction(
  productId: string,
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdminUser();
  void _previousState;

  try {
    const prisma = getPrisma();
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { sectorId: true },
    });
    if (!product) return error("Ürün bulunamadı.");

    const selectedColorIds = uniqueStrings(
      formData.getAll("colorVariantId"),
    );
    if (!selectedColorIds.length) {
      return error("Sipariş teklifleri için en az bir renk seçmelisin.");
    }

    const offerColorCountMin = integer(formData, "offerColorCountMin", {
      min: 1,
    });
    const offerColorCountMax = integer(formData, "offerColorCountMax", {
      min: 1,
    });
    if (offerColorCountMin > offerColorCountMax) {
      return error("Minimum renk sayısı maksimum değerden büyük olamaz.");
    }

    const colors = await prisma.productColorVariant.findMany({
      where: {
        id: { in: selectedColorIds },
        sectorId: product.sectorId,
      },
      select: { id: true },
    });
    if (colors.length !== selectedColorIds.length) {
      return error("Seçilen renklerden biri ürün sektörüyle uyumlu değil.");
    }

    const activeColorIds = selectedColorIds.filter((colorId) =>
      bool(formData, `isActive:${colorId}`),
    );
    if (!activeColorIds.length) {
      return error("Sipariş havuzu için en az bir aktif ürün rengi gerekli.");
    }
    if (offerColorCountMax > activeColorIds.length) {
      return error(
        "Maksimum renk sayısı aktif seçili renk sayısından büyük olamaz.",
      );
    }

    const defaultColorId = optionalText(formData, "defaultColorVariantId");
    if (defaultColorId && !activeColorIds.includes(defaultColorId)) {
      return error("Varsayılan renk seçili ve aktif bir renk olmalı.");
    }

    const colorInputs = selectedColorIds.map((colorVariantId) => ({
      colorVariantId,
      isActive: activeColorIds.includes(colorVariantId),
      isDefault: defaultColorId === colorVariantId,
      selectionWeightBps: percentToBps(
        formData,
        `selectionWeightPercent:${colorVariantId}`,
      ),
      sortOrder: integer(formData, `sortOrder:${colorVariantId}`, {
        min: 0,
      }),
    }));

    await prisma.$transaction(async (transaction) => {
      await transaction.product.update({
        where: { id: productId },
        data: {
          offerColorCountMin,
          offerColorCountMax,
        },
      });

      await transaction.productAllowedColor.deleteMany({
        where: {
          productId,
          colorVariantId: { notIn: selectedColorIds },
        },
      });

      await Promise.all(
        colorInputs.map((colorInput) =>
          transaction.productAllowedColor.upsert({
            where: {
              productId_colorVariantId: {
                productId,
                colorVariantId: colorInput.colorVariantId,
              },
            },
            update: {
              isActive: colorInput.isActive,
              isDefault: colorInput.isDefault,
              selectionWeightBps: colorInput.selectionWeightBps,
              sortOrder: colorInput.sortOrder,
            },
            create: {
              productId,
              colorVariantId: colorInput.colorVariantId,
              isActive: colorInput.isActive,
              isDefault: colorInput.isDefault,
              selectionWeightBps: colorInput.selectionWeightBps,
              sortOrder: colorInput.sortOrder,
            },
          }),
        ),
      );
    });

    refreshProduct(productId);
    return success(
      `${activeColorIds.length} aktif renk ile ürün renkleri kaydedildi.`,
      productId,
    );
  } catch (cause) {
    if (
      cause instanceof Prisma.PrismaClientKnownRequestError &&
      cause.code === "P2002"
    ) {
      return error("Aynı renk bu ürüne birden fazla eklenemez.");
    }

    return actionError(cause);
  }
}

export async function updateProductCardAction(
  productId: string,
  formData: FormData,
) {
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
    },
  });
  refreshProduct(productId);
}

function uniqueStrings(values: FormDataEntryValue[]) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function percentToBps(formData: FormData, key: string) {
  const raw = text(formData, key).replace(",", ".");

  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
    throw new Error(`${key} yüzde olarak 0.01 ile 100 arasında olmalı.`);
  }

  const percent = Number(raw);
  if (!Number.isFinite(percent) || percent < 0.01 || percent > 100) {
    throw new Error(`${key} yüzde olarak 0.01 ile 100 arasında olmalı.`);
  }

  return Math.round(percent * 100);
}

export async function saveProductRouteStepAction(
  productId: string,
  routeStepId: string | null,
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdminUser();
  void _previousState;

  try {
    const prisma = getPrisma();
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { sectorId: true },
    });
    if (!product) return error("Ürün bulunamadı.");

    const departmentId = text(formData, "departmentId");
    const department = await prisma.department.findFirst({
      where: {
        id: departmentId,
        sectorId: product.sectorId,
        kind: DepartmentKind.PRODUCTION,
      },
      select: { id: true },
    });
    if (!department) {
      return error(
        "Departman ürün sektörüyle uyumlu ve PRODUCTION türünde olmalı.",
      );
    }

    const data = {
      departmentId,
      sequence: integer(formData, "sequence", { min: 1 }),
      isRequired: bool(formData, "isRequired"),
      canOutsource: bool(formData, "canOutsource"),
      workloadPointsPerUnit: integer(formData, "workloadPointsPerUnit", {
        min: 1,
      }),
      setupPoints: integer(formData, "setupPoints", { min: 0 }),
      metadata: json(formData),
    };

    const conflicts = await prisma.productRouteStep.findMany({
      where: {
        productId,
        ...(routeStepId ? { id: { not: routeStepId } } : {}),
        OR: [{ sequence: data.sequence }, { departmentId }],
      },
      select: { departmentId: true, sequence: true },
    });

    if (conflicts.some((step) => step.sequence === data.sequence)) {
      return error(
        `Bu üründe ${data.sequence}. rota sırası zaten kullanılıyor.`,
      );
    }

    if (conflicts.some((step) => step.departmentId === departmentId)) {
      return error("Seçilen departman bu ürünün rotasında zaten bulunuyor.");
    }

    const routeStep = routeStepId
      ? await prisma.productRouteStep.update({
          where: { id: routeStepId, productId },
          data,
          select: { id: true },
        })
      : await prisma.productRouteStep.create({
          data: { productId, ...data },
          select: { id: true },
        });

    refreshProduct(productId);
    return success(
      routeStepId ? "Rota adımı güncellendi." : "Rota adımı eklendi.",
      routeStep.id,
    );
  } catch (cause) {
    if (
      cause instanceof Prisma.PrismaClientKnownRequestError &&
      cause.code === "P2002"
    ) {
      return error(
        "Rota sırası veya departman bu ürün için zaten kullanılıyor.",
      );
    }

    return error(
      cause instanceof Error ? cause.message : "Rota adımı kaydedilemedi.",
    );
  }
}

export async function deleteProductRouteStepAction(
  productId: string,
  routeStepId: string,
) {
  await requireAdminUser();
  await getPrisma().productRouteStep.delete({
    where: { id: routeStepId, productId },
  });
  refreshProduct(productId);
}
