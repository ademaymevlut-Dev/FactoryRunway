"use server";

import { del, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import sharp from "sharp";

import {
  ContentStatus,
  DepartmentKind,
  Prisma,
  ProductionGrade,
  ProductionLineAssetVariant,
  StaffType,
} from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { recalculateDirectLineCost } from "@/lib/production-line-cost";

import { integer, json, optionalText, text } from "../admin-data";
import { requireAdminUser } from "../admin-auth";
import type { AdminActionState } from "../product-form-state";

const MAX_SERVER_UPLOAD_BYTES = 4.5 * 1024 * 1024;
const grades = new Set<string>(Object.values(ProductionGrade));
const statuses = new Set<string>(Object.values(ContentStatus));
const imageVariants = [
  {
    variant: ProductionLineAssetVariant.CARD,
    width: 512,
    height: 384,
  },
  {
    variant: ProductionLineAssetVariant.MAP,
    width: 768,
    height: 512,
  },
  {
    variant: ProductionLineAssetVariant.DETAIL,
    width: 1024,
    height: 768,
  },
  {
    variant: ProductionLineAssetVariant.THUMBNAIL,
    width: 320,
    height: 240,
  },
] as const;

const success = (message: string, entityId?: string): AdminActionState => ({
  status: "success",
  message,
  entityId,
});

const error = (message: string): AdminActionState => ({
  status: "error",
  message,
});

function linePath(lineId: string) {
  return `/admin/production-lines/${lineId}`;
}

function refreshLine(lineId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/production-lines");
  if (lineId) revalidatePath(linePath(lineId));
}

function technicalKey(formData: FormData) {
  const key = text(formData, "key")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!key) {
    throw new Error("Teknik anahtar en az bir harf veya rakam içermeli.");
  }

  return key;
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

function actionError(cause: unknown, fallback: string) {
  if (cause instanceof Prisma.PrismaClientKnownRequestError) {
    if (cause.code === "P2002") {
      return error(
        "Bu departman ve derece için bir hat zaten tanımlı veya teknik anahtar kullanılıyor.",
      );
    }
    if (cause.code === "P2003") {
      return error("Seçilen bağlı kayıt artık kullanılamıyor.");
    }
    if (cause.code === "P2025") {
      return error("Üretim hattı veya bağlı kayıt bulunamadı.");
    }
  }

  return error(cause instanceof Error ? cause.message : fallback);
}

async function assertProductionDepartment(
  sectorId: string,
  departmentId: string,
) {
  const department = await getPrisma().department.findFirst({
    where: {
      id: departmentId,
      sectorId,
      kind: DepartmentKind.PRODUCTION,
      status: ContentStatus.ACTIVE,
    },
    select: { id: true },
  });

  if (!department) {
    throw new Error(
      "Üretim hattı yalnızca seçilen sektöre ait aktif PRODUCTION departmanında kullanılabilir.",
    );
  }
}

export async function createProductionLineTemplateAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdminUser();

  try {
    const sectorId = text(formData, "sectorId");
    const departmentId = text(formData, "departmentId");
    await assertProductionDepartment(sectorId, departmentId);

    const line = await getPrisma().productionLineTemplate.create({
      data: {
        sectorId,
        departmentId,
        key: technicalKey(formData),
        grade: enumValue<ProductionGrade>(formData, "grade", grades),
        machineCount: 0,
        idealStaff: 0,
        dailyPointCapacity: 0,
        directCostPer1000PointsCents: 0,
        areaM2: 0,
        monthlyElectricityBaseCents: 0,
        purchaseCostCents: 0,
        sortOrder: integer(formData, "sortOrder", { min: 0 }),
        status: enumValue<ContentStatus>(formData, "status", statuses),
        metadata: {
          setupStatus: "MAIN_RECORD_CREATED",
        },
      },
      select: { id: true },
    });

    refreshLine(line.id);
    return success(
      "Üretim hattı ana kaydı oluşturuldu. Tablodaki Details bağlantısından devam edebilirsin.",
      line.id,
    );
  } catch (cause) {
    return actionError(cause, "Üretim hattı oluşturulamadı.");
  }
}

