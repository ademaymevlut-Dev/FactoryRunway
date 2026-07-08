"use server";

import { revalidatePath } from "next/cache";

import {
  ContentStatus,
  DepartmentKind,
  Prisma,
  SectorStatus,
} from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";

import { requireAdminUser } from "./admin-auth";
import { bool, integer, optionalText, text } from "./admin-data";
import type { AdminActionState } from "./product-form-state";

type DefinitionEntity =
  | "sector"
  | "departmentGroup"
  | "department"
  | "productCategory"
  | "productType"
  | "productColorVariant";

const success = (message: string, entityId?: string): AdminActionState => ({
  status: "success",
  message,
  entityId,
});

const error = (message: string): AdminActionState => ({
  status: "error",
  message,
});

function actionError(cause: unknown, duplicateMessage: string) {
  if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === "P2002") {
    return error(duplicateMessage);
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

function translatedName(formData: FormData, locale: "tr" | "en") {
  const preferred = optionalText(formData, locale === "tr" ? "nameTr" : "nameEn");
  const legacy = locale === "tr" ? optionalText(formData, "nameKey") : null;

  return preferred ?? legacy;
}

function translatedDescription(formData: FormData, locale: "tr" | "en") {
  const preferred = optionalText(
    formData,
    locale === "tr" ? "descriptionTr" : "descriptionEn",
  );
  const legacy = locale === "tr" ? optionalText(formData, "descriptionKey") : null;

  return preferred ?? legacy;
}

function translationRows(formData: FormData) {
  const nameTr = translatedName(formData, "tr");
  const nameEn = translatedName(formData, "en");

  if (!nameTr) {
    throw new Error("Türkçe görünen ad zorunlu.");
  }

  return [
    {
      locale: "tr",
      name: nameTr,
      description: translatedDescription(formData, "tr"),
    },
    ...(nameEn
      ? [
          {
            locale: "en",
            name: nameEn,
            description: translatedDescription(formData, "en"),
          },
        ]
      : []),
  ];
}

function refreshDefinitions() {
  revalidatePath("/admin");
  revalidatePath("/admin/sectors");
  revalidatePath("/admin/definitions/departments");
  revalidatePath("/admin/definitions/products");
  revalidatePath("/admin/products");
  revalidatePath("/admin/production-lines");
}

export async function createSectorAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdminUser();

  try {
    const sector = await getPrisma().sector.create({
      data: {
        key: technicalKey(formData),
        status: text(formData, "status") as SectorStatus,
        sortOrder: integer(formData, "sortOrder"),
        photoUrl: optionalText(formData, "photoUrl"),
        slimPhotoUrl: optionalText(formData, "slimPhotoUrl"),
        translations: {
          create: translationRows(formData),
        },
      },
      select: { id: true },
    });

    refreshDefinitions();
    return success("Sektör oluşturuldu.", sector.id);
  } catch (cause) {
    return actionError(cause, "Bu sektör anahtarı daha önce kullanılmış.");
  }
}

export async function createDepartmentGroupAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdminUser();

  try {
    const prisma = getPrisma();
    const sectorId = text(formData, "sectorId");
    await prisma.sector.findUniqueOrThrow({ where: { id: sectorId }, select: { id: true } });

    const group = await prisma.departmentGroup.create({
      data: {
        sectorId,
        key: technicalKey(formData),
        sortOrder: integer(formData, "sortOrder"),
        status: text(formData, "status") as ContentStatus,
        translations: {
          create: translationRows(formData),
        },
      },
      select: { id: true },
    });

    refreshDefinitions();
    return success("Departman grubu oluşturuldu.", group.id);
  } catch (cause) {
    return actionError(
      cause,
      "Bu departman grubu anahtarı seçilen sektörde daha önce kullanılmış.",
    );
  }
}

export async function createDepartmentAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdminUser();

  try {
    const prisma = getPrisma();
    const sectorId = text(formData, "sectorId");
    const departmentGroupId = optionalText(formData, "departmentGroupId");

    if (departmentGroupId) {
      const group = await prisma.departmentGroup.findFirst({
        where: { id: departmentGroupId, sectorId },
        select: { id: true },
      });

      if (!group) return error("Departman grubu seçilen sektörle uyumlu değil.");
    } else {
      await prisma.sector.findUniqueOrThrow({
        where: { id: sectorId },
        select: { id: true },
      });
    }

    const department = await prisma.department.create({
      data: {
        sectorId,
        departmentGroupId,
        key: technicalKey(formData),
        kind: text(formData, "kind") as DepartmentKind,
        routeOrder: integer(formData, "routeOrder"),
        isStarter: bool(formData, "isStarter"),
        supportsOutsource: bool(formData, "supportsOutsource"),
        status: text(formData, "status") as ContentStatus,
        translations: {
          create: translationRows(formData),
        },
      },
      select: { id: true },
    });

    refreshDefinitions();
    return success("Departman oluşturuldu.", department.id);
  } catch (cause) {
    return actionError(
      cause,
      "Bu departman anahtarı seçilen sektörde daha önce kullanılmış.",
    );
  }
}

