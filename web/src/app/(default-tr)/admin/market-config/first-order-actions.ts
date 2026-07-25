"use server";

import { revalidatePath } from "next/cache";

import {
  ContentStatus,
  Prisma,
  TutorialKey,
} from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";

import { requireAdminUser } from "../admin-auth";
import { integer, json, text } from "../admin-data";

const pagePath = "/admin/market-config";
const maxFirstOrderOptions = 3;
const statuses = new Set<string>(Object.values(ContentStatus));
const tutorialKeys = new Set<string>(Object.values(TutorialKey));

function enumValue<T extends string>(
  formData: FormData,
  key: string,
  allowed: Set<string>,
): T {
  const value = text(formData, key);
  if (!allowed.has(value)) throw new Error(`${key} geçerli bir seçim olmalı.`);
  return value as T;
}

function actionError(cause: unknown) {
  if (cause instanceof Prisma.PrismaClientKnownRequestError) {
    if (cause.code === "P2002") {
      return new Error("Bu ürün aynı sektör için ilk sipariş seçeneklerinde zaten var.");
    }
    if (cause.code === "P2003") {
      return new Error("Seçilen sektör veya ürün artık kullanılamıyor.");
    }
  }

  return cause instanceof Error ? cause : new Error("İşlem tamamlanamadı.");
}

async function assertOptionScope({
  optionId,
  sectorId,
  productId,
  tutorialKey,
}: {
  optionId: string | null;
  sectorId: string;
  productId: string;
  tutorialKey: TutorialKey;
}) {
  const prisma = getPrisma();
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { sectorId: true, status: true },
  });

  if (!product) throw new Error("Ürün bulunamadı.");
  if (product.sectorId !== sectorId) {
    throw new Error("Ürün seçilen sektörle uyumlu olmalı.");
  }
  if (product.status === ContentStatus.ARCHIVED) {
    throw new Error("Arşivlenmiş ürün ilk sipariş seçeneği olamaz.");
  }

  const existingCount = await prisma.firstOrderProductOption.count({
    where: {
      sectorId,
      tutorialKey,
      ...(optionId ? { id: { not: optionId } } : {}),
    },
  });

  if (existingCount >= maxFirstOrderOptions) {
    throw new Error("Bir sektör için en fazla 3 ilk sipariş ürünü tanımlanabilir.");
  }
}

export async function saveFirstOrderOptionAction(
  optionId: string | null,
  formData: FormData,
) {
  await requireAdminUser();

  try {
    const sectorId = text(formData, "sectorId");
    const productId = text(formData, "productId");
    const tutorialKey = enumValue<TutorialKey>(
      formData,
      "tutorialKey",
      tutorialKeys,
    );
    const data = {
      sectorId,
      productId,
      tutorialKey,
      defaultQuantity: integer(formData, "defaultQuantity", { min: 1 }),
      targetDeliveryDays: integer(formData, "targetDeliveryDays", { min: 1 }),
      sortOrder: integer(formData, "sortOrder", { min: 0 }),
      status: enumValue<ContentStatus>(formData, "status", statuses),
      metadata: json(formData),
    };

    await assertOptionScope({
      optionId,
      sectorId,
      productId,
      tutorialKey,
    });

    if (optionId) {
      await getPrisma().firstOrderProductOption.update({
        where: { id: optionId },
        data,
      });
    } else {
      await getPrisma().firstOrderProductOption.create({ data });
    }

    revalidatePath(pagePath);
  } catch (cause) {
    throw actionError(cause);
  }
}

export async function deleteFirstOrderOptionAction(optionId: string) {
  await requireAdminUser();

  try {
    await getPrisma().firstOrderProductOption.delete({
      where: { id: optionId },
    });
    revalidatePath(pagePath);
  } catch (cause) {
    throw actionError(cause);
  }
}