export async function updateProductionLineBasicsAction(
  lineId: string,
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdminUser();

  try {
    const prisma = getPrisma();
    const sectorId = text(formData, "sectorId");
    const departmentId = text(formData, "departmentId");
    await assertProductionDepartment(sectorId, departmentId);

    const existing = await prisma.productionLineTemplate.findUniqueOrThrow({
      where: { id: lineId },
      select: {
        sectorId: true,
        departmentId: true,
        _count: {
          select: {
            staffRequirements: true,
            factoryProductionLines: true,
          },
        },
      },
    });
    const scopeChanged =
      existing.sectorId !== sectorId ||
      existing.departmentId !== departmentId;

    if (
      scopeChanged &&
      (existing._count.staffRequirements > 0 ||
        existing._count.factoryProductionLines > 0)
    ) {
      throw new Error(
        "Personel gereksinimi veya kurulu fabrika hattı bulunan template’in sektör/departmanı değiştirilemez.",
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.productionLineTemplate.update({
        where: { id: lineId },
        data: {
          sectorId,
          departmentId,
          key: technicalKey(formData),
          grade: enumValue<ProductionGrade>(formData, "grade", grades),
          sortOrder: integer(formData, "sortOrder", { min: 0 }),
          status: enumValue<ContentStatus>(formData, "status", statuses),
          metadata: json(formData),
        },
      });
      await recalculateDirectLineCost(tx, lineId);
    });

    refreshLine(lineId);
    return success("Ana bilgiler güncellendi.", lineId);
  } catch (cause) {
    return actionError(cause, "Ana bilgiler güncellenemedi.");
  }
}

export async function updateProductionLineCapacityAction(
  lineId: string,
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdminUser();

  try {
    await getPrisma().$transaction(async (tx) => {
      await tx.productionLineTemplate.update({
        where: { id: lineId },
        data: {
          machineCount: integer(formData, "machineCount", { min: 0 }),
          dailyPointCapacity: integer(formData, "dailyPointCapacity", {
            min: 0,
          }),
          areaM2: integer(formData, "areaM2", { min: 0 }),
        },
      });
      await recalculateDirectLineCost(tx, lineId);
    });

    refreshLine(lineId);
    return success("Kapasite ve alan bilgileri güncellendi.", lineId);
  } catch (cause) {
    return actionError(cause, "Kapasite bilgileri güncellenemedi.");
  }
}

export async function updateProductionLineCostsAction(
  lineId: string,
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdminUser();

  try {
    await getPrisma().$transaction(async (tx) => {
      await tx.productionLineTemplate.update({
        where: { id: lineId },
        data: {
          monthlyElectricityBaseCents: currencyToCents(
            formData,
            "monthlyElectricityBase",
          ),
          purchaseCostCents: currencyToCents(formData, "purchaseCost"),
        },
      });
      await recalculateDirectLineCost(tx, lineId);
    });

    refreshLine(lineId);
    return success("Maliyet girdileri güncellendi.", lineId);
  } catch (cause) {
    return actionError(cause, "Maliyet bilgileri güncellenemedi.");
  }
}

