"use server";

import { revalidatePath } from "next/cache";

import { ContentStatus, Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";

import { requireAdminUser } from "../admin-auth";
import {
  assertMinMax,
  integer,
  json,
  optionalText,
  text,
} from "../admin-data";

const pagePath = "/admin/customers";

function technicalKey(formData: FormData) {
  const key = text(formData, "key")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!key) throw new Error("Teknik anahtar en az bir harf veya rakam içermeli.");
  return key;
}

function translations(formData: FormData) {
  const nameTr = text(formData, "nameTr");
  const nameEn = optionalText(formData, "nameEn");
  const descriptionTr = optionalText(formData, "descriptionTr");
  const descriptionEn = optionalText(formData, "descriptionEn");

  return [
    { locale: "tr", name: nameTr, description: descriptionTr },
    ...(nameEn
      ? [{ locale: "en", name: nameEn, description: descriptionEn }]
      : []),
  ];
}

function handleKnownError(cause: unknown, duplicateMessage: string): never {
  if (
    cause instanceof Prisma.PrismaClientKnownRequestError &&
    cause.code === "P2002"
  ) {
    throw new Error(duplicateMessage);
  }
  throw cause;
}

export async function saveCustomerSegmentAction(
  segmentId: string | null,
  formData: FormData,
) {
  await requireAdminUser();
  const prisma = getPrisma();
  const sectorId = text(formData, "sectorId");
  if (segmentId) {
    const current = await prisma.customerSegment.findUnique({
      where: { id: segmentId },
      select: {
        sectorId: true,
        _count: { select: { virtualCustomers: true } },
      },
    });
    if (
      current &&
      current.sectorId !== sectorId &&
      current._count.virtualCustomers > 0
    ) {
      throw new Error(
        "Kullanımda olan müşteri segmentinin sektörü değiştirilemez.",
      );
    }
  }

  const data = {
    sectorId,
    key: technicalKey(formData),
    sortOrder: integer(formData, "sortOrder"),
    status: text(formData, "status") as ContentStatus,
    tierWeights: json(formData, "tierWeights"),
    categoryWeights: json(formData, "categoryWeights"),
    priceMultiplierBps: integer(formData, "priceMultiplierBps", { min: 1 }),
    qualityExpectationBps: integer(formData, "qualityExpectationBps", { min: 1 }),
    deliveryPressureBps: integer(formData, "deliveryPressureBps", { min: 1 }),
    metadata: json(formData),
  };

  try {
    if (segmentId) {
      await prisma.customerSegment.update({
        where: { id: segmentId },
        data: {
          ...data,
          translations: {
            deleteMany: {},
            create: translations(formData),
          },
        },
      });
    } else {
      await prisma.customerSegment.create({
        data: {
          ...data,
          translations: { create: translations(formData) },
        },
      });
    }
  } catch (cause) {
    handleKnownError(
      cause,
      "Bu müşteri segmenti anahtarı seçilen sektörde daha önce kullanılmış.",
    );
  }

  revalidatePath(pagePath);
}

