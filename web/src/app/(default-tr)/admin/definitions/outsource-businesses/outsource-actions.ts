"use server";

import { revalidatePath } from "next/cache";

import {
  ContentStatus,
  OutsourceOptionType,
} from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";

import { integer, json, text } from "../../admin-data";
import { requireAdminUser } from "../../admin-auth";

const pagePath = "/admin/definitions/outsource-businesses";

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

export async function saveOutsourceOptionAction(
  configId: string | null,
  formData: FormData,
) {
  await requireAdminUser();
  const prisma = getPrisma();
  const departmentId = text(formData, "departmentId");
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { sectorId: true, supportsOutsource: true },
  });

  if (!department?.supportsOutsource) {
    throw new Error("Seçilen departman fason üretimi desteklemiyor.");
  }

  const data = {
    sectorId: department.sectorId,
    departmentId,
    optionType: text(formData, "optionType") as OutsourceOptionType,
    leadTimeDays: integer(formData, "leadTimeDays", { min: 1 }),
    baseCostPer1000PointsCents: currencyToCents(
      formData,
      "baseCostPer1000Points",
    ),
    costMultiplierBps: integer(formData, "costMultiplierBps", { min: 1 }),
    qualityRiskBps: integer(formData, "qualityRiskBps", { max: 10000 }),
    delayRiskBps: integer(formData, "delayRiskBps", { max: 10000 }),
    status: text(formData, "status") as ContentStatus,
    metadata: json(formData),
  };

  if (
    data.status === ContentStatus.ACTIVE &&
    data.baseCostPer1000PointsCents <= 0
  ) {
    throw new Error("Aktif fason tanımı için 1000 point baz maliyeti girilmeli.");
  }

  if (configId) {
    await prisma.outsourceOptionConfig.update({
      where: { id: configId },
      data,
    });
  } else {
    await prisma.outsourceOptionConfig.create({ data });
  }

  revalidatePath(pagePath);
}

export async function deleteOutsourceOptionAction(configId: string) {
  await requireAdminUser();
  await getPrisma().outsourceOptionConfig.delete({ where: { id: configId } });
  revalidatePath(pagePath);
}