export async function createProductCategoryAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdminUser();

  try {
    const prisma = getPrisma();
    const sectorId = text(formData, "sectorId");
    await prisma.sector.findUniqueOrThrow({ where: { id: sectorId }, select: { id: true } });

    const category = await prisma.productCategory.create({
      data: {
        sectorId,
        key: technicalKey(formData),
        sortOrder: integer(formData, "sortOrder"),
        status: text(formData, "status") as ContentStatus,
        translations: {
          create: translationRows(formData),
        },
      },
      select: { id: true },
    });

    refreshDefinitions();
    return success("Ürün kategorisi oluşturuldu.", category.id);
  } catch (cause) {
    return actionError(
      cause,
      "Bu kategori anahtarı seçilen sektörde daha önce kullanılmış.",
    );
  }
}

export async function createProductTypeAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdminUser();

  try {
    const prisma = getPrisma();
    const sectorId = text(formData, "sectorId");
    const categoryId = text(formData, "categoryId");
    const category = await prisma.productCategory.findFirst({
      where: { id: categoryId, sectorId },
      select: { id: true },
    });

    if (!category) return error("Kategori seçilen sektörle uyumlu değil.");

    const productType = await prisma.productType.create({
      data: {
        sectorId,
        categoryId,
        key: technicalKey(formData),
        sortOrder: integer(formData, "sortOrder"),
        status: text(formData, "status") as ContentStatus,
        translations: {
          create: translationRows(formData),
        },
      },
      select: { id: true },
    });

    refreshDefinitions();
    return success("Ürün tipi oluşturuldu.", productType.id);
  } catch (cause) {
    return actionError(
      cause,
      "Bu ürün tipi anahtarı seçilen sektörde daha önce kullanılmış.",
    );
  }
}

export async function createProductColorVariantAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdminUser();

  try {
    const prisma = getPrisma();
    const sectorId = text(formData, "sectorId");
    const hexCode = text(formData, "hexCode").toUpperCase();

    if (!/^#[0-9A-F]{6}$/.test(hexCode)) {
      return error("HEX renk kodu #RRGGBB biçiminde olmalı.");
    }

    await prisma.sector.findUniqueOrThrow({ where: { id: sectorId }, select: { id: true } });

    const color = await prisma.productColorVariant.create({
      data: {
        sectorId,
        key: technicalKey(formData),
        hexCode,
        sortOrder: integer(formData, "sortOrder"),
        status: text(formData, "status") as ContentStatus,
        translations: {
          create: translationRows(formData),
        },
      },
      select: { id: true },
    });

    refreshDefinitions();
    return success("Ürün rengi oluşturuldu.", color.id);
  } catch (cause) {
    return actionError(
      cause,
      "Bu renk anahtarı seçilen sektörde daha önce kullanılmış.",
    );
  }
}

export async function setDefinitionStatusAction(
  entity: DefinitionEntity,
  id: string,
  activate: boolean,
) {
  await requireAdminUser();
  const prisma = getPrisma();

  switch (entity) {
    case "sector":
      await prisma.sector.update({
        where: { id },
        data: { status: activate ? SectorStatus.ACTIVE : SectorStatus.IN_DEVELOPMENT },
      });
      break;
    case "departmentGroup":
      await prisma.departmentGroup.update({
        where: { id },
        data: { status: activate ? ContentStatus.ACTIVE : ContentStatus.INACTIVE },
      });
      break;
    case "department":
      await prisma.department.update({
        where: { id },
        data: { status: activate ? ContentStatus.ACTIVE : ContentStatus.INACTIVE },
      });
      break;
    case "productCategory":
      await prisma.productCategory.update({
        where: { id },
        data: { status: activate ? ContentStatus.ACTIVE : ContentStatus.INACTIVE },
      });
      break;
    case "productType":
      await prisma.productType.update({
        where: { id },
        data: { status: activate ? ContentStatus.ACTIVE : ContentStatus.INACTIVE },
      });
      break;
    case "productColorVariant":
      await prisma.productColorVariant.update({
        where: { id },
        data: { status: activate ? ContentStatus.ACTIVE : ContentStatus.INACTIVE },
      });
      break;
  }

  refreshDefinitions();
}

export async function createProductValueAddCategoryAction(
  _previousState: AdminActionState,
  _formData: FormData,
): Promise<AdminActionState> {
  await requireAdminUser();
  void _previousState;
  void _formData;
  return error("Katma değer kategorisi yeni final schema içinde kullanılmıyor.");
}