export async function saveCustomerVolumeClassAction(
  volumeClassId: string | null,
  formData: FormData,
) {
  await requireAdminUser();
  const prisma = getPrisma();
  const sectorId = text(formData, "sectorId");
  if (volumeClassId) {
    const current = await prisma.customerVolumeClass.findUnique({
      where: { id: volumeClassId },
      select: {
        sectorId: true,
        _count: { select: { virtualCustomers: true } },
      },
    });
    if (
      current &&
      current.sectorId !== sectorId &&
      current._count.virtualCustomers > 0
    ) {
      throw new Error(
        "Kullanımda olan hacim sınıfının sektörü değiştirilemez.",
      );
    }
  }

  const targetProductionDayMin = integer(formData, "targetProductionDayMin", {
    min: 1,
  });
  const targetProductionDayMax = integer(formData, "targetProductionDayMax", {
    min: 1,
  });
  const itemCountMin = integer(formData, "itemCountMin", { min: 1 });
  const itemCountMax = integer(formData, "itemCountMax", { min: 1 });
  assertMinMax(
    targetProductionDayMin,
    targetProductionDayMax,
    "Hedef üretim günü",
  );
  assertMinMax(itemCountMin, itemCountMax, "Ürün satırı sayısı");

  const data = {
    sectorId,
    key: technicalKey(formData),
    sortOrder: integer(formData, "sortOrder"),
    status: text(formData, "status") as ContentStatus,
    quantityMultiplierBps: integer(formData, "quantityMultiplierBps", { min: 1 }),
    priceMultiplierBps: integer(formData, "priceMultiplierBps", { min: 1 }),
    targetProductionDayMin,
    targetProductionDayMax,
    itemCountMin,
    itemCountMax,
    maxOfferLoadBps: integer(formData, "maxOfferLoadBps", {
      min: 1,
      max: 10000,
    }),
    tierQuantityCaps: json(formData, "tierQuantityCaps"),
    metadata: json(formData),
  };

  try {
    if (volumeClassId) {
      await prisma.customerVolumeClass.update({
        where: { id: volumeClassId },
        data: {
          ...data,
          translations: {
            deleteMany: {},
            create: translations(formData),
          },
        },
      });
    } else {
      await prisma.customerVolumeClass.create({
        data: {
          ...data,
          translations: { create: translations(formData) },
        },
      });
    }
  } catch (cause) {
    handleKnownError(
      cause,
      "Bu hacim sınıfı anahtarı seçilen sektörde daha önce kullanılmış.",
    );
  }

  revalidatePath(pagePath);
}

export async function saveVirtualCustomerAction(
  customerId: string | null,
  formData: FormData,
) {
  await requireAdminUser();
  const prisma = getPrisma();
  const sectorId = text(formData, "sectorId");
  const customerSegmentId = text(formData, "customerSegmentId");
  const customerVolumeClassId = text(formData, "customerVolumeClassId");
  const minOperatingStageId = optionalText(formData, "minOperatingStageId");
  const maxOperatingStageId = optionalText(formData, "maxOperatingStageId");

  const [segment, volumeClass, minStage, maxStage] = await Promise.all([
    prisma.customerSegment.findFirst({
      where: { id: customerSegmentId, sectorId },
      select: { id: true },
    }),
    prisma.customerVolumeClass.findFirst({
      where: { id: customerVolumeClassId, sectorId },
      select: { id: true },
    }),
    minOperatingStageId
      ? prisma.sectorFactoryOperatingStage.findFirst({
          where: { id: minOperatingStageId, sectorId },
          select: { id: true, sortOrder: true },
        })
      : null,
    maxOperatingStageId
      ? prisma.sectorFactoryOperatingStage.findFirst({
          where: { id: maxOperatingStageId, sectorId },
          select: { id: true, sortOrder: true },
        })
      : null,
  ]);

  if (!segment || !volumeClass) {
    throw new Error("Segment ve hacim sınıfı seçilen sektörle uyumlu olmalı.");
  }
  if (minOperatingStageId && !minStage) {
    throw new Error("Minimum işletme aşaması seçilen sektörle uyumlu olmalı.");
  }
  if (maxOperatingStageId && !maxStage) {
    throw new Error("Maksimum işletme aşaması seçilen sektörle uyumlu olmalı.");
  }
  if (minStage && maxStage && minStage.sortOrder > maxStage.sortOrder) {
    throw new Error("Minimum işletme aşaması maksimum aşamadan büyük olamaz.");
  }

  const countryCode = optionalText(formData, "countryCode")?.toUpperCase() ?? null;
  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
    throw new Error("Ülke kodu iki harfli ISO kodu olmalı.");
  }

  const data = {
    sectorId,
    customerSegmentId,
    customerVolumeClassId,
    key: technicalKey(formData),
    name: text(formData, "name"),
    countryCode,
    minOperatingStageId,
    maxOperatingStageId,
    trustRequirementBps: integer(formData, "trustRequirementBps"),
    status: text(formData, "status") as ContentStatus,
    metadata: json(formData),
  };

  try {
    if (customerId) {
      await prisma.virtualCustomer.update({
        where: { id: customerId },
        data,
      });
    } else {
      await prisma.virtualCustomer.create({ data });
    }
  } catch (cause) {
    handleKnownError(
      cause,
      "Bu müşteri anahtarı seçilen sektörde daha önce kullanılmış.",
    );
  }

  revalidatePath(pagePath);
}
