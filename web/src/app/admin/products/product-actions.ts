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
  return {
    sectorId: text(formData, "sectorId"),
    categoryId: text(formData, "categoryId"),
    productTypeId: text(formData, "productTypeId"),
    key: technicalKey(formData),
    code: optionalText(formData, "code")?.toUpperCase() ?? null,
    name: text(formData, "name"),
    tier: enumValue<ProductTier>(formData, "tier", productTiers),
    gender: optionalEnumValue<Gender>(formData, "gender", genders),
    status: enumValue<ContentStatus>(formData, "status", statuses),
    sortOrder: integer(formData, "sortOrder", { min: 0 }),
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

    const product = await getPrisma().product.create({
      data: input,
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
      _count: { select: { routeSteps: true } },
    },
  });

  if (!existing) throw new Error("Ürün bulunamadı.");
  if (existing.sectorId !== input.sectorId && existing._count.routeSteps > 0) {
    throw new Error(
      "Üretim rotası bulunan ürünün sektörü değiştirilemez. Önce rota adımlarını kaldırmalısın.",
    );
  }

  await prisma.product.update({
    where: { id: productId },
    data: input,
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

  await getPrisma().product.update({
    where: { id: productId },
    data: {
      baseUnitPriceCents: integer(formData, "baseUnitPriceCents", { min: 0 }),
      requiredPlayerLevel: integer(formData, "requiredPlayerLevel", { min: 1 }),
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
