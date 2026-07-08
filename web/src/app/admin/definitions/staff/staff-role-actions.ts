"use server";

import { revalidatePath } from "next/cache";

import {
  ContentStatus,
  Prisma,
  StaffType,
  SupportCategory,
} from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";

import { requireAdminUser } from "../../admin-auth";
import { integer, optionalText, text } from "../../admin-data";
import type { AdminActionState } from "../../product-form-state";

const staffTypes = new Set<string>(Object.values(StaffType));
const contentStatuses = new Set<string>(Object.values(ContentStatus));
const supportCategories = new Set<string>(Object.values(SupportCategory));

const success = (message: string, entityId?: string): AdminActionState => ({
  status: "success",
  message,
  entityId,
});

const error = (message: string): AdminActionState => ({
  status: "error",
  message,
});

function refreshStaffRoles() {
  revalidatePath("/admin");
  revalidatePath("/admin/definitions/staff");
  revalidatePath("/admin/production-lines");
}

function actionError(cause: unknown) {
  if (cause instanceof Prisma.PrismaClientKnownRequestError) {
    if (cause.code === "P2002") {
      return error("Bu teknik anahtar seçilen sektörde daha önce kullanılmış.");
    }

    if (cause.code === "P2003") {
      return error(
        "Bu personel rolü başka kayıtlarda kullanılıyor. Silmek yerine pasife alabilirsin.",
      );
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

  if (!allowed.has(value)) {
    throw new Error(`${key} geçerli bir seçim olmalı.`);
  }

  return value as T;
}

function translationRows(formData: FormData) {
  const nameTr = optionalText(formData, "nameTr");
  const nameEn = optionalText(formData, "nameEn");

  if (!nameTr) {
    throw new Error("Türkçe rol adı zorunlu.");
  }

  return [
    {
      locale: "tr",
      name: nameTr,
      description: optionalText(formData, "descriptionTr"),
    },
    ...(nameEn
      ? [
          {
            locale: "en",
            name: nameEn,
            description: optionalText(formData, "descriptionEn"),
          },
        ]
      : []),
  ];
}

function selectedSupportCategories(formData: FormData) {
  const values = formData
    .getAll("supportCategories")
    .filter((value): value is string => typeof value === "string");

  for (const value of values) {
    if (!supportCategories.has(value)) {
      throw new Error("Geçersiz destek kategorisi seçildi.");
    }
  }

  return [...new Set(values)] as SupportCategory[];
}

function roleInput(formData: FormData) {
  const staffType = enumValue<StaffType>(
    formData,
    "staffType",
    staffTypes,
  );
  const departmentId = optionalText(formData, "departmentId");
  const categories = selectedSupportCategories(formData);

  if (staffType === StaffType.DIRECT_PRODUCTION && !departmentId) {
    throw new Error("Doğrudan üretim rolü için departman seçimi zorunlu.");
  }

  if (staffType !== StaffType.DIRECT_PRODUCTION && categories.length === 0) {
    throw new Error("Destek veya yönetim rolü için en az bir destek kategorisi seçilmeli.");
  }

  return {
    sectorId: text(formData, "sectorId"),
    departmentId,
    key: technicalKey(formData),
    staffType,
    monthlySalaryCents: integer(formData, "monthlySalaryCents", {
      min: 0,
      max: 2_000_000_000,
    }),
    sortOrder: integer(formData, "sortOrder", {
      min: 0,
      max: 2_000_000_000,
    }),
    status: enumValue<ContentStatus>(formData, "status", contentStatuses),
    translations: translationRows(formData),
    categories:
      staffType === StaffType.DIRECT_PRODUCTION ? [] : categories,
  };
}

async function assertScope(sectorId: string, departmentId: string | null) {
  const prisma = getPrisma();
  const sector = await prisma.sector.findUnique({
    where: { id: sectorId },
    select: { id: true },
  });

  if (!sector) {
    throw new Error("Seçilen sektör bulunamadı.");
  }

  if (departmentId) {
    const department = await prisma.department.findFirst({
      where: { id: departmentId, sectorId },
      select: { id: true },
    });

    if (!department) {
      throw new Error("Seçilen departman bu sektöre bağlı değil.");
    }
  }
}

export async function createStaffRoleAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdminUser();

  try {
    const input = roleInput(formData);
    await assertScope(input.sectorId, input.departmentId);

    const role = await getPrisma().staffRole.create({
      data: {
        sectorId: input.sectorId,
        departmentId: input.departmentId,
        key: input.key,
        staffType: input.staffType,
        monthlySalaryCents: input.monthlySalaryCents,
        sortOrder: input.sortOrder,
        status: input.status,
        translations: { create: input.translations },
        supportCategories: {
          create: input.categories.map((supportCategory) => ({
            supportCategory,
          })),
        },
      },
      select: { id: true },
    });

    refreshStaffRoles();
    return success("Personel rolü oluşturuldu.", role.id);
  } catch (cause) {
    return actionError(cause);
  }
}

export async function updateStaffRoleAction(
  roleId: string,
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdminUser();

  try {
    const prisma = getPrisma();
    const input = roleInput(formData);
    await assertScope(input.sectorId, input.departmentId);

    const existing = await prisma.staffRole.findUnique({
      where: { id: roleId },
      select: {
        id: true,
        sectorId: true,
        departmentId: true,
        staffType: true,
        _count: {
          select: {
            assignments: true,
            lineRequirements: true,
          },
        },
      },
    });

    if (!existing) {
      return error("Düzenlenecek personel rolü bulunamadı.");
    }

    const isUsed =
      existing._count.assignments > 0 || existing._count.lineRequirements > 0;
    const scopeChanged =
      existing.sectorId !== input.sectorId ||
      existing.departmentId !== input.departmentId ||
      existing.staffType !== input.staffType;

    if (isUsed && scopeChanged) {
      return error(
        "Kullanımda olan bir rolün sektör, departman veya personel türü değiştirilemez. Diğer alanları düzenleyebilir ya da yeni rol oluşturabilirsin.",
      );
    }

    await prisma.staffRole.update({
      where: { id: roleId },
      data: {
        sectorId: input.sectorId,
        departmentId: input.departmentId,
        key: input.key,
        staffType: input.staffType,
        monthlySalaryCents: input.monthlySalaryCents,
        sortOrder: input.sortOrder,
        status: input.status,
        translations: {
          deleteMany: {},
          create: input.translations,
        },
        supportCategories: {
          deleteMany: {},
          create: input.categories.map((supportCategory) => ({
            supportCategory,
          })),
        },
      },
    });

    refreshStaffRoles();
    return success("Personel rolü güncellendi.", roleId);
  } catch (cause) {
    return actionError(cause);
  }
}

export async function deleteStaffRoleAction(
  roleId: string,
  _previousState: AdminActionState,
  _formData: FormData,
): Promise<AdminActionState> {
  await requireAdminUser();
  void _previousState;
  void _formData;

  try {
    const prisma = getPrisma();
    const role = await prisma.staffRole.findUnique({
      where: { id: roleId },
      select: {
        id: true,
        _count: {
          select: {
            assignments: true,
            lineRequirements: true,
          },
        },
      },
    });

    if (!role) {
      return error("Silinecek personel rolü bulunamadı.");
    }

    if (role._count.assignments > 0 || role._count.lineRequirements > 0) {
      return error(
        "Bu rol üretim hattı veya fabrika personel kayıtlarında kullanılıyor. Silmek yerine pasife alabilirsin.",
      );
    }

    await prisma.staffRole.delete({ where: { id: roleId } });
    refreshStaffRoles();
    return success("Personel rolü silindi.");
  } catch (cause) {
    return actionError(cause);
  }
}

export async function setStaffRoleStatusAction(
  roleId: string,
  activate: boolean,
) {
  await requireAdminUser();

  await getPrisma().staffRole.update({
    where: { id: roleId },
    data: { status: activate ? ContentStatus.ACTIVE : ContentStatus.INACTIVE },
  });

  refreshStaffRoles();
}