export async function saveProductionLineStaffRequirementAction(
  lineId: string,
  requirementId: string | null,
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdminUser();

  try {
    const prisma = getPrisma();
    const staffRoleId = text(formData, "staffRoleId");
    const line = await prisma.productionLineTemplate.findUniqueOrThrow({
      where: { id: lineId },
      select: { sectorId: true, departmentId: true },
    });
    const staffRole = await prisma.staffRole.findFirst({
      where: {
        id: staffRoleId,
        sectorId: line.sectorId,
        departmentId: line.departmentId,
        staffType: StaffType.DIRECT_PRODUCTION,
        status: ContentStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!staffRole) {
      throw new Error(
        "Yalnızca hattın departmanına bağlı aktif direkt üretim rolü seçilebilir.",
      );
    }

    await prisma.$transaction(async (tx) => {
      const data = {
        productionLineTemplateId: lineId,
        staffRoleId,
        requiredQuantity: integer(formData, "requiredQuantity", { min: 1 }),
        sortOrder: integer(formData, "sortOrder", { min: 0 }),
      };

      if (requirementId) {
        await tx.productionLineTemplateStaffRequirement.update({
          where: { id: requirementId, productionLineTemplateId: lineId },
          data,
        });
      } else {
        await tx.productionLineTemplateStaffRequirement.create({ data });
      }

      const totals =
        await tx.productionLineTemplateStaffRequirement.aggregate({
          where: { productionLineTemplateId: lineId },
          _sum: { requiredQuantity: true },
        });
      await tx.productionLineTemplate.update({
        where: { id: lineId },
        data: { idealStaff: totals._sum.requiredQuantity ?? 0 },
      });
      await recalculateDirectLineCost(tx, lineId);
    });

    refreshLine(lineId);
    return success(
      requirementId
        ? "Personel gereksinimi güncellendi."
        : "Personel gereksinimi eklendi.",
      requirementId ?? undefined,
    );
  } catch (cause) {
    return actionError(cause, "Personel gereksinimi kaydedilemedi.");
  }
}

export async function deleteProductionLineStaffRequirementAction(
  lineId: string,
  requirementId: string,
) {
  await requireAdminUser();

  await getPrisma().$transaction(async (tx) => {
    await tx.productionLineTemplateStaffRequirement.delete({
      where: { id: requirementId, productionLineTemplateId: lineId },
    });
    const totals = await tx.productionLineTemplateStaffRequirement.aggregate({
      where: { productionLineTemplateId: lineId },
      _sum: { requiredQuantity: true },
    });
    await tx.productionLineTemplate.update({
      where: { id: lineId },
      data: { idealStaff: totals._sum.requiredQuantity ?? 0 },
    });
    await recalculateDirectLineCost(tx, lineId);
  });

  refreshLine(lineId);
}

export async function uploadLineVisualAssetsAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdminUser();

  const lineId = text(formData, "productionLineTemplateId", false);
  const altText = optionalText(formData, "altText");
  const entry = formData.get("imageFile");
  const imageFile = entry instanceof File && entry.size > 0 ? entry : null;

  if (!lineId) return error("Üretim hattı zorunlu.");
  if (!imageFile) return error("PNG veya WEBP master görsel seçmelisin.");
  if (!["image/png", "image/webp"].includes(imageFile.type)) {
    return error("Kaynak görsel PNG veya WEBP olmalı.");
  }
  if (imageFile.size > MAX_SERVER_UPLOAD_BYTES) {
    return error("Görsel 4.5 MB sınırını aşıyor.");
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return error("BLOB_READ_WRITE_TOKEN bulunamadı.");
  }

  const prisma = getPrisma();
  const line = await prisma.productionLineTemplate.findUnique({
    where: { id: lineId },
    select: {
      key: true,
      grade: true,
      visualAssets: { select: { pathname: true } },
    },
  });
  if (!line) return error("Üretim hattı bulunamadı.");

  const sourceBuffer = Buffer.from(await imageFile.arrayBuffer());
  const lineKey =
    line.key
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || lineId;
  const gradeKey = line.grade.toLowerCase();
  const versionKey = Date.now().toString();
  const uploaded: Array<{
    variant: ProductionLineAssetVariant;
    url: string;
    pathname: string;
    width: number;
    height: number;
    fileSizeBytes: number;
  }> = [];

  for (const imageVariant of imageVariants) {
    let outputBuffer: Buffer;
    try {
      outputBuffer = await sharp(sourceBuffer)
        .rotate()
        .resize(imageVariant.width, imageVariant.height, {
          fit: "contain",
          position: "center",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .webp({ alphaQuality: 100, quality: 90 })
        .toBuffer();
    } catch {
      return error("Görsel WEBP formatına dönüştürülemedi.");
    }

    try {
      const pathname = `production-lines/${lineKey}/${gradeKey}/${lineKey}-${gradeKey}-${imageVariant.variant.toLowerCase()}-${versionKey}.webp`;
      const blob = await put(pathname, outputBuffer, {
        access: "public",
        contentType: "image/webp",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      uploaded.push({
        ...imageVariant,
        url: blob.url,
        pathname: blob.pathname,
        fileSizeBytes: outputBuffer.byteLength,
      });
    } catch {
      const paths = uploaded.map((image) => image.pathname);
      if (paths.length) {
        await del(paths, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        }).catch(() => undefined);
      }
      return error("Görsel Blob depolama alanına yüklenemedi.");
    }
  }

  try {
    const card = uploaded.find(
      (image) => image.variant === ProductionLineAssetVariant.CARD,
    );
    await prisma.$transaction([
      ...uploaded.map((image) =>
        prisma.productionLineVisualAsset.upsert({
          where: {
            productionLineTemplateId_variant: {
              productionLineTemplateId: lineId,
              variant: image.variant,
            },
          },
          create: {
            productionLineTemplateId: lineId,
            variant: image.variant,
            url: image.url,
            pathname: image.pathname,
            width: image.width,
            height: image.height,
            mimeType: "image/webp",
            fileSizeBytes: image.fileSizeBytes,
            altText,
          },
          update: {
            url: image.url,
            pathname: image.pathname,
            width: image.width,
            height: image.height,
            mimeType: "image/webp",
            fileSizeBytes: image.fileSizeBytes,
            altText,
          },
        }),
      ),
      prisma.productionLineTemplate.update({
        where: { id: lineId },
        data: {
          imageUrl: card?.url ?? null,
          imagePathname: card?.pathname ?? null,
        },
      }),
    ]);

    const nextPaths = new Set(uploaded.map((image) => image.pathname));
    const replaced = line.visualAssets
      .map((image) => image.pathname)
      .filter(
        (pathname): pathname is string =>
          Boolean(pathname && !nextPaths.has(pathname)),
      );
    if (replaced.length) {
      await del(replaced, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      }).catch(() => undefined);
    }

    refreshLine(lineId);
    return success(
      "CARD, MAP, DETAIL ve THUMBNAIL WEBP görselleri oluşturuldu.",
      lineId,
    );
  } catch (cause) {
    const paths = uploaded.map((image) => image.pathname);
    if (paths.length) {
      await del(paths, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      }).catch(() => undefined);
    }
    return actionError(cause, "Görsel kayıtları veritabanına yazılamadı.");
  }
}
